// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GerenciarEspaco } from './GerenciarEspaco'
import { ProvedorEspaco } from './ContextoEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao } from '../dominio/config'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function esperar(voltas = 20) {
  for (let i = 0; i < voltas; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

describe('GerenciarEspaco — backup promovido (U3)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('sem ultimoBackupEm (backup v1 sem o campo): mostra "nunca" e o aviso, sem quebrar', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    await storeLocal.salvar(espaco.id, { regras: [], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <GerenciarEspaco onVoltar={() => {}} />
        </ProvedorEspaco>,
      )
    })
    await esperar()

    expect(container.textContent).toContain('último backup: nunca')
    expect(container.textContent).toContain('a única cópia de segurança')

    root.unmount()
  })

  it('exportar grava o carimbo — o aviso some depois', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    await storeLocal.salvar(espaco.id, { regras: [], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <GerenciarEspaco onVoltar={() => {}} />
        </ProvedorEspaco>,
      )
    })
    await esperar()

    // jsdom não implementa URL.createObjectURL — stub mínimo pro clique não quebrar
    ;(URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:mock'
    ;(URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {}

    const botaoExportar = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'exportar backup (JSON)',
    )!
    act(() => botaoExportar.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar()

    expect(container.textContent).toContain('último backup: hoje')
    expect(container.textContent).not.toContain('a única cópia de segurança')

    const dadosFinais = await storeLocal.carregar(espaco.id)
    expect(dadosFinais.config.ultimoBackupEm).toBeTruthy()

    root.unmount()
  })
})
