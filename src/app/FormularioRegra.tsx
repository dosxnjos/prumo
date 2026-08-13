import { useState } from 'react'
import { useEspaco } from './useEspaco'
import { formatarBRL, paraCentavos } from '../dominio/dinheiro'
import { mesAtual } from '../dominio/mes'
import type { Fluxo, Mes, Recorrencia, Regra } from '../dominio/tipos'

type TipoRecorrenciaUI = 'todo-mes' | 'periodo' | 'unica' | 'periodica' | 'parcelada'

function tipoUIDaRegra(recorrencia: Recorrencia): TipoRecorrenciaUI {
  if (recorrencia.tipo === 'unica') return 'unica'
  if (recorrencia.tipo === 'periodica') return 'periodica'
  if (recorrencia.tipo === 'parcelada') return 'parcelada'
  return recorrencia.fim === null ? 'todo-mes' : 'periodo'
}

interface Props {
  regra: Regra | null
  onFechar: () => void
}

export function FormularioRegra({ regra, onFechar }: Props) {
  const { espacoAtivo, dados, salvarRegras } = useEspaco()
  const editando = regra !== null

  const [nome, setNome] = useState(regra?.nome ?? '')
  const [fluxo, setFluxo] = useState<Fluxo>(regra?.fluxo ?? 'saida')
  const [membroId, setMembroId] = useState(regra?.membroId ?? 'compartilhado')
  const [categoria, setCategoria] = useState(regra?.categoria ?? '')
  const [valorTexto, setValorTexto] = useState(
    regra ? (regra.valorCentavos / 100).toFixed(2).replace('.', ',') : '',
  )
  const [tipoUI, setTipoUI] = useState<TipoRecorrenciaUI>(
    regra ? tipoUIDaRegra(regra.recorrencia) : 'todo-mes',
  )
  const [inicio, setInicio] = useState<Mes>(
    regra && 'inicio' in regra.recorrencia ? regra.recorrencia.inicio : mesAtual(),
  )
  const [fim, setFim] = useState<Mes>(
    regra && 'fim' in regra.recorrencia && regra.recorrencia.fim ? regra.recorrencia.fim : mesAtual(),
  )
  const [mesUnico, setMesUnico] = useState<Mes>(
    regra?.recorrencia.tipo === 'unica' ? regra.recorrencia.mes : mesAtual(),
  )
  const [aCadaMeses, setACadaMeses] = useState(
    regra?.recorrencia.tipo === 'periodica' ? regra.recorrencia.aCadaMeses : 3,
  )
  const [parcelas, setParcelas] = useState(
    regra?.recorrencia.tipo === 'parcelada' ? regra.recorrencia.parcelas : 6,
  )
  const [erro, setErro] = useState<string | null>(null)

  function construirRecorrencia(): Recorrencia {
    switch (tipoUI) {
      case 'todo-mes':
        return { tipo: 'mensal', inicio, fim: null }
      case 'periodo':
        return { tipo: 'mensal', inicio, fim }
      case 'unica':
        return { tipo: 'unica', mes: mesUnico }
      case 'periodica':
        return { tipo: 'periodica', inicio, fim: null, aCadaMeses }
      case 'parcelada':
        return { tipo: 'parcelada', inicio, parcelas }
    }
  }

  async function salvar() {
    setErro(null)
    if (!nome.trim()) {
      setErro('dá um nome pro item')
      return
    }
    let valorCentavos: number
    try {
      valorCentavos = paraCentavos(valorTexto)
    } catch {
      setErro('valor inválido')
      return
    }
    if (!espacoAtivo || !dados) return

    const agora = new Date().toISOString()
    const regraFinal: Regra = regra
      ? { ...regra, nome, fluxo, membroId, categoria, valorCentavos, recorrencia: construirRecorrencia(), atualizadoEm: agora }
      : {
          id: crypto.randomUUID(),
          espacoId: espacoAtivo.id,
          nome,
          fluxo,
          membroId,
          categoria,
          valorCentavos,
          recorrencia: construirRecorrencia(),
          pagamento: { tipo: 'conta' },
          ativa: true,
          excecoes: {},
          criadoEm: agora,
          atualizadoEm: agora,
        }

    const novasRegras = editando
      ? dados.regras.map((r) => (r.id === regraFinal.id ? regraFinal : r))
      : [...dados.regras, regraFinal]
    await salvarRegras(espacoAtivo.id, novasRegras)
    onFechar()
  }

  async function apagar() {
    if (!regra || !dados || !espacoAtivo) return
    await salvarRegras(espacoAtivo.id, dados.regras.filter((r) => r.id !== regra.id))
    onFechar()
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="formulario-regra">
        <h2>{editando ? 'Editar item' : 'Novo item'}</h2>

        <label>
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex. Aluguel" />
        </label>

        <label>
          Tipo
          <select value={fluxo} onChange={(e) => setFluxo(e.target.value as Fluxo)}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <label>
          Dono
          <select value={membroId} onChange={(e) => setMembroId(e.target.value)}>
            <option value="compartilhado">Compartilhado</option>
            {espacoAtivo?.membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Categoria
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="ex. moradia" />
        </label>

        <label>
          Valor
          <input
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
          />
        </label>

        <fieldset>
          <legend>Quando acontece</legend>

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'todo-mes'} onChange={() => setTipoUI('todo-mes')} />
            todo mês, a partir de
            {tipoUI === 'todo-mes' && (
              <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            )}
          </label>

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'periodo'} onChange={() => setTipoUI('periodo')} />
            de
            {tipoUI === 'periodo' && (
              <>
                <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
                até
                <input type="month" value={fim} onChange={(e) => setFim(e.target.value)} />
              </>
            )}
          </label>

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'unica'} onChange={() => setTipoUI('unica')} />
            só em
            {tipoUI === 'unica' && (
              <input type="month" value={mesUnico} onChange={(e) => setMesUnico(e.target.value)} />
            )}
          </label>

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'periodica'} onChange={() => setTipoUI('periodica')} />
            a cada
            {tipoUI === 'periodica' && (
              <>
                <input
                  type="number"
                  min={1}
                  value={aCadaMeses}
                  onChange={(e) => setACadaMeses(Number(e.target.value))}
                  style={{ width: '3em' }}
                />
                meses, a partir de
                <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </>
            )}
          </label>

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'parcelada'} onChange={() => setTipoUI('parcelada')} />
            <input
              type="number"
              min={1}
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              style={{ width: '3em' }}
              disabled={tipoUI !== 'parcelada'}
            />
            x a partir de
            {tipoUI === 'parcelada' && (
              <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            )}
          </label>
        </fieldset>

        {erro && <p className="erro">{erro}</p>}

        <div className="acoes">
          {editando && (
            <button type="button" className="apagar" onClick={apagar}>
              apagar
            </button>
          )}
          <button type="button" onClick={onFechar}>
            cancelar
          </button>
          <button type="button" className="salvar" onClick={salvar}>
            salvar
          </button>
        </div>

        {valorTexto && (
          <p className="preview-valor">
            {(() => {
              try {
                return formatarBRL(paraCentavos(valorTexto))
              } catch {
                return null
              }
            })()}
          </p>
        )}
      </div>
    </div>
  )
}
