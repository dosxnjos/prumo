import { createContext, useContext } from 'react'

export interface OpcoesToast {
  rotuloAcao?: string
  onAcao?: () => void
  duracaoMs?: number
}

export interface ContextoToast {
  mostrar: (mensagem: string, opcoes?: OpcoesToast) => void
}

export const Contexto = createContext<ContextoToast | null>(null)

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto)
  if (!contexto) {
    throw new Error('useToast precisa estar dentro de <ProvedorToast>')
  }
  return contexto
}
