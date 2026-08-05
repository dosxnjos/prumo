import { describe, expect, it } from 'vitest'
import { somarMeses } from './mes'
import { ocorreEm, valorEm } from './recorrencia'
import type { Regra } from './tipos'

function regraBase(overrides: Partial<Regra> = {}): Regra {
  return {
    id: 'r1',
    espacoId: 'e1',
    nome: 'Teste',
    fluxo: 'saida',
    membroId: 'compartilhado',
    categoria: 'geral',
    valorCentavos: 10000,
    recorrencia: { tipo: 'unica', mes: '2026-06' },
    pagamento: { tipo: 'conta' },
    ativa: true,
    excecoes: {},
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('unica', () => {
  it('ocorre só no mês exato', () => {
    const regra = regraBase({ recorrencia: { tipo: 'unica', mes: '2026-06' } })
    expect(ocorreEm(regra, '2026-06')).toBe(true)
    expect(ocorreEm(regra, '2026-07')).toBe(false)
  })
})

describe('mensal', () => {
  it('ocorre em todo o intervalo, sem fim', () => {
    const regra = regraBase({ recorrencia: { tipo: 'mensal', inicio: '2026-03', fim: null } })
    expect(ocorreEm(regra, '2026-03')).toBe(true)
    expect(ocorreEm(regra, '2027-01')).toBe(true)
    expect(ocorreEm(regra, '2026-02')).toBe(false)
  })

  it('fim anterior ao início nunca ocorre', () => {
    const regra = regraBase({ recorrencia: { tipo: 'mensal', inicio: '2026-06', fim: '2026-01' } })
    expect(ocorreEm(regra, '2026-03')).toBe(false)
    expect(ocorreEm(regra, '2026-06')).toBe(false)
  })

  it('respeita fim', () => {
    const regra = regraBase({ recorrencia: { tipo: 'mensal', inicio: '2026-01', fim: '2026-06' } })
    expect(ocorreEm(regra, '2026-06')).toBe(true)
    expect(ocorreEm(regra, '2026-07')).toBe(false)
  })
})

describe('periodica', () => {
  it('ocorre a cada N meses', () => {
    const regra = regraBase({
      recorrencia: { tipo: 'periodica', inicio: '2026-01', fim: null, aCadaMeses: 3 },
    })
    expect(ocorreEm(regra, '2026-01')).toBe(true)
    expect(ocorreEm(regra, '2026-02')).toBe(false)
    expect(ocorreEm(regra, '2026-04')).toBe(true)
    expect(ocorreEm(regra, '2026-07')).toBe(true)
  })

  it('respeita fim', () => {
    const regra = regraBase({
      recorrencia: { tipo: 'periodica', inicio: '2026-01', fim: '2026-06', aCadaMeses: 3 },
    })
    expect(ocorreEm(regra, '2026-07')).toBe(false)
  })
})

describe('parcelada', () => {
  it('ocorre exatamente nas N parcelas, uma por mês', () => {
    const regra = regraBase({ recorrencia: { tipo: 'parcelada', inicio: '2026-06', parcelas: 3 } })
    expect(ocorreEm(regra, '2026-05')).toBe(false)
    expect(ocorreEm(regra, '2026-06')).toBe(true)
    expect(ocorreEm(regra, '2026-08')).toBe(true)
    expect(ocorreEm(regra, '2026-09')).toBe(false)
  })

  it('resto do arredondamento cai na última parcela', () => {
    const regra = regraBase({
      valorCentavos: 10000,
      recorrencia: { tipo: 'parcelada', inicio: '2026-01', parcelas: 3 },
    })
    expect(valorEm(regra, '2026-01')).toBe(3333)
    expect(valorEm(regra, '2026-02')).toBe(3333)
    expect(valorEm(regra, '2026-03')).toBe(3334)
  })

  it('atravessa a virada do ano', () => {
    const regra = regraBase({ recorrencia: { tipo: 'parcelada', inicio: '2026-11', parcelas: 4 } })
    expect(ocorreEm(regra, '2026-11')).toBe(true)
    expect(ocorreEm(regra, '2027-02')).toBe(true)
    expect(ocorreEm(regra, '2027-03')).toBe(false)
  })
})

describe('exceções', () => {
  it('pular impede a ocorrência de um mês específico', () => {
    const regra = regraBase({
      recorrencia: { tipo: 'mensal', inicio: '2026-01', fim: null },
      excecoes: { '2026-06': { pular: true } },
    })
    expect(ocorreEm(regra, '2026-05')).toBe(true)
    expect(ocorreEm(regra, '2026-06')).toBe(false)
    expect(ocorreEm(regra, '2026-07')).toBe(true)
  })

  it('valor de exceção sobrescreve o valor do mês, sem afetar os demais', () => {
    const regra = regraBase({
      valorCentavos: 10000,
      recorrencia: { tipo: 'mensal', inicio: '2026-01', fim: null },
      excecoes: { '2026-12': { valorCentavos: 25000 } },
    })
    expect(valorEm(regra, '2026-11')).toBe(10000)
    expect(valorEm(regra, '2026-12')).toBe(25000)
    expect(valorEm(regra, '2027-01')).toBe(10000)
  })
})

describe('ativa: false', () => {
  it('nunca ocorre, mesmo dentro do intervalo', () => {
    const regra = regraBase({
      ativa: false,
      recorrencia: { tipo: 'mensal', inicio: '2026-01', fim: null },
    })
    expect(ocorreEm(regra, '2026-06')).toBe(false)
  })
})

/**
 * Tabela de tradução da planilha antiga (docs/modelo-de-dados.md).
 * `mesCorrente` fixo em '2026-08' — é só o ponto de referência arbitrário
 * usado para migrar cada item, não algo que o domínio lê de `Date.now()`.
 */
describe('tradução da operação antiga', () => {
  const mesCorrente = '2026-08'

  it('vazio: mensal sem fim, a partir do mês corrente', () => {
    const regra = regraBase({ recorrencia: { tipo: 'mensal', inicio: mesCorrente, fim: null } })
    expect(ocorreEm(regra, somarMeses(mesCorrente, -1))).toBe(false)
    expect(ocorreEm(regra, mesCorrente)).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, 12))).toBe(true)
  })

  it('x: mensal sem fim, a partir do mês seguinte', () => {
    const regra = regraBase({
      recorrencia: { tipo: 'mensal', inicio: somarMeses(mesCorrente, 1), fim: null },
    })
    expect(ocorreEm(regra, mesCorrente)).toBe(false)
    expect(ocorreEm(regra, somarMeses(mesCorrente, 1))).toBe(true)
  })

  it('0: única no mês corrente', () => {
    const regra = regraBase({ recorrencia: { tipo: 'unica', mes: mesCorrente } })
    expect(ocorreEm(regra, mesCorrente)).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, 1))).toBe(false)
  })

  it('off: ativa false nunca ocorre', () => {
    const regra = regraBase({
      ativa: false,
      recorrencia: { tipo: 'mensal', inicio: mesCorrente, fim: null },
    })
    expect(ocorreEm(regra, mesCorrente)).toBe(false)
  })

  it('n: mensal do corrente até corrente+n', () => {
    const n = 5
    const regra = regraBase({
      recorrencia: { tipo: 'mensal', inicio: mesCorrente, fim: somarMeses(mesCorrente, n) },
    })
    expect(ocorreEm(regra, mesCorrente)).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n + 1))).toBe(false)
  })

  it('nx: mensal do corrente+1 até corrente+n', () => {
    const n = 5
    const regra = regraBase({
      recorrencia: {
        tipo: 'mensal',
        inicio: somarMeses(mesCorrente, 1),
        fim: somarMeses(mesCorrente, n),
      },
    })
    expect(ocorreEm(regra, mesCorrente)).toBe(false)
    expect(ocorreEm(regra, somarMeses(mesCorrente, 1))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n + 1))).toBe(false)
  })

  it('nm: mensal de corrente+n até corrente+m', () => {
    const n = 2
    const m = 6
    const regra = regraBase({
      recorrencia: {
        tipo: 'mensal',
        inicio: somarMeses(mesCorrente, n),
        fim: somarMeses(mesCorrente, m),
      },
    })
    expect(ocorreEm(regra, somarMeses(mesCorrente, n - 1))).toBe(false)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, m))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, m + 1))).toBe(false)
  })

  it('n0: mensal de corrente+n sem fim', () => {
    const n = 3
    const regra = regraBase({
      recorrencia: { tipo: 'mensal', inicio: somarMeses(mesCorrente, n), fim: null },
    })
    expect(ocorreEm(regra, somarMeses(mesCorrente, n - 1))).toBe(false)
    expect(ocorreEm(regra, somarMeses(mesCorrente, n))).toBe(true)
    expect(ocorreEm(regra, somarMeses(mesCorrente, 50))).toBe(true)
  })
})
