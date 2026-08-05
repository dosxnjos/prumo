import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { definirEspacoAtivoId, obterEspacoAtivoId, storeLocal } from '../dados/store-local'
import type { DadosEspaco } from '../dados/store'
import type { Espaco, Regra } from '../dominio/tipos'

interface EstadoEspaco {
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
  recarregar: () => Promise<void>
}

const Contexto = createContext<EstadoEspaco | null>(null)

export function ProvedorEspaco({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [espacoAtivo, setEspacoAtivo] = useState<Espaco | null>(null)
  const [dados, setDados] = useState<DadosEspaco | null>(null)

  const carregarEspacoAtivo = useCallback(async (lista: Espaco[]) => {
    const ativoId = await obterEspacoAtivoId()
    const ativo = lista.find((e) => e.id === ativoId) ?? lista[0] ?? null
    setEspacoAtivo(ativo)
    if (ativo) {
      setDados(await storeLocal.carregar(ativo.id))
      await definirEspacoAtivoId(ativo.id)
    } else {
      setDados(null)
    }
  }, [])

  const recarregar = useCallback(async () => {
    setCarregando(true)
    const lista = await storeLocal.listarEspacos()
    setEspacos(lista)
    await carregarEspacoAtivo(lista)
    setCarregando(false)
  }, [carregarEspacoAtivo])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  /**
   * Lê a lista de espaços fresca do storage — nunca do array `espacos` do
   * React state, cujo closure pode estar desatualizado dentro da mesma
   * execução assíncrona (ex.: logo após `criarEspaco` no mesmo fluxo).
   */
  const selecionarEspaco = useCallback(async (espacoId: string) => {
    const lista = await storeLocal.listarEspacos()
    const alvo = lista.find((e) => e.id === espacoId)
    if (!alvo) return
    setEspacos(lista)
    setEspacoAtivo(alvo)
    setDados(await storeLocal.carregar(alvo.id))
    await definirEspacoAtivoId(alvo.id)
  }, [])

  const criarEspaco = useCallback(async (nome: string) => {
    const novo = await storeLocal.criarEspaco(nome)
    // grava a intenção no storage ANTES de recarregar — recarregar() decide
    // o espaço ativo lendo `obterEspacoAtivoId()`, então isso tem que vir
    // primeiro, nunca depender do array `espacos` do state.
    await definirEspacoAtivoId(novo.id)
    await recarregar()
    return novo
  }, [recarregar])

  const atualizarEspacoAtivo = useCallback(async (espaco: Espaco) => {
    await storeLocal.atualizarEspaco(espaco)
    await recarregar()
  }, [recarregar])

  const apagarEspaco = useCallback(async (espacoId: string) => {
    await storeLocal.apagarEspaco(espacoId)
    await recarregar()
  }, [recarregar])

  const salvarRegras = useCallback(async (espacoId: string, regras: Regra[]) => {
    const dadosAtuais = await storeLocal.carregar(espacoId)
    const novosDados = { ...dadosAtuais, regras }
    await storeLocal.salvar(espacoId, novosDados)
    // Fonte da verdade é o storage, nunca `espacoAtivo` do React state (que
    // pode estar stale dentro da mesma execução assíncrona — é essa mesma
    // classe de bug que já mordeu `criarEspaco`/`selecionarEspaco`).
    const ativoId = await obterEspacoAtivoId()
    if (ativoId === espacoId) setDados(novosDados)
  }, [])

  const valor = useMemo<EstadoEspaco>(() => ({
    carregando,
    espacos,
    espacoAtivo,
    dados,
    selecionarEspaco,
    criarEspaco,
    atualizarEspacoAtivo,
    apagarEspaco,
    salvarRegras,
    recarregar,
  }), [carregando, espacos, espacoAtivo, dados, selecionarEspaco, criarEspaco, atualizarEspacoAtivo, apagarEspaco, salvarRegras, recarregar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useEspaco(): EstadoEspaco {
  const contexto = useContext(Contexto)
  if (!contexto) {
    throw new Error('useEspaco precisa estar dentro de <ProvedorEspaco>')
  }
  return contexto
}
