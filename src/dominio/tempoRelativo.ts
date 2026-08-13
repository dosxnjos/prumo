/** U3: "último backup: há N dias" — sem libs de data, só o que o app precisa. */

export function diasDesde(iso: string, agora: Date): number {
  const entao = new Date(iso)
  const inicioEntao = new Date(entao.getFullYear(), entao.getMonth(), entao.getDate())
  const inicioAgora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  return Math.round((inicioAgora.getTime() - inicioEntao.getTime()) / (1000 * 60 * 60 * 24))
}

export function rotuloRelativo(iso: string | undefined, agora: Date): string {
  if (!iso) return 'nunca'
  const dias = diasDesde(iso, agora)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}
