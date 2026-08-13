// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TelaMes } from './TelaMes'
import { FormularioRegra } from './FormularioRegra'
import { ProvedorEspaco } from './ContextoEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao } from '../dominio/config'
import { mesAtual } from '../dominio/mes'
import type { Regra } from '../dominio/tipos'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function regraDeTeste(): Regra {
  const agora = new Date().toISOString()
  return {
    id: 'r1',
    espacoId: 'x',
    nome: 'Aluguel',
    fluxo: 'saida',
    membroId: 'compartilhado',
    categoria: 'moradia',
    valorCentavos: 10000,
    recorrencia: { tipo: 'mensal', inicio: mesAtual(), fim: null },
    pagamento: { tipo: 'conta' },
    ativa: true,
    excecoes: {},
    criadoEm: agora,
    atualizadoEm: agora,
  }
}

/** Reproduz o essencial de `App.Conteudo`: TelaMes + FormularioRegra num modal. */
function Wrapper() {
  const [regraEmEdicao, setRegraEmEdicao] = useState<Regra | null | 'fechado'>('fechado')
  return (
    <>
      <TelaMes
        onEditarRegra={(r) => setRegraEmEdicao(r)}
        onAjustarOcorrencia={() => {}}
      />
      {regraEmEdicao !== 'fechado' && (
        <FormularioRegra regra={regraEmEdicao} onFechar={() => setRegraEmEdicao('fechado')} />
      )}
    </>
  )
}

async function esperar(voltas = 20) {
  for (let i = 0; i < voltas; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

describe('TelaMes + FormularioRegra — desligar/religar item (L2)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('desligar remove dos totais e aparece na seção "Desligados"; religar restaura', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    const regra = { ...regraDeTeste(), espacoId: espaco.id }
    await storeLocal.salvar(espaco.id, { regras: [regra], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <Wrapper />
        </ProvedorEspaco>,
      )
    })
    await esperar()

    expect(container.textContent).toContain('Aluguel')
    expect(container.textContent).toContain('Saídas: R$ 100,00')
    expect(container.querySelector('.secao-desligados')).toBeNull()

    // abre o form clicando no nome do item
    const nomeItem = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Aluguel'))!
    act(() => nomeItem.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar(3)

    const botaoDesligar = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'desligar item')!
    act(() => botaoDesligar.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar()

    expect(container.textContent).toContain('Saídas: R$ 0,00')
    expect(container.querySelector('.secao-desligados')).not.toBeNull()
    expect(container.textContent).toContain('Desligados (1)')

    const botaoReligar = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'religar')!
    act(() => botaoReligar.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar()

    expect(container.textContent).toContain('Saídas: R$ 100,00')
    expect(container.querySelector('.secao-desligados')).toBeNull()

    root.unmount()
  })
})
