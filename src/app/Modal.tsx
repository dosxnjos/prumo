import { useEffect, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'

interface Props {
  onFechar: () => void
  /** Se dado, o conteúdo vira um `<form>` de verdade — Enter submete. */
  onSubmit?: () => void
  children: ReactNode
  className: string
  titulo?: string
}

/**
 * U8: componente compartilhado pelos overlays (`FormularioRegra`,
 * `TrocarEspaco`, `GerenciarEspaco`, `ConfigFinanceiraTela`, `TelaCurvaDetalhada`) —
 * `Enter` submete (quando `onSubmit` é dado), `Esc` fecha, foco vai pro
 * primeiro campo ao abrir e volta pro elemento que abriu o modal ao fechar.
 */
export function Modal({ onFechar, onSubmit, children, className, titulo }: Props) {
  const refConteudo = useRef<HTMLElement | null>(null)
  const refGatilho = useRef<Element | null>(null)

  useEffect(() => {
    refGatilho.current = document.activeElement
    const primeiroCampo = refConteudo.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button',
    )
    primeiroCampo?.focus()

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onFechar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      if (refGatilho.current instanceof HTMLElement) {
        refGatilho.current.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aoSubmeter(e: FormEvent) {
    e.preventDefault()
    onSubmit?.()
  }

  const definirRef = (el: HTMLElement | null) => {
    refConteudo.current = el
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={titulo}>
      {onSubmit ? (
        // noValidate: a validação já é feita em JS com mensagem própria
        // (L7) — a validação nativa do HTML5 (ex. `min` num <input>)
        // bloquearia o evento `submit` silenciosamente antes de chegar lá.
        <form onSubmit={aoSubmeter} className={className} ref={definirRef} noValidate>
          {children}
        </form>
      ) : (
        <div className={className} ref={definirRef}>
          {children}
        </div>
      )}
    </div>
  )
}
