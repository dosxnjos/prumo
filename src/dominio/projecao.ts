import { diffMeses, somarMeses } from './mes'
import { ocorreEm, valorEm } from './recorrencia'
import type { Fluxo, Mes, Regra } from './tipos'

export interface ConfigProjecao {
  /** Fração mensal, ex. 0.006 = 0,6%/mês — já líquida de IR. */
  taxaRendimentoMensal: number
  /** Fração mensal cobrada sobre a dívida remanescente. */
  taxaJurosDividaMensal: number
  metaPeDeMeiaCentavos: number
  /**
   * "Não vale a pena ficar no vermelho para manter o pé de meia" (aba `ℹ`).
   * `true` (default): saca reserva e depois pé de meia antes de endividar.
   * `false`: preserva as reservas e vai direto para a dívida.
   */
  sacarReservaAntesDeEndividar?: boolean
}

export interface EstadoFinanceiro {
  reserva: number
  peDeMeia: number
  divida: number
}

export interface Ocorrencia {
  regraId: string | null
  nome: string
  fluxo: Fluxo
  valorCentavos: number
}

export interface ResultadoProjecaoMes {
  ocorrencias: Ocorrencia[]
  totalEntradas: number
  totalSaidas: number
  saldo: number
  aporteReserva: number
  reservaFinal: number
  peDeMeiaFinal: number
  dividaFinal: number
  jurosPagos: number
}

export interface EntradaProjecaoMes {
  mes: Mes
  estadoAnterior: EstadoFinanceiro
  regras: Regra[]
  config: ConfigProjecao
}

function comRendimento(valor: number, taxa: number): number {
  return Math.round(valor * (1 + taxa))
}

export function projetarMes({ mes, estadoAnterior, regras, config }: EntradaProjecaoMes): ResultadoProjecaoMes {
  const reservaAntes = comRendimento(estadoAnterior.reserva, config.taxaRendimentoMensal)
  const peDeMeiaAntes = comRendimento(estadoAnterior.peDeMeia, config.taxaRendimentoMensal)

  const ocorrencias: Ocorrencia[] = regras
    .filter((r) => ocorreEm(r, mes))
    .map((r) => ({
      regraId: r.id,
      nome: r.nome,
      fluxo: r.fluxo,
      valorCentavos: valorEm(r, mes),
    }))

  let jurosPagos = 0
  if (estadoAnterior.divida > 0) {
    const dividaComJuros = comRendimento(estadoAnterior.divida, config.taxaJurosDividaMensal)
    jurosPagos = dividaComJuros - estadoAnterior.divida
    ocorrencias.push({
      regraId: null,
      nome: 'Dívida do mês anterior',
      fluxo: 'saida',
      valorCentavos: dividaComJuros,
    })
  }

  const totalEntradas = ocorrencias
    .filter((o) => o.fluxo === 'entrada')
    .reduce((soma, o) => soma + o.valorCentavos, 0)
  const totalSaidas = ocorrencias
    .filter((o) => o.fluxo === 'saida')
    .reduce((soma, o) => soma + o.valorCentavos, 0)
  const saldo = totalEntradas - totalSaidas

  if (saldo >= 0) {
    const espacoNaMeta = Math.max(0, config.metaPeDeMeiaCentavos - peDeMeiaAntes)
    const aportePeDeMeia = Math.min(saldo, espacoNaMeta)
    const aporteReserva = saldo - aportePeDeMeia

    return {
      ocorrencias,
      totalEntradas,
      totalSaidas,
      saldo,
      aporteReserva,
      reservaFinal: reservaAntes + aporteReserva,
      peDeMeiaFinal: peDeMeiaAntes + aportePeDeMeia,
      dividaFinal: 0,
      jurosPagos,
    }
  }

  const falta = -saldo
  const sacarAntes = config.sacarReservaAntesDeEndividar ?? true

  if (!sacarAntes) {
    return {
      ocorrencias,
      totalEntradas,
      totalSaidas,
      saldo,
      aporteReserva: 0,
      reservaFinal: reservaAntes,
      peDeMeiaFinal: peDeMeiaAntes,
      dividaFinal: falta,
      jurosPagos,
    }
  }

  const saqueReserva = Math.min(reservaAntes, falta)
  const faltaAposReserva = falta - saqueReserva
  const saquePeDeMeia = Math.min(peDeMeiaAntes, faltaAposReserva)
  const dividaFinal = faltaAposReserva - saquePeDeMeia

  return {
    ocorrencias,
    totalEntradas,
    totalSaidas,
    saldo,
    aporteReserva: -saqueReserva,
    reservaFinal: reservaAntes - saqueReserva,
    peDeMeiaFinal: peDeMeiaAntes - saquePeDeMeia,
    dividaFinal,
    jurosPagos,
  }
}

/**
 * Encadeia `projetarMes` de `mesInicio` até `mesFim`, memoizado por mês:
 * chamadas repetidas com o mesmo ponto de partida reaproveitam o prefixo já
 * calculado em vez de recomputar a série inteira.
 *
 * `mesInicio`/`estadoInicial` devem vir do último **fechamento** gravado
 * (Fase 4) quando existir um; até lá, vêm do mês/estado configurado pelo
 * usuário — quem decide isso é o chamador, não esta função.
 */
export function criarProjetorSerie(regras: Regra[], config: ConfigProjecao) {
  const cache = new Map<string, ResultadoProjecaoMes[]>()

  return function projetarSerie(
    mesInicio: Mes,
    estadoInicial: EstadoFinanceiro,
    mesFim: Mes,
  ): ResultadoProjecaoMes[] {
    const chave = `${mesInicio}|${estadoInicial.reserva}|${estadoInicial.peDeMeia}|${estadoInicial.divida}`
    let resultados = cache.get(chave)
    if (!resultados) {
      resultados = []
      cache.set(chave, resultados)
    }

    const totalNecessario = diffMeses(mesInicio, mesFim) + 1
    for (let i = resultados.length; i < totalNecessario; i++) {
      const mes = somarMeses(mesInicio, i)
      const estadoAnterior =
        i === 0
          ? estadoInicial
          : {
              reserva: resultados[i - 1].reservaFinal,
              peDeMeia: resultados[i - 1].peDeMeiaFinal,
              divida: resultados[i - 1].dividaFinal,
            }
      resultados.push(projetarMes({ mes, estadoAnterior, regras, config }))
    }

    return resultados.slice(0, totalNecessario)
  }
}
