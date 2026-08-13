import type { ConfigProjecao } from './projecao'

const ALIQUOTA_IR = 0.225

/**
 * Configuração financeira que o usuário digita (por espaço). É a partir
 * dela que se deriva `ConfigProjecao` (o que `projetarMes` consome) — o
 * usuário nunca digita `taxaRendimentoMensal` direto, digita CDI e % do
 * banco, como a planilha antiga fazia.
 */
export interface ConfigFinanceira {
  /** CDI ao ano, em %. Ex.: 10.5 */
  cdiAnualPercent: number
  /** % do CDI que o banco paga. Ex.: 100 */
  percentualBanco: number
  /** Fração mensal cobrada sobre a dívida remanescente. */
  taxaJurosDividaMensal: number
  metaPeDeMeiaMeses: number
  /** Manual — a derivação automática a partir dos essenciais fica para depois. */
  custoSobrevivenciaCentavos: number
  /** Estado atual, digitado manualmente — Fase 4 (fechamento) ainda não existe. */
  peDeMeiaAtualCentavos: number
  reservaAtualCentavos: number
  /**
   * U3: carimbo do último export de backup, ISO. Opcional — schema v1
   * intocado (restrição nº1 do roadmap); backup antigo sem o campo lê
   * `undefined` e o rótulo vira "nunca" (`rotuloRelativo`).
   */
  ultimoBackupEm?: string
}

export function configFinanceiraPadrao(): ConfigFinanceira {
  return {
    cdiAnualPercent: 0,
    percentualBanco: 100,
    taxaJurosDividaMensal: 0,
    metaPeDeMeiaMeses: 6,
    custoSobrevivenciaCentavos: 0,
    peDeMeiaAtualCentavos: 0,
    reservaAtualCentavos: 0,
  }
}

/** CDI a.a. → taxa mensal líquida (% do banco aplicado, IR de 22,5% descontado). */
export function taxaRendimentoMensalDeCDI(cdiAnualPercent: number, percentualBanco: number): number {
  const cdiMensal = (1 + cdiAnualPercent / 100) ** (1 / 12) - 1
  const bruta = cdiMensal * (percentualBanco / 100)
  return bruta * (1 - ALIQUOTA_IR)
}

export function metaPeDeMeiaCentavos(config: ConfigFinanceira): number {
  return Math.round(config.metaPeDeMeiaMeses * config.custoSobrevivenciaCentavos)
}

export function paraConfigProjecao(config: ConfigFinanceira): ConfigProjecao {
  return {
    taxaRendimentoMensal: taxaRendimentoMensalDeCDI(config.cdiAnualPercent, config.percentualBanco),
    taxaJurosDividaMensal: config.taxaJurosDividaMensal,
    metaPeDeMeiaCentavos: metaPeDeMeiaCentavos(config),
  }
}
