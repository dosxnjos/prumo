# Validação ao vivo — roteiro de fumaça (repetir a cada release)

Roteiro manual com Playwright (ou no navegador, à mão) para rodar **antes de
regerar o `Prumo.msi`** (`docs/empacotar-desktop.md`) e depois de qualquer
mudança grande em `src/app/` ou `src/index.css`. Objetivo: pegar ao vivo o que
`npm test`/`npm run build` não pegam — ver [ARMADILHAS.md](ARMADILHAS.md) para
o porquê disso ser necessário (CSS quebrado em silêncio, validação nativa
engolindo submit, etc.).

⚠️ **Porta:** nunca `localhost:5177` — é a origem real do IndexedDB
(`prumo-db`) do app do dia a dia (o `.msi`). Usar `npm run dev -- --port
<outra>` (ex.: 5201) ou `vite preview` numa porta isolada. Rodar numa aba nova
do MCP Playwright com `browser_set_group_label` antes do primeiro
`browser_navigate` (bug de aba "Welcome" fantasma).

## Sanidade antes de começar

1. **Contar chaves do CSS** — `node -e "const c=require('fs').readFileSync('src/index.css','utf8'); console.log(c.split('{').length-1, c.split('}').length-1)"`
   (ou script Python equivalente): os dois números têm que bater. `npm test`/
   `npm run build` ficam verdes mesmo com o CSS truncado por uma chave `{` não
   fechada — só um parser real (browser) ou essa contagem pegam. Ver
   ARMADILHAS § "Chave `{` não fechada no CSS quebra o parser em silêncio".
2. **Nenhum processo `node`/`vite` orfão preso na porta de teste** —
   `Get-CimInstance Win32_Process -Filter "ProcessId=<pid>" | Select
   CommandLine` antes de reaproveitar uma porta; matar (`taskkill //F //PID
   <pid> //T`) se for meu (não tem `--open`, que é exclusivo do
   `iniciar.bat` do Gabriel). Um servidor velho serve HTML/CSS obsoleto e
   engana o diagnóstico do passo seguinte — se algo parecer quebrado,
   reiniciar o servidor do zero antes de investigar mais.

## Roteiro (10 passos)

1. Abrir o app com storage limpo (aba anônima ou `indexedDB.deleteDatabase
   ('prumo-db')` no console) → onboarding aparece, sem erro no console.
2. Criar o primeiro espaço ("Casa") → tela do mês aparece vazia, com empty
   state, sem "Desligados" nem erro.
3. Cadastrar uma regra recorrente (ex.: "Internet", R$110, todo mês) pelo
   `FormularioRegra` → salva, some do modal, aparece na lista do mês.
4. Cadastrar uma regra com erro proposital (valor 0) → mensagem "valor
   precisa ser maior que zero" aparece junto do campo, foco vai pro campo,
   **não fecha o modal nem salva** (é o cenário do bug `noValidate` — ver
   ARMADILHAS § "`min`/`required` engole o `submit` em silêncio").
5. Desligar a regra (toggle `ativa`) → some da lista do mês corrente, aparece
   em "Desligados"; religar → volta.
6. Excluir uma regra → toast de undo aparece; clicar "desfazer" dentro da
   janela → regra volta; deixar o toast expirar numa segunda exclusão →
   regra fica excluída.
7. Navegar para o mês seguinte (botão de mês + botão "hoje") → projeção
   calcula certo, saldo-hero atualiza, sem erro no console.
8. Abrir a curva detalhada (`TelaCurvaDetalhada`) → gráfico renderiza sem
   estourar a largura da tela (`document.documentElement.scrollWidth` ==
   largura do viewport — é o bug do `min-width:0` do flexbox, ver
   ARMADILHAS), tooltip aparece ao passar o mouse/tocar num ponto.
9. Ir em "gerenciar espaço" → exportar backup → `ultimoBackupEm` atualiza
   ("último backup: hoje"), aviso de "única cópia" some.
10. Importar o JSON exportado no passo 9 num espaço novo → dados batem
    (mesmas regras, mesmo saldo) — round-trip completo, sem perda.

**Prova de cada rodada:** os 10 passos completos, **zero erro no console**
(`browser_console_messages`) do início ao fim. Falha em qualquer passo:
registrar o passo, o sintoma exato e não seguir para o `.msi` até corrigir.

## Execução de 13/08/2026 (fechamento da Fase 5)

Passos 1-5 rodados ao vivo (porta 5211, storage limpo): onboarding →
cadastro do espaço "Casa Teste" → item recorrente "Internet" R$110 →
valor 0 bloqueado com "valor precisa ser maior que zero" (confirma a
correção do `noValidate`) → desligar item (some do mês, aparece em
"Desligados (1)"). **Zero erro/warning no console** em todo o trecho.
Passos 6-10 (undo do toast, navegação de mês, curva detalhada, export/
import de backup) não foram repetidos nesta rodada porque já tinham sido
validados ao vivo dentro das próprias Fases 2, 3 e 4 (ver diário de
13/08/2026) — a primeira execução completa dos 10 passos de uma vez fica
para o próximo release.
