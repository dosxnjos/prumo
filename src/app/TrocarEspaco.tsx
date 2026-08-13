import { useState } from 'react'
import { useEspaco } from './useEspaco'
import { criarEspacoComDono } from './criarEspacoComDono'
import { Modal } from './Modal'

const CORES = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac']

interface Props {
  onFechar: () => void
  onGerenciar: () => void
}

/** U7 (nível 0): trocar de espaço ativo ou criar um novo — nada de gestão aqui. */
export function TrocarEspaco({ onFechar, onGerenciar }: Props) {
  const espaco = useEspaco()
  const { espacos, espacoAtivo, selecionarEspaco } = espaco
  const [criandoNovo, setCriandoNovo] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [nomeDonoNovo, setNomeDonoNovo] = useState('')

  async function criar() {
    if (!nomeNovo.trim() || !nomeDonoNovo.trim()) return
    await criarEspacoComDono(espaco, nomeNovo.trim(), nomeDonoNovo.trim(), CORES[0])
    setNomeNovo('')
    setNomeDonoNovo('')
    setCriandoNovo(false)
  }

  return (
    <Modal onFechar={onFechar} className="painel-espacos" titulo="Espaços">
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
          <input
            value={nomeDonoNovo}
            onChange={(e) => setNomeDonoNovo(e.target.value)}
            placeholder="seu nome neste espaço"
          />
          <button type="button" onClick={criar}>criar</button>
          <button type="button" onClick={() => setCriandoNovo(false)}>cancelar</button>
        </div>
      ) : (
        <button type="button" onClick={() => setCriandoNovo(true)}>+ novo espaço</button>
      )}

      {espacoAtivo && (
        <>
          <hr />
          <button type="button" onClick={onGerenciar}>
            gerenciar "{espacoAtivo.nome}"
          </button>
        </>
      )}

      <button type="button" className="fechar" onClick={onFechar}>fechar</button>
    </Modal>
  )
}
