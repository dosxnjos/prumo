# Roadmap — Prumo: app de finanças que substitui a planilha (2026-08-05)

> **Alvo:** `C:\Users\Gabriel dos Anjos\Downloads\finanças.xlsx` (26 abas, Google
> Sheets exportado) → aplicação própria em `C:\Dev\prumo`.
> **Executor:** sessão nova, com este md como contrato.
> **Usuários:** Gabriel e Sofia primeiro; depois, irmão e amigos rodando **cada
> um a sua própria instância**.

**Prumo** — *finanças da casa, no prumo*. Nome escolhido em 05/08/2026: curto,
sem acento (repositório e domínio ficam limpos), e "estar no prumo" já significa
estar alinhado e em ordem.

## Contexto e motivação

A planilha funciona, mas o motor de previsão dela é **relativo ao mês corrente**.
Cada item tem uma coluna *Operação* com códigos (`x`, `off`, `0`, `n`, `nx`,
`nm`, `n0`) que só fazem sentido contados a partir de "hoje". Consequência: todo
mês que vira, a previsão inteira precisa ser reescrita na mão para continuar
verdadeira.

O pedido central é esse: **poder dizer "volta a pagar em mar/2027"** em vez de
"daqui a 7 meses". Junto vêm quatro coisas que a planilha não entrega:

- ser usável fora do PC (celular, os dois);
- registrar o que de fato aconteceu, não só o previsto;
- no futuro, ler extrato de banco para saber para onde o dinheiro foi;
- **poder ser dado a outra pessoa** — irmão, amigos — para ela gerir a própria
  vida, sem que isso vire custódia de dado alheio nem suporte técnico.

O horizonte de 12 meses (`P1`…`P12`) é limitação de planilha, não desejo: a meta
declarada é **navegar para qualquer mês, passado ou futuro, sem teto**.

### O que ler antes de começar

| ler | por quê |
| --- | --- |
| `C:\Dev\CLAUDE.md` | regras transversais: peso de fonte ≤600, commit direto na main, onde gravar conhecimento |
| `C:\Users\Gabriel dos Anjos\.claude\CLAUDE.md` | ritual de trabalho, entregável visual em HTML standalone, nunca Artifact |
| `C:\Dev\unclick\` (`package.json`, `src/`) | precedente mais próximo: webapp que substituiu planilha, Vite+React+TS+vitest, engine pura testada |
| este md, inteiro | a semântica da planilha antiga está destrinchada abaixo; ela não está documentada em nenhum outro lugar |

⚠️ **Nenhum valor financeiro real entra neste repositório** — nem em fixture, nem
em teste, nem em md. Salário, saldo, dívida e limite de cartão são digitados pelo
Gabriel direto no app, em armazenamento local ignorado pelo git. Testes usam
números fictícios. Isso vale em dobro aqui: **o repositório vai ser público**.

---

## Alvo e estado atual — como a planilha funciona hoje

**26 abas**, 6 delas ocultas e mortas. As que importam:

| aba | papel |
| --- | --- |
| `💸` | mês corrente. Itens em blocos de 3 colunas (Nome / Valor / Operação), agrupados por dono: um bloco por pessoa e um bloco "Casa" (luz, água, internet, mercado) |
| `P1`…`P12` | 12 cópias-espelho da `💸`. Cada célula é `=💸!<mesma célula>`; o que muda é a coluna Ignorar, resolvida contra `N18` (o número da previsão, 1 a 12) |
| `💰` | configuração: CDI, % do CDI do banco escolhido, taxa do rotativo, meta do pé de meia (= 6 × custo mensal de sobrevivência). Também guarda uma calculadora de antecipação de fatura (99Pay/RecargaPay) |
| `💳` | série das 12 previsões (saldo por mês, variação), limites de cartão e um simulador de férias/abono pecuniário |
| `XML`, `index` | staging de `IMPORTXML` (CDI e dólar). **Morto** fora do Google Sheets |
| `ℹ` (oculta) | tabela de fechamento/vencimento dos cartões e regras escritas à mão |
| `🌐`, `Cronograma *`, `Biel - *` (ocultas) | abandonadas |

### O motor de recorrência (a parte que precisa sobreviver)

Cada linha `P<n>` resolve a operação assim (traduzido da fórmula real):

| operação | significado | limitação |
| --- | --- | --- |
| vazio | roda no mês atual e em todas as previsões | — |
| `x` | não roda no mês atual, roda nas previsões | — |
| `0` | roda só no mês atual | — |
| `off` | desligado em tudo | — |
| `n` (1 dígito) | roda até a previsão n; mês atual ainda não pago/recebido | n ≤ 9 |
| `nx` | roda até a previsão n; mês atual já pago/recebido | n ≤ 9 |
| `nm` (2 dígitos) | começa na previsão n, termina na m | n, m ≤ 9 |
| `n0` | começa na previsão n, sem previsão de término | n ≤ 9 |

Três defeitos estruturais, todos resolvidos pelo modelo novo:

1. **tudo é relativo a hoje** — vira o mês, tudo mente;
2. **`LEFT`/`RIGHT` de 1 dígito** — impossível endereçar o 10º, 11º ou 12º mês,
   num horizonte que tem 12;
3. **12 abas duplicadas** — mudar a estrutura exige repetir em 13 lugares.

### O encadeamento entre meses

- `saldo do mês = entradas − saídas`;
- saldo positivo alimenta o **pé de meia**, limitado à meta; o excedente vira
  "guardado a render". Ambos rendem a taxa mensal líquida (CDI × % do banco,
  descontado IR de 22,5%);
- saldo negativo vira uma saída **"Atrasados"** no mês seguinte, corrigida pela
  taxa do rotativo/antecipação;
- a meta do pé de meia é `6 × custo mensal de sobrevivência`, e o custo é
  derivado da soma dos gastos essenciais, arredondada para cima de 500 em 500.

### O que está bom e deve ser preservado

- **A tese central**: previsão encadeada mês a mês, onde a sobra rende e a falta
  cobra juros. É o que dá valor à planilha e não existe em app genérico de
  finanças.
- **Dono por item** (pessoa A / pessoa B / compartilhado) e o cálculo derivado
  "custo da casa" vs. "disponível por mês".
- **Meta de reserva ancorada em meses de sobrevivência**, não em número redondo.
- **A regra escrita na aba `ℹ`**: *"não vale a pena ficar no vermelho para manter
  o pé de meia"*. Hoje é só um lembrete — no app vira comportamento.

### O que está frágil ou custando

| sintoma / evidência | causa |
| --- | --- |
| previsão precisa ser reescrita todo mês | operação relativa (acima) |
| `#NAME?` em várias células das abas `P*` | `SWITCH`/`IMPORTXML`/`GOOGLEFINANCE` não existem fora do Sheets — o arquivo já está meio quebrado |
| cotação de CDI e dólar congelada | `IMPORTXML` morto; os valores exibidos são o último cache do Sheets |
| cartão de crédito não funciona | a coluna de cartões na `💳` referencia células vazias (`F26`/`F30`); as próprias notas na planilha dizem *"adicionar cartões de crédito adequadamente"* e *"corrigir essa previsão"* |
| dois cálculos de juros divergentes | uma célula cobra `dívida × (1 + juros)` e outra soma só `dívida × juros`. Um dos dois está errado; o app precisa de uma regra só |
| resíduo de ponto flutuante visível | há células com `0,15000000000009` — dinheiro em float. No app, **centavos inteiros** |
| títulos dessincronizados entre abas | os rótulos de dono na `💸` e na `P1` divergem (uma diz um nome, a outra diz o outro) porque títulos não são espelhados; ninguém percebeu |
| nenhum registro do realizado | a planilha só tem previsão; não dá para responder "para onde foi o dinheiro" |
| impossível dar para outra pessoa | tudo é nominal e hardcoded: nomes, contas, taxas, apelidos |
| 6 abas mortas carregando junto | `🌐`, `index`, `XML`, `Cronograma Gabi/Biel`, `Biel - Estudos/Trabalho` |

---

## Decisões tomadas (não reabrir)

Respondidas pelo Gabriel em 05/08/2026, antes de escrever este roadmap:

| decisão | escolha |
| --- | --- |
| nome | **Prumo** — *finanças da casa, no prumo* |
| container de dados | **Espaço** (`Espaco`, `espacoId`) — escolhido por não colidir com conta, carteira, caixa, orçamento ou categoria, que já significam outra coisa dentro do app |
| papéis | **dono** e **membro**, só isso |
| caixa | **único** no início (tudo num saldo comum, com dono por item), mas **switchável** para "dois caixas + casa rateada" — o schema já nasce suportando os dois |
| escopo | **previsto + realizado** (livro de transações efetivas, comparação, base para o banco depois) |
| onde os dados vivem | **local primeiro**, online como módulo opcional |
| horizonte | **infinito** nos dois sentidos — navegar para qualquer mês, passado ou futuro |
| acesso quando hospedar | **Cloudflare Access** (e-mail OTP) na instância do Gabriel |
| cartão | **fatura de verdade** (fechamento, vencimento, parcelas caindo sozinhas, limite) |
| no MVP | pé de meia com rendimento; juros sobre saldo negativo; simulador de férias/abono/dissídio; cotação automática de CDI/dólar |
| tela | **celular primeiro**, desktop também |
| banco | **extrato OFX/CSV primeiro**, agregador (Pluggy/Belvo) avaliado depois |
| compartilhar | **cada um roda a sua instância**. O Gabriel não hospeda dado de amigo. O que se compartilha é o *projeto*, não o servidor |

### A arquitetura que sustenta "compartilhar sem virar suporte"

Três regras que valem para todas as fases. Violar qualquer uma quebra o
compartilhamento, mesmo que o app funcione:

1. **Local-first de verdade, não local-por-enquanto.** O app é um site estático
   que funciona 100% offline, sem servidor, sem cadastro. Qualquer pessoa abre a
   URL (ou o arquivo) e já usa. Backend é **enfeite opcional**, nunca requisito.
2. **Módulo online se liga em runtime, jamais por fork.** Sync, autenticação e
   integração bancária são configurados **dentro do app** (colar uma URL e uma
   chave em Configurações), gravados no armazenamento local. Um único build serve
   todo mundo. Se ligar o sync exigir recompilar, cada amigo vira uma versão
   diferente e o Gabriel vira suporte técnico de cinco pessoas.
3. **Nada nominal no código.** Zero nome de pessoa, banco, categoria ou valor
   hardcoded. Tudo vem do estado, criado no onboarding. O teste é literal: abrir
   o app com armazenamento limpo tem que dar um app vazio e utilizável, não um
   app com a vida do Gabriel dentro.

### Espaço, membro e identidade — o modelo que aguenta local e online sem migração

**Espaço** é o container de tudo: regras, lançamentos, cartões, fechamentos,
configuração financeira. Nada existe fora de um espaço, **inclusive offline**.
Uma pessoa pode ter vários ("Casa", "Meu pessoal") e alterna por um seletor no
topo. Nenhum dado cruza a fronteira: toda leitura filtra por `espacoId`.

**Membro** existe sempre, inclusive offline: é o dono de um item (quem gastou,
quem recebeu) e carrega um papel. É um rótulo com nome, cor e papel — **sem
autenticação nenhuma no modo local**.

**Identidade** só existe com o módulo online ligado: um e-mail autenticado que se
**liga** a um membro. É o que permite a Sofia editar autenticada, e o amigo
convidar o parceiro dele na instância dele.

Consequência prática: ligar o sync depois **adiciona** campo (`email` no membro),
não migra schema. E o modo local não paga nada pelo peso da autenticação.

**Papéis — dois, e as travas que os tornam seguros:**

| papel | pode |
| --- | --- |
| **dono** | tudo do membro, mais: convidar por e-mail, remover membro, promover outro a dono, renomear e apagar o espaço |
| **membro** | tudo com o dinheiro (criar, editar, apagar regras, lançamentos, cartões, fechar mês) |

- ⚠️ **Sempre pelo menos um dono.** O último dono não pode se remover, se
  rebaixar nem sair do espaço — senão o espaço vira órfão, sem ninguém para
  convidar ninguém. É invariante do domínio, testada, não regra de UI.
- Membro faz tudo com o dinheiro de propósito: é finança de casal, não
  hierarquia corporativa. Papel serve para **administrar o espaço**, não para
  controlar quem gasta o quê.
- No modo local (sem identidade) o papel fica gravado, mas não restringe nada —
  não há quem autenticar. Ele só passa a valer quando o módulo online liga.

### ⚠️ As duas camadas de porta (a pegadinha do Access)

Com o módulo online existem **dois portões diferentes**, e confundi-los é o erro
clássico:

| camada | quem controla | o que decide |
| --- | --- | --- |
| política do Cloudflare Access | painel da Cloudflare | quem consegue **entrar no site** |
| membros do espaço | dentro do app | quem vê **qual dado** |

Convidar alguém, no rigor, mexe nas duas. **Decisão para a v1:** a política do
Access com lista explícita de e-mails, editada no painel (são 2-3 pessoas); o
convite dentro do app cria um **convite pendente** que casa sozinho quando aquele
e-mail logar — sem SMTP, sem link de token, sem página de aceite.

⚠️ **O que NÃO fazer:** liberar qualquer e-mail autenticado no Access e confiar
só no filtro do app. Aí qualquer pessoa com um Gmail alcança a API, e a única
coisa entre ela e os dados é o teu `WHERE`. Automatizar a política pela API da
Cloudflare (o Worker adiciona o e-mail sozinho ao convidar) é melhoria válida —
depois, e com token de escopo restrito.

### Decisões técnicas do arquiteto

Justificadas, mas abertas a ajuste do executor se esbarrar em impedimento real:

- **Stack**: Vite + React 18 + TypeScript + vitest. Mesmo terreno do `unclick`,
  que já provou funcionar para "planilha → app". Sem framework de CSS.
- **Dinheiro em centavos inteiros** (`number` inteiro), formatação só na borda da
  UI. A planilha atual é prova viva do problema oposto.
- **Domínio puro**: `src/dominio/` não importa React nem toca em IO. É o que
  torna o motor testável e portável para o servidor no módulo online.
- **Todo registro nasce com `id` (uuid v4) e `atualizadoEm` (ISO)** desde a Fase
  0, mesmo sem servidor. Sem isso, o sync vira reescrita, não migração.
- **Zero CDN em runtime**; fontes e assets locais; nenhum peso de fonte acima de
  600 (regra da casa).

---

## Marcos de entrega — onde o app já vale a pena

As fases são a ordem de construção; os marcos são os pontos em que o Prumo passa
a servir para alguma coisa. **Nada antes da Fase 8 toca em servidor.**

### 🎯 Marco A — "chega de planilha" (100% local, sem integração nenhuma)

✅ **Todos os passos de código concluídos em 05/08/2026** (Fases 0–3 + passos
30/31, 73 testes vitest + validação ao vivo com Playwright em cada fase). O que
falta para o marco em si é o critério comportamental abaixo — depende do
Gabriel recadastrar os itens reais e usar o app por um mês, não de código.

O objetivo é ter **paridade com o que a planilha já faz**, e nada além. É a
entrega que muda o hábito: enquanto o Gabriel ainda abrir o Sheets, feature nova
não tem quem use.

**Passos que compõem o marco:** 1 a 21 (fases 0, 1, 2 e 3) **+ passos 30 e 31**
(tela de configuração financeira e progresso do pé de meia — a projeção não
replica a planilha sem as taxas configuráveis).

Ao fim do Marco A o app faz, offline e no celular:

- cadastrar entradas e saídas com recorrência em **data absoluta**;
- navegar para qualquer mês, passado ou futuro, sem teto;
- ajuste pontual de um mês sem quebrar a regra;
- encadeamento completo: pé de meia rendendo, dívida cobrando juros, saque da
  reserva antes de endividar;
- vários espaços e membros, com dono por item;
- curva de saldo projetado;
- export/import de JSON (o backup).

**Fica de fora de propósito:** realizado, cartões, simuladores, PWA, sync, banco.
Nada disso existe na planilha hoje — não são paridade, são melhoria.

**Pronto quando:** o Gabriel passa **um mês inteiro** sem abrir a planilha. Esse
é o critério, não "as telas ficaram bonitas".

### Marco B — além da planilha (ainda 100% local)

Fases 4 (realizado e fechamento), 5 (cartões de verdade) e o passo 33
(simuladores). É aqui que o app começa a responder "para onde foi o dinheiro" e
resolve o cartão, que na planilha nunca funcionou.

### Marco C — no bolso e doável

Fase 7 (PWA + publicação estática). A partir daqui o projeto pode ser dado ao
irmão e aos amigos, **sem backend nenhum**.

### Marco D — compartilhado de verdade

Fase 8 (sync, Access, convite, troca de e-mail) e Fase 9 (banco). Só faz sentido
depois que o app já provou valor sozinho.

---

## Roadmap

### Fase 0 — fundação do projeto

1. [x] Criar o esqueleto em `C:\Dev\prumo`: `npm create vite@latest . --
   --template react-ts`, remover o boilerplate de exemplo. `package.json` com
   `"name": "prumo"`.
   **Pronto quando:** `npm run dev` sobe uma página com o título "Prumo" e
   `npm run build` passa sem erro de tipo. ✅ Feito 05/08/2026 — dev/build
   verdes, boilerplate de exemplo removido.
2. [x] Estrutura de pastas (criar já, mesmo vazias):
   `src/dominio/` (tipos + motor puro), `src/dados/` (persistência),
   `src/ui/` (componentes), `src/app/` (telas), `docs/`, `roadmap/`.
   **Pronto quando:** existe um `docs/modelo-de-dados.md` (pode ser stub) e o
   `tsconfig` tem `strict: true`. ✅ Feito 05/08/2026 — `strict: true` adicionado
   ao `tsconfig.app.json` (não vinha por padrão no template).
3. [x] `.gitignore` com `node_modules/`, `dist/`, **`dados-locais/`**,
   **`*.local.json`**, **`fixtures/local/`**.
   **Pronto quando:** `git status --porcelain` numa pasta com dado local de teste
   não mostra o arquivo. ⚠️ Fazer **antes** de qualquer `git init` — o repo vai
   ser público e commit é para sempre. ✅ Feito 05/08/2026 — validado com arquivo
   de teste antes do `git init`.
4. [x] `src/dominio/dinheiro.ts` — centavos inteiros: `paraCentavos(str)`,
   `formatarBRL(centavos)`, `somar`, `ratear(total, partes)` (rateio que
   distribui o resto, sem perder centavo).
   **Pronto quando:** teste prova que `ratear(35000, 3)` devolve `[11667, 11667,
   11666]` e a soma bate exatamente com o total. ✅ Feito 05/08/2026 — 9 testes,
   todos verdes.
5. [x] `src/dominio/mes.ts` — aritmética de competência `AAAA-MM` como string
   ordenável: `mesAtual()`, `somarMeses(mes, n)`, `diffMeses(a, b)`,
   `intervalo(de, ate)`, `rotulo(mes)` (`"set/2026"`).
   **Pronto quando:** testes cobrem virada de ano nos dois sentidos e `n` negativo.
   ✅ Feito 05/08/2026 — 14 testes, todos verdes.

### Fase 1 — o motor de projeção (o coração)

Nada de UI aqui. Só domínio puro e testes.

6. [x] `src/dominio/tipos.ts` — o modelo de dados:

   ```ts
   type Mes = string            // 'AAAA-MM'
   type Fluxo = 'entrada' | 'saida'
   type Papel = 'dono' | 'membro'

   interface Espaco {           // container de TUDO, inclusive offline
     id: string; nome: string; icone?: string
     membros: Membro[]
     criadoEm: string; atualizadoEm: string
   }

   interface Membro {           // existe SEMPRE; sem autenticação no modo local
     id: string; nome: string; cor: string; papel: Papel
     email?: string             // preenchido só com o módulo online ligado
   }

   type Recorrencia =
     | { tipo: 'unica';     mes: Mes }
     | { tipo: 'mensal';    inicio: Mes; fim: Mes | null }
     | { tipo: 'periodica'; inicio: Mes; fim: Mes | null; aCadaMeses: number }
     | { tipo: 'parcelada'; inicio: Mes; parcelas: number }

   interface Regra {
     id: string; espacoId: string
     nome: string; fluxo: Fluxo
     membroId: string | 'compartilhado'
     categoria: string
     valorCentavos: number
     recorrencia: Recorrencia
     pagamento: { tipo: 'conta' } | { tipo: 'cartao'; cartaoId: string }
     diaDoMes?: number
     ativa: boolean
     excecoes: Record<Mes, { valorCentavos?: number; pular?: true }>
     criadoEm: string; atualizadoEm: string
   }
   ```

   `excecoes` é o que permite "em dezembro esse valor é outro" sem quebrar a
   regra nem duplicar o item. `membroId` substitui o dono fixo da planilha:
   nenhum nome no código. `espacoId` entra em **toda** entidade de dado (regra,
   lançamento, cartão, compra, fechamento, config).
   **Pronto quando:** `docs/modelo-de-dados.md` descreve cada campo e a tabela de
   tradução da operação antiga (abaixo) está lá. ✅ Feito 05/08/2026.

7. [x] `src/dominio/espaco.ts` — invariantes do espaço, puras e testadas:
   `podeRemover(espaco, membroId)`, `podeRebaixar(espaco, membroId)`,
   `removerMembro`, `alterarPapel`, `adicionarMembro`.
   ⚠️ **A trava do último dono mora aqui**, não na UI.
   **Pronto quando:** teste prova que remover ou rebaixar o único dono **lança
   erro**, e que com dois donos a operação passa. ✅ Feito 05/08/2026 — 6 testes.

8. [x] `src/dominio/recorrencia.ts` — `ocorreEm(regra, mes): boolean` e
   `valorEm(regra, mes): number`. Uma regra `parcelada` de N parcelas gera a
   parcela k no mês `inicio + (k−1)`, com o resto do arredondamento na última.
   **Pronto quando:** existe um teste por tipo de recorrência, incluindo:
   `fim` anterior ao `inicio` (não ocorre nunca), `periodica` com
   `aCadaMeses: 3`, exceção `pular`, exceção com valor diferente, e regra
   `ativa: false`. ✅ Feito 05/08/2026 — 12 testes, todas as bordas pedidas.

9. [x] **Tabela de tradução da planilha antiga** — gravar em
   `docs/modelo-de-dados.md`, porque é como o Gabriel vai recadastrar os itens:

   | operação antiga | recorrência nova |
   | --- | --- |
   | vazio | `mensal`, início = mês corrente, `fim: null` |
   | `x` | `mensal`, início = mês corrente + 1, `fim: null` |
   | `0` | `unica` no mês corrente |
   | `off` | `ativa: false` |
   | `n` | `mensal`, de mês corrente até mês + n |
   | `nx` | `mensal`, de mês corrente + 1 até mês + n |
   | `nm` | `mensal`, de mês + n até mês + m |
   | `n0` | `mensal`, de mês + n, `fim: null` |

   **Pronto quando:** a tabela está no doc e cada linha tem um teste
   correspondente provando a equivalência. ✅ Feito 05/08/2026 — 8 testes, um
   por linha da tabela.

10. [x] `src/dominio/projecao.ts` — `projetarMes({ mes, estadoAnterior, regras,
    cartoes, config })` devolvendo `{ ocorrencias[], totalEntradas, totalSaidas,
    saldo, aporteReserva, reservaFinal, peDeMeiaFinal, dividaFinal, jurosPagos }`.

    Regras de encadeamento, nesta ordem:
    - `saldo = entradas − saídas` (a saída "dívida do mês anterior" já entra como
      ocorrência sintética);
    - `saldo ≥ 0`: aporta no pé de meia até a meta; o que passa vai para reserva
      livre; ambos rendem `config.taxaRendimentoMensal` no mês seguinte;
    - `saldo < 0`: **saca da reserva livre primeiro, depois do pé de meia**, e só
      o que ainda faltar vira dívida (aplica a regra escrita na aba `ℹ`:
      *"não vale a pena ficar no vermelho para manter o pé de meia"*).
      Controlado por `config.sacarReservaAntesDeEndividar` (default `true`);
    - dívida remanescente aparece no mês seguinte como saída
      `dívida × (1 + config.taxaJurosDividaMensal)`, e o juro embutido é
      reportado separado em `jurosPagos` — **resolve a divergência das duas
      fórmulas da planilha: cobra principal + juros uma vez só**.

    **Pronto quando:** testes cobrem os quatro caminhos (sobra abaixo da meta,
    sobra acima da meta, falta coberta pela reserva, falta que vira dívida) e um
    teste de 24 meses seguidos prova que reserva + pé de meia − dívida nunca
    diverge do somatório dos saldos mensais mais o rendimento acumulado.
    ✅ Feito 05/08/2026 — 7 testes, incluindo os 4 caminhos e o de 24 meses.
    ⚠️ Desvio consciente da assinatura: `cartoes` **não** entrou no parâmetro
    (o tipo `Cartao` só nasce na Fase 5) — YAGNI, sem custo para retomar depois.

11. [x] `projetarSerie(mesInicio, mesFim, estadoInicial, ...)` — encadeia
    `projetarMes`, com memo por mês. Ponto de partida do encadeamento é o último
    **fechamento** gravado (Fase 4) ou o mês de início configurado.
    **Pronto quando:** projetar 600 meses (50 anos) leva menos de 100 ms na
    máquina do Gabriel — medir e anotar o número em `docs/modelo-de-dados.md`,
    não presumir. ✅ Feito 05/08/2026 — medido ~3ms (teto: 100ms).

12. [x] **Teste de paridade com a planilha** (roda local, não vai para o git):
    reproduzir em `fixtures/local/` os itens reais do mês corrente e conferir se
    a projeção de 12 meses bate com as abas `P1`…`P12`.
    **Pronto quando:** as diferenças estão explicadas item a item — divergência
    esperada é aceitável (o app corrige defeitos conhecidos), divergência
    inexplicada é bug. Registrar o veredito em `docs/ARMADILHAS.md`. ✅ Feito
    05/08/2026 — mês atual bate exato; P1-P12 divergem por cache de fórmula
    desatualizado no arquivo exportado (não é bug do motor). Veredito completo
    em `docs/ARMADILHAS.md`.

### Fase 2 — persistência local e portabilidade

13. [x] `src/dados/store.ts` — interface `Store` (assíncrona, mesmo local):
    `listarEspacos()`, `carregar(espacoId)`, `salvar(espacoId, dados)`,
    `criarEspaco(nome)`, `exportarJSON(espacoId)`, `importarJSON(texto)`.
    **Toda a UI fala só com esta interface** — é a única fronteira que o módulo
    online vai trocar.
    **Pronto quando:** nenhum arquivo em `src/ui/` ou `src/app/` importa
    `store-local` diretamente; só `store`. ✅ Feito 05/08/2026 — ainda não há
    UI (Fase 3), então a regra vale por construção; será checada de novo
    quando a UI existir.
14. [x] `src/dados/store-local.ts` — implementação sobre IndexedDB
    (`idb-keyval`, dep pequena e madura). **Um registro por espaço**, mais um
    índice de espaços e o `espacoAtivoId`. Estado serializado com
    `schemaVersion: 1` e função de migração vazia já no lugar.
    **Pronto quando:** recarregar a página preserva os dados e o espaço ativo; um
    estado de `schemaVersion` desconhecida falha alto em vez de corromper.
    ✅ Feito 05/08/2026 — 7 testes (vitest + `fake-indexeddb`), incluindo
    "reload" simulado e `schemaVersion` desconhecida lançando erro.
15. [x] Export/import de JSON por espaço (botão em Configurações). O arquivo
    exportado carrega `{ schemaVersion, espaco, dados }`.
    **Pronto quando:** exportar num navegador e importar em outro reconstrói o
    espaço idêntico, **como espaço novo** (id regerado, sem sobrescrever o
    existente). É o backup, a troca de aparelho e a ponte para o sync.
    ✅ Feito 05/08/2026 — testado junto com o passo 14; o botão em
    Configurações (UI) fica para a Fase 3.

### Fase 3 — UI do mês, espaços e onboarding (celular primeiro)

16. [x] **Onboarding com armazenamento limpo**: criar o primeiro espaço
    (nome, ex. "Casa"), cadastrar os membros (1, 2 ou mais, com cor), definir se
    existe caixa compartilhado, e oferecer *começar vazio* ou *carregar exemplo
    fictício*. Quem cria vira **dono**.
    **Pronto quando:** abrir o app numa janela anônima dá um app vazio e
    utilizável — **nenhum nome, banco, categoria ou valor do Gabriel aparece**.
    Este é o teste que garante que o projeto pode ser dado a outra pessoa.
    ✅ Feito 05/08/2026 — validado com Playwright (IndexedDB limpo), onboarding
    vazio, exemplo fictício carrega corretamente.
17. [x] Seletor de espaço no topo: trocar, criar novo, renomear, apagar (com
    confirmação que exige digitar o nome). Gerir membros: adicionar, remover,
    trocar papel — tudo passando por `src/dominio/espaco.ts`.
    **Pronto quando:** trocar de espaço troca o dado inteiro sem recarregar a
    página, e a UI **não oferece** o botão de remover/rebaixar o último dono.
    ✅ Feito 05/08/2026 — validado ao vivo: criar/apagar espaço (com
    confirmação por nome exata), promover/rebaixar membro, único dono sem
    select/remover habilitado, dois donos com ambos habilitados.
18. [x] Tela principal: cabeçalho com o mês, setas ‹ ›, e um seletor de mês/ano
    para pular longe. Lista de entradas e saídas agrupadas por membro, com totais
    e o saldo do mês em destaque.
    **Pronto quando:** dá para navegar de `2020-01` a `2040-12` sem travar e sem
    erro no console; a lista é virtualizada se passar de ~200 itens. ✅ Feito
    05/08/2026 — testado nos dois extremos, 0 erros no console. Corte em
    `LIMITE_LISTA = 200` com botão "carregar mais" (não é virtualização de
    verdade — suficiente para o volume real do MVP, ~25 itens).
19. [x] Formulário de regra (criar/editar), com o seletor de recorrência em
    linguagem de gente: *"todo mês"*, *"de mar/2027 até out/2027"*,
    *"só em dez/2026"*, *"a cada 3 meses"*, *"6x a partir de set/2026"*.
    **Pronto quando:** cadastrar "volta a pagar em mar/2027" leva menos de 20
    segundos no celular, e o item aparece em mar/2027 e não antes. ✅ Feito
    05/08/2026 — testado: item "Cartão" cadastrado com essa recorrência
    aparece exatamente em mar/2027 (não em fev, não em nov/2026).
20. [x] Ajuste pontual: no mês aberto, editar o valor de uma ocorrência grava
    `excecoes[mes]` na regra, sem alterar os outros meses.
    **Pronto quando:** mudar dezembro não mexe em novembro nem em janeiro, e a UI
    marca visualmente que aquele mês está ajustado. ✅ Feito 05/08/2026 —
    ajustei Cartão só em mar/2027 (R$300→R$450); abr/2027 continuou R$300 sem
    marca; mar/2027 mostrou `✎`.
21. [x] Curva de saldo projetado (12/24/60 meses, alternável), com marcação de
    onde a série deixa de ter realizado e passa a ser estimativa.
    **Pronto quando:** a curva reproduz `projetarSerie` e o ponto de virada
    previsto→estimado está visível. ✅ Feito 05/08/2026 — os três horizontes
    testados ao vivo. ⚠️ Sem Fase 4 (fechamento), não existe "realizado" ainda
    — a curva mostra isso honestamente ("tudo aqui é estimativa") em vez de
    fingir um ponto de virada que não existe.

### Fase 4 — realizado e fechamento de mês

22. [ ] Marcar ocorrência como **paga/recebida**, com data e valor efetivo
    (default = previsto). Gera um `Lancamento` ligado à regra.
    **Pronto quando:** o mês mostra "previsto X · realizado Y · falta Z" e o
    saldo passa a usar o efetivo onde existir.
23. [ ] Lançamento avulso (gasto que não tem regra).
    **Pronto quando:** entra no total do mês sem virar recorrência.
24. [ ] **Fechamento de mês**: snapshot imutável `{ espacoId, mes, saldoFinal,
    reserva, peDeMeia, divida, fechadoEm }`. Meses fechados não recalculam; a
    projeção parte do último fechamento.
    **Pronto quando:** editar uma regra antiga não altera nenhum mês fechado, e a
    UI mostra o cadeado com a data do fechamento.
25. [ ] Tela "para onde foi" — realizado por categoria e por membro no mês, com
    comparação contra o previsto.
    **Pronto quando:** as somas por categoria batem exatamente com o total de
    saídas realizadas do mês.

### Fase 5 — cartões de crédito

26. [ ] `Cartao { id, espacoId, nome, membroId, limiteCentavos, diaFechamento,
    diaVencimento, ativo }` e `Compra { id, espacoId, cartaoId, data, nome,
    categoria, membroId, valorTotalCentavos, parcelas }`.
    **Pronto quando:** cadastrar cartão e compra persiste e sobrevive ao reload.
27. [ ] `src/dominio/cartao.ts` — competência: compra com dia ≤ `diaFechamento`
    entra na fatura que vence no mês corrente; depois disso, na seguinte. Parcela
    k cai na fatura do mês da compra + (k−1), com o resto do arredondamento na
    última parcela.
    **Pronto quando:** testes cobrem compra na véspera do fechamento, no dia do
    fechamento, no dia seguinte, e parcelamento que atravessa a virada do ano.
28. [ ] A fatura de cada cartão entra na projeção como **uma** saída do mês do
    vencimento; abrir a saída mostra as parcelas que a compõem.
    **Pronto quando:** uma compra em 6x lançada uma única vez aparece nas 6
    projeções seguintes, sem digitação extra.
29. [ ] Limite: usado × disponível por cartão, com alerta ao ultrapassar.
    **Pronto quando:** o usado é derivado das compras em aberto, nunca digitado.

### Fase 6 — patrimônio, taxas e simuladores

30. [x] Tela de configuração financeira (por espaço): taxa de rendimento
    (CDI × % do banco, IR de 22,5% descontado), taxa de juros da dívida, meta do
    pé de meia em meses, custo mensal de sobrevivência (derivado dos essenciais,
    com override manual).
    **Pronto quando:** mudar a taxa reflete na projeção inteira sem recarregar, e
    a config de um espaço não vaza para outro. ✅ Feito 05/08/2026 — validado ao
    vivo: CDI 12% a.a. → preview 0,7354% a.m. em tempo real (bate com o teste
    unitário); trocar de espaço mostra config zerada, isolada. ⚠️ **Escopo
    reduzido conscientemente**: custo de sobrevivência é **manual** — a
    derivação automática a partir dos essenciais exigiria marcar `Regra` como
    "essencial" (campo que não existe no schema da Fase 1) e não é necessária
    para o critério de pronto. Registrado como pendência, não bug.
31. [x] Progresso do pé de meia: quanto falta para a meta, em R$ e em meses.
    **Pronto quando:** reproduz a mensagem que a planilha dá hoje
    ("faltam R$ N para completar") a partir do estado real. ✅ Feito 05/08/2026
    — "Faltam R$ 7.000,00 para completar o pé de meia — ≈ 4 meses no ritmo
    atual", validado ao vivo com números reais (conferi a conta à mão: bate
    exato). Pé de meia atual e reserva atual são **manuais** (Fase 4/fechamento
    não existe ainda para calcular isso sozinho) — mesma régua do passo 30.
32. [ ] Cotação automática de CDI e dólar pela **API do Banco Central**
    (`api.bcb.gov.br/dados/serie/bcdata.sgs.<id>/dados/ultimos/1?formato=json`).
    ⚠️ **Primeiro passo é medir**: conferir qual série devolve o número que bate
    com a planilha (candidatas: CDI a.a., CDI a.d., dólar PTAX) **e se o CORS
    permite chamar direto do navegador**. Se bloquear, o fallback é o valor
    digitado, e a busca automática vira parte do módulo online (Fase 8).
    **Pronto quando:** a taxa aparece com a data da cotação e a origem
    (automática/manual) visível; app nunca quebra se a API cair.
33. [ ] Simulador de férias/abono/dissídio, tela isolada: salário proporcional
    por dias, venda de 10 dias, +1/3, adicional por subida de nível, % de
    dissídio — e o botão "jogar resultado para o mês X" que cria a regra `unica`
    correspondente.
    **Pronto quando:** os resultados batem com as contas da aba `💳` da planilha
    para os mesmos insumos.

### Fase 7 — publicar como app estático e instalável

Aqui o Prumo **já é compartilhável**: qualquer pessoa abre a URL e usa, sem
servidor e sem conta. É o marco que destrava dar o projeto para o irmão e os
amigos, antes de existir qualquer backend.

34. [ ] PWA: manifest, ícone, service worker com estratégia *cache-first* para os
    assets. Sem cache de dado (o dado nunca sai do IndexedDB).
    **Pronto quando:** dá para instalar na tela inicial do celular e abrir em modo
    avião com os dados intactos.
35. [ ] Deploy do estático no Cloudflare Pages, com versionamento de asset por
    hash (a armadilha de cache do `nomura-bi` vale aqui — asset novo tem que
    invalidar o antigo).
    **Pronto quando:** a URL abre no celular dos dois, e um deploy novo não deixa
    ninguém preso na versão velha.
36. [ ] Aviso honesto de escopo: um rodapé/tela "seus dados estão só neste
    aparelho" com o botão de exportar ao lado.
    **Pronto quando:** o usuário entende, sem ler documentação, que trocar de
    celular sem exportar perde tudo.

### Fase 8 — módulo online (sync, autenticação, convite)

⚠️ **Opcional por construção.** Nada aqui pode virar requisito do app. Se o
módulo estiver desligado, tudo das fases 0–7 continua funcionando igual.

37. [ ] `src/dados/store-remoto.ts` implementando a **mesma** interface `Store`,
    falando com um Worker (`workers/api/`) sobre **D1**. Merge last-write-wins
    por `id` + `atualizadoEm`.
    **Pronto quando:** trocar a implementação da store é uma linha, e a suíte de
    testes do domínio continua passando sem alteração.
38. [ ] Tela **Configurações → Sincronização**: colar URL da API e credencial,
    testar conexão, ligar/desligar. Gravado no armazenamento local.
    **Pronto quando:** ligar o sync **não exige rebuild** — o mesmo `dist/`
    publicado funciona com sync ligado e desligado.
39. [ ] **Cloudflare Access** (e-mail OTP) na instância do Gabriel. Mecânica
    completa, para o executor não redescobrir:

    - o Access fica **na frente** da aplicação; quem passa por ele chega ao
      Worker com o header **`Cf-Access-Jwt-Assertion`** (JWT assinado);
    - o Worker **valida a assinatura** contra
      `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, confere o claim
      **`aud`** (Application Audience da aplicação) e a expiração, e só então lê
      o claim **`email`**;
    - o front pode chamar **`/cdn-cgi/access/get-identity`** na própria origem
      para saber quem logou e escolher o que exibir ("olá, Sofia", seletor de
      espaço).

    ⚠️ **Nunca autorizar pelo e-mail cru** — nem pelo header
    `Cf-Access-Authenticated-User-Email`, nem pela resposta do `get-identity`.
    Quem alcançar o Worker por fora do Access forja os dois num `curl`.
    **O front decide o que exibir; o servidor decide o que existe.**

    ⚠️ Há precedente na casa: o deck do `disclaw` já roda atrás de Access
    escopado a um caminho de `*.pages.dev` — reaproveitar o padrão e conferir se
    a política cobre a **produção**, não só os previews.

    **Pronto quando:** janela anônima pede o código por e-mail; chamada direta à
    API sem JWT devolve 403; e uma chamada com
    `Cf-Access-Authenticated-User-Email` forjado **e sem JWT válido** também
    devolve 403 (teste explícito, não presumido).

40. [ ] Identidade → espaços. O Worker resolve `email` (do JWT) → lista de
    espaços em que aquele e-mail é membro. Se houver mais de um, a UI mostra
    seletor; se houver um só, entra direto; se não houver nenhum, mostra
    "você ainda não foi convidado para nenhum espaço".
    **Pronto quando:** o mesmo e-mail em dois espaços vê os dois, e trocar de
    espaço troca o dado inteiro sem recarregar.

41. [ ] Convite por e-mail: o **dono** adiciona um e-mail ao espaço, que vira
    **convite pendente**. Quando aquele e-mail logar pelo Access, o convite casa
    sozinho e vira membro — sem SMTP, sem link de token, sem página de aceite.
    Remover membro e promover a dono na mesma tela, sempre por
    `src/dominio/espaco.ts`.
    **Pronto quando:** convidar → logar com o outro e-mail → cair direto no
    espaço, sem passo manual no meio. E remover o último dono devolve erro do
    domínio, não tela branca.

42. [ ] Autorização no servidor. Toda query filtra pelo espaço resolvido **a
    partir do JWT**, nunca por parâmetro vindo do cliente. Ações de dono
    (convidar, remover, apagar espaço) verificam o papel **no servidor**.
    **Pronto quando:** existem dois testes de isolamento — (a) usuário
    autenticado lendo dado de outro espaço recebe **403, não lista vazia** (lista
    vazia esconde bug de filtro); (b) `espacoId` passado na query string é
    ignorado em favor do JWT. E um membro comum chamando a rota de remover
    membro recebe 403.

43. [ ] **Troca de e-mail do membro**, sem depender de SMTP. A sessão do Access
    já prova a posse do endereço antigo (o OTP foi para ele); o login do novo
    prova a posse do novo. Fluxo:

    1. logado com o e-mail antigo, o membro pede a troca para `novo@x` → grava
       `trocaPendente { membroId, emailNovo, pedidoEm }`;
    2. `novo@x` entra pelo Access e **reivindica** a troca;
    3. o vínculo antigo é desativado no mesmo commit em que o novo é criado.

    Regras de borda, todas testadas:
    - o e-mail antigo continua funcionando **até** a reivindicação — pedido feito
      e esquecido não tranca ninguém para fora;
    - o e-mail antigo pode **cancelar** o pedido enquanto estiver pendente;
    - `novo@x` já ser membro do mesmo espaço = erro claro, não merge silencioso
      de dois membros;
    - **perdeu o acesso ao e-mail antigo:** outro **dono** do espaço troca o
      e-mail direto. Se for o único dono, a saída é administrativa — é a
      instância dele, ele tem o painel da Cloudflare e o D1 na mão. Documentar
      em `docs/ARMADILHAS.md`; não construir fluxo de recuperação para isso.

    **Pronto quando:** trocar o e-mail e logar com o novo cai no mesmo espaço,
    com o mesmo histórico e o mesmo papel; e um pedido pendente **não** impede o
    login com o e-mail antigo.

44. [ ] Migração dos dados locais: exportar JSON (Fase 2) e importar no remoto.
    **Pronto quando:** o estado local e o remoto conferem item a item, e o local
    vira cache.

### Fase 9 — módulo banco

45. [ ] Import de **OFX** (e CSV, para os bancos que não dão OFX): tela de upload,
    parser, listagem das transações lidas. **Roda 100% no navegador** — o extrato
    não sobe para servidor nenhum.
    **Pronto quando:** um extrato real importa sem perder transação e sem
    duplicar em reimportação (dedupe por id da transação + data + valor).
46. [ ] Conciliação: casar transação importada com ocorrência prevista do mês
    (sugestão por valor + janela de dias + nome parecido), aceitar/rejeitar.
    **Pronto quando:** o mês mostra quantas previsões foram conciliadas e quais
    transações sobraram sem par.
47. [ ] Categorização com memória: ao categorizar um estabelecimento uma vez, as
    próximas importações sugerem sozinhas.
    **Pronto quando:** a segunda importação do mesmo estabelecimento já vem
    categorizada, com a sugestão marcada como automática.
48. [ ] **Só então** avaliar agregador (Pluggy/Belvo): levantar preço real,
    escopo de dados e o que a conexão exige.
    **Pronto quando:** existe um md de decisão com números — não é passo de
    código, é passo de decisão. ⚠️ Custo sai do bolso do Gabriel; o cartão
    corporativo não cobre app pessoal. E se entrar, entra como **módulo**,
    ligado por quem quiser, com a chave de API do próprio usuário.

### Fase 10 — empacotar para os amigos

Pode ser antecipada para logo depois da Fase 7 — a partir dali o app já é útil
sozinho, e nada aqui depende do módulo online.

49. [ ] `README.md` para humano não-técnico: o que é o Prumo, print, "use agora"
    (link), "instale no celular", "seus dados são seus". Seção separada e curta
    para quem quiser rodar/hospedar o próprio.
    **Pronto quando:** uma pessoa que nunca viu o projeto entende o que ganha nos
    primeiros 10 segundos de leitura.
50. [ ] Licença **MIT** e varredura final de dado pessoal antes do repo virar
    público: histórico de commits, fixtures, prints, `docs/`.
    **Pronto quando:** `git log -p` não contém nome de banco, valor real ou
    e-mail privado. ⚠️ Se contiver, **reescrever o histórico antes de publicar**
    — depois do push, é para sempre.
51. [ ] Botão **"Deploy to Cloudflare"** no README, com `wrangler.toml` de
    template que provisiona Worker + D1 sozinho, para o amigo que quiser o
    próprio backend.
    **Pronto quando:** o próprio Gabriel consegue seguir o próprio README numa
    conta Cloudflare limpa e chegar num app com sync funcionando, sem editar
    código.
52. [ ] `CHANGELOG.md` e `docs/ARMADILHAS.md` publicáveis; `CLAUDE.md` do projeto
    com as três regras da arquitetura de compartilhamento e as travas de espaço.
    **Pronto quando:** um agente que abre o repo pela primeira vez não precisa
    deste roadmap para não quebrar as regras.

---

## Priorização (impacto × esforço × risco)

| item | impacto | esforço | risco | veredito |
| --- | --- | --- | --- | --- |
| Fase 1 — motor com meses absolutos | altíssimo | médio | baixo | **faz primeiro**, é o pedido central |
| Fase 3 — UI do mês, espaços e onboarding | alto | médio | baixo | sem isso o motor não é usável nem doável |
| Fase 2 — store + export/import | alto | baixo | baixo | barato e destrava backup e sync |
| Fase 5 — cartões | alto | médio | médio | maior buraco atual; risco = regra de competência |
| Fase 4 — realizado + fechamento | alto | médio | baixo | é o que a planilha nunca teve |
| Fase 6 — taxas e simuladores | médio | baixo | baixo | port quase direto da planilha |
| Fase 7 — PWA + publicar estático | alto | baixo | baixo | **é o marco que torna o Prumo doável** |
| Fase 8 — módulo online | alto (para a Sofia) | médio | médio | risco = Access cobrir produção em `pages.dev` |
| Fase 9 — OFX e conciliação | alto | alto | médio | só faz sentido com realizado de pé |
| Fase 10 — empacotar | médio | baixo | baixo | barato; o risco real está na varredura de dado pessoal |
| Agregador bancário | médio | alto | alto | custo recorrente do bolso + credencial com terceiro |

---

## O que NÃO fazer

- **Não hospedar o dado dos amigos.** O que se compartilha é o projeto, não o
  servidor. Custódia de dado financeiro de terceiro é responsabilidade jurídica e
  operacional que não paga nada em troca.
- **Não fazer cadastro aberto ao público.** Decisão explícita do Gabriel: círculo
  conhecido, cada um com sua instância.
- **Não liberar qualquer e-mail no Access** confiando só no filtro do app. Duas
  camadas de porta existem por um motivo (ver § As duas camadas).
- **Não criar um terceiro papel** (leitor/visualizador) agora. Dois papéis
  resolvem o círculo real; um terceiro cobra verificação de permissão em cada
  escrita, no cliente e no servidor. Volta se alguém pedir de verdade.
- **Não exigir backend para o app funcionar.** No minuto em que a tela inicial
  pedir login, o projeto deixa de ser doável.
- **Não portar a calculadora de antecipação de fatura** (99Pay/RecargaPay, na
  aba `💰`). Não foi marcada no MVP, tem ~15 células de conta de taxa sobre taxa
  e responde uma pergunta pontual, não recorrente.
- **Não portar o "magic number" de FII** (aba `Fundos Imobiliários`). É
  simulação de investimento, assunto diferente de fluxo de caixa.
- **Não escrever importador de `.xlsx`.** São ~25 itens ativos. Recadastrar na
  mão é mais rápido que o parser, e força a revisão do que ainda faz sentido
  (metade das saídas listadas está desatualizada).
- **Não replicar as 12 abas.** Nada de `P1`…`P12` no código: o mês é gerado sob
  demanda a partir das regras. Se aparecer array de 12 posições fixas na
  projeção, o desenho foi violado.
- **Não recriar o scraping por `IMPORTXML`.** API do BCB ou valor digitado.
- **Não migrar as abas ocultas** (`🌐`, `index`, `XML`, `Cronograma Gabi/Biel`,
  `Biel - Estudos/Trabalho`). Estão mortas há tempo e nada as referencia.
- **Não usar float para dinheiro** em lugar nenhum, nem "só no cálculo
  intermediário".
- **Não colocar login próprio** (usuário/senha) — Access resolve na instância do
  Gabriel, e senha de app financeiro é responsabilidade que não precisa existir.
- **Não fazer multi-idioma agora.** pt-BR só. Volta se algum amigo real precisar.

---

## Riscos e pré-requisitos

**Conceitos do acervo aplicados** (auto-sabatina):

- **[falácia da previsão](../../cerebro/pessoal/aprendizado/conceitos/falacia-da-previsao.md)** —
  o app inteiro é uma máquina de projetar, e projeção infinita cria falsa
  precisão: o mês 40 sai com a mesma cara de exatidão do mês 2. Mitigações que já
  estão no roadmap, não são conselho solto: o fechamento mensal ancora a série no
  realizado (passo 24); a curva marca visualmente onde acaba o real e começa a
  estimativa (passo 21); previsto × realizado fica na cara do usuário (passo 22).
  Regra de uso: a projeção longa serve para **decidir direção**, nunca para
  cravar valor.
- **[via negativa](../../cerebro/pessoal/aprendizado/conceitos/via-negativa.md)** —
  a tentação era portar a planilha inteira e, agora, virar plataforma. O corte
  está no bloco acima: 6 abas mortas, calculadora de antecipação, magic number de
  FII, importador de xlsx, scraping, multi-idioma, cadastro aberto, terceiro
  papel e custódia de dado alheio. O que sobra é menor que o original **e** faz
  mais.
- **[opcionalidade](../../cerebro/pessoal/aprendizado/conceitos/opcionalidade.md)** —
  o desenho "local-first + módulos ligados em runtime" existe para não fechar
  portas: dá para ficar offline para sempre, ligar sync depois, trocar de
  provedor, ou entregar o projeto a um amigo sem nada disso. Um backend
  obrigatório teria travado as quatro opções de uma vez.
- **[hábito-chave](../../cerebro/pessoal/aprendizado/conceitos/habito-chave.md)** —
  é por isso que o **Marco A** existe e é definido por *paridade com a planilha*,
  não por lista de features. A mudança que arrasta todas as outras é uma só:
  **parar de abrir o Sheets**. Enquanto isso não acontecer, cartão, conciliação e
  sync são features sem usuário. Daí o critério de pronto do marco ser
  comportamental (um mês sem abrir a planilha), não visual.

**Riscos técnicos:**

| risco | mitigação |
| --- | --- |
| Local-first com dois usuários em aparelhos diferentes gera dados divergentes | `id` uuid + `atualizadoEm` em todo registro desde a Fase 0; até a Fase 8, combinar quem edita e usar export/import como ponte. Se doer antes da hora, antecipar a Fase 8 |
| **Módulo online vazar para dentro do núcleo** (o app "só funciona" com backend) | teste de fumaça permanente: rodar a suíte e abrir o app com o módulo desligado, em toda fase a partir da 8 |
| **Espaço órfão** (último dono removido, ninguém pode convidar) | invariante no domínio (passo 7), testada, não regra de UI |
| **Vazamento entre espaços** | `espacoId` em toda entidade desde a Fase 1; no servidor, espaço resolvido do JWT e nunca de parâmetro do cliente; dois testes de isolamento no passo 42 |
| Cloudflare Access pode não cobrir produção em `*.pages.dev` sem domínio próprio | verificar cedo (passo 39); precedente do deck do `disclaw` sugere que dá, mas **é para conferir, não presumir**. Plano B: domínio próprio |
| CORS do BCB pode bloquear chamada direta do navegador | passo 32 mede antes de construir; fallback é valor digitado |
| Regra de competência de cartão errada desloca fatura em um mês inteiro | testes de borda obrigatórios no passo 27 (véspera, dia, dia seguinte do fechamento) |
| Divergência entre as duas fórmulas de juros da planilha | resolvida por decisão explícita no passo 10: principal + juros uma vez, juro reportado à parte |
| **Dado pessoal no histórico do git de um repo que vai virar público** | `.gitignore` antes do `git init` (passo 3) + varredura no passo 50. Depois do push, só reescrita de histórico resolve |

**Pré-requisitos e pontos que dependem do Gabriel:**

- **Repositório**: projeto **pessoal** (owner `dosxnjos`), `user.email` pessoal,
  e **público**. ⚠️ Regra da casa manda **perguntar antes de criar repo novo** e
  conferir a conta ativa do `gh` (`gh api user -q .login`) antes de qualquer
  escrita — o Gabriel roda várias sessões e o `gh auth` é global do processo.
- **Domínio** `prumo.app` (ou equivalente): checar disponibilidade antes do passo
  48. Não bloqueia nada até lá — o app roda em `*.pages.dev`.
- **Nomes de membros e espaços** — vêm do onboarding, nunca do código.
- **Dado real nunca no repo** — reafirmado aqui porque é o erro mais fácil de
  cometer numa fixture de teste, e aqui ele seria público.

---

## Como executar

Uma fase por sessão, na ordem. A Fase 1 é a que justifica o projeto — se ela não
ficar sólida e testada, o resto é fachada sobre motor errado.

**O alvo imediato é o Marco A**, e nada além dele: passos 1 a 21, mais 30 e 31.
Tudo local, sem servidor, sem integração. Só se declara pronto quando o Gabriel
passar um mês sem abrir a planilha.

> Fases 0 a 10 escritas em 2026-08-05, antes de qualquer linha de código existir.
> Revisado três vezes no mesmo dia: (1) para incorporar "compartilhar com irmão e
> amigos" — o produto virou app local-first replicável, com módulos online
> opcionais; (2) para nomear o projeto (**Prumo**) e trazer **espaços, membros e
> papéis para o schema da Fase 1**, em vez de deixá-los como enfeite da fase de
> hospedagem; (3) para marcar o **Marco A** (paridade com a planilha, 100% local)
> e desenhar a **troca de e-mail sem SMTP** (passo 43).
