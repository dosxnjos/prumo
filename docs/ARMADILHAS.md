# Armadilhas — Prumo

## `ContextoEspaco.tsx`: closure stale sobre `espacoAtivo`/`espacos` do React state

**Sintoma (achado testando ao vivo com Playwright, Fase 3):** escolher
"carregar exemplo fictício" no onboarding criava o espaço, mas o mês vinha
sempre vazio — as regras do exemplo nunca apareciam, mesmo depois de
recarregar a página.

**Causa:** dentro de `Onboarding.confirmar()`, a sequência é `criarEspaco()`
→ `atualizarEspacoAtivo()` → `salvarRegras()`, todas obtidas de `useEspaco()`
**uma única vez**, no topo do componente. Cada uma dessas funções é recriada
(`useCallback`) toda vez que o `ProvedorEspaco` re-renderiza — mas dentro de
uma função assíncrona já em execução, a referência capturada não muda nunca,
mesmo que o Provider tenha re-renderizado internamente enquanto o `await`
estava pendente. `salvarRegras` fechava sobre `espacoAtivo` (do render
**anterior** à criação do espaço, portanto `null`) para decidir se atualizava
o `dados` exibido — a gravação no IndexedDB acontecia certinho, só a UI não
refletia.

**Correção:** nenhuma função do contexto pode decidir o que fazer com base em
`espacoAtivo`/`espacos` do React state. Toda decisão lê fresco do storage
(`storeLocal.listarEspacos()`, `obterEspacoAtivoId()`) a cada chamada.
`salvarRegras` e `selecionarEspaco` passaram a receber `espacoId` explícito
como parâmetro, nunca implícito via closure.

**Regra geral para o resto do app:** qualquer fluxo assíncrono de múltiplos
passos que usa `useEspaco()` uma vez no topo do componente e depois faz
várias chamadas em sequência é candidato a esse bug. Prevenção: as funções
expostas pelo contexto nunca devem depender de estado React capturado por
closure para decidir *o quê* fazer — só para decidir *se* devem re-renderizar
no fim.

## `ContextoEspaco.tsx` quebra o Fast Refresh do Vite (HMR)

**Sintoma:** console mostra repetidamente `Could not Fast Refresh ("useEspaco"
export is incompatible)` a cada edição salva com o dev server rodando.
Depois de várias edições acumuladas, interações no browser (ex. `<input
type="month">`) pararam de disparar `onChange` — sintoma de módulo em estado
inconsistente por HMR parcial.

**Causa:** o arquivo exporta tanto o componente (`ProvedorEspaco`) quanto uma
função não-componente (`useEspaco`). O Fast Refresh do React só consegue
substituir com segurança um módulo que exporta *só* componentes.

**Mitigação usada nesta sessão:** confiar em Fast Refresh é arriscado para
qualquer interação que pareça "não disparar" durante uma sessão longa de dev
— fazer um **reload completo da página** (não confiar em HMR acumulado) antes
de concluir que algo é bug real. Resolvido isso, o comportamento ficou
correto.

**Correção estrutural — feita 13/08/2026 (Fase 0, passo 2)** do roadmap
`2026-08-13-melhoria-ux-ui-logica.md`: `useEspaco` (hook + `Contexto` +
`EstadoEspaco`) mudou para `src/app/useEspaco.ts`; `ContextoEspaco.tsx` ficou
só com `ProvedorEspaco`. Validado com `npm run dev` + edição ao vivo (via
Playwright, console sem `Could not Fast Refresh`) e `npm test`/`npm run
build` verdes.

## Teste de componente com `act()` assíncrono trava esperando estado que nunca chega

**Sintoma (Fase 0, passo 4, `ContextoEspaco.test.tsx`):** `estadoObservado`
ficava travado no valor do primeiro render (`carregando: true`) mesmo depois
de 100 voltas de `setTimeout` reais dentro de
`await act(async () => { root.render(...); await esperarAlgumaCoisa() })` —
o `useEffect` que dispara `recarregar()` parecia nunca progredir.

**Causa:** `act(async () => { ... })` só comita os efeitos passivos
pendentes quando a callback **inteira** termina — um `await` no meio dela
não abre uma janela de commit. Como a espera (polling) estava *dentro* da
mesma chamada de `act` do `render()`, o React nunca tinha a chance de
processar o `useEffect` (que encadeia leituras assíncronas no
`fake-indexeddb`) enquanto a Promise externa não resolvia — um deadlock.

**Correção:** `render()` em um `act(() => {...})` síncrono próprio; o
polling que segue é uma sequência de `act(async () => { await tick })`
**independentes** (uma chamada de `act` por tentativa), não um `act` só
encadeando várias esperas — assim o React comita entre uma tentativa e
outra. Também é preciso `(globalThis as ...).IS_REACT_ACT_ENVIRONMENT = true`
no topo do arquivo de teste (React 19 avisa "not configured to support
act(...)" sem isso, mesmo com `act` importado de `'react'`).

**Regra geral:** qualquer teste de componente que espera um efeito
assíncrono assentar (loading → dados) deve fazer o polling em `act`s
separados, nunca um único `act` com `await`s aninhados no meio.

## `git push` rejeitado com 403 — remote HTTPS depende da conta `gh` ativa

**Sintoma (13/08/2026, ao fechar a Fase 0):** `git push` deu
`Permission to dosxnjos/prumo.git denied to dados-produto-gruponomura` —
403, mesmo com o repo correto e o commit certo.

**Causa:** o remote estava em HTTPS (`https://github.com/dosxnjos/prumo.git`),
que autentica pela conta `gh` ativa no processo — que é global da máquina,
não por sessão/pasta, e desde a migração pra org o default costuma ser a
conta corporativa. `prumo` é repo **pessoal** (`dosxnjos`).

**Correção:** `git remote set-url origin git@github.com:dosxnjos/prumo.git`
— com SSH, o push nunca mais depende de qual conta o `gh` CLI tem ativa
(a chave SSH da máquina já é do `dosxnjos`, confirmado com
`ssh -T git@github.com`). Regra geral já documentada em
`C:\Dev\CLAUDE.md` § "Git: commitar direto na main" — receita completa lá.

## MCP `github` autentica como a conta corporativa, não `dosxnjos`

**Sintoma:** `mcp__github__create_repository` criou o repo em
`dados-produto-gruponomura/prumo` mesmo com `gh api user -q .login` confirmando
`dosxnjos` como conta ativa do `gh` CLI.

**Causa:** o servidor MCP `github` tem token/sessão própria, independente do
`gh` CLI — `gh api user` só confere a conta do CLI, não a do MCP. Para repo
pessoal, criar via `gh repo create` (CLI), não via MCP `github`.

**Resolução:** repo órfão ficou em `dados-produto-gruponomura/prumo` (vazio,
nunca recebeu push) — apagar manualmente no painel do GitHub quando conveniente.
O repo correto é `dosxnjos/prumo`, criado via `gh repo create --source=. --remote=origin`.

## Teste de paridade (Fase 1, passo 12) — veredito

**Feito 05/08/2026**, com os itens reais de `💸` (25 itens, extraídos via
`fixtures/local/itens-agosto-2026.json`, fora do git). Mecânica em
`fixtures/local/verificar-paridade.mts` (`npx tsx fixtures/local/verificar-paridade.mts`).

**Mês atual (`💸`) bate exatamente:** entradas R$20,82, saídas R$228,80 — igual
ao que a própria aba mostra. Isso confirma a tradução `vazio`/`0`/`off` e o
motor `recorrencia.ts`/`projecao.ts` para o caso mais crítico (o mês que o
Gabriel edita todo dia).

**P1 em diante NÃO bate**, e a causa está identificada: **a planilha exportada
tem cache de fórmula desatualizado nas abas `P*`**, não um bug do motor novo.
Evidência:

- O bloco `Casa` (Luz/Água/Internet/Mercado/Atrasados) em P1 bate 100% exato
  contra a coluna `Ignorar` já resolvida pela própria planilha
  (140+70+110+900+216,28 = R$1.436,28, igual ao `Total` mostrado).
- Os blocos de despesa pessoal (`Ração/Areia/Tattoo/Cassol/Cabeleireiro/Beauty`
  e `Jheik/Pilates/Massagem/Unha/Terapia`) **não** batem: o `Total` cacheado
  exclui itens (Tattoo, Cabeleireiro, Beauty, Jheik, Terapia) cuja própria
  coluna `Ignorar` mostra "não ignorado" — inconsistência **dentro do mesmo
  arquivo**, entre a fórmula do `Ignorar` e a fórmula do `Total`.
- P1's "Entradas" (R$3.800, cacheado) não inclui `Nubank` (R$0,82, operação
  vazia — deveria rodar todo mês) nem `Duda`/`Extra` (operação `11` = `nm`
  com n=1,m=1 — deveriam rodar só em P1). O mês atual (`💸`) já inclui
  `Nubank` no seu próprio total, então a divergência é do snapshot de `P1`,
  não da tradução da operação.

**Conclusão:** é exatamente o defeito estrutural que o roadmap já documentava
("o arquivo já está meio quebrado", `#NAME?`/`IMPORTXML` morto) — um snapshot
de planilha viva, editada todo dia, exportado num instante em que nem todas as
abas espelho tinham recalculado. Não é uma divergência inexplicada (que seria
bug), nem algo para o motor "compensar" — é exatamente o problema que o app
substitui. Não investigado mais a fundo por decisão consciente: forçar
reconciliação byte a byte contra um cache sabidamente inconsistente não
aumentaria a confiança no motor.
