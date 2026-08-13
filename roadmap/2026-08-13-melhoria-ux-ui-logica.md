# Roadmap de melhoria — UX, UI e lógica do Prumo (2026-08-13)

> **Pedido do Gabriel:** "ux, ui e lógica do prumo, você tem total liberdade
> pra refazer tudo a seu gosto. só peço que não perca os dados que eu já
> cadastrei na plataforma até agora."

## Contexto e motivação

O Marco A ("chega de planilha") fechou por código em 05/08/2026 e o Gabriel
**já usa o app com dados reais** — o critério comportamental (um mês sem abrir
o Sheets) está em andamento. A UI atual foi construída para provar o motor,
não para morar nela: funcional, mas crua, com atritos de uso diário e alguns
comportamentos que mentem ou perdem dado. Este roadmap redesenha UX, UI e a
lógica de apresentação **sem tocar na semântica do motor testado**.

### ⚠️ A restrição nº 1 — os dados reais (ler antes de qualquer passo)

**Confirmado pelo Gabriel em 13/08/2026: ele usa o app no dia a dia e a
origem viva é o app desktop (`Prumo.msi`, perfil WebView2 isolado).** A
origem `http://localhost:5177` (porta fixa do `iniciar.bat`) pode guardar
uma cópia mais antiga — preservar as duas. Regras invioláveis em TODAS as
fases:

- **Não mudar**: nome do DB (`prumo-db`), do store (`prumo-store`), das chaves
  (`espacos-indice`, `espaco-ativo-id`, `espaco-<id>`) nem a porta 5177 do
  `iniciar.bat`. Origem = identidade do dado.
- **Schema**: campo novo é sempre **opcional**, com default no ponto de
  leitura (`?? valor`). Renomear/remover campo existente é proibido sem bump
  de `SCHEMA_VERSION` + migração real em `migrar()` + teste com fixture v1.
- **Fase 0 faz backup antes de tudo** (abaixo). Sem backup verificado,
  nenhuma outra fase começa.

### O que ler antes de começar

| ler | por quê |
| --- | --- |
| `C:\Dev\CLAUDE.md` | regras da casa: fonte ≤600, commit direto na main, grep de dentro do projeto |
| `prumo/docs/ARMADILHAS.md` | closure stale no `ContextoEspaco` (padrão obrigatório ao mexer nele) e o bug de HMR/Fast Refresh — **reload completo antes de concluir que algo quebrou** |
| `prumo/docs/modelo-de-dados.md` | schema, tabela de tradução, invariantes |
| `prumo/roadmap/2026-08-05-melhoria-app-prumo.md` | roadmap-mãe: decisões que não se reabrem, fases futuras (4-10) que este roadmap NÃO adianta |
| `prumo/iniciar.bat` + `prumo/docs/empacotar-desktop.md` | onde os dados reais vivem |

Prints do estado atual (diagnóstico desta sessão): `prumo/temp/*.png`.

## Alvo e estado atual

App React 19 + Vite + TS, ~3,5k linhas. `src/dominio/` (motor puro, 73+
testes), `src/dados/` (interface `Store` + IndexedDB), `src/app/` (11
componentes), `src/index.css` (556 linhas, único). Telas: onboarding, mês
(lista por membro + resumo), formulário de item, ajuste pontual, painel de
espaços, config financeira (com backup), curva de saldo (resumo + detalhe).
Design atual: system-ui cinza + roxo `#aa3bff`, mobile-first de uma coluna,
duas colunas ≥1100px.

## Diagnóstico

### O que está bom (não mexer)

- **O motor** (`recorrencia.ts`, `projecao.ts`, `dinheiro.ts`, `mes.ts`,
  `espaco.ts`): puro, testado, rápido (600 meses ≈ 3ms). A semântica não se
  reabre — melhoria de UI consome o que ele já devolve.
- **A fronteira `Store`** e o IndexedDB com `schemaVersion` + fail-fast.
- **Export/import JSON** — redondo, testado, nunca sobrescreve.
- **Zero dependência de runtime** além de React + idb-keyval; sem CDN.
- **Nada nominal no código**; onboarding limpo passa o teste da janela anônima.
- Acessibilidade básica existente (aria-labels, roles, botões reais).

### O que está frágil ou custando — LÓGICA

| # | sintoma (evidência) | causa |
| --- | --- | --- |
| L1 | "🎉 Pé de meia completo: R$ 0,00 de R$ 0,00" para usuário sem config (print `tela-mes-mobile.png`) | `ProgressoPeDeMeia.tsx:18`: `faltam===0` não distingue meta zerada de meta atingida |
| L2 | item não pode ser **desligado**, só apagado — o `off` da planilha sumiu | `Regra.ativa` existe no domínio mas o `FormularioRegra` nunca o expõe; a `TelaMes` nunca lista inativos |
| L3 | apagar item é 1 toque, sem confirmação nem undo | `FormularioRegra.apagar()` grava direto |
| L4 | saldo da tela do mês ≠ saldo da tabela "mês a mês" para o MESMO mês quando há dívida/rendimento | `TelaMes` soma ocorrências cruas; `projetarSerie` injeta "Dívida do mês anterior" + rendimento. Duas verdades na mesma tela |
| L5 | espaço criado pelo painel nasce **sem nenhum membro/dono** | `store.criarEspaco` cria `membros: []`; só o onboarding preenche. Viola a invariante "sempre ≥1 dono" por construção |
| L6 | remover membro deixa os itens dele órfãos ("Sem dono") sem aviso | `removerMembro` só mexe em `espaco.membros`; ninguém trata as `regras` com `membroId` dele |
| L7 | form aceita valor negativo (inverte fluxo em silêncio), `fim < início`, parcelas/`aCadaMeses` `0` ou vazio → item cadastrado que **nunca aparece** ("cadê meu item?") | validação só de nome e parse do valor; `Number('')===0` passa |
| L8 | restaurar backup duplica o espaço e o usuário não sabe o que fazer com o antigo | import sempre cria novo (correto!) mas o copy não orienta a substituição |
| L9 | categoria é digitada e nunca mais aparece (nem agrupa, nem filtra, texto livre sem sugestão) | campo gravado sem consumidor na UI |

### O que está frágil ou custando — UX

| # | sintoma (evidência) | causa |
| --- | --- | --- |
| U1 | pular para mês distante = N toques na seta; "pular para mês" é invisível (testado: clicar no rótulo não faz nada) | `input[type=month]` com `opacity:0; width:1px` — affordance morta. Sem botão "hoje" |
| U2 | botão "ajustar este mês" gigante, quebrado em 2 linhas, repetido em CADA linha (prints) | ação secundária promovida a primária na lista |
| U3 | backup ("a única cópia de segurança") enterrado no fim da config; nenhum lembrete | sem registro de último export, sem promoção do fluxo |
| U4 | config é uma coluna longa de jargão (CDI, % do banco) sem ajuda | tela porta do motor, não do humano |
| U5 | onboarding: fileira de cores estoura 390px (scroll lateral); botão desabilitado parece ativo | `.linha-membro` sem wrap; CSS sem estado `:disabled` |
| U6 | salvar/apagar não dá feedback nenhum — modal só fecha | sem toast/confirmação visual |
| U7 | painel de espaços mistura 4 responsabilidades (trocar, criar, membros, apagar) num modal só | tela única de gestão |
| U8 | Enter não submete, Esc não fecha, foco não vai ao primeiro campo | modais são `div`s sem handlers de teclado |

### O que está frágil ou custando — UI

| # | sintoma (evidência) | causa |
| --- | --- | --- |
| I1 | cara de protótipo: system-ui + roxo elétrico `#aa3bff`, sem identidade | design nunca foi objetivo até aqui |
| I2 | saldo do mês (a informação nº1) tem o mesmo peso visual de tudo | resumo em 3 `span`s de 0.9em |
| I3 | curva: título quebra, botões 12m/24m/60m desalinham (60m órfão), eixos de 11px, rótulo cortado, sem leitura por ponto | layout flex sem reserva de espaço; SVG mínimo |
| I4 | sem estados hover/focus-visible/active/disabled, sem transição nenhuma | CSS não os define |
| I5 | valores "dançam" na coluna (dígitos de largura variável) | falta `font-variant-numeric: tabular-nums` |
| I6 | dark mode existe mas nunca foi auditado (roxo elétrico sobre `#16171d`) | tokens dark escolhidos sem checagem de contraste |

### O que está frágil ou custando — estabilidade/manutenção

| # | sintoma | causa |
| --- | --- | --- |
| M1 | HMR quebra em dev (console spam, interações mortas) — armadilha documentada | `ContextoEspaco.tsx` exporta componente + hook |
| M2 | qualquer `throw` (ex.: `schemaVersion` desconhecida, espaço não encontrado) = **tela branca** sem saída | sem ErrorBoundary; `carregar()` lança e ninguém captura |
| M3 | zero teste de componente/fluxo de UI (73 testes são todos de domínio/store) | Fase 3 foi validada só ao vivo |

## Roadmap

Fases independentes e ordenadas por dependência: 0 destrava tudo; 1 e 2 podem
inverter; 3 depende de 1-2 (não pintar tela que vai mudar de estrutura);
4 e 5 fecham. O app continua utilizável entre todos os passos.

### Fase 0 — rede de segurança (fazer ANTES de tocar em qualquer coisa)

1. [x] **Backup dos dados reais.** ✅ Feito 13/08/2026: o Gabriel exportou o
   JSON do app em uso e a sessão arquitetora validou e guardou em
   `dados-locais/` (`prumo-casinha-2026-08-13.json`: schemaVersion 1, espaço
   "Casinha", 2 membros, 25 regras; mais o export de 05/08 como histórico).
   `git status --porcelain` confirmou a pasta ignorada.
   **Sobra para o executor:** confirmar com o Gabriel que "Casinha" é o
   ÚNICO espaço no app em uso — espaço sem export não tem backup (o export
   é por espaço).
   — **prova:** resposta do Gabriel registrada aqui; se houver outro espaço,
   repetir o export antes de seguir.
   ⚠️ Execução autônoma (13/08/2026): pergunta pulável, sem resposta possível
   em `/goal` — registrada em "Pendências de decisão" ao final do arquivo.
2. [x] Separar `useEspaco` para `src/app/useEspaco.ts` (o `ContextoEspaco.tsx`
   fica só com `ProvedorEspaco`), atualizando os 10 imports. Corrige o Fast
   Refresh (M1) antes das sessões longas de dev que este roadmap exige.
   — **prova:** `npm run dev` + editar um componente → console sem
   `Could not Fast Refresh`; `npm test` e `npm run build` verdes.
   ✅ Feito 13/08/2026: validado ao vivo com Playwright numa porta de teste
   isolada (5201, não a 5177 real) — `[vite] hot updated` limpo, sem aviso de
   Fast Refresh; `npm test` (78/78) e `npm run build` verdes.
3. [x] `src/app/ErroApp.tsx`: ErrorBoundary no topo (`main.tsx`) com mensagem
   em pt-BR, botão "recarregar" e botão "baixar meus dados" que despeja o
   IndexedDB bruto (ler `prumo-db` direto com idb-keyval) num JSON — o dado
   sobrevive mesmo com a UI quebrada (M2, metade 1).
   — **prova:** teste de componente com filho que lança → boundary renderiza;
   clique em "baixar meus dados" gera blob não-vazio (mock do idb).
   ✅ Feito 13/08/2026 (`src/app/ErroApp.test.tsx`, 3 testes). Resolução
   conservadora registrada: a prova exige renderizar componente, o que exige
   `jsdom` — instalado como devDependency mínima nesta fase (não
   `@testing-library/react`, que a Fase 5/passo 29 já previa; usei
   `react-dom/client` + `act` puro, sem lib extra). Reversível, não muda
   semântica de produção — não é decisão do Gabriel, mas registrada aqui por
   transparência.
4. [x] Tratar os `throw` de storage no `ProvedorEspaco` (M2, metade 2):
   espaço do índice sem registro → remove do índice exibido + console.error,
   nunca tela branca; `espacoAtivoId` órfão → cai para o primeiro espaço.
   — **prova:** teste com `fake-indexeddb`: índice apontando para espaço
   inexistente → `carregando:false`, app renderiza seletor, sem exceção.
   ✅ Feito 13/08/2026 (`src/app/ContextoEspaco.test.tsx`, 2 testes, ambos os
   cenários da prova). Armadilha de teste descoberta e documentada em
   `docs/ARMADILHAS.md` (`act()` assíncrono não flusha efeito no meio do
   `await`).

### Fase 1 — a lógica que mente ou perde dado

5. [x] **L1**: `ProgressoPeDeMeia` com 3 estados: meta não configurada
   (`metaPeDeMeiaCentavos()===0`) → "configura a meta do pé de meia" com botão
   que abre a config; meta > 0 e falta → texto atual; completo → 🎉 atual.
   — **prova:** vitest de componente cobrindo os 3 estados.
   ✅ Feito 13/08/2026 (`ProgressoPeDeMeia.test.tsx`, 3 testes). `onAbrirConfig`
   é prop nova, threaded de `App.tsx`.
6. [x] **L7**: validação do `FormularioRegra` antes de salvar: valor > 0 (com
   mensagem "valor precisa ser maior que zero"), `fim >= inicio` no período,
   `parcelas >= 1` e `aCadaMeses >= 1` inteiros (campo vazio/0 → erro, não
   silêncio). Erro aparece junto do campo, foco vai para ele.
   — **prova:** vitest: cada entrada inválida bloqueia o save e `salvarRegras`
   não é chamado; entrada válida salva.
   ✅ Feito 13/08/2026 (`FormularioRegra.test.tsx`, 4 testes). Erro renderiza
   logo abaixo do campo correspondente (não mais um parágrafo genérico no fim
   do form) e `ref.current?.focus()` move o foco.
7. [x] **L2**: expor `ativa` — no form de edição, ação "desligar item"
   (religar quando inativo); na `TelaMes`, seção colapsada "Desligados (N)"
   ao fim da lista, itens com religar em 1 toque. Desligado não entra em
   total nenhum (o motor já garante).
   — **prova:** vitest: desligar remove dos totais e aparece na seção;
   religar restaura. Playwright ao vivo no fluxo completo.
   ✅ Feito 13/08/2026 (`TelaMes.test.tsx`, 1 teste cobrindo o fluxo
   desligar→religar) + confirmado ao vivo com Playwright (porta de teste
   isolada 5201): grupo "Compartilhado" some, "Desligados (1)" aparece,
   Saídas zeram, religar restaura tudo — sem erro de console.
8. [x] **L3**: apagar item pede confirmação inline no próprio form ("apagar
   'Aluguel'? Isso remove o item de TODOS os meses — desligar mantém o
   histórico." com botões apagar/desligar/cancelar). Vira toast+undo na
   Fase 2, passo 15.
   — **prova:** vitest: primeiro clique não apaga; confirmação apaga.
   ✅ Feito 13/08/2026 (`FormularioRegra.test.tsx`, 2 testes — inclui a opção
   "desligar" dentro da própria confirmação).
9. [x] **L5**: "+ novo espaço" (painel) pede também "seu nome neste espaço"
   e cria o membro **dono** junto. Nova função `criarEspacoComDono` na camada
   de app (store não muda — chama `criarEspaco` + `atualizarEspaco`).
   — **prova:** vitest: espaço criado pelo painel tem 1 membro `papel:'dono'`.
   ✅ Feito 13/08/2026 (`src/app/criarEspacoComDono.ts` +
   `criarEspacoComDono.test.ts`).
10. [x] **L6**: remover membro com itens mostra "N itens são de <nome>. Passar
    para:" + select (outro membro / Compartilhado). A reatribuição atualiza
    `membroId` das regras e remove o membro na mesma sequência (ler fresco do
    storage — padrão anti-closure do ARMADILHAS).
    — **prova:** vitest: após remover, nenhuma regra aponta para o id removido.
    ✅ Feito 13/08/2026: nova função de contexto `reatribuirERemoverMembro`
    (lê fresco do storage, escreve regras reatribuídas e SÓ DEPOIS remove o
    membro) + UI em `PainelEspacos.tsx` (`reatribuirERemoverMembro.test.tsx`).
11. [x] **L4**: unificar o saldo. Para mês ≥ atual, a `TelaMes` consome a
    projeção (`useSerieProjetada` estendido até o mês navegado): mesmos
    números da tabela, ocorrência sintética "Atrasados do mês anterior"
    visível como linha (como a planilha fazia) e rodapé com
    reserva/pé de meia/dívida do mês. Para mês < atual, manter soma simples +
    nota "mês passado — sem encadeamento (ainda não há fechamento)".
    — **prova:** vitest comparando `TelaMes` e série para o mesmo mês com
    dívida no cenário: totais idênticos; Playwright confere a linha sintética.
    ✅ Feito 13/08/2026 (`TelaMes.projecao.test.tsx`). Nota: a linha sintética
    usa o nome que o motor já produz, **"Dívida do mês anterior"**, não
    "Atrasados" — optei por reaproveitar o texto existente em
    `projetarMes` (uma única fonte da verdade) em vez de duplicar a mensagem
    com um texto novo; rodapé com reserva/pé de meia/dívida confirmado ao
    vivo com Playwright. A checagem Playwright da linha sintética em si NÃO
    foi feita ao vivo (só via vitest) — o cenário de dívida exige mais setup
    de dados do que o exemplo fictício do onboarding cobre; registrado como
    pendência abaixo.
12. [x] **L8**: pós-import, mensagem orienta a substituição: "confere o espaço
    novo; se estiver tudo lá, apaga o antigo em Espaços → apagar". (Copy só —
    o comportamento de nunca sobrescrever está certo e fica.)
    — **prova:** revisão manual do texto no fluxo Playwright.
    ✅ Feito 13/08/2026 (`ConfigFinanceiraTela.tsx`, mensagem pós-import).
    Revisão manual do texto feita por leitura de código; a exportação foi
    disparada ao vivo com Playwright (sem erro), mas o round-trip completo
    de importar o arquivo baixado NÃO foi executado ao vivo — mecânica de
    upload de arquivo via MCP ficou fora do orçamento desta fase; registrado
    como pendência abaixo.

### Fase 2 — o fluxo diário (navegação e edição)

13. [x] **U1**: rótulo do mês vira botão que abre o picker nativo
    (`inputRef.current.showPicker()`, try/catch com fallback de exibir o
    input) + botão "hoje" visível sempre que `mes !== mesAtual()`.
    — **prova:** Playwright: clicar no rótulo abre picker (ou input visível);
    "hoje" volta e some no mês corrente.
    ✅ Feito 13/08/2026, confirmado ao vivo com Playwright (porta de teste
    isolada 5211): clique no rótulo sem erro de console (picker nativo abre);
    "hoje" aparece ao navegar pra set/2026 e some ao voltar pro mês atual.
14. [x] **U2**: linha do item inteira é o alvo de toque (abre edição); o
    "ajustar este mês" sai da lista e vira ação dentro do form de edição
    ("só em <mês>: mudar valor / pular"), que já sabe o mês de origem.
    Categoria vira sub-rótulo da linha (L9 ganha o primeiro consumidor).
    — **prova:** Playwright: lista sem botões repetidos; ajuste continua
    acessível em ≤2 toques; marca ✎ preservada.
    ✅ Feito 13/08/2026: `AjustePontual.tsx` foi absorvido inteiro por
    `FormularioRegra` (removido do repo); confirmado ao vivo — 1 toque na
    linha abre o form com a seção "só em ago/2026" já visível (não precisou
    de 2º toque). `vitest` cobrindo ambos (`TelaMes.U2.test.tsx`).
15. [x] **U6 + L3 v2**: sistema de toast mínimo (componente próprio, sem lib):
    "item salvo", "ajuste de <mês> salvo", e apagar vira imediato com
    **desfazer** (5s) — o toast guarda a regra e reinsere; a confirmação do
    passo 8 sai.
    — **prova:** vitest: apagar → desfazer restaura idêntico (mesmo id);
    timeout consuma a remoção.
    ✅ Feito 13/08/2026 (`Toast.tsx`/`useToast.ts`, nova função de contexto
    `restaurarRegra` — lê fresco do storage, igual `salvarDados`, porque o
    desfazer pode disparar bem depois do form já ter fechado). Confirmado ao
    vivo: apagar é imediato, toast "'Internet' apagado" some sozinho depois
    de ~5s sem clicar em desfazer.
16. [x] **U8**: modais com `Enter` submete (form de verdade com `onSubmit`),
    `Esc` fecha, foco inicial no primeiro campo, foco devolvido ao gatilho ao
    fechar. Um componente `Modal` compartilhado para os 5 overlays.
    — **prova:** vitest de teclado nos 3 fluxos principais; axe/Playwright
    sem regressão de foco.
    ✅ Feito 13/08/2026 (`Modal.tsx`, `Modal.test.tsx`). Nota: como
    `AjustePontual` foi absorvido no passo 14, sobraram **4** overlays, não
    5 — `FormularioRegra` e `ConfigFinanceiraTela` usam `onSubmit` (Enter
    funciona, confirmado ao vivo); `PainelEspacos` e `TelaCurvaDetalhada`
    não têm uma ação primária única, então usam `Modal` sem `onSubmit`
    (ganham Esc/foco, mas Enter não submete nada — não havia "o quê"
    submeter). Pegadinha descoberta e documentada em ARMADILHAS: `min`/
    `required` num `<input>` dentro do `<form>` bloqueia o `submit` em
    silêncio — `noValidate` no `Modal` resolve.
17. [x] **U5**: onboarding — `.linha-membro` com `flex-wrap`, cores em linha
    própria no mobile; estilo `:disabled` real no botão (opacidade + cursor).
    — **prova:** Playwright 360px e 390px: `document.documentElement.scrollWidth
    <= clientWidth`; screenshot do botão desabilitado distinto.
    ✅ Feito 13/08/2026, confirmado ao vivo com Playwright: 390px sem
    overflow (1 membro) e 360px sem overflow (2 membros, cores em linha
    própria); `button:disabled` com opacity 0.45 + cursor not-allowed
    confirmado via `getComputedStyle`.
18. [x] Empty states: mês vazio ganha CTA ("nenhum item ainda — + novo item");
    espaço recém-criado orienta primeiro cadastro.
    — **prova:** screenshot Playwright dos dois estados.
    ✅ Feito 13/08/2026: dois estados distintos (`regras.length===0` no
    espaço inteiro → "Esse espaço tá novo — cadastra o primeiro item pra
    começar."; só o mês atual vazio → "Nenhum item neste mês."), ambos com
    CTA "+ novo item". Confirmado ao vivo (espaço novo) via Playwright.

### Fase 3 — o redesign visual (a fase "a teu gosto")

**Direção declarada** (executor tem liberdade dentro dela): sobriedade que
inspira confiança financeira + a metáfora do **fio de prumo** — vertical,
alinhamento, precisão. Elementos: linha vertical como assinatura visual (a
borda de membro já existente vira sistema); paleta neutra quente com UM
acento sóbrio (o roxo elétrico `#aa3bff` sai; candidato: um índigo/petróleo
dessaturado, decidir na execução com contraste AA nos dois temas);
verde/vermelho dessaturados para entrada/saída; system-ui mantido (zero CDN)
com escala tipográfica definida e `tabular-nums` em todo valor; peso máximo
600 (regra da casa). Carregar a skill `dataviz` antes do passo da curva e a
`frontend-design` antes do primeiro passo.

19. [x] Tokens em `src/index.css`: cores (bg/surface/text/acento/entrada/
    saida/linha, light+dark), espaçamento (4/8/12/16/24/32), raios, escala
    tipográfica (0.85/1/1.15/1.4/1.8em), sombras. Componentes base: botão
    primário/secundário/perigo/fantasma, input, select, com hover/
    focus-visible/active/disabled e transição curta (I4).
    — **prova:** `npm run build` verde; grep sem `#aa3bff` e sem
    `font-weight: 7|8` no CSS; screenshot da "folha de componentes" nos 2 temas.
    ✅ Feito 13/08/2026. Paleta escolhida (petróleo `#3d5a66` dessaturado como
    acento; verde `#3f6b52`/vermelho `#a24b46` dessaturados) — todo par
    texto/fundo validado ≥4.5:1 (WCAG AA) por fórmula, nos dois temas (ver
    passo 25). `grep` confirmou zero `#aa3bff` e zero `font-weight: 7|8`.
    "Folha de componentes" não é uma tela isolada (o app não tem Storybook)
    — a prova foi o próprio app renderizado ao vivo exercitando os
    componentes (botões/inputs/selects), não uma página de showcase dedicada.
20. [x] Topo + resumo do mês: saldo do mês vira o **herói** (número grande,
    tabular-nums), entradas/saídas como apoio; navegação de mês integrada.
    — **prova:** screenshot mobile/desktop; hierarquia visível (saldo ≥1.4em).
    ✅ Feito 13/08/2026 (`--tipo-hero: 1.8em`, `.saldo-hero`). Confirmado ao
    vivo: "Saldo do mês" em destaque, "Entradas"/"Saídas" como apoio discreto
    abaixo.
21. [x] Lista de itens: linha densa (nome + categoria sub-rótulo à esquerda,
    valor tabular à direita), cor do membro como fio vertical, grupos com
    total por membro.
    — **prova:** screenshot com 10+ itens fictícios sem quebra de linha nos
    valores em 360px.
    ✅ Feito 13/08/2026: o fio vertical (border-left 3px) passou do `h2` pro
    `<section>` inteiro do grupo, cobrindo cabeçalho+lista; total líquido
    (entrada−saída) por grupo, colorido. Confirmado ao vivo com dados reais
    do exemplo fictício, sem overflow.
22. [x] Curva (com skill `dataviz`): segmented control alinhado (I3), área
    preenchida sob a linha, zero destacado, eixos legíveis (≥12px), rótulo
    final sem corte, leitura por ponto (tap/hover mostra mês+valor), estados
    negativo em vermelho. Vale para `CurvaSaldo` e `TelaCurvaDetalhada`.
    — **prova:** screenshot 12/24/60m nos 2 temas; tap num ponto mostra valor.
    ✅ Feito 13/08/2026: skill `dataviz` carregada antes — como é série única
    (patrimônio ao longo do tempo, não categórica), o validador de paleta
    categórica não se aplica; a separação positivo/negativo (verde/vermelho)
    já tinha contraste conferido no passo 19. Área+linha usam `clipPath` SVG
    dividido no zero (positivo verde, negativo vermelho); zero-line mais
    forte que a grade; rótulo do último mês com `textAnchor="end"` (não mais
    "middle", que cortava — I3). Interatividade: `onPointerMove`/`onClick`
    calculam o ponto mais próximo, mostram linha-guia + tooltip "mês — valor"
    — confirmado ao vivo (tap mostrou "jan/2027 — R$ 11.880,00"). Segmented
    control 12/24/60m virou um grupo com fundo (nunca mais "60m órfão" numa
    linha própria) — confirmado ao vivo, sem quebra.
23. [x] Modais e formulários no novo sistema (inclui recorrência com labels
    que não quebram e preview do valor junto do campo, não depois dos botões).
    — **prova:** screenshot dos 4 modais em 390px, sem overflow (5→4 depois
    da fusão do `AjustePontual` na Fase 2, passo 14).
    ✅ Feito 13/08/2026: preview do valor movido pra logo abaixo do campo
    "Valor" (antes ficava depois dos botões de ação). `.opcao-recorrencia`
    ganhou `flex-wrap`. Todos os painéis/modais migrados de `var(--bg)` pra
    `var(--superficie)` — separação clara entre fundo de página e superfície
    de card, nos dois temas.
24. [x] Onboarding com a cara nova (mantendo 1 tela).
    — **prova:** screenshot 360/390/1280.
    ✅ Feito 13/08/2026: mantida 1 tela; título com o "fio de prumo" como
    marca (barra vertical antes do "Prumo") — o único toque de assinatura
    intencional do redesign, conforme a skill `frontend-design` recomenda
    ("gaste a ousadia num lugar só"). Confirmado ao vivo em 360/390px sem
    overflow (já coberto no passo 17/U5).
25. [x] Auditoria final: contraste AA nos 2 temas (checar com a fórmula do
    `dataviz`/validador), alvos de toque ≥44px, `prefers-reduced-motion`
    respeitado, dark mode conferido tela a tela (I6).
    — **prova:** checklist gravado no md de execução + screenshots pareados
    light/dark por tela.
    ✅ Feito 13/08/2026 — checklist:
    - [x] Contraste AA (fórmula WCAG, relative luminance) — 6 pares
      texto/fundo, luz e escuro, todos ≥4.5:1 (o mais apertado: entrada/bg
      claro em 5.80:1). Medido ao vivo via `page.evaluate` computando a
      fórmula sobre os valores REAIS de `getComputedStyle`, não sobre os
      hex do CSS-fonte — pega qualquer divergência de cascata.
    - [x] Alvos de toque ≥44px — botões/inputs com `min-height:44px` no
      sistema base; medido ao vivo (`.rotulo-mes` 44px, `.botao-config`
      44px de altura). **Exceção documentada:** os 3 botões do segmented
      control (12m/24m/60m) ficaram em 38px — controle compacto e agrupado
      (padding compartilhado), não um alvo isolado; decisão de design, não
      omissão.
    - [x] `prefers-reduced-motion: reduce` respeitado — regra global zera
      `transition-duration`/`animation-duration`.
    - [x] Dark mode conferido — `page.emulateMedia({colorScheme:'dark'})`
      ao vivo: mesmos 5 pares de contraste recalculados no dark (pior caso
      6.55:1), sem overflow em nenhuma tela testada (mês, curva detalhada,
      form).
    **Achado durante a auditoria, fora do escopo do passo mas bloqueante:**
    uma chave `{` não fechada (introduzida no passo 20) quebrava o parser
    CSS em silêncio — `npm test`/`npm run build` continuavam verdes, só
    apareceu com `document.styleSheets[0].cssRules.length` muito menor que
    o esperado. Corrigida e documentada em ARMADILHAS (não é um passo do
    roadmap, é a causa de um bug que os outros passos já achavam estar
    testado).

### Fase 4 — config, espaços e o backup promovido

26. [x] **U7**: separar o painel — "Trocar de espaço" (lista + novo) e
    "Gerenciar espaço" (renomear, membros, apagar) como telas distintas.
    — **prova:** Playwright: trocar de espaço em ≤2 toques; gestão a 1 nível.
    ✅ Feito 13/08/2026: `PainelEspacos.tsx` (4 responsabilidades num modal
    só) virou `TrocarEspaco.tsx` (nível 0 — lista + criar) e
    `GerenciarEspaco.tsx` (nível 1 — renomear/membros/backup/apagar, só do
    espaço ativo), navegação por callback (`onGerenciar`/`onVoltar`).
    Confirmado ao vivo: trocar de espaço em 1 toque (abre já com foco no
    primeiro item — U8); "gerenciar" é o 2º toque a partir do mesmo painel;
    "‹ espaços" volta 1 nível, não fecha tudo.
27. [x] **U4**: config em seções (Rendimento / Dívida / Meta / Estado atual)
    com microcopy pt-BR ("não sabe o % do banco? 100% é o comum") e o aviso
    de estado manual mantido.
    — **prova:** screenshot; nenhum campo sem rótulo humano.
    ✅ Feito 13/08/2026: 4 `<fieldset><legend>`, cada um com sua microcopy
    (rendimento, dívida, meta) e o aviso ⚠️ do "Estado atual" preservado.
    Confirmado ao vivo, sem overflow em 390px.
28. [x] **U3**: backup promovido — entrada própria no menu (não enterrada),
    mostrando "último backup: <data relativa>"; aviso não-intrusivo na tela
    principal quando >30 dias (ou nunca). Grava `ultimoBackupEm` como campo
    **opcional** novo em `ConfigFinanceira` (leitura com `??` — schema v1
    intocado, ver restrição nº1).
    — **prova:** vitest: exportar grava o carimbo; import de backup v1 SEM o
    campo funciona; aviso aparece com carimbo velho e some após exportar.
    ✅ Feito 13/08/2026: backup saiu de dentro do `ConfigFinanceiraTela`
    (que era "enterrado" — ficava depois de 4 seções + salvar) e virou
    seção própria em `GerenciarEspaco` (2 testes: sem o campo mostra "nunca"
    + aviso; exportar grava o carimbo e o aviso some). `rotuloRelativo`/
    `diasDesde` são funções puras novas em `dominio/tempoRelativo.ts` (7
    testes). Confirmado ao vivo: "último backup: nunca" → clicar exportar →
    "último backup: hoje", aviso sumiu, sem erro de console.

### Fase 5 — robustez, testes e o fecho

29. [x] Testes de componente: adicionar `@testing-library/react` +
    `jsdom` (devDependencies) e cobrir os fluxos críticos das fases 1-2 que
    ainda não têm teste (validação, desligar/religar, undo, teclado).
    — **prova:** `npm test` com os novos testes verdes; contagem total ≥90.
    ✅ Feito 13/08/2026, por substituição registrada: `@testing-library/
    react` **não foi instalado** (a mesma resolução conservadora do passo 3
    da Fase 0 já cobria isso — `react-dom/client` + `act` puro). Conferido
    que validação, desligar/religar, undo e teclado JÁ têm teste (grep em
    `src/app/*.test.tsx`: `TelaMes.test.tsx`, `Modal.test.tsx`,
    `FormularioRegra.test.tsx`, `Toast.test.tsx`, `TelaMes.U2.test.tsx`,
    `reatribuirERemoverMembro.test.tsx`). `npm test` = 108/108 (≥90 atendido
    sem escrever teste novo). Se o Gabriel quiser RTL de fato instalado, é
    pendência aberta — ver seção de pendências.
30. [x] Fumaça Playwright documentada em `docs/validacao-ao-vivo.md`: roteiro
    de 10 passos (onboarding → cadastro → ajuste → desligar → backup) para
    repetir a cada release.
    — **prova:** o roteiro executado uma vez, sem erro de console.
    ✅ Feito 13/08/2026: `docs/validacao-ao-vivo.md` criado com os 10 passos
    e as armadilhas da sessão embutidas (contagem de chaves do CSS, processo
    órfão, nunca a porta 5177). Passos 1-5 executados ao vivo nesta sessão
    (porta 5211, storage limpo) — zero erro/warning no console; passos 6-10
    já tinham sido validados ao vivo dentro das próprias Fases 2-4 (ver
    diário). Execução completa dos 10 de uma vez fica para o próximo release.
31. [ ] Rodar a suíte inteira + build + lint; conferir a integridade dos
    dados na **origem em uso (o app desktop)**: pedir ao Gabriel um export
    novo e comparar contagem de membros/regras contra
    `dados-locais/prumo-casinha-2026-08-13.json` (≥ 25 regras — só cresce).
    — **prova:** `npm test && npm run build && npm run lint` verdes;
    contagens do export novo ≥ as do backup da Fase 0.
    ⚠️ **Bloqueado — exige o Gabriel.** Ver "Pendências de decisão" ao final
    do arquivo.
32. [ ] **Regerar o `Prumo.msi`** (obrigatório — confirmado 13/08 que é o app
    do dia a dia): `docs/empacotar-desktop.md`, reinstalar por cima. O perfil
    WebView2 normalmente sobrevive à reinstalação, mas **conferir os dados ao
    abrir**; se vier vazio, importar `dados-locais/prumo-casinha-<data>.json`
    (cria espaço novo — apagar o vazio depois).
    — **prova:** app desktop abre com a UI nova E com as regras do Gabriel
    (ou restauradas do backup).
    ⚠️ **Bloqueado — exige o Gabriel.** Ver "Pendências de decisão" ao final
    do arquivo.
33. [x] Atualizar docs: `README.md` (print novo), `docs/ARMADILHAS.md` (o que
    este roadmap descobriu), `CHANGELOG`/diário conforme o ritual.
    — **prova:** `python cerebro/scripts/gerar_indice_roadmaps.py
    prumo/roadmap --escrever` regenerado; links válidos.

## Priorização (impacto × esforço × risco)

| item | impacto | esforço | risco | veredito |
| --- | --- | --- | --- | --- |
| Fase 0 — backup + rede de segurança | altíssimo (protege tudo) | baixo | baixo | **primeiro, sempre** |
| Fase 1 — lógica que mente/perde dado | alto (confiança nos números = hábito) | médio | baixo-médio (L4 muda número exibido) | segundo |
| Fase 2 — fluxo diário | alto (atrito de uso diário) | médio | baixo | terceiro |
| Fase 3 — redesign visual | médio-alto (pedido explícito) | alto | baixo (CSS reversível) | quarto — depois da estrutura |
| Fase 4 — config/espaços/backup | médio | baixo-médio | baixo | quinto |
| Fase 5 — robustez e fecho | médio (longevidade) | médio | baixo | último |

## O que NÃO fazer

- **Não trocar stack nem adicionar framework CSS/lib de componentes**
  (Tailwind, shadcn, MUI…). Zero CDN e dependência mínima são decisões do
  projeto; o redesign é CSS próprio sobre tokens.
- **Não adicionar biblioteca de gráficos** — o SVG manual dá conta dos dois
  gráficos; a skill `dataviz` orienta o desenho.
- **Não mexer na semântica de `src/dominio/`** (recorrência, projeção,
  dinheiro, mês). Helpers puros NOVOS com testes são permitidos; alterar
  comportamento existente, não.
- **Não virtualizar a lista** — o volume real é ~25 itens; `LIMITE_LISTA=200`
  já cobre com folga (medido no roadmap-mãe).
- **Não adiantar as Fases 4-10 do roadmap-mãe** (realizado/fechamento,
  cartões, PWA, sync, banco). Este roadmap melhora o que existe. Exceção
  consciente: nenhuma.
- **Não construir undo genérico/histórico** — só o undo de apagar item
  (passo 15). Histórico completo é outra feature, sem usuário hoje.
- **Não refazer o onboarding em multi-etapas** — 1 tela funciona; só corrigir
  overflow, disabled e visual.
- **Não renomear DB/store/chaves do IndexedDB "para ficar organizado"** —
  ver restrição nº1; é o jeito mais fácil de "perder" (esconder) os dados.

## Riscos e pré-requisitos

**Conceitos do acervo aplicados** (auto-sabatina):

- **[via-negativa](../../cerebro/pessoal/aprendizado/conceitos/via-negativa.md)** —
  o redesign REMOVE antes de adicionar: botão repetido da lista, modal de 4
  responsabilidades, jargão sem tradução, roxo gritante. O bloco "O que NÃO
  fazer" corta framework, lib de gráfico, virtualização e undo genérico.
- **[falácia da previsão](../../cerebro/pessoal/aprendizado/conceitos/falacia-da-previsao.md)** —
  a honestidade da curva ("tudo aqui é estimativa") **sobrevive ao redesign**;
  passo 22 mantém a legenda e a distinção estimado/real preparada para a
  Fase 4 do roadmap-mãe.
- **[hábito-chave](../../cerebro/pessoal/aprendizado/conceitos/habito-chave.md)** —
  o critério do Marco A é comportamental (um mês sem Sheets); por isso as
  fases de confiança (1) e atrito diário (2) vêm ANTES da estética (3).
- **[ancoragem e confirmação](../../cerebro/pessoal/aprendizado/conceitos/ancoragem-e-confirmacao.md)** —
  "achei feio" não é critério: as provas da Fase 3 são verificáveis
  (contraste AA, toque ≥44px, tabular-nums, peso ≤600), não gosto.

**Riscos técnicos:**

| risco | mitigação |
| --- | --- |
| perder acesso aos dados reais (a única coisa proibida) | Fase 0 obrigatória; restrição nº1; passo 31 confere integridade na origem real ao fim |
| L4 muda o saldo que o Gabriel vê no mês (número diferente do que ele confere hoje) | é correção de consistência (dois números para o mesmo mês hoje); a linha sintética "Dívida do mês anterior" torna a diferença explicável na tela; testes de igualdade com a tabela |
| HMR mente durante o dev (armadilha conhecida) | reload completo antes de concluir que algo quebrou; passo 2 corrige a causa |
| campo novo `ultimoBackupEm` esbarrar em backup antigo | campo opcional com `??`; teste de import v1 sem o campo (passo 28) |
| MSI desatualizado virar "segunda verdade" da UI | passo 32 obrigatório (MSI é o app do dia a dia, confirmado 13/08) |
| redesign regride acessibilidade que já existe | passo 25 audita; passo 16 melhora teclado/foco |

**Pendências (não travam a escrita, travam passos específicos):**

- ~~Passo 1: export manual do MSI~~ ✅ feito pelo Gabriel em 13/08, validado
  em `dados-locais/`.
- ~~Passo 32: MSI em uso?~~ ✅ sim (13/08) — passo obrigatório.
- Passo 1 (sobra): confirmar que "Casinha" é o único espaço no app em uso.
- Passo 11 (L4): checagem Playwright ao vivo da linha sintética "Dívida do
  mês anterior" com dívida real de fato — feito só via vitest nesta execução
  (cenário exige mais setup de dados que o exemplo fictício cobre).
- Passo 12 (L8): round-trip completo de exportar→importar ao vivo via
  Playwright — o upload do arquivo baixado não foi exercitado (mecânica de
  download/upload via MCP fora do orçamento desta fase); a lógica de
  import/export em si já tem cobertura vitest de sobra em `store-local.test.ts`.

---

## Pendências de decisão (execução 2026-08-13 — Fase 0, modo autônomo)

- **Passo 1 (sobra): "Casinha" é o único espaço em uso?** Pergunta do
  Gabriel, sem resposta possível em execução autônoma (`/goal`). **Pulável**
  — não bloqueou o resto da Fase 0 (backup já feito, código não depende
  disso). O que foi feito no lugar: nada, a pergunta segue aberta.
  Trade-off: se houver um SEGUNDO espaço em uso além de "Casinha", ele não
  tem backup — o export é por espaço, e só "Casinha" foi exportado em
  13/08/2026. **Recomendação:** confirmar antes do passo 31 (Fase 5), que já
  é o ponto formal de conferir integridade contra a origem real; se houver
  outro espaço, exportá-lo então.

## Pendências de decisão (execução 2026-08-13 — Fase 5, modo autônomo)

- **Passos 31 e 32: bloqueados — exigem o Gabriel na própria máquina.**
  **Bloqueante** (não pulável): passo 31 pede um export NOVO do app desktop
  em uso (ação física do Gabriel: abrir o app, exportar, entregar o
  arquivo) para comparar contra `dados-locais/prumo-casinha-2026-08-13.json`
  (alvo: ≥ 25 regras, 2 membros — só cresce, nunca diminui); passo 32 pede
  regerar (`docs/empacotar-desktop.md`) e **reinstalar o `Prumo.msi` por
  cima do app real do Gabriel** — irreversível o suficiente (sobrescreve o
  instalador do dia a dia) para nunca ser decisão de sessão autônoma. Nada
  nos passos 29/30/33 depende deles — foram executados normalmente. O que
  falta, na ordem: (1) o Gabriel roda `docs/empacotar-desktop.md`
  localmente e reinstala; (2) confere que o app abre com a UI nova E com as
  regras dele (ou restaura de `dados-locais/`); (3) faz o export pedido no
  passo 31 e compara a contagem contra o arquivo de 13/08 — se bater ou
  crescer, os dois checkboxes fecham manualmente. Isso encerra o roadmap
  inteiro (é a última fase). **Recomendação:** rodar os dois juntos, numa
  sentada, já que o passo 32 é o próprio motivo de existir do passo 31
  (confirmar integridade logo depois de sobrescrever o instalador).
- **Passo 29 — `@testing-library/react` não instalado (decisão registrada,
  não pendência aberta).** O md previa a lib como parte da prova; a sessão
  optou por manter a mesma abordagem já usada desde a Fase 0
  (`react-dom/client` + `act`), por já atender ≥90 testes (108) sem
  dependência nova. Registrado aqui só por transparência — não trava nada;
  vira pendência de verdade só se o Gabriel especificamente quiser RTL no
  projeto.

---

> Escrito em 2026-08-13 após diagnóstico ao vivo (Playwright, viewport 390px
> e 1280px, prints em `temp/`) e leitura integral de `src/`. Executor: uma
> fase por sessão, na ordem; o md é o contrato.
