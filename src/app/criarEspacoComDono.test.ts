import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { criarEspacoComDono } from './criarEspacoComDono'
import { storeLocal } from '../dados/store-local'

describe('criarEspacoComDono (L5)', () => {
  it('espaço criado pelo painel tem 1 membro com papel "dono"', async () => {
    const espaco = await criarEspacoComDono(
      {
        criarEspaco: (nome) => storeLocal.criarEspaco(nome),
        atualizarEspacoAtivo: (e) => storeLocal.atualizarEspaco(e),
      },
      'Casa',
      'Gabriel',
      '#e57373',
    )

    expect(espaco.membros).toHaveLength(1)
    expect(espaco.membros[0]).toMatchObject({ nome: 'Gabriel', papel: 'dono', cor: '#e57373' })

    // persistido de verdade — não só o retorno da função
    const indice = await storeLocal.listarEspacos()
    const persistido = indice.find((e) => e.id === espaco.id)
    expect(persistido?.membros).toHaveLength(1)
    expect(persistido?.membros[0].papel).toBe('dono')
  })
})
