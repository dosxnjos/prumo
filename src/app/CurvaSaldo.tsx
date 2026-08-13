import { useId, useState } from 'react'
import { formatarBRL } from '../dominio/dinheiro'
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
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null)
  const idClip = useId()

  if (serie.length === 0) return null

  const valores = serie.map((p) => p.patrimonio)
  const min = Math.min(0, ...valores)
  const max = Math.max(0, ...valores)
  const amplitude = max - min || 1

  const LARGURA = 600
  const ALTURA = 160
  const PAD_ESQ = 64
  const PAD_DIR = 8
  const PAD_BAIXO = 20
  const LARGURA_PLOT = LARGURA - PAD_ESQ - PAD_DIR
  const ALTURA_PLOT = ALTURA - PAD_BAIXO

  const passoX = LARGURA_PLOT / (serie.length - 1 || 1)
  const x = (i: number) => PAD_ESQ + i * passoX
  const y = (valor: number) => ALTURA_PLOT - ((valor - min) / amplitude) * ALTURA_PLOT

  const pontos = serie.map((p, i) => `${x(i)},${y(p.patrimonio)}`).join(' ')
  const yZero = y(0)
  const areaPath = `M${x(0)},${yZero} L${pontos.replace(/ /g, ' L')} L${x(serie.length - 1)},${yZero} Z`

  const ativo = indiceAtivo !== null ? serie[indiceAtivo] : null

  function aoMoverPonteiro(clientX: number, retangulo: DOMRect) {
    const relativo = ((clientX - retangulo.left) / retangulo.width) * LARGURA
    const indice = Math.round((relativo - PAD_ESQ) / passoX)
    setIndiceAtivo(Math.max(0, Math.min(serie.length - 1, indice)))
  }

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

      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="grafico-curva"
        role="img"
        aria-label="curva de saldo projetado"
        onPointerMove={(e) => aoMoverPonteiro(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setIndiceAtivo(null)}
        onClick={(e) => aoMoverPonteiro(e.clientX, e.currentTarget.getBoundingClientRect())}
      >
        <defs>
          <clipPath id={`${idClip}-pos`}>
            <rect x="0" y="0" width={LARGURA} height={yZero} />
          </clipPath>
          <clipPath id={`${idClip}-neg`}>
            <rect x="0" y={yZero} width={LARGURA} height={ALTURA - yZero} />
          </clipPath>
        </defs>

        <text x={PAD_ESQ - 8} y={y(max)} className="rotulo-eixo-y" textAnchor="end" dominantBaseline="middle">
          R$ {formatarEixoY(max)}
        </text>
        <text x={PAD_ESQ - 8} y={y(min)} className="rotulo-eixo-y" textAnchor="end" dominantBaseline="middle">
          R$ {formatarEixoY(min)}
        </text>

        <path d={areaPath} className="area-curva area-positiva" clipPath={`url(#${idClip}-pos)`} />
        <path d={areaPath} className="area-curva area-negativa" clipPath={`url(#${idClip}-neg)`} />

        <line x1={PAD_ESQ} y1={yZero} x2={LARGURA} y2={yZero} className="linha-zero" />
        <polyline points={pontos} className="linha-curva" fill="none" clipPath={`url(#${idClip}-pos)`} />
        <polyline points={pontos} className="linha-curva linha-curva-negativa" fill="none" clipPath={`url(#${idClip}-neg)`} />

        {/* ponto de virada previsto→estimado: hoje, único ponto real possível
            sem Fase 4 (fechamento) — a partir daqui tudo é estimativa. */}
        <circle cx={x(0)} cy={y(serie[0].patrimonio)} r={4} className="ponto-hoje" />

        {ativo && indiceAtivo !== null && (
          <>
            <line x1={x(indiceAtivo)} y1={0} x2={x(indiceAtivo)} y2={ALTURA_PLOT} className="linha-guia" />
            <circle
              cx={x(indiceAtivo)}
              cy={y(ativo.patrimonio)}
              r={4}
              className={ativo.patrimonio >= 0 ? 'ponto-ativo positivo' : 'ponto-ativo negativo'}
            />
          </>
        )}

        <text x={PAD_ESQ} y={ALTURA} className="rotulo-eixo-x" textAnchor="start">
          {rotulo(serie[0].mes)}
        </text>
        <text x={LARGURA - PAD_DIR} y={ALTURA} className="rotulo-eixo-x" textAnchor="end">
          {rotulo(serie[serie.length - 1].mes)}
        </text>
      </svg>

      {ativo && (
        <p className="tooltip-curva">
          <strong>{rotulo(ativo.mes)}</strong> — <span className="valor">{formatarBRL(ativo.patrimonio)}</span>
        </p>
      )}

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
