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
