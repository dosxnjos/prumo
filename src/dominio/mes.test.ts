import { describe, expect, it } from 'vitest'
import { diffMeses, intervalo, rotulo, somarMeses } from './mes'

describe('somarMeses', () => {
  it('soma dentro do mesmo ano', () => {
    expect(somarMeses('2026-03', 2)).toBe('2026-05')
  })

  it('vira o ano para frente', () => {
    expect(somarMeses('2026-11', 3)).toBe('2027-02')
  })

  it('vira o ano para trás com n negativo', () => {
    expect(somarMeses('2026-01', -2)).toBe('2025-11')
  })

  it('n negativo dentro do mesmo ano', () => {
    expect(somarMeses('2026-06', -1)).toBe('2026-05')
  })

  it('n = 0 devolve o mesmo mês', () => {
    expect(somarMeses('2026-08', 0)).toBe('2026-08')
  })
})

describe('diffMeses', () => {
  it('diferença positiva', () => {
    expect(diffMeses('2026-01', '2026-06')).toBe(5)
  })

  it('diferença negativa', () => {
    expect(diffMeses('2026-06', '2026-01')).toBe(-5)
  })

  it('diferença atravessando virada de ano', () => {
    expect(diffMeses('2025-11', '2026-02')).toBe(3)
  })

  it('mesmo mês dá zero', () => {
    expect(diffMeses('2026-05', '2026-05')).toBe(0)
  })
})

describe('intervalo', () => {
  it('gera a sequência de meses, inclusive nas pontas', () => {
    expect(intervalo('2026-11', '2027-02')).toEqual([
      '2026-11', '2026-12', '2027-01', '2027-02',
    ])
  })

  it('intervalo invertido devolve lista vazia', () => {
    expect(intervalo('2026-05', '2026-01')).toEqual([])
  })

  it('intervalo de um mês só devolve um item', () => {
    expect(intervalo('2026-05', '2026-05')).toEqual(['2026-05'])
  })
})

describe('rotulo', () => {
  it('formata como abreviação/ano', () => {
    expect(rotulo('2026-09')).toBe('set/2026')
  })

  it('formata janeiro corretamente', () => {
    expect(rotulo('2027-01')).toBe('jan/2027')
  })
})
