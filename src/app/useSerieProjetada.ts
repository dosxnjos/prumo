import { useMemo } from 'react'
import { useEspaco } from './ContextoEspaco'
import { paraConfigProjecao } from '../dominio/config'
import { mesAtual, somarMeses } from '../dominio/mes'
import { criarProjetorSerie } from '../dominio/projecao'
import type { Mes } from '../dominio/tipos'

export interface PontoSerie {
  mes: Mes
  totalEntradas: number
  totalSaidas: number
  saldo: number
  patrimonio: number
}

/** Série projetada a partir de hoje, com o estado atual configurado (Fase 6). */
export function useSerieProjetada(horizonte: number): PontoSerie[] {
  const { dados } = useEspaco()

  return useMemo(() => {
    if (!dados) return []
    const inicio = mesAtual()
    const fim = somarMeses(inicio, horizonte - 1)
    const estadoInicial = {
      reserva: dados.config.reservaAtualCentavos,
      peDeMeia: dados.config.peDeMeiaAtualCentavos,
      divida: 0,
    }
    const projetarSerie = criarProjetorSerie(dados.regras, paraConfigProjecao(dados.config))
    return projetarSerie(inicio, estadoInicial, fim).map((r, i) => ({
      mes: somarMeses(inicio, i),
      totalEntradas: r.totalEntradas,
      totalSaidas: r.totalSaidas,
      saldo: r.saldo,
      patrimonio: r.reservaFinal + r.peDeMeiaFinal - r.dividaFinal,
    }))
  }, [dados, horizonte])
}
