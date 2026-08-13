// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createStore, set } from 'idb-keyval'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProvedorEspaco } from './ContextoEspaco'
import { useEspaco } from './useEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'

// mesmo par (dbName, storeName) que store-local.ts usa internamente — os
// testes gravam registros crus para simular estados inconsistentes que a UI
// nunca produziria sozinha, mas que podem existir num IndexedDB real.
const db = createStore('prumo-db', 'prumo-store')

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * `act(async () => { ...vários awaits... })` só flusha os efeitos passivos
 * quando a callback INTEIRA termina — um `await` no meio dela não dá chance
 * de commit. Por isso cada tentativa é o SEU PRÓPRIO `act`: assim o React
 * comita entre uma tentativa e outra, dando ao `useEffect` (que dispara
 * `recarregar()`, encadeando leituras assíncronas no fake-indexeddb) chance
 * de progredir e ao componente `Sonda` chance de re-renderizar.
 */
async function esperarCarregamentoAssentar(maxTentativas = 50) {
  for (let i = 0; i < maxTentativas; i++) {
    if (estadoObservado && !estadoObservado.carregando) return
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

let estadoObservado: {
  carregando: boolean
  espacos: { id: string; nome: string }[]
  espacoAtivo: { id: string; nome: string } | null
} | null = null

function Sonda() {
  const { carregando, espacos, espacoAtivo } = useEspaco()
  estadoObservado = { carregando, espacos, espacoAtivo }
  return (
    <div>
      {carregando ? 'carregando…' : espacoAtivo ? `ativo: ${espacoAtivo.nome}` : 'seletor: nenhum espaço ativo'}
    </div>
  )
}

describe('ProvedorEspaco — throws de storage não geram tela branca (M2)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    estadoObservado = null
  })

  afterEach(() => {
    container.remove()
  })

  it('espaço no índice sem registro de dados: removido do índice exibido, sem exceção', async () => {
    const espacoOrfao = await storeLocal.criarEspaco('Órfão')
    // apaga só o registro de dados, mantendo o espaço no índice — simula o
    // estado inconsistente que o M2 precisa tratar
    const { del } = await import('idb-keyval')
    await del(`espaco-${espacoOrfao.id}`, db)
    await definirEspacoAtivoId(espacoOrfao.id)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <Sonda />
        </ProvedorEspaco>,
      )
    })
    await esperarCarregamentoAssentar()

    expect(estadoObservado?.carregando).toBe(false)
    expect(estadoObservado?.espacoAtivo).toBeNull()
    expect(estadoObservado?.espacos.some((e) => e.id === espacoOrfao.id)).toBe(false)
    expect(container.textContent).toBe('seletor: nenhum espaço ativo')

    root.unmount()
  })

  it('espacoAtivoId órfão (fora do índice) cai pro primeiro espaço válido', async () => {
    const espacoValido = await storeLocal.criarEspaco('Válido')
    await set('espaco-ativo-id', 'id-que-nao-existe-em-nenhum-lugar', db)

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <Sonda />
        </ProvedorEspaco>,
      )
    })
    await esperarCarregamentoAssentar()

    expect(estadoObservado?.carregando).toBe(false)
    expect(estadoObservado?.espacoAtivo?.id).toBe(espacoValido.id)
    expect(container.textContent).toBe('ativo: Válido')

    root.unmount()
  })
})
