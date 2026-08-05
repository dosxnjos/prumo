import { useState } from 'react'
import { AjustePontual } from './app/AjustePontual'
import { ProvedorEspaco, useEspaco } from './app/ContextoEspaco'
import { CurvaSaldo } from './app/CurvaSaldo'
import { FormularioRegra } from './app/FormularioRegra'
import { Onboarding } from './app/Onboarding'
import { PainelEspacos } from './app/PainelEspacos'
import { TelaMes } from './app/TelaMes'
import type { Mes, Regra } from './dominio/tipos'

type ModalAberto =
  | { tipo: 'espacos' }
  | { tipo: 'regra'; regra: Regra | null }
  | { tipo: 'ajuste'; regra: Regra; mes: Mes }
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
      </header>

      <TelaMes
        onEditarRegra={(regra) => setModal({ tipo: 'regra', regra })}
        onAjustarOcorrencia={(regra, mes) => setModal({ tipo: 'ajuste', regra, mes })}
      />

      <CurvaSaldo />

      {modal?.tipo === 'espacos' && <PainelEspacos onFechar={() => setModal(null)} />}
      {modal?.tipo === 'regra' && <FormularioRegra regra={modal.regra} onFechar={() => setModal(null)} />}
      {modal?.tipo === 'ajuste' && (
        <AjustePontual regra={modal.regra} mes={modal.mes} onFechar={() => setModal(null)} />
      )}
    </div>
  )
}

function App() {
  return (
    <ProvedorEspaco>
      <Conteudo />
    </ProvedorEspaco>
  )
}

export default App
