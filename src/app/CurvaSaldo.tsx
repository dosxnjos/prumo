import { useState } from 'react'
import { formatarBRL } from '../dominio/dinheiro'
import { rotulo } from '../dominio/mes'
import { useSerieProjetada } from './useSerieProjetada'

const OPCOES_HORIZONTE = [12, 24, 60] as const

interface Props {
  onVerDetalhes: () => void
}

export function CurvaSaldo({ onVerDetalhes }: Props) {
  const [horizonte, setHorizonte] = useState<(typeof OPCOES_HORIZONTE)[number]>(12)
  const serie = useSerieProjetada(horizonte)

  if (serie.length === 0) return null

  const valores = serie.map((p) => p.patrimonio)
  const min = Math.min(0, ...valores)
  const max = Math.max(0, ...valores)
  const amplitude = max - min || 1

  const LARGURA = 600
  const ALTURA = 160
  const pontos = serie
    .map((p, i) => {
      const x = (i / (serie.length - 1 || 1)) * LARGURA
      const y = ALTURA - ((p.patrimonio - min) / amplitude) * ALTURA
      return `${x},${y}`
    })
    .join(' ')

  const yZero = ALTURA - ((0 - min) / amplitude) * ALTURA

  return (
    <section className="curva-saldo">
      <div className="curva-cabecalho">
        <h2>Curva de saldo projetado</h2>
        <div className="opcoes-horizonte">
          {OPCOES_HORIZONTE.map((n) => (
            <button
              key={n}
              type="button"
              className={n === horizonte ? 'selecionado' : ''}
              onClick={() => setHorizonte(n)}
            >
              {n}m
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="grafico-curva" role="img" aria-label="curva de saldo projetado">
        <line x1={0} y1={yZero} x2={LARGURA} y2={yZero} className="linha-zero" />
        <polyline points={pontos} className="linha-curva" fill="none" />
        {/* ponto de virada previsto→estimado: hoje, único ponto real possível
            sem Fase 4 (fechamento) — a partir daqui tudo é estimativa. */}
        <circle cx={0} cy={ALTURA - ((serie[0].patrimonio - min) / amplitude) * ALTURA} r={4} className="ponto-hoje" />
      </svg>

      <p className="legenda-curva">
        ⚠️ tudo aqui é <strong>estimativa</strong> — o fechamento mensal (Fase 4)
        ainda não existe para ancorar a série no realizado.
      </p>

      <div className="extremos-curva">
        <span>{rotulo(serie[0].mes)}: {formatarBRL(serie[0].patrimonio)}</span>
        <span>{rotulo(serie[serie.length - 1].mes)}: {formatarBRL(serie[serie.length - 1].patrimonio)}</span>
      </div>

      <button type="button" className="ver-detalhes" onClick={onVerDetalhes}>
        ver mês a mês
      </button>
    </section>
  )
}
