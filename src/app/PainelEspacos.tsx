import { useState } from 'react'
import { useEspaco } from './ContextoEspaco'
import { adicionarMembro, alterarPapel, podeRebaixar, podeRemover, removerMembro } from '../dominio/espaco'
import type { Papel } from '../dominio/tipos'

const CORES = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac']

interface Props {
  onFechar: () => void
}

export function PainelEspacos({ onFechar }: Props) {
  const { espacos, espacoAtivo, selecionarEspaco, criarEspaco, atualizarEspacoAtivo, apagarEspaco } = useEspaco()
  const [criandoNovo, setCriandoNovo] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [renomeando, setRenomeando] = useState(false)
  const [nomeRenomeado, setNomeRenomeado] = useState(espacoAtivo?.nome ?? '')
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [nomeMembroNovo, setNomeMembroNovo] = useState('')

  async function criar() {
    if (!nomeNovo.trim()) return
    await criarEspaco(nomeNovo.trim())
    setNomeNovo('')
    setCriandoNovo(false)
  }

  async function renomear() {
    if (!espacoAtivo || !nomeRenomeado.trim()) return
    await atualizarEspacoAtivo({ ...espacoAtivo, nome: nomeRenomeado.trim() })
    setRenomeando(false)
  }

  async function confirmarApagar() {
    if (!espacoAtivo || nomeConfirmacao !== espacoAtivo.nome) return
    await apagarEspaco(espacoAtivo.id)
    setConfirmandoApagar(false)
    setNomeConfirmacao('')
  }

  async function adicionarNovoMembro() {
    if (!espacoAtivo || !nomeMembroNovo.trim()) return
    const cor = CORES[espacoAtivo.membros.length % CORES.length]
    const novo = adicionarMembro(espacoAtivo, {
      id: crypto.randomUUID(),
      nome: nomeMembroNovo.trim(),
      cor,
      papel: 'membro',
    })
    await atualizarEspacoAtivo(novo)
    setNomeMembroNovo('')
  }

  async function trocarPapel(membroId: string, papel: Papel) {
    if (!espacoAtivo) return
    try {
      await atualizarEspacoAtivo(alterarPapel(espacoAtivo, membroId, papel))
    } catch {
      // trava do último dono — a UI já não deveria oferecer isso, mas o
      // domínio é a fonte da verdade; se chegar aqui, simplesmente ignora.
    }
  }

  async function remover(membroId: string) {
    if (!espacoAtivo) return
    try {
      await atualizarEspacoAtivo(removerMembro(espacoAtivo, membroId))
    } catch {
      // idem — trava do último dono.
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="painel-espacos">
        <h2>Espaços</h2>
        <ul className="lista-espacos">
          {espacos.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={e.id === espacoAtivo?.id ? 'selecionado' : ''}
                onClick={() => selecionarEspaco(e.id)}
              >
                {e.nome}
              </button>
            </li>
          ))}
        </ul>

        {criandoNovo ? (
          <div className="linha-criar">
            <input value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} placeholder="nome do espaço" />
            <button type="button" onClick={criar}>criar</button>
            <button type="button" onClick={() => setCriandoNovo(false)}>cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setCriandoNovo(true)}>+ novo espaço</button>
        )}

        {espacoAtivo && (
          <>
            <hr />
            <h3>{espacoAtivo.nome}</h3>

            {renomeando ? (
              <div className="linha-criar">
                <input value={nomeRenomeado} onChange={(e) => setNomeRenomeado(e.target.value)} />
                <button type="button" onClick={renomear}>salvar</button>
                <button type="button" onClick={() => setRenomeando(false)}>cancelar</button>
              </div>
            ) : (
              <button type="button" onClick={() => setRenomeando(true)}>renomear</button>
            )}

            <h4>Membros</h4>
            <ul className="lista-membros">
              {espacoAtivo.membros.map((m) => (
                <li key={m.id}>
                  <span className="ponto-cor" style={{ background: m.cor }} />
                  {m.nome}
                  <select
                    value={m.papel}
                    disabled={m.papel === 'dono' && !podeRebaixar(espacoAtivo, m.id)}
                    onChange={(e) => trocarPapel(m.id, e.target.value as Papel)}
                  >
                    <option value="dono">dono</option>
                    <option value="membro">membro</option>
                  </select>
                  {podeRemover(espacoAtivo, m.id) && (
                    <button type="button" className="remover" onClick={() => remover(m.id)}>
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="linha-criar">
              <input
                value={nomeMembroNovo}
                onChange={(e) => setNomeMembroNovo(e.target.value)}
                placeholder="nome do novo membro"
              />
              <button type="button" onClick={adicionarNovoMembro}>+ adicionar</button>
            </div>

            <hr />
            {confirmandoApagar ? (
              <div className="linha-criar">
                <p>Digite <strong>{espacoAtivo.nome}</strong> para confirmar:</p>
                <input value={nomeConfirmacao} onChange={(e) => setNomeConfirmacao(e.target.value)} />
                <button
                  type="button"
                  className="apagar"
                  disabled={nomeConfirmacao !== espacoAtivo.nome}
                  onClick={confirmarApagar}
                >
                  apagar espaço
                </button>
                <button type="button" onClick={() => setConfirmandoApagar(false)}>cancelar</button>
              </div>
            ) : (
              <button type="button" className="apagar" onClick={() => setConfirmandoApagar(true)}>
                apagar espaço
              </button>
            )}
          </>
        )}

        <button type="button" className="fechar" onClick={onFechar}>fechar</button>
      </div>
    </div>
  )
}
