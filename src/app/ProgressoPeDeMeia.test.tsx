// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressoPeDeMeia } from './ProgressoPeDeMeia'
import { ProvedorEspaco } from './ContextoEspaco'
import { configFinanceiraPadrao } from '../dominio/config'
import { storeLocal } from '../dados/store-local'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function montarComConfig(container: HTMLDivElement, config: ReturnType<typeof configFinanceiraPadrao>) {
  const espaco = await storeLocal.criarEspaco('Casa')
  await storeLocal.salvar(espaco.id, { regras: [], config })
  const { definirEspacoAtivoId } = await import('../dados/store-local')
  await definirEspacoAtivoId(espaco.id)

  const onAbrirConfig = vi.fn()
  const root = createRoot(container)
  act(() => {
    root.render(
      <ProvedorEspaco>
        <ProgressoPeDeMeia onAbrirConfig={onAbrirConfig} />
      </ProvedorEspaco>,
    )
  })
  for (let i = 0; i < 30 && container.textContent === ''; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
  return { root, onAbrirConfig }
}

describe('ProgressoPeDeMeia — 3 estados (L1)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('meta não configurada (0): orienta a configurar, não finge estar completo', async () => {
    const { root, onAbrirConfig } = await montarComConfig(container, configFinanceiraPadrao())

    expect(container.textContent).toContain('Configura a meta')
    expect(container.textContent).not.toContain('completo')

    const botao = container.querySelector('button')!
    act(() => {
      botao.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onAbrirConfig).toHaveBeenCalled()

    root.unmount()
  })

  it('meta > 0 e faltando: mostra quanto falta', async () => {
    const config = { ...configFinanceiraPadrao(), metaPeDeMeiaMeses: 6, custoSobrevivenciaCentavos: 100000, peDeMeiaAtualCentavos: 50000 }
    const { root } = await montarComConfig(container, config)

    expect(container.textContent).toContain('Faltam')
    expect(container.textContent).not.toContain('Configura a meta')

    root.unmount()
  })

  it('meta > 0 e atingida: comemora', async () => {
    const config = { ...configFinanceiraPadrao(), metaPeDeMeiaMeses: 6, custoSobrevivenciaCentavos: 100000, peDeMeiaAtualCentavos: 600000 }
    const { root } = await montarComConfig(container, config)

    expect(container.textContent).toContain('🎉')
    expect(container.textContent).toContain('completo')

    root.unmount()
  })
})
