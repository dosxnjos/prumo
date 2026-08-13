import { describe, expect, it } from 'vitest'
import { diasDesde, rotuloRelativo } from './tempoRelativo'

const AGORA = new Date('2026-08-13T12:00:00.000Z')

describe('rotuloRelativo (U3)', () => {
  it('sem data: "nunca"', () => {
    expect(rotuloRelativo(undefined, AGORA)).toBe('nunca')
  })

  it('mesmo dia: "hoje"', () => {
    expect(rotuloRelativo('2026-08-13T08:00:00.000Z', AGORA)).toBe('hoje')
  })

  it('um dia antes: "ontem"', () => {
    expect(rotuloRelativo('2026-08-12T08:00:00.000Z', AGORA)).toBe('ontem')
  })

  it('dentro do mês: "há N dias"', () => {
    expect(rotuloRelativo('2026-08-01T08:00:00.000Z', AGORA)).toBe('há 12 dias')
  })

  it('mais de 30 dias: "há N meses"', () => {
    expect(rotuloRelativo('2026-06-01T08:00:00.000Z', AGORA)).toBe('há 2 meses')
  })

  it('exatamente 1 mês: singular', () => {
    expect(rotuloRelativo('2026-07-10T08:00:00.000Z', AGORA)).toBe('há 1 mês')
  })
})

describe('diasDesde', () => {
  it('conta dias de calendário, não 24h corridas', () => {
    // mesmo horário do dia, 3 dias de diferença — sempre 3, sem depender de
    // qual timezone a máquina de teste está (evita virada de dia por UTC).
    expect(diasDesde('2026-08-10T12:00:00.000Z', new Date('2026-08-13T12:00:00.000Z'))).toBe(3)
  })
})
