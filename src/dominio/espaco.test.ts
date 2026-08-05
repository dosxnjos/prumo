import { describe, expect, it } from 'vitest'
import { adicionarMembro, alterarPapel, podeRebaixar, podeRemover, removerMembro } from './espaco'
import type { Espaco, Membro } from './tipos'

function membro(id: string, papel: Membro['papel']): Membro {
  return { id, nome: id, cor: '#000', papel }
}

function espacoComMembros(...membros: Membro[]): Espaco {
  return {
    id: 'espaco-1',
    nome: 'Casa',
    membros,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  }
}

describe('trava do último dono', () => {
  it('não permite remover o único dono', () => {
    const espaco = espacoComMembros(membro('a', 'dono'))
    expect(podeRemover(espaco, 'a')).toBe(false)
    expect(() => removerMembro(espaco, 'a')).toThrow()
  })

  it('não permite rebaixar o único dono', () => {
    const espaco = espacoComMembros(membro('a', 'dono'))
    expect(podeRebaixar(espaco, 'a')).toBe(false)
    expect(() => alterarPapel(espaco, 'a', 'membro')).toThrow()
  })

  it('permite remover um dono quando existe outro', () => {
    const espaco = espacoComMembros(membro('a', 'dono'), membro('b', 'dono'))
    expect(podeRemover(espaco, 'a')).toBe(true)
    const depois = removerMembro(espaco, 'a')
    expect(depois.membros.map((m) => m.id)).toEqual(['b'])
  })

  it('permite rebaixar um dono quando existe outro', () => {
    const espaco = espacoComMembros(membro('a', 'dono'), membro('b', 'dono'))
    const depois = alterarPapel(espaco, 'a', 'membro')
    expect(depois.membros.find((m) => m.id === 'a')?.papel).toBe('membro')
  })

  it('remover ou rebaixar membro comum sempre é permitido', () => {
    const espaco = espacoComMembros(membro('a', 'dono'), membro('b', 'membro'))
    expect(podeRemover(espaco, 'b')).toBe(true)
    expect(podeRebaixar(espaco, 'b')).toBe(true)
  })
})

describe('adicionarMembro', () => {
  it('acrescenta o membro à lista', () => {
    const espaco = espacoComMembros(membro('a', 'dono'))
    const depois = adicionarMembro(espaco, membro('b', 'membro'))
    expect(depois.membros).toHaveLength(2)
  })
})
