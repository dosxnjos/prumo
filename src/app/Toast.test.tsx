// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvedorToast } from './Toast'
import { useToast } from './useToast'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Botao({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      disparar
    </button>
  )
}

function clicar(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('Toast (U6 + L3 v2)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('mostra a mensagem e some sozinho depois da duração', async () => {
    function Disparador() {
      const { mostrar } = useToast()
      return <Botao onClick={() => mostrar('item salvo', { duracaoMs: 30 })} />
    }

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorToast>
          <Disparador />
        </ProvedorToast>,
      )
    })

    act(() => clicar(container.querySelector('button')!))
    expect(container.textContent).toContain('item salvo')

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })
    expect(container.textContent).not.toContain('item salvo')

    root.unmount()
  })

  it('ação (ex. "desfazer") dispara o callback e remove o toast na hora', async () => {
    const onAcao = vi.fn()

    function Disparador() {
      const { mostrar } = useToast()
      return (
        <Botao
          onClick={() => mostrar('"Aluguel" apagado', { rotuloAcao: 'desfazer', onAcao, duracaoMs: 5000 })}
        />
      )
    }

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorToast>
          <Disparador />
        </ProvedorToast>,
      )
    })

    act(() => clicar(container.querySelector('button')!))
    const botaoDesfazer = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'desfazer')!
    act(() => clicar(botaoDesfazer))

    expect(onAcao).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('"Aluguel" apagado')

    root.unmount()
  })

  it('sem clicar na ação, o timeout consome a remoção (ação nunca dispara)', async () => {
    const onAcao = vi.fn()

    function Disparador() {
      const { mostrar } = useToast()
      return (
        <Botao onClick={() => mostrar('"Aluguel" apagado', { rotuloAcao: 'desfazer', onAcao, duracaoMs: 30 })} />
      )
    }

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorToast>
          <Disparador />
        </ProvedorToast>,
      )
    })

    act(() => clicar(container.querySelector('button')!))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60))
    })

    expect(container.textContent).not.toContain('"Aluguel" apagado')
    expect(onAcao).not.toHaveBeenCalled()

    root.unmount()
  })
})
