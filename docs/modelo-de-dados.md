# Modelo de dados — Prumo

## Tipos (`src/dominio/tipos.ts`)

### `Mes`

`AAAA-MM` como string — ordenável por comparação lexicográfica direta, sem
precisar de parsing. Toda aritmética de mês vive em `src/dominio/mes.ts`.

### `Espaco`

Container de **tudo**, inclusive offline. Nada existe fora de um espaço.

| campo | tipo | descrição |
| --- | --- | --- |
| `id` | `string` | uuid v4 |
| `nome` | `string` | ex. "Casa" |
| `icone` | `string?` | opcional, decorativo |
| `membros` | `Membro[]` | quem pertence a este espaço |
| `criadoEm` / `atualizadoEm` | `string` (ISO) | rastreio de sync futuro |

### `Membro`

Existe **sempre**, inclusive offline — sem autenticação no modo local. É o
dono de um item (quem gastou, quem recebeu) e carrega um papel.

| campo | tipo | descrição |
| --- | --- | --- |
| `id` | `string` | uuid v4 |
| `nome` | `string` | vem do onboarding, nunca hardcoded |
| `cor` | `string` | identidade visual do membro na UI |
| `papel` | `Papel` | `'dono' \| 'membro'` |
| `email` | `string?` | preenchido só com o módulo online ligado (liga identidade a membro) |

### `Recorrencia`

União discriminada por `tipo`, tradução direta da coluna *Operação* da
planilha (tabela completa abaixo):

| tipo | campos | significado |
| --- | --- | --- |
| `unica` | `mes` | ocorre só naquele mês |
| `mensal` | `inicio`, `fim \| null` | ocorre todo mês no intervalo; `fim: null` = sem término |
| `periodica` | `inicio`, `fim \| null`, `aCadaMeses` | ocorre a cada N meses a partir de `inicio` |
| `parcelada` | `inicio`, `parcelas` | N parcelas, uma por mês a partir de `inicio` |

### `Regra`

O item recorrente (entrada ou saída), substituindo a linha da planilha.

| campo | tipo | descrição |
| --- | --- | --- |
| `id` | `string` | uuid v4 |
| `espacoId` | `string` | **toda** entidade de dado carrega este campo — é o que isola espaços |
| `nome` | `string` | ex. "Aluguel" |
| `fluxo` | `Fluxo` | `'entrada' \| 'saida'` |
| `membroId` | `string \| 'compartilhado'` | substitui o dono fixo/hardcoded da planilha |
| `categoria` | `string` | livre, definida pelo usuário |
| `valorCentavos` | `number` | inteiro — nunca float |
| `recorrencia` | `Recorrencia` | ver acima |
| `pagamento` | `{tipo:'conta'} \| {tipo:'cartao', cartaoId}` | cartão chega na Fase 5 |
| `diaDoMes` | `number?` | dia de vencimento, informativo |
| `ativa` | `boolean` | equivalente ao `off` da planilha |
| `excecoes` | `Record<Mes, {valorCentavos?, pular?}>` | ajuste pontual sem duplicar a regra nem quebrá-la — "em dezembro esse valor é outro" |
| `criadoEm` / `atualizadoEm` | `string` (ISO) | rastreio de sync futuro |

## Tabela de tradução — operação antiga → recorrência nova

A planilha resolvia a coluna *Operação* **relativa ao mês corrente**; o app
resolve em **data absoluta**. Tradução usada ao recadastrar os itens
(mês corrente = mês em que o Gabriel migrar cada item):

| operação antiga | recorrência nova | equivalência testada em |
| --- | --- | --- |
| vazio | `mensal`, início = mês corrente, `fim: null` | `recorrencia.test.ts` — *"vazio: mensal sem fim, a partir do mês corrente"* |
| `x` | `mensal`, início = mês corrente + 1, `fim: null` | `recorrencia.test.ts` — *"x: mensal sem fim, a partir do mês seguinte"* |
| `0` | `unica` no mês corrente | `recorrencia.test.ts` — *"0: única no mês corrente"* |
| `off` | `ativa: false` | `recorrencia.test.ts` — *"off: ativa false nunca ocorre"* |
| `n` | `mensal`, de mês corrente até mês + n | `recorrencia.test.ts` — *"n: mensal do corrente até corrente+n"* |
| `nx` | `mensal`, de mês corrente + 1 até mês + n | `recorrencia.test.ts` — *"nx: mensal do corrente+1 até corrente+n"* |
| `nm` | `mensal`, de mês + n até mês + m | `recorrencia.test.ts` — *"nm: mensal de corrente+n até corrente+m"* |
| `n0` | `mensal`, de mês + n, `fim: null` | `recorrencia.test.ts` — *"n0: mensal de corrente+n sem fim"* |

## Performance de `projetarSerie`

Medido em 05/08/2026, máquina do Gabriel (Windows 11, Node v24.15.0):
**projetar 600 meses (50 anos) leva ~3ms** (teto do gate: 100ms) — vitest
`src/dominio/projecao.test.ts`, teste *"projeta 600 meses (50 anos) em menos
de 100ms"*.
