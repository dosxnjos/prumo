import { describe, expect, it } from 'vitest'
import { formatarBRL, paraCentavos, ratear, somar } from './dinheiro'

describe('paraCentavos', () => {
  it('converte string com vírgula decimal', () => {
    expect(paraCentavos('350,00')).toBe(35000)
  })

  it('converte string com separador de milhar', () => {
    expect(paraCentavos('1.234,56')).toBe(123456)
  })

  it('rejeita valor inválido', () => {
    expect(() => paraCentavos('abc')).toThrow()
  })
})

describe('formatarBRL', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatarBRL(35000)).toBe('R$ 350,00')
  })
})

describe('somar', () => {
  it('soma uma lista de centavos', () => {
    expect(somar(100, 200, 300)).toBe(600)
  })

  it('soma vazia dá zero', () => {
    expect(somar()).toBe(0)
  })
})

describe('ratear', () => {
  it('distribui o resto sem perder centavo', () => {
    const partes = ratear(35000, 3)
    expect(partes).toEqual([11667, 11667, 11666])
    expect(somar(...partes)).toBe(35000)
  })

  it('divide exato sem resto', () => {
    expect(ratear(300, 3)).toEqual([100, 100, 100])
  })

  it('rejeita partes <= 0', () => {
    expect(() => ratear(100, 0)).toThrow()
  })
})
