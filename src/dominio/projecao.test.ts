import { describe, expect, it } from 'vitest'
import { somarMeses } from './mes'
import { criarProjetorSerie, projetarMes } from './projecao'
import type { ConfigProjecao, EstadoFinanceiro } from './projecao'
import type { Regra } from './tipos'

function regra(overrides: Partial<Regra>): Regra {
  return {
    id: 'r',
    espacoId: 'e1',
    nome: 'item',
    fluxo: 'saida',
    membroId: 'compartilhado',
    categoria: 'geral',
    valorCentavos: 0,
    recorrencia: { tipo: 'mensal', inicio: '2026-01', fim: null },
    pagamento: { tipo: 'conta' },
    ativa: true,
    excecoes: {},
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const configBase: ConfigProjecao = {
  taxaRendimentoMensal: 0.005,
  taxaJurosDividaMensal: 0.1,
  metaPeDeMeiaCentavos: 100000,
}

const estadoZerado: EstadoFinanceiro = { reserva: 0, peDeMeia: 0, divida: 0 }

describe('saldo positivo — sobra abaixo da meta', () => {
  it('tudo entra no pé de meia, nada na reserva', () => {
    const regras = [regra({ fluxo: 'entrada', valorCentavos: 50000, nome: 'salário' })]
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estadoZerado, regras, config: configBase })
    expect(r.saldo).toBe(50000)
    expect(r.peDeMeiaFinal).toBe(50000)
    expect(r.reservaFinal).toBe(0)
    expect(r.aporteReserva).toBe(0)
    expect(r.dividaFinal).toBe(0)
  })
})

describe('saldo positivo — sobra acima da meta', () => {
  it('completa o pé de meia e o resto vai para a reserva', () => {
    const regras = [regra({ fluxo: 'entrada', valorCentavos: 150000, nome: 'salário' })]
    const estado: EstadoFinanceiro = { reserva: 0, peDeMeia: 90000, divida: 0 }
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estado, regras, config: configBase })
    // peDeMeiaAntes com rendimento: round(90000 * 1.005) = 90450
    expect(r.peDeMeiaFinal).toBe(100000)
    expect(r.aporteReserva).toBe(150000 - (100000 - 90450))
    expect(r.reservaFinal).toBe(r.aporteReserva)
    expect(r.dividaFinal).toBe(0)
  })
})

describe('saldo negativo — falta coberta pela reserva', () => {
  it('saca da reserva livre, pé de meia intacto, sem dívida', () => {
    const regras = [regra({ fluxo: 'saida', valorCentavos: 80000, nome: 'contas' })]
    const estado: EstadoFinanceiro = { reserva: 100000, peDeMeia: 50000, divida: 0 }
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estado, regras, config: configBase })
    expect(r.saldo).toBe(-80000)
    expect(r.dividaFinal).toBe(0)
    expect(r.reservaFinal).toBeLessThan(100500) // rendeu, mas foi sacada
    expect(r.peDeMeiaFinal).toBe(Math.round(50000 * 1.005))
  })
})

describe('saldo negativo — falta que vira dívida', () => {
  it('saca reserva e pé de meia inteiros e o resto vira dívida', () => {
    const regras = [regra({ fluxo: 'saida', valorCentavos: 200000, nome: 'emergência' })]
    const estado: EstadoFinanceiro = { reserva: 30000, peDeMeia: 40000, divida: 0 }
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estado, regras, config: configBase })
    expect(r.reservaFinal).toBe(0)
    expect(r.peDeMeiaFinal).toBe(0)
    const reservaAntes = Math.round(30000 * 1.005)
    const peDeMeiaAntes = Math.round(40000 * 1.005)
    expect(r.dividaFinal).toBe(200000 - reservaAntes - peDeMeiaAntes)
  })

  it('sacarReservaAntesDeEndividar: false preserva as reservas e vai direto para dívida', () => {
    const regras = [regra({ fluxo: 'saida', valorCentavos: 50000, nome: 'gasto' })]
    const estado: EstadoFinanceiro = { reserva: 30000, peDeMeia: 40000, divida: 0 }
    const config: ConfigProjecao = { ...configBase, sacarReservaAntesDeEndividar: false }
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estado, regras, config })
    expect(r.reservaFinal).toBe(Math.round(30000 * 1.005))
    expect(r.peDeMeiaFinal).toBe(Math.round(40000 * 1.005))
    expect(r.dividaFinal).toBe(50000)
  })
})

describe('dívida do mês anterior', () => {
  it('entra como ocorrência sintética com juros, principal + juros cobrados uma vez só', () => {
    const estado: EstadoFinanceiro = { reserva: 0, peDeMeia: 0, divida: 10000 }
    const regras: Regra[] = []
    const r = projetarMes({ mes: '2026-06', estadoAnterior: estado, regras, config: configBase })
    const dividaComJuros = Math.round(10000 * 1.1)
    expect(r.totalSaidas).toBe(dividaComJuros)
    expect(r.jurosPagos).toBe(dividaComJuros - 10000)
    expect(r.ocorrencias.some((o) => o.nome === 'Dívida do mês anterior')).toBe(true)
  })
})

describe('encadeamento de 24 meses', () => {
  it('reserva + pé de meia − dívida nunca diverge do somatório dos saldos mais o rendimento', () => {
    const config: ConfigProjecao = {
      taxaRendimentoMensal: 0.004,
      taxaJurosDividaMensal: 0.08,
      metaPeDeMeiaCentavos: 600000,
    }
    const regras: Regra[] = [
      regra({ fluxo: 'entrada', nome: 'salário', valorCentavos: 500000 }),
      regra({ fluxo: 'saida', nome: 'aluguel', valorCentavos: 150000 }),
      // saída periódica alta o suficiente para forçar meses de dívida
      regra({
        fluxo: 'saida',
        nome: 'gasto variável',
        valorCentavos: 420000,
        recorrencia: { tipo: 'periodica', inicio: '2026-03', fim: null, aCadaMeses: 4 },
      }),
    ]

    let estado: EstadoFinanceiro = { reserva: 0, peDeMeia: 0, divida: 0 }
    let mes = '2026-01'
    let somaSaldos = 0
    let patrimonioAntes = 0

    for (let i = 0; i < 24; i++) {
      const r = projetarMes({ mes, estadoAnterior: estado, regras, config })
      somaSaldos += r.saldo

      const patrimonioDepois = r.reservaFinal + r.peDeMeiaFinal - r.dividaFinal
      const rendimentoDoMes =
        Math.round(estado.reserva * config.taxaRendimentoMensal) +
        Math.round(estado.peDeMeia * config.taxaRendimentoMensal)

      // patrimônio não pode divergir do que entrou (saldo) mais o que rendeu,
      // e o juro da dívida (que já está embutido no saldo via a saída sintética)
      // não deve ser contado duas vezes.
      expect(patrimonioDepois).toBe(patrimonioAntes + r.saldo + rendimentoDoMes)

      patrimonioAntes = patrimonioDepois
      estado = { reserva: r.reservaFinal, peDeMeia: r.peDeMeiaFinal, divida: r.dividaFinal }
      mes = somarMeses(mes, 1)
    }

    expect(somaSaldos).not.toBe(0) // sanity: o cenário realmente varia
  })
})

describe('criarProjetorSerie', () => {
  const regras: Regra[] = [
    regra({ fluxo: 'entrada', nome: 'salário', valorCentavos: 500000 }),
    regra({ fluxo: 'saida', nome: 'aluguel', valorCentavos: 150000 }),
  ]

  it('encadeia projetarMes mês a mês', () => {
    const projetarSerie = criarProjetorSerie(regras, configBase)
    const serie = projetarSerie('2026-01', estadoZerado, '2026-06')
    expect(serie).toHaveLength(6)
    expect(serie[0].saldo).toBe(350000)
    // mês 2 deve partir do peDeMeiaFinal do mês 1, não do estado zerado
    expect(serie[1].peDeMeiaFinal).toBeGreaterThan(serie[0].peDeMeiaFinal)
  })

  it('memoiza: estender o fim reaproveita o prefixo já calculado', () => {
    const projetarSerie = criarProjetorSerie(regras, configBase)
    const primeiros6 = projetarSerie('2026-01', estadoZerado, '2026-06')
    const primeiros12 = projetarSerie('2026-01', estadoZerado, '2026-12')
    // os 6 primeiros objetos devem ser os MESMOS (referência), não recalculados
    for (let i = 0; i < 6; i++) {
      expect(primeiros12[i]).toBe(primeiros6[i])
    }
  })

  it('projeta 600 meses (50 anos) em menos de 100ms', () => {
    const projetarSerie = criarProjetorSerie(regras, configBase)
    const inicio = performance.now()
    const serie = projetarSerie('2026-01', estadoZerado, somarMeses('2026-01', 599))
    const duracaoMs = performance.now() - inicio
    expect(serie).toHaveLength(600)
    expect(duracaoMs).toBeLessThan(100)
  })
})
