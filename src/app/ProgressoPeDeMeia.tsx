import { useMemo } from 'react'
import { useEspaco } from './ContextoEspaco'
import { metaPeDeMeiaCentavos, paraConfigProjecao } from '../dominio/config'
import { formatarBRL } from '../dominio/dinheiro'
import { mesAtual } from '../dominio/mes'
import { projetarMes } from '../dominio/projecao'

export function ProgressoPeDeMeia() {
  const { dados } = useEspaco()

  const progresso = useMemo(() => {
    if (!dados) return null
    const { config } = dados
    const meta = metaPeDeMeiaCentavos(config)
    const atual = config.peDeMeiaAtualCentavos
    const faltam = Math.max(0, meta - atual)

    if (faltam === 0) return { meta, atual, faltam, mesesEstimados: 0 }

    // aporte deste mês, no ritmo atual — estimativa, não promessa (mesma
    // régua da curva de saldo: falácia da previsão).
    const resultado = projetarMes({
      mes: mesAtual(),
      estadoAnterior: { reserva: config.reservaAtualCentavos, peDeMeia: atual, divida: 0 },
      regras: dados.regras,
      config: paraConfigProjecao(config),
    })
    const aporteMensal = resultado.peDeMeiaFinal - atual
    const mesesEstimados = aporteMensal > 0 ? Math.ceil(faltam / aporteMensal) : null

    return { meta, atual, faltam, mesesEstimados }
  }, [dados])

  if (!progresso) return null

  if (progresso.faltam === 0) {
    return (
      <section className="progresso-pe-de-meia">
        <p>🎉 Pé de meia completo: {formatarBRL(progresso.atual)} de {formatarBRL(progresso.meta)}.</p>
      </section>
    )
  }

  return (
    <section className="progresso-pe-de-meia">
      <p>
        Faltam <strong>{formatarBRL(progresso.faltam)}</strong> para completar o pé de meia
        {progresso.mesesEstimados !== null && (
          <> — <strong>≈ {progresso.mesesEstimados} {progresso.mesesEstimados === 1 ? 'mês' : 'meses'}</strong> no ritmo atual</>
        )}
        .
      </p>
    </section>
  )
}
