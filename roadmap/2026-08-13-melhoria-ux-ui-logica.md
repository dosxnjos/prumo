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

Os dados vivem no **IndexedDB da origem `http://localhost:5177`** (porta
fixa de propósito — `iniciar.bat`) e possivelmente também no app desktop
(`Prumo.msi`, perfil WebView2 isolado). Regras invioláveis em TODAS as fases:

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

1. [ ] **Backup dos dados reais.** Subir o dev na porta real (`npm run dev --
   --port 5177 --strictPort`), abrir `http://localhost:5177` no Chrome do
   Gabriel (Playwright MCP — é o perfil onde os dados estão), e para CADA
   espaço listado: ⚙︎ → exportar backup (JSON). Mover os arquivos para
   `prumo/dados-locais/` (gitignored — conferir com `git status --porcelain`
   antes de seguir). Se o Gabriel também usa o `Prumo.msi`, pedir a ele o
   export de lá (não é automatizável de fora).
   — **prova:** arquivos `prumo-*.json` em `dados-locais/`, cada um com
   `schemaVersion: 1` e `regras.length > 0`; `git status --porcelain` não os
   lista.
2. [ ] Separar `useEspaco` para `src/app/useEspaco.ts` (o `ContextoEspaco.tsx`
   fica só com `ProvedorEspaco`), atualizando os 10 imports. Corrige o Fast
   Refresh (M1) antes das sessões longas de dev que este roadmap exige.
   — **prova:** `npm run dev` + editar um componente → console sem
   `Could not Fast Refresh`; `npm test` e `npm run build` verdes.
3. [ ] `src/app/ErroApp.tsx`: ErrorBoundary no topo (`main.tsx`) com mensagem
   em pt-BR, botão "recarregar" e botão "baixar meus dados" que despeja o
   IndexedDB bruto (ler `prumo-db` direto com idb-keyval) num JSON — o dado
   sobrevive mesmo com a UI quebrada (M2, metade 1).
   — **prova:** teste de componente com filho que lança → boundary renderiza;
   clique em "baixar meus dados" gera blob não-vazio (mock do idb).
4. [ ] Tratar os `throw` de storage no `ProvedorEspaco` (M2, metade 2):
   espaço do índice sem registro → remove do índice exibido + console.error,
   nunca tela branca; `espacoAtivoId` órfão → cai para o primeiro espaço.
   — **prova:** teste com `fake-indexeddb`: índice apontando para espaço
   inexistente → `carregando:false`, app renderiza seletor, sem exceção.

### Fase 1 — a lógica que mente ou perde dado

5. [ ] **L1**: `ProgressoPeDeMeia` com 3 estados: meta não configurada
   (`metaPeDeMeiaCentavos()===0`) → "configura a meta do pé de meia" com botão
   que abre a config; meta > 0 e falta → texto atual; completo → 🎉 atual.
   — **prova:** vitest de componente cobrindo os 3 estados.
6. [ ] **L7**: validação do `FormularioRegra` antes de salvar: valor > 0 (com
   mensagem "valor precisa ser maior que zero"), `fim >= inicio` no período,
   `parcelas >= 1` e `aCadaMeses >= 1` inteiros (campo vazio/0 → erro, não
   silêncio). Erro aparece junto do campo, foco vai para ele.
   — **prova:** vitest: cada entrada inválida bloqueia o save e `salvarRegras`
   não é chamado; entrada válida salva.
7. [ ] **L2**: expor `ativa` — no form de edição, ação "desligar item"
   (religar quando inativo); na `TelaMes`, seção colapsada "Desligados (N)"
   ao fim da lista, itens com religar em 1 toque. Desligado não entra em
   total nenhum (o motor já garante).
   — **prova:** vitest: desligar remove dos totais e aparece na seção;
   religar restaura. Playwright ao vivo no fluxo completo.
8. [ ] **L3**: apagar item pede confirmação inline no próprio form ("apagar
   'Aluguel'? Isso remove o item de TODOS os meses — desligar mantém o
   histórico." com botões apagar/desligar/cancelar). Vira toast+undo na
   Fase 2, passo 15.
   — **prova:** vitest: primeiro clique não apaga; confirmação apaga.
9. [ ] **L5**: "+ novo espaço" (painel) pede também "seu nome neste espaço"
   e cria o membro **dono** junto. Nova função `criarEspacoComDono` na camada
   de app (store não muda — chama `criarEspaco` + `atualizarEspaco`).
   — **prova:** vitest: espaço criado pelo painel tem 1 membro `papel:'dono'`.
10. [ ] **L6**: remover membro com itens mostra "N itens são de <nome>. Passar
    para:" + select (outro membro / Compartilhado). A reatribuição atualiza
    `membroId` das regras e remove o membro na mesma sequência (ler fresco do
    storage — padrão anti-closure do ARMADILHAS).
    — **prova:** vitest: após remover, nenhuma regra aponta para o id removido.
11. [ ] **L4**: unificar o saldo. Para mês ≥ atual, a `TelaMes` consome a
    projeção (`useSerieProjetada` estendido até o mês navegado): mesmos
    números da tabela, ocorrência sintética "Atrasados do mês anterior"
    visível como linha (como a planilha fazia) e rodapé com
    reserva/pé de meia/dívida do mês. Para mês < atual, manter soma simples +
    nota "mês passado — sem encadeamento (ainda não há fechamento)".
    — **prova:** vitest comparando `TelaMes` e série para o mesmo mês com
    dívida no cenário: totais idênticos; Playwright confere a linha sintética.
12. [ ] **L8**: pós-import, mensagem orienta a substituição: "confere o espaço
    novo; se estiver tudo lá, apaga o antigo em Espaços → apagar". (Copy só —
    o comportamento de nunca sobrescrever está certo e fica.)
    — **prova:** revisão manual do texto no fluxo Playwright.

### Fase 2 — o fluxo diário (navegação e edição)

13. [ ] **U1**: rótulo do mês vira botão que abre o picker nativo
    (`inputRef.current.showPicker()`, try/catch com fallback de exibir o
    input) + botão "hoje" visível sempre que `mes !== mesAtual()`.
    — **prova:** Playwright: clicar no rótulo abre picker (ou input visível);
    "hoje" volta e some no mês corrente.
14. [ ] **U2**: linha do item inteira é o alvo de toque (abre edição); o
    "ajustar este mês" sai da lista e vira ação dentro do form de edição
    ("só em <mês>: mudar valor / pular"), que já sabe o mês de origem.
    Categoria vira sub-rótulo da linha (L9 ganha o primeiro consumidor).
    — **prova:** Playwright: lista sem botões repetidos; ajuste continua
    acessível em ≤2 toques; marca ✎ preservada.
15. [ ] **U6 + L3 v2**: sistema de toast mínimo (componente próprio, sem lib):
    "item salvo", "ajuste de <mês> salvo", e apagar vira imediato com
    **desfazer** (5s) — o toast guarda a regra e reinsere; a confirmação do
    passo 8 sai.
    — **prova:** vitest: apagar → desfazer restaura idêntico (mesmo id);
    timeout consuma a remoção.
16. [ ] **U8**: modais com `Enter` submete (form de verdade com `onSubmit`),
    `Esc` fecha, foco inicial no primeiro campo, foco devolvido ao gatilho ao
    fechar. Um componente `Modal` compartilhado para os 5 overlays.
    — **prova:** vitest de teclado nos 3 fluxos principais; axe/Playwright
    sem regressão de foco.
17. [ ] **U5**: onboarding — `.linha-membro` com `flex-wrap`, cores em linha
    própria no mobile; estilo `:disabled` real no botão (opacidade + cursor).
    — **prova:** Playwright 360px e 390px: `document.documentElement.scrollWidth
    <= clientWidth`; screenshot do botão desabilitado distinto.
18. [ ] Empty states: mês vazio ganha CTA ("nenhum item ainda — + novo item");
    espaço recém-criado orienta primeiro cadastro.
    — **prova:** screenshot Playwright dos dois estados.

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

19. [ ] Tokens em `src/index.css`: cores (bg/surface/text/acento/entrada/
    saida/linha, light+dark), espaçamento (4/8/12/16/24/32), raios, escala
    tipográfica (0.85/1/1.15/1.4/1.8em), sombras. Componentes base: botão
    primário/secundário/perigo/fantasma, input, select, com hover/
    focus-visible/active/disabled e transição curta (I4).
    — **prova:** `npm run build` verde; grep sem `#aa3bff` e sem
    `font-weight: 7|8` no CSS; screenshot da "folha de componentes" nos 2 temas.
20. [ ] Topo + resumo do mês: saldo do mês vira o **herói** (número grande,
    tabular-nums), entradas/saídas como apoio; navegação de mês integrada.
    — **prova:** screenshot mobile/desktop; hierarquia visível (saldo ≥1.4em).
21. [ ] Lista de itens: linha densa (nome + categoria sub-rótulo à esquerda,
    valor tabular à direita), cor do membro como fio vertical, grupos com
    total por membro.
    — **prova:** screenshot com 10+ itens fictícios sem quebra de linha nos
    valores em 360px.
22. [ ] Curva (com skill `dataviz`): segmented control alinhado (I3), área
    preenchida sob a linha, zero destacado, eixos legíveis (≥12px), rótulo
    final sem corte, leitura por ponto (tap/hover mostra mês+valor), estados
    negativo em vermelho. Vale para `CurvaSaldo` e `TelaCurvaDetalhada`.
    — **prova:** screenshot 12/24/60m nos 2 temas; tap num ponto mostra valor.
23. [ ] Modais e formulários no novo sistema (inclui recorrência com labels
    que não quebram e preview do valor junto do campo, não depois dos botões).
    — **prova:** screenshot dos 5 modais em 390px, sem overflow.
24. [ ] Onboarding com a cara nova (mantendo 1 tela).
    — **prova:** screenshot 360/390/1280.
25. [ ] Auditoria final: contraste AA nos 2 temas (checar com a fórmula do
    `dataviz`/validador), alvos de toque ≥44px, `prefers-reduced-motion`
    respeitado, dark mode conferido tela a tela (I6).
    — **prova:** checklist gravado no md de execução + screenshots pareados
    light/dark por tela.

### Fase 4 — config, espaços e o backup promovido

26. [ ] **U7**: separar o painel — "Trocar de espaço" (lista + novo) e
    "Gerenciar espaço" (renomear, membros, apagar) como telas distintas.
    — **prova:** Playwright: trocar de espaço em ≤2 toques; gestão a 1 nível.
27. [ ] **U4**: config em seções (Rendimento / Dívida / Meta / Estado atual)
    com microcopy pt-BR ("não sabe o % do banco? 100% é o comum") e o aviso
    de estado manual mantido.
    — **prova:** screenshot; nenhum campo sem rótulo humano.
28. [ ] **U3**: backup promovido — entrada própria no menu (não enterrada),
    mostrando "último backup: <data relativa>"; aviso não-intrusivo na tela
    principal quando >30 dias (ou nunca). Grava `ultimoBackupEm` como campo
    **opcional** novo em `ConfigFinanceira` (leitura com `??` — schema v1
    intocado, ver restrição nº1).
    — **prova:** vitest: exportar grava o carimbo; import de backup v1 SEM o
    campo funciona; aviso aparece com carimbo velho e some após exportar.

### Fase 5 — robustez, testes e o fecho

29. [ ] Testes de componente: adicionar `@testing-library/react` +
    `jsdom` (devDependencies) e cobrir os fluxos críticos das fases 1-2 que
    ainda não têm teste (validação, desligar/religar, undo, teclado).
    — **prova:** `npm test` com os novos testes verdes; contagem total ≥90.
30. [ ] Fumaça Playwright documentada em `docs/validacao-ao-vivo.md`: roteiro
    de 10 passos (onboarding → cadastro → ajuste → desligar → backup) para
    repetir a cada release.
    — **prova:** o roteiro executado uma vez, sem erro de console.
31. [ ] Rodar a suíte inteira + build + lint; conferir na origem real
    (`localhost:5177`) que os dados do Gabriel continuam íntegros (mesma
    contagem de espaços/regras do backup da Fase 0).
    — **prova:** `npm test && npm run build && npm run lint` verdes;
    contagem conferida via Playwright na origem real.
32. [ ] **Se o Gabriel usa o `Prumo.msi` no dia a dia**: regerar o instalador
    (`docs/empacotar-desktop.md`) com a UI nova e reinstalar — senão o
    desktop fica preso na versão velha. Lembrar: perfil isolado → migração é
    export/import.
    — **prova:** MSI regenerado abre com a UI nova e importa o backup.
33. [ ] Atualizar docs: `README.md` (print novo), `docs/ARMADILHAS.md` (o que
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
| L4 muda o saldo que o Gabriel vê no mês (número diferente do que ele confere hoje) | é correção de consistência (dois números para o mesmo mês hoje); a linha sintética "Atrasados" torna a diferença explicável na tela; testes de igualdade com a tabela |
| HMR mente durante o dev (armadilha conhecida) | reload completo antes de concluir que algo quebrou; passo 2 corrige a causa |
| campo novo `ultimoBackupEm` esbarrar em backup antigo | campo opcional com `??`; teste de import v1 sem o campo (passo 28) |
| MSI desatualizado virar "segunda verdade" da UI | passo 32 condicional; perguntar ao Gabriel se o MSI está em uso |
| redesign regride acessibilidade que já existe | passo 25 audita; passo 16 melhora teclado/foco |

**Pendências (não travam a escrita, travam passos específicos):**

- Passo 1: se houver dados no `Prumo.msi`, o export de lá é manual (Gabriel).
- Passo 32: depende de saber se o MSI está em uso diário.

---

> Escrito em 2026-08-13 após diagnóstico ao vivo (Playwright, viewport 390px
> e 1280px, prints em `temp/`) e leitura integral de `src/`. Executor: uma
> fase por sessão, na ordem; o md é o contrato.
