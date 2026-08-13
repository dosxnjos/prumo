import { adicionarMembro } from '../dominio/espaco'
import type { Espaco } from '../dominio/tipos'
import type { EstadoEspaco } from './useEspaco'

/**
 * L5: espaço criado pelo painel nascia sem nenhum membro/dono, violando a
 * invariante "sempre ≥1 dono" por construção. Compõe as duas ações que já
 * existem no contexto — o `Store` não ganha um método novo.
 */
export async function criarEspacoComDono(
  ctx: Pick<EstadoEspaco, 'criarEspaco' | 'atualizarEspacoAtivo'>,
  nomeEspaco: string,
  nomeDono: string,
  corDono: string,
): Promise<Espaco> {
  const espaco = await ctx.criarEspaco(nomeEspaco)
  const comDono = adicionarMembro(espaco, {
    id: crypto.randomUUID(),
    nome: nomeDono,
    cor: corDono,
    papel: 'dono',
  })
  await ctx.atualizarEspacoAtivo(comDono)
  return comDono
}
