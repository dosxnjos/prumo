# Armadilhas — Prumo

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
