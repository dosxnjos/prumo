import { useMemo, useState } from 'react'
import { useEspaco } from './useEspaco'
import { formatarBRL } from '../dominio/dinheiro'
import { mesAtual, rotulo, somarMeses } from '../dominio/mes'
import { ocorreEm, valorEm } from '../dominio/recorrencia'
import type { Mes, Regra } from '../dominio/tipos'

const LIMITE_LISTA = 200

interface OcorrenciaExibida {
  regra: Regra
  valorCentavos: number
}

function agruparPorMembro(ocorrencias: OcorrenciaExibida[]) {
  const grupos = new Map<string, OcorrenciaExibida[]>()
  for (const oc of ocorrencias) {
    const chave = oc.regra.membroId
    grupos.set(chave, [...(grupos.get(chave) ?? []), oc])
  }
  return grupos
}

interface Props {
  onEditarRegra: (regra: Regra | null) => void
  onAjustarOcorrencia: (regra: Regra, mes: Mes) => void
}

export function TelaMes({ onEditarRegra, onAjustarOcorrencia }: Props) {
  const { espacoAtivo, dados } = useEspaco()
  const [mes, setMes] = useState<Mes>(mesAtual())
  const [visiveis, setVisiveis] = useState(LIMITE_LISTA)

  const regras = dados?.regras ?? []

  const ocorrencias = useMemo<OcorrenciaExibida[]>(() => {
    return regras
      .filter((r) => ocorreEm(r, mes))
      .map((r) => ({ regra: r, valorCentavos: valorEm(r, mes) }))
  }, [regras, mes])

  const totalEntradas = ocorrencias
    .filter((o) => o.regra.fluxo === 'entrada')
    .reduce((soma, o) => soma + o.valorCentavos, 0)
  const totalSaidas = ocorrencias
    .filter((o) => o.regra.fluxo === 'saida')
    .reduce((soma, o) => soma + o.valorCentavos, 0)
  const saldo = totalEntradas - totalSaidas

  const grupos = agruparPorMembro(ocorrencias.slice(0, visiveis))
  const cortou = ocorrencias.length > visiveis

  function nomeMembro(membroId: string): string {
    if (membroId === 'compartilhado') return 'Compartilhado'
    return espacoAtivo?.membros.find((m) => m.id === membroId)?.nome ?? 'Sem dono'
  }

  function corMembro(membroId: string): string {
    return espacoAtivo?.membros.find((m) => m.id === membroId)?.cor ?? '#888'
  }

  return (
    <div className="tela-mes">
      <header className="cabecalho-mes">
        <button type="button" aria-label="mês anterior" onClick={() => setMes((m) => somarMeses(m, -1))}>
          ‹
        </button>
        <div className="mes-atual">
          <strong>{rotulo(mes)}</strong>
          <input
            type="month"
            aria-label="pular para mês"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
          />
        </div>
        <button type="button" aria-label="mês seguinte" onClick={() => setMes((m) => somarMeses(m, 1))}>
          ›
        </button>
      </header>

      <div className="resumo-mes">
        <span className="entradas">Entradas: {formatarBRL(totalEntradas)}</span>
        <span className="saidas">Saídas: {formatarBRL(totalSaidas)}</span>
        <span className={saldo >= 0 ? 'saldo positivo' : 'saldo negativo'}>
          Saldo: {formatarBRL(saldo)}
        </span>
      </div>

      <button type="button" className="nova-regra" onClick={() => onEditarRegra(null)}>
        + novo item
      </button>

      {[...grupos.entries()].map(([membroId, itens]) => (
        <section key={membroId} className="grupo-membro">
          <h2 style={{ borderColor: corMembro(membroId) }}>{nomeMembro(membroId)}</h2>
          <ul>
            {itens.map((oc) => (
              <li key={oc.regra.id} className={oc.regra.excecoes[mes] ? 'ajustado' : ''}>
                <button type="button" onClick={() => onEditarRegra(oc.regra)} className="nome-item">
                  {oc.regra.nome}
                  {oc.regra.excecoes[mes] && <span className="marca-ajuste" title="ajustado neste mês">✎</span>}
                </button>
                <span className={oc.regra.fluxo === 'entrada' ? 'valor entrada' : 'valor saida'}>
                  {oc.regra.fluxo === 'saida' ? '−' : '+'}
                  {formatarBRL(oc.valorCentavos)}
                </span>
                <button type="button" className="ajustar" onClick={() => onAjustarOcorrencia(oc.regra, mes)}>
                  ajustar este mês
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {ocorrencias.length === 0 && <p className="vazio">Nenhum item neste mês.</p>}

      {cortou && (
        <button type="button" onClick={() => setVisiveis((v) => v + LIMITE_LISTA)}>
          carregar mais ({ocorrencias.length - visiveis} restantes)
        </button>
      )}
    </div>
  )
}
