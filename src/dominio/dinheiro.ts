/** Dinheiro sempre em centavos inteiros — nunca float. Formatação só na borda da UI. */

export function paraCentavos(str: string): number {
  const normalizado = str.trim().replace(/\./g, '').replace(',', '.')
  const valor = Number(normalizado)
  if (!Number.isFinite(valor)) {
    throw new Error(`valor inválido: "${str}"`)
  }
  return Math.round(valor * 100)
}

export function formatarBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function somar(...valores: number[]): number {
  return valores.reduce((total, v) => total + v, 0)
}

/** Distribui `total` em `partes` parcelas, sem perder nem sobrar centavo. */
export function ratear(total: number, partes: number): number[] {
  if (partes <= 0) {
    throw new Error('partes deve ser maior que zero')
  }
  const base = Math.floor(total / partes)
  const resto = total - base * partes
  return Array.from({ length: partes }, (_, i) => (i < resto ? base + 1 : base))
}
