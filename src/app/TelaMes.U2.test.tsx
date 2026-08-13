// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TelaMes } from './TelaMes'
import { FormularioRegra } from './FormularioRegra'
import { ProvedorEspaco } from './ContextoEspaco'
import { ProvedorToast } from './Toast'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao } from '../dominio/config'
import { mesAtual, rotulo } from '../dominio/mes'
import type { Mes, Regra } from '../dominio/tipos'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Wrapper() {
  const [modal, setModal] = useState<{ regra: Regra | null; mesOrigem?: Mes } | 'fechado'>('fechado')
  return (
    <>
      <TelaMes onEditarRegra={(regra, mesOrigem) => setModal({ regra, mesOrigem })} />
      {modal !== 'fechado' && (
        <FormularioRegra regra={modal.regra} mesOrigem={modal.mesOrigem} onFechar={() => setModal('fechado')} />
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

describe('TelaMes — linha inteira é o alvo de toque, ajuste vira ação do form (U2)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('sem botão "ajustar este mês" repetido; clique na linha abre o form com a seção do mês', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    const agora = new Date().toISOString()
    const regra: Regra = {
      id: 'r1',
      espacoId: espaco.id,
      nome: 'Aluguel',
      fluxo: 'saida',
      membroId: 'compartilhado',
      categoria: 'moradia',
      valorCentavos: 150000,
      recorrencia: { tipo: 'mensal', inicio: mesAtual(), fim: null },
      pagamento: { tipo: 'conta' },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    await storeLocal.salvar(espaco.id, { regras: [regra], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <ProvedorToast>
            <Wrapper />
          </ProvedorToast>
        </ProvedorEspaco>,
      )
    })
    await esperar()

    // sem o botão repetido por linha (U2 — vira ação dentro do form)
    expect(Array.from(container.querySelectorAll('button')).some((b) => b.textContent === 'ajustar este mês')).toBe(
      false,
    )
    // categoria aparece como sub-rótulo da linha
    expect(container.textContent).toContain('moradia')

    const linha = Array.from(container.querySelectorAll('button.linha-item')).find((b) =>
      b.textContent?.includes('Aluguel'),
    )!
    act(() => linha.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar(3)

    expect(container.textContent).toContain(`só em ${rotulo(mesAtual())}`)

    root.unmount()
  })
})
