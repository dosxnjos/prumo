import { useState } from 'react'
import { formatarBRL } from '../dominio/dinheiro'
import { rotulo } from '../dominio/mes'
import { useSerieProjetada } from './useSerieProjetada'

const OPCOES_HORIZONTE = [12, 24, 60] as const

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
  const passoX = LARGURA / (serie.length - 1 || 1)
  const pontos = serie
    .map((p, i) => {
      const x = i * passoX
      const y = ALTURA - ((p.patrimonio - min) / amplitude) * ALTURA
      return `${x},${y}`
    })
    .join(' ')
  const yZero = ALTURA - ((0 - min) / amplitude) * ALTURA

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="curva-detalhada">
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
          <line x1={0} y1={yZero} x2={LARGURA} y2={yZero} className="linha-zero" />
          <polyline points={pontos} className="linha-curva" fill="none" />
          {serie.map((p, i) => (
            <circle
              key={p.mes}
              cx={i * passoX}
              cy={ALTURA - ((p.patrimonio - min) / amplitude) * ALTURA}
              r={i === 0 ? 4 : 2.5}
              className={i === 0 ? 'ponto-hoje' : 'ponto-mes'}
            />
          ))}
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
      </div>
    </div>
  )
}
