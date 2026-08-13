import { useState } from 'react'
import { formatarBRL } from '../dominio/dinheiro'
import { rotulo } from '../dominio/mes'
import { Modal } from './Modal'
import { useSerieProjetada } from './useSerieProjetada'

const OPCOES_HORIZONTE = [12, 24, 60] as const

function formatarEixoY(centavos: number): string {
  const reais = Math.round(centavos / 100)
  return reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Mostra rótulo de mês só a cada N pontos, pra não empilhar texto. */
function passoRotuloX(totalMeses: number): number {
  if (totalMeses <= 12) return 1
  if (totalMeses <= 24) return 2
  return 6
}

interface Props {
  onFechar: () => void
}

export function TelaCurvaDetalhada({ onFechar }: Props) {
  const [horizonte, setHorizonte] = useState<(typeof OPCOES_HORIZONTE)[number]>(12)
  const serie = useSerieProjetada(horizonte)

  if (serie.length === 0) return null

  const valores = serie.map((p) => p.patrimonio)
  const min = Math.min(0, ...valores)
  const max = Math.max(0, ...valores)
  const amplitude = max - min || 1

  const LARGURA = 900
  const ALTURA = 260
  const PAD_ESQ = 76
  const PAD_DIR = 12
  const PAD_TOPO = 12
  const PAD_BAIXO = 28
  const LARGURA_PLOT = LARGURA - PAD_ESQ - PAD_DIR
  const ALTURA_PLOT = ALTURA - PAD_TOPO - PAD_BAIXO

  const passoX = LARGURA_PLOT / (serie.length - 1 || 1)
  const x = (i: number) => PAD_ESQ + i * passoX
  const y = (valor: number) => PAD_TOPO + ALTURA_PLOT - ((valor - min) / amplitude) * ALTURA_PLOT

  const pontos = serie.map((p, i) => `${x(i)},${y(p.patrimonio)}`).join(' ')

  const TICKS_Y = 4
  const ticksY = Array.from({ length: TICKS_Y + 1 }, (_, i) => min + (amplitude * i) / TICKS_Y)

  const passoRotulo = passoRotuloX(serie.length)

  return (
    <Modal onFechar={onFechar} className="curva-detalhada" titulo="Curva de saldo — mês a mês">
        <div className="curva-detalhada-cabecalho">
          <h2>Curva de saldo — mês a mês</h2>
          <button type="button" onClick={onFechar}>fechar</button>
        </div>

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

        <svg
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="grafico-curva grafico-curva-grande"
          role="img"
          aria-label="curva de saldo projetado, mês a mês"
        >
          {ticksY.map((valor) => (
            <g key={valor}>
              <line x1={PAD_ESQ} y1={y(valor)} x2={LARGURA - PAD_DIR} y2={y(valor)} className="linha-grade" />
              <text x={PAD_ESQ - 8} y={y(valor)} className="rotulo-eixo-y" textAnchor="end" dominantBaseline="middle">
                R$ {formatarEixoY(valor)}
              </text>
            </g>
          ))}

          <polyline points={pontos} className="linha-curva" fill="none" />

          {serie.map((p, i) => (
            <circle
              key={p.mes}
              cx={x(i)}
              cy={y(p.patrimonio)}
              r={i === 0 ? 4 : 2.5}
              className={i === 0 ? 'ponto-hoje' : 'ponto-mes'}
            />
          ))}

          {serie.map((p, i) =>
            i % passoRotulo === 0 || i === serie.length - 1 ? (
              <text key={p.mes} x={x(i)} y={ALTURA - 6} className="rotulo-eixo-x" textAnchor="middle">
                {rotulo(p.mes)}
              </text>
            ) : null,
          )}
        </svg>

        <p className="legenda-curva">
          ⚠️ tudo aqui é <strong>estimativa</strong> — o fechamento mensal (Fase 4)
          ainda não existe para ancorar a série no realizado.
        </p>

        <div className="tabela-curva-wrapper">
          <table className="tabela-curva">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Saldo</th>
                <th>Patrimônio</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((p, i) => (
                <tr key={p.mes} className={i === 0 ? 'mes-atual' : ''}>
                  <td>{rotulo(p.mes)}</td>
                  <td className="valor entrada">{formatarBRL(p.totalEntradas)}</td>
                  <td className="valor saida">{formatarBRL(p.totalSaidas)}</td>
                  <td className={p.saldo >= 0 ? 'saldo positivo' : 'saldo negativo'}>
                    {formatarBRL(p.saldo)}
                  </td>
                  <td>{formatarBRL(p.patrimonio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </Modal>
  )
}
