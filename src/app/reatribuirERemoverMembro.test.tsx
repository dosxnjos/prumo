// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProvedorEspaco } from './ContextoEspaco'
import { useEspaco } from './useEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao } from '../dominio/config'
import type { EstadoEspaco } from './useEspaco'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let capturado: EstadoEspaco | null = null

function Sonda() {
  const ctx = useEspaco()
  capturado = ctx
  return null
}

async function esperar(voltas = 20) {
  for (let i = 0; i < voltas; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

describe('reatribuirERemoverMembro (L6)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    capturado = null
  })

  afterEach(() => {
    container.remove()
  })

  it('reatribui os itens do membro removido antes de tirá-lo — nenhuma regra sobra apontando pro id antigo', async () => {
    const espacoBase = await storeLocal.criarEspaco('Casa')
    const agora = new Date().toISOString()
    const dono = { id: 'dono1', nome: 'Gabriel', cor: '#e57373', papel: 'dono' as const }
    const membro = { id: 'membro1', nome: 'Sofia', cor: '#64b5f6', papel: 'membro' as const }
    await storeLocal.atualizarEspaco({ ...espacoBase, membros: [dono, membro] })

    const regraDoMembro = {
      id: 'r1',
      espacoId: espacoBase.id,
      nome: 'Pilates',
      fluxo: 'saida' as const,
      membroId: 'membro1',
      categoria: 'saude',
      valorCentavos: 5000,
      recorrencia: { tipo: 'mensal' as const, inicio: '2026-01', fim: null },
      pagamento: { tipo: 'conta' as const },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    await storeLocal.salvar(espacoBase.id, { regras: [regraDoMembro], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espacoBase.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <Sonda />
        </ProvedorEspaco>,
      )
    })
    await esperar()

    await act(async () => {
      await capturado!.reatribuirERemoverMembro(espacoBase.id, 'membro1', 'compartilhado')
    })
    await esperar(3)

    const dadosFinais = await storeLocal.carregar(espacoBase.id)
    expect(dadosFinais.regras.some((r) => r.membroId === 'membro1')).toBe(false)
    expect(dadosFinais.regras[0].membroId).toBe('compartilhado')

    const indice = await storeLocal.listarEspacos()
    const espacoFinal = indice.find((e) => e.id === espacoBase.id)!
    expect(espacoFinal.membros.some((m) => m.id === 'membro1')).toBe(false)
    expect(espacoFinal.membros).toHaveLength(1)

    root.unmount()
  })
})
