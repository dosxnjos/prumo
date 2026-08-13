import { useState } from 'react'
import { ConfigFinanceiraTela } from './app/ConfigFinanceiraTela'
import { ProvedorEspaco } from './app/ContextoEspaco'
import { CurvaSaldo } from './app/CurvaSaldo'
import { FormularioRegra } from './app/FormularioRegra'
import { Onboarding } from './app/Onboarding'
import { PainelEspacos } from './app/PainelEspacos'
import { ProgressoPeDeMeia } from './app/ProgressoPeDeMeia'
import { TelaCurvaDetalhada } from './app/TelaCurvaDetalhada'
import { ProvedorToast } from './app/Toast'
import { useEspaco } from './app/useEspaco'
import { TelaMes } from './app/TelaMes'
import type { Mes, Regra } from './dominio/tipos'

type ModalAberto =
  | { tipo: 'espacos' }
  | { tipo: 'regra'; regra: Regra | null; mesOrigem?: Mes }
  | { tipo: 'config' }
  | { tipo: 'curva' }
  | null

function Conteudo() {
  const { carregando, espacoAtivo } = useEspaco()
  const [modal, setModal] = useState<ModalAberto>(null)

  if (carregando) return null
  if (!espacoAtivo) return <Onboarding />

  return (
    <div className="app-shell">
      <header className="topo-app">
        <button type="button" className="nome-espaco" onClick={() => setModal({ tipo: 'espacos' })}>
          {espacoAtivo.nome} ▾
        </button>
        <button type="button" className="botao-config" onClick={() => setModal({ tipo: 'config' })}>
          ⚙︎
        </button>
      </header>

      <div className="corpo-app">
        <div className="coluna-principal">
          <TelaMes
            onEditarRegra={(regra, mesOrigem) => setModal({ tipo: 'regra', regra, mesOrigem })}
          />
        </div>

        <div className="coluna-lateral">
          <ProgressoPeDeMeia onAbrirConfig={() => setModal({ tipo: 'config' })} />
          <CurvaSaldo onVerDetalhes={() => setModal({ tipo: 'curva' })} />
        </div>
      </div>

      {modal?.tipo === 'espacos' && <PainelEspacos onFechar={() => setModal(null)} />}
      {modal?.tipo === 'regra' && (
        <FormularioRegra regra={modal.regra} mesOrigem={modal.mesOrigem} onFechar={() => setModal(null)} />
      )}
      {modal?.tipo === 'config' && <ConfigFinanceiraTela onFechar={() => setModal(null)} />}
      {modal?.tipo === 'curva' && <TelaCurvaDetalhada onFechar={() => setModal(null)} />}
    </div>
  )
}

function App() {
  return (
    <ProvedorEspaco>
      <ProvedorToast>
        <Conteudo />
      </ProvedorToast>
    </ProvedorEspaco>
  )
}

export default App
