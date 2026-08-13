import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Contexto, type OpcoesToast } from './useToast'

interface ItemToast {
  id: string
  mensagem: string
  acao?: { rotulo: string; onClick: () => void }
}

const DURACAO_PADRAO_MS = 3000
const DURACAO_COM_ACAO_MS = 5000

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const remover = useCallback((id: string) => {
    setItens((atual) => atual.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const mostrar = useCallback(
    (mensagem: string, opcoes?: OpcoesToast) => {
      const id = crypto.randomUUID()
      const acao =
        opcoes?.onAcao && opcoes?.rotuloAcao
          ? {
              rotulo: opcoes.rotuloAcao,
              onClick: () => {
                opcoes.onAcao!()
                remover(id)
              },
            }
          : undefined
      setItens((atual) => [...atual, { id, mensagem, acao }])
      const duracao = opcoes?.duracaoMs ?? (acao ? DURACAO_COM_ACAO_MS : DURACAO_PADRAO_MS)
      timers.current.set(
        id,
        setTimeout(() => remover(id), duracao),
      )
    },
    [remover],
  )

  return (
    <Contexto.Provider value={{ mostrar }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((item) => (
          <div key={item.id} className="toast">
            <span>{item.mensagem}</span>
            {item.acao && (
              <button type="button" onClick={item.acao.onClick}>
                {item.acao.rotulo}
              </button>
            )}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}
