// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// mock do idb — o boundary não deve depender de IndexedDB real (indisponível
// no ambiente jsdom) para o teste do fluxo "baixar meus dados".
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  entries: vi.fn(async () => [
    ['espacos-indice', [{ id: 'e1', nome: 'Casa' }]],
    ['espaco-e1', { schemaVersion: 1, dados: { regras: [], config: {} } }],
  ]),
}))

const { ErroApp } = await import('./ErroApp')

function ComponenteQueLanca(): never {
  throw new Error('falha simulada de teste')
}

describe('ErroApp', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  it('renderiza a mensagem de erro quando um filho lança', () => {
    // React loga o erro capturado no console mesmo com boundary — silenciar
    // no teste evita ruído sem esconder falha real (a asserção abaixo é o
    // que garante que o boundary realmente capturou).
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const root = createRoot(container)
    act(() => {
      root.render(
        <ErroApp>
          <ComponenteQueLanca />
        </ErroApp>,
      )
    })

    expect(container.textContent).toContain('Algo deu errado')
    expect(container.querySelector('button')).not.toBeNull()
  })

  it('não interfere quando os filhos não lançam', () => {
    const root = createRoot(container)
    act(() => {
      root.render(
        <ErroApp>
          <p>tudo bem</p>
        </ErroApp>,
      )
    })

    expect(container.textContent).toBe('tudo bem')
  })

  it('"baixar meus dados" gera um blob JSON não-vazio a partir do idb', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    const cliqueSimulado = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(cliqueSimulado)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ErroApp>
          <ComponenteQueLanca />
        </ErroApp>,
      )
    })

    const botaoBaixar = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('baixar meus dados'),
    )
    expect(botaoBaixar).toBeDefined()

    await act(async () => {
      botaoBaixar!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(cliqueSimulado).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
    const blobPassado = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob
    expect(blobPassado.size).toBeGreaterThan(0)
    expect(blobPassado.type).toBe('application/json')

    vi.unstubAllGlobals()
  })
})
