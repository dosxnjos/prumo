// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('Modal (U8) — teclado e foco', () => {
  let container: HTMLDivElement
  let botaoGatilho: HTMLButtonElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    botaoGatilho = document.createElement('button')
    botaoGatilho.textContent = 'abrir'
    document.body.appendChild(botaoGatilho)
    botaoGatilho.focus()
  })

  afterEach(() => {
    container.remove()
    botaoGatilho.remove()
  })

  it('foca o primeiro campo ao abrir', () => {
    const root = createRoot(container)
    act(() => {
      root.render(
        <Modal onFechar={() => {}} className="teste-modal">
          <input aria-label="primeiro" />
          <input aria-label="segundo" />
        </Modal>,
      )
    })

    expect(document.activeElement?.getAttribute('aria-label')).toBe('primeiro')
    root.unmount()
  })

  it('Esc chama onFechar e devolve o foco pro elemento que abriu o modal', () => {
    const onFechar = vi.fn()
    const root = createRoot(container)
    act(() => {
      root.render(
        <Modal onFechar={onFechar} className="teste-modal">
          <input aria-label="campo" />
        </Modal>,
      )
    })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onFechar).toHaveBeenCalledTimes(1)

    act(() => root.unmount())
    expect(document.activeElement).toBe(botaoGatilho)
  })

  it('Enter dentro de um campo submete o form (onSubmit dado)', () => {
    const onSubmit = vi.fn()
    const root = createRoot(container)
    act(() => {
      root.render(
        <Modal onFechar={() => {}} onSubmit={onSubmit} className="teste-modal">
          <input aria-label="campo" />
          <button type="submit">salvar</button>
        </Modal>,
      )
    })

    const form = container.querySelector('form')!
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    root.unmount()
  })

  it('sem onSubmit, renderiza um `div` (não um form) — nenhum submit possível', () => {
    const root = createRoot(container)
    act(() => {
      root.render(
        <Modal onFechar={() => {}} className="teste-modal">
          <p>conteúdo</p>
        </Modal>,
      )
    })

    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('.teste-modal')?.tagName).toBe('DIV')
    root.unmount()
  })
})
