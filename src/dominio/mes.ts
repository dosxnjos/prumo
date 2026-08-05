/** Competência `AAAA-MM`, como string — ordenável por comparação lexicográfica direta. */
export type Mes = string

const NOMES_MES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function partes(mes: Mes): { ano: number; mesIndex: number } {
  const [anoStr, mesStr] = mes.split('-')
  return { ano: Number(anoStr), mesIndex: Number(mesStr) - 1 }
}

function formatar(ano: number, mesIndex: number): Mes {
  const mesStr = String(mesIndex + 1).padStart(2, '0')
  return `${ano}-${mesStr}`
}

export function mesAtual(): Mes {
  const hoje = new Date()
  return formatar(hoje.getFullYear(), hoje.getMonth())
}

export function somarMeses(mes: Mes, n: number): Mes {
  const { ano, mesIndex } = partes(mes)
  const total = ano * 12 + mesIndex + n
  return formatar(Math.floor(total / 12), ((total % 12) + 12) % 12)
}

export function diffMeses(a: Mes, b: Mes): number {
  const pa = partes(a)
  const pb = partes(b)
  return (pb.ano * 12 + pb.mesIndex) - (pa.ano * 12 + pa.mesIndex)
}

export function intervalo(de: Mes, ate: Mes): Mes[] {
  const n = diffMeses(de, ate)
  if (n < 0) return []
  return Array.from({ length: n + 1 }, (_, i) => somarMeses(de, i))
}

export function rotulo(mes: Mes): string {
  const { ano, mesIndex } = partes(mes)
  return `${NOMES_MES[mesIndex]}/${ano}`
}
