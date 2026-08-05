import { describe, expect, it } from 'vitest'
import { configFinanceiraPadrao, metaPeDeMeiaCentavos, paraConfigProjecao, taxaRendimentoMensalDeCDI } from './config'

describe('taxaRendimentoMensalDeCDI', () => {
  it('CDI 0% dá taxa 0', () => {
    expect(taxaRendimentoMensalDeCDI(0, 100)).toBe(0)
  })

  it('desconta o IR de 22,5% sobre o rendimento bruto', () => {
    // CDI 12% a.a. equivale a ~0,9489% a.m. bruto (juros compostos)
    const taxa = taxaRendimentoMensalDeCDI(12, 100)
    const cdiMensalBruto = 1.12 ** (1 / 12) - 1
    expect(taxa).toBeCloseTo(cdiMensalBruto * 0.775, 6)
  })

  it('aplica o percentual do banco antes do IR', () => {
    const taxa100 = taxaRendimentoMensalDeCDI(12, 100)
    const taxa50 = taxaRendimentoMensalDeCDI(12, 50)
    expect(taxa50).toBeCloseTo(taxa100 / 2, 6)
  })
})

describe('metaPeDeMeiaCentavos', () => {
  it('multiplica meses pelo custo de sobrevivência', () => {
    const config = { ...configFinanceiraPadrao(), metaPeDeMeiaMeses: 6, custoSobrevivenciaCentavos: 500000 }
    expect(metaPeDeMeiaCentavos(config)).toBe(3000000)
  })
})

describe('paraConfigProjecao', () => {
  it('deriva os três campos que projetarMes consome', () => {
    const config = {
      ...configFinanceiraPadrao(),
      cdiAnualPercent: 12,
      percentualBanco: 100,
      taxaJurosDividaMensal: 0.08,
      metaPeDeMeiaMeses: 6,
      custoSobrevivenciaCentavos: 500000,
    }
    const derivado = paraConfigProjecao(config)
    expect(derivado.taxaJurosDividaMensal).toBe(0.08)
    expect(derivado.metaPeDeMeiaCentavos).toBe(3000000)
    expect(derivado.taxaRendimentoMensal).toBeGreaterThan(0)
  })
})
