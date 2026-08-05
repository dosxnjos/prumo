import type { Espaco, Membro, Papel } from './tipos'

function donos(espaco: Espaco): Membro[] {
  return espaco.membros.filter((m) => m.papel === 'dono')
}

function encontrar(espaco: Espaco, membroId: string): Membro {
  const membro = espaco.membros.find((m) => m.id === membroId)
  if (!membro) {
    throw new Error(`membro não encontrado: ${membroId}`)
  }
  return membro
}

/** Removê-lo deixaria o espaço sem nenhum dono? */
export function podeRemover(espaco: Espaco, membroId: string): boolean {
  const membro = encontrar(espaco, membroId)
  if (membro.papel !== 'dono') return true
  return donos(espaco).length > 1
}

/** Rebaixá-lo deixaria o espaço sem nenhum dono? */
export function podeRebaixar(espaco: Espaco, membroId: string): boolean {
  const membro = encontrar(espaco, membroId)
  if (membro.papel !== 'dono') return true
  return donos(espaco).length > 1
}

export function removerMembro(espaco: Espaco, membroId: string): Espaco {
  if (!podeRemover(espaco, membroId)) {
    throw new Error('não é possível remover o último dono do espaço')
  }
  return {
    ...espaco,
    membros: espaco.membros.filter((m) => m.id !== membroId),
  }
}

export function alterarPapel(espaco: Espaco, membroId: string, papel: Papel): Espaco {
  if (papel === 'membro' && !podeRebaixar(espaco, membroId)) {
    throw new Error('não é possível rebaixar o último dono do espaço')
  }
  return {
    ...espaco,
    membros: espaco.membros.map((m) => (m.id === membroId ? { ...m, papel } : m)),
  }
}

export function adicionarMembro(espaco: Espaco, membro: Membro): Espaco {
  return {
    ...espaco,
    membros: [...espaco.membros, membro],
  }
}
