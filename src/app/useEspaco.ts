import { createContext, useContext } from 'react'
import type { DadosEspaco } from '../dados/store'
import type { ConfigFinanceira } from '../dominio/config'
import type { Espaco, Regra } from '../dominio/tipos'

export interface EstadoEspaco {
  carregando: boolean
  espacos: Espaco[]
  espacoAtivo: Espaco | null
  dados: DadosEspaco | null
  selecionarEspaco: (espacoId: string) => Promise<void>
  criarEspaco: (nome: string) => Promise<Espaco>
  atualizarEspacoAtivo: (espaco: Espaco) => Promise<void>
  apagarEspaco: (espacoId: string) => Promise<void>
  /**
   * `espacoId` explícito — NUNCA feche sobre `espacoAtivo` do contexto: um
   * chamador que acabou de criar o espaço no mesmo fluxo (ex. onboarding)
   * teria uma referência stale e a gravação silenciosamente não aconteceria.
   */
  salvarRegras: (espacoId: string, regras: Regra[]) => Promise<void>
  salvarConfig: (espacoId: string, config: ConfigFinanceira) => Promise<void>
  exportarEspaco: (espacoId: string) => Promise<string>
  /** Sempre cria um espaço NOVO (id regerado) — nunca sobrescreve um existente. */
  importarEspaco: (texto: string) => Promise<Espaco>
  recarregar: () => Promise<void>
}

export const Contexto = createContext<EstadoEspaco | null>(null)

export function useEspaco(): EstadoEspaco {
  const contexto = useContext(Contexto)
  if (!contexto) {
    throw new Error('useEspaco precisa estar dentro de <ProvedorEspaco>')
  }
  return contexto
}
