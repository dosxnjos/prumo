import { useState } from 'react'
import { useEspaco } from './useEspaco'
import { paraCentavos } from '../dominio/dinheiro'
import { rotulo } from '../dominio/mes'
import type { Mes, Regra } from '../dominio/tipos'

interface Props {
  regra: Regra
  mes: Mes
  onFechar: () => void
}

export function AjustePontual({ regra, mes, onFechar }: Props) {
  const { espacoAtivo, dados, salvarRegras } = useEspaco()
  const excecaoAtual = regra.excecoes[mes]
  const [pular, setPular] = useState(excecaoAtual?.pular === true)
  const [valorTexto, setValorTexto] = useState(
    excecaoAtual?.valorCentavos !== undefined
      ? (excecaoAtual.valorCentavos / 100).toFixed(2).replace('.', ',')
      : (regra.valorCentavos / 100).toFixed(2).replace('.', ','),
  )
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!dados || !espacoAtivo) return
    setErro(null)

    const novasExcecoes = { ...regra.excecoes }
    if (pular) {
      novasExcecoes[mes] = { pular: true }
    } else {
      try {
        novasExcecoes[mes] = { valorCentavos: paraCentavos(valorTexto) }
      } catch {
        setErro('valor inválido')
        return
      }
    }

    const regraAtualizada = { ...regra, excecoes: novasExcecoes, atualizadoEm: new Date().toISOString() }
    await salvarRegras(espacoAtivo.id, dados.regras.map((r) => (r.id === regra.id ? regraAtualizada : r)))
    onFechar()
  }

  async function removerAjuste() {
    if (!dados || !espacoAtivo) return
    const { [mes]: _removido, ...resto } = regra.excecoes
    const regraAtualizada = { ...regra, excecoes: resto, atualizadoEm: new Date().toISOString() }
    await salvarRegras(espacoAtivo.id, dados.regras.map((r) => (r.id === regra.id ? regraAtualizada : r)))
    onFechar()
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="ajuste-pontual">
        <h2>Ajustar {regra.nome}</h2>
        <p className="subtitulo">só em {rotulo(mes)} — os outros meses continuam iguais</p>

        <label>
          <input type="checkbox" checked={pular} onChange={(e) => setPular(e.target.checked)} />
          pular este mês
        </label>

        {!pular && (
          <label>
            valor neste mês
            <input value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} inputMode="decimal" />
          </label>
        )}

        {erro && <p className="erro">{erro}</p>}

        <div className="acoes">
          {excecaoAtual && (
            <button type="button" className="apagar" onClick={removerAjuste}>
              remover ajuste
            </button>
          )}
          <button type="button" onClick={onFechar}>
            cancelar
          </button>
          <button type="button" className="salvar" onClick={salvar}>
            salvar
          </button>
        </div>
      </div>
    </div>
  )
}
