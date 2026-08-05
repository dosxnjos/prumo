import { useState } from 'react'
import { rotulo } from '../dominio/mes'
import { useSerieProjetada } from './useSerieProjetada'

const OPCOES_HORIZONTE = [12, 24, 60] as const

function formatarEixoY(centavos: number): string {
  const reais = Math.round(centavos / 100)
  return reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

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
  const PAD_ESQ = 64
  const PAD_BAIXO = 20
  const LARGURA_PLOT = LARGURA - PAD_ESQ
  const ALTURA_PLOT = ALTURA - PAD_BAIXO

  const passoX = LARGURA_PLOT / (serie.length - 1 || 1)
  const x = (i: number) => PAD_ESQ + i * passoX
  const y = (valor: number) => ALTURA_PLOT - ((valor - min) / amplitude) * ALTURA_PLOT

  const pontos = serie.map((p, i) => `${x(i)},${y(p.patrimonio)}`).join(' ')
  const yZero = y(0)

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
        <text x={PAD_ESQ - 8} y={y(max)} className="rotulo-eixo-y" textAnchor="end" dominantBaseline="middle">
          R$ {formatarEixoY(max)}
        </text>
        <text x={PAD_ESQ - 8} y={y(min)} className="rotulo-eixo-y" textAnchor="end" dominantBaseline="middle">
          R$ {formatarEixoY(min)}
        </text>

        <line x1={PAD_ESQ} y1={yZero} x2={LARGURA} y2={yZero} className="linha-zero" />
        <polyline points={pontos} className="linha-curva" fill="none" />
        {/* ponto de virada previsto→estimado: hoje, único ponto real possível
            sem Fase 4 (fechamento) — a partir daqui tudo é estimativa. */}
        <circle cx={x(0)} cy={y(serie[0].patrimonio)} r={4} className="ponto-hoje" />

        <text x={PAD_ESQ} y={ALTURA} className="rotulo-eixo-x" textAnchor="start">
          {rotulo(serie[0].mes)}
        </text>
        <text x={LARGURA} y={ALTURA} className="rotulo-eixo-x" textAnchor="end">
          {rotulo(serie[serie.length - 1].mes)}
        </text>
      </svg>

      <p className="legenda-curva">
        ⚠️ tudo aqui é <strong>estimativa</strong> — o fechamento mensal (Fase 4)
        ainda não existe para ancorar a série no realizado.
      </p>

      <button type="button" className="ver-detalhes" onClick={onVerDetalhes}>
        ver mês a mês
      </button>
    </section>
  )
}
