import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useEspaco } from './useEspaco'
import { useToast } from './useToast'
import { Modal } from './Modal'
import { formatarBRL, paraCentavos } from '../dominio/dinheiro'
import { mesAtual, rotulo } from '../dominio/mes'
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
  /** U2: mês de onde o form foi aberto — habilita a seção "ajustar este mês". */
  mesOrigem?: Mes
}

export function FormularioRegra({ regra, onFechar, mesOrigem }: Props) {
  const { espacoAtivo, dados, salvarRegras, restaurarRegra } = useEspaco()
  const { mostrar: mostrarToast } = useToast()
  const editando = regra !== null
  const excecaoOrigem = mesOrigem ? regra?.excecoes[mesOrigem] : undefined
  const [pularMesOrigem, setPularMesOrigem] = useState(excecaoOrigem?.pular === true)
  const [valorMesOrigemTexto, setValorMesOrigemTexto] = useState(
    regra
      ? ((excecaoOrigem?.valorCentavos ?? regra.valorCentavos) / 100).toFixed(2).replace('.', ',')
      : '',
  )
  const [erroAjusteMes, setErroAjusteMes] = useState<string | null>(null)

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
  const [campoComErro, setCampoComErro] = useState<'nome' | 'valor' | 'fim' | 'aCadaMeses' | 'parcelas' | null>(null)
  const refNome = useRef<HTMLInputElement>(null)
  const refValor = useRef<HTMLInputElement>(null)
  const refFim = useRef<HTMLInputElement>(null)
  const refACadaMeses = useRef<HTMLInputElement>(null)
  const refParcelas = useRef<HTMLInputElement>(null)

  function falhar(mensagem: string, campo: typeof campoComErro, ref: RefObject<HTMLInputElement | null>) {
    setErro(mensagem)
    setCampoComErro(campo)
    ref.current?.focus()
  }

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
    setCampoComErro(null)
    if (!nome.trim()) {
      falhar('dá um nome pro item', 'nome', refNome)
      return
    }
    let valorCentavos: number
    try {
      valorCentavos = paraCentavos(valorTexto)
    } catch {
      falhar('valor inválido', 'valor', refValor)
      return
    }
    if (valorCentavos <= 0) {
      falhar('valor precisa ser maior que zero', 'valor', refValor)
      return
    }
    if (tipoUI === 'periodo' && fim < inicio) {
      falhar('o fim não pode vir antes do início', 'fim', refFim)
      return
    }
    if (tipoUI === 'periodica' && (!Number.isInteger(aCadaMeses) || aCadaMeses < 1)) {
      falhar('precisa ser 1 ou mais', 'aCadaMeses', refACadaMeses)
      return
    }
    if (tipoUI === 'parcelada' && (!Number.isInteger(parcelas) || parcelas < 1)) {
      falhar('precisa ser 1 ou mais', 'parcelas', refParcelas)
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
    mostrarToast('item salvo')
  }

  /**
   * L3 v2: apagar é imediato — sem confirmação (o toast com "desfazer" por
   * 5s cobre o arrependimento). O snapshot da regra vai junto no toast
   * porque o form já fechou quando o desfazer é clicado.
   */
  async function apagar() {
    if (!regra || !dados || !espacoAtivo) return
    const espacoId = espacoAtivo.id
    const regraApagada = regra
    await salvarRegras(espacoId, dados.regras.filter((r) => r.id !== regra.id))
    onFechar()
    mostrarToast(`"${regraApagada.nome}" apagado`, {
      rotuloAcao: 'desfazer',
      onAcao: () => {
        restaurarRegra(espacoId, regraApagada)
      },
    })
  }

  /** `ativa: false` é o `off` da planilha — desligar preserva histórico, apagar não. */
  async function alternarAtiva() {
    if (!regra || !dados || !espacoAtivo) return
    const atualizado = { ...regra, ativa: !regra.ativa, atualizadoEm: new Date().toISOString() }
    await salvarRegras(espacoAtivo.id, dados.regras.map((r) => (r.id === regra.id ? atualizado : r)))
    onFechar()
  }

  /** U2: absorve o que era `AjustePontual` — ajuste vale só pro `mesOrigem`. */
  async function salvarAjusteMes() {
    if (!regra || !dados || !espacoAtivo || !mesOrigem) return
    setErroAjusteMes(null)
    const novasExcecoes = { ...regra.excecoes }
    if (pularMesOrigem) {
      novasExcecoes[mesOrigem] = { pular: true }
    } else {
      try {
        novasExcecoes[mesOrigem] = { valorCentavos: paraCentavos(valorMesOrigemTexto) }
      } catch {
        setErroAjusteMes('valor inválido')
        return
      }
    }
    const atualizado = { ...regra, excecoes: novasExcecoes, atualizadoEm: new Date().toISOString() }
    await salvarRegras(espacoAtivo.id, dados.regras.map((r) => (r.id === regra.id ? atualizado : r)))
    onFechar()
    mostrarToast(`ajuste de ${rotulo(mesOrigem)} salvo`)
  }

  async function removerAjusteMes() {
    if (!regra || !dados || !espacoAtivo || !mesOrigem) return
    const { [mesOrigem]: _removido, ...resto } = regra.excecoes
    const atualizado = { ...regra, excecoes: resto, atualizadoEm: new Date().toISOString() }
    await salvarRegras(espacoAtivo.id, dados.regras.map((r) => (r.id === regra.id ? atualizado : r)))
    onFechar()
  }

  return (
    <Modal onFechar={onFechar} onSubmit={salvar} className="formulario-regra" titulo={editando ? 'Editar item' : 'Novo item'}>
        <h2>{editando ? 'Editar item' : 'Novo item'}</h2>

        <label>
          Nome
          <input ref={refNome} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex. Aluguel" />
        </label>
        {campoComErro === 'nome' && <p className="erro-campo">{erro}</p>}

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
            ref={refValor}
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
          />
        </label>
        {campoComErro === 'valor' && <p className="erro-campo">{erro}</p>}

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
                <input ref={refFim} type="month" value={fim} onChange={(e) => setFim(e.target.value)} />
              </>
            )}
          </label>
          {campoComErro === 'fim' && <p className="erro-campo">{erro}</p>}

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
                  ref={refACadaMeses}
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
          {campoComErro === 'aCadaMeses' && <p className="erro-campo">{erro}</p>}

          <label className="opcao-recorrencia">
            <input type="radio" checked={tipoUI === 'parcelada'} onChange={() => setTipoUI('parcelada')} />
            <input
              ref={refParcelas}
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
          {campoComErro === 'parcelas' && <p className="erro-campo">{erro}</p>}
        </fieldset>

        {editando && mesOrigem && (
          <fieldset className="ajuste-mes-origem">
            <legend>só em {rotulo(mesOrigem)}</legend>

            <label>
              <input
                type="checkbox"
                checked={pularMesOrigem}
                onChange={(e) => setPularMesOrigem(e.target.checked)}
              />
              pular este mês
            </label>

            {!pularMesOrigem && (
              <label>
                valor neste mês
                <input
                  value={valorMesOrigemTexto}
                  onChange={(e) => setValorMesOrigemTexto(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            )}

            {erroAjusteMes && <p className="erro-campo">{erroAjusteMes}</p>}

            <div className="acoes">
              {excecaoOrigem && (
                <button type="button" className="apagar" onClick={removerAjusteMes}>
                  remover ajuste
                </button>
              )}
              <button type="button" className="salvar" onClick={salvarAjusteMes}>
                salvar ajuste
              </button>
            </div>
          </fieldset>
        )}

        <div className="acoes">
          {editando && (
            <button type="button" className="apagar" onClick={apagar}>
              apagar
            </button>
          )}
          {editando && (
            <button type="button" className="alternar-ativa" onClick={alternarAtiva}>
              {regra?.ativa ? 'desligar item' : 'religar item'}
            </button>
          )}
          <button type="button" onClick={onFechar}>
            cancelar
          </button>
          <button type="submit" className="salvar">
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
    </Modal>
  )
}
