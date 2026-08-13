import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { definirEspacoAtivoId, obterEspacoAtivoId, storeLocal } from '../dados/store-local'
import type { DadosEspaco } from '../dados/store'
import type { Espaco } from '../dominio/tipos'
import { Contexto, type EstadoEspaco } from './useEspaco'

export function ProvedorEspaco({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [espacos, setEspacos] = useState<Espaco[]>([])
  const [espacoAtivo, setEspacoAtivo] = useState<Espaco | null>(null)
  const [dados, setDados] = useState<DadosEspaco | null>(null)

  /**
   * `espacoAtivoId` órfão (aponta para um id fora do índice) já cai pro
   * primeiro espaço por causa da ordenação abaixo. Espaço presente no
   * índice mas sem registro de dados (`storeLocal.carregar` lança) é
   * removido do índice exibido e a busca continua pro próximo candidato —
   * nunca deixa a tela branca (M2).
   */
  const carregarEspacoAtivo = useCallback(async (lista: Espaco[]) => {
    const ativoId = await obterEspacoAtivoId()
    const ordenados = ativoId
      ? [lista.find((e) => e.id === ativoId), ...lista.filter((e) => e.id !== ativoId)].filter(
          (e): e is Espaco => e != null,
        )
      : lista

    for (const candidato of ordenados) {
      try {
        const dadosCarregados = await storeLocal.carregar(candidato.id)
        setEspacoAtivo(candidato)
        setDados(dadosCarregados)
        await definirEspacoAtivoId(candidato.id)
        return
      } catch (erro) {
        console.error(
          `espaço "${candidato.nome}" (${candidato.id}) está no índice mas sem registro de dados — removendo do índice exibido`,
          erro,
        )
        setEspacos((atual) => atual.filter((e) => e.id !== candidato.id))
      }
    }
    setEspacoAtivo(null)
    setDados(null)
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

  /**
   * Fonte da verdade é sempre o storage, nunca `espacoAtivo`/`dados` do
   * React state (podem estar stale dentro da mesma execução assíncrona —
   * a mesma classe de bug que já mordeu `criarEspaco`/`selecionarEspaco`).
   */
  const salvarDados = useCallback(async (espacoId: string, parcial: Partial<DadosEspaco>) => {
    const dadosAtuais = await storeLocal.carregar(espacoId)
    const novosDados = { ...dadosAtuais, ...parcial }
    await storeLocal.salvar(espacoId, novosDados)
    const ativoId = await obterEspacoAtivoId()
    if (ativoId === espacoId) setDados(novosDados)
  }, [])

  const salvarRegras = useCallback(
    (espacoId: string, regras: DadosEspaco['regras']) => salvarDados(espacoId, { regras }),
    [salvarDados],
  )

  const salvarConfig = useCallback(
    (espacoId: string, config: DadosEspaco['config']) => salvarDados(espacoId, { config }),
    [salvarDados],
  )

  const exportarEspaco = useCallback((espacoId: string) => storeLocal.exportarJSON(espacoId), [])

  const importarEspaco = useCallback(async (texto: string) => {
    const novo = await storeLocal.importarJSON(texto)
    await definirEspacoAtivoId(novo.id)
    await recarregar()
    return novo
  }, [recarregar])

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
    salvarConfig,
    exportarEspaco,
    importarEspaco,
    recarregar,
  }), [carregando, espacos, espacoAtivo, dados, selecionarEspaco, criarEspaco, atualizarEspacoAtivo, apagarEspaco, salvarRegras, salvarConfig, exportarEspaco, importarEspaco, recarregar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
