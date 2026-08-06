# Prumo

Finanças da casa, no prumo. App de finanças pessoais local-first: substitui
a planilha de fluxo de caixa por um motor de recorrência em data absoluta
(nada de "daqui a 7 meses" — é "volta a pagar em mar/2027").

⚠️ **Nada dos seus dados sai do navegador.** Não há servidor, não há conta,
não há nuvem. Tudo fica no IndexedDB local. Isso significa que **você é o
único backup** — use o botão de exportar (Configurações ⚙︎) com frequência.

> Este README cobre o setup técnico. Um guia para quem não mexe com código
> ainda não existe (é um passo futuro do roadmap).

## Rodando localmente

Pré-requisito: **Node `^20.19.0` ou `>=22.12.0`**.

```bash
git clone <url-do-repo>
cd prumo
npm install
npm run dev
```

Abre em `http://localhost:5173` (ou a próxima porta livre). Testado e
funcionando em Windows e macOS (Apple Silicon incluso — as dependências
nativas, Vite/rolldown e oxlint, têm binário para `darwin-arm64`).

## Scripts

| comando | o que faz |
| --- | --- |
| `npm run dev` | sobe o servidor de desenvolvimento |
| `npm run build` | build de produção em `dist/` (typecheck + bundle) |
| `npm test` | roda a suíte de testes (vitest) |
| `npm run lint` | lint (oxlint) |
| `npm run preview` | serve o `dist/` já buildado, para conferir antes de publicar |

## Estrutura

- `src/dominio/` — motor puro (tipos, recorrência, projeção, dinheiro). Sem
  React, sem IO. É o coração testado do app.
- `src/dados/` — persistência (interface `Store` + implementação sobre
  IndexedDB). Única fronteira que um módulo online trocaria no futuro.
- `src/app/` — telas e componentes React.
- `docs/` — como funciona, armadilhas conhecidas, como empacotar como app
  desktop.
- `roadmap/` — o roadmap completo do projeto, com o que já foi feito e o
  que falta.

## App desktop (opcional)

Dá para empacotar como app instalável (Windows/macOS/Linux via Tauri) — ver
[`docs/empacotar-desktop.md`](docs/empacotar-desktop.md). O app desktop usa
um perfil de navegador isolado: não compartilha dados com o navegador
comum, então a migração é via exportar/importar JSON.

## Estado do projeto

Marco A ("chega de planilha") está completo — ver
[`roadmap/2026-08-05-melhoria-app-prumo.md`](roadmap/2026-08-05-melhoria-app-prumo.md)
para o roadmap inteiro, decisões de arquitetura e o que ainda falta.
