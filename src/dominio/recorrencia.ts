import { diffMeses } from './mes'
import type { Mes, Regra } from './tipos'

/** Parcelas iguais, com o resto do arredondamento absorvido pela última. */
function valorDaParcela(total: number, parcelas: number, k: number): number {
  const base = Math.floor(total / parcelas)
  const ultima = k === parcelas - 1
  return ultima ? total - base * (parcelas - 1) : base
}

function dentroDoIntervalo(mes: Mes, inicio: Mes, fim: Mes | null): boolean {
  if (mes < inicio) return false
  if (fim !== null && mes > fim) return false
  return true
}

function ocorreSemExcecao(regra: Regra, mes: Mes): boolean {
  if (!regra.ativa) return false

  const rec = regra.recorrencia
  switch (rec.tipo) {
    case 'unica':
      return mes === rec.mes
    case 'mensal':
      return dentroDoIntervalo(mes, rec.inicio, rec.fim)
    case 'periodica': {
      if (!dentroDoIntervalo(mes, rec.inicio, rec.fim)) return false
      return diffMeses(rec.inicio, mes) % rec.aCadaMeses === 0
    }
    case 'parcelada': {
      const offset = diffMeses(rec.inicio, mes)
      return offset >= 0 && offset < rec.parcelas
    }
  }
}

export function ocorreEm(regra: Regra, mes: Mes): boolean {
  if (regra.excecoes[mes]?.pular) return false
  return ocorreSemExcecao(regra, mes)
}

export function valorEm(regra: Regra, mes: Mes): number {
  const excecao = regra.excecoes[mes]
  if (excecao?.valorCentavos !== undefined) return excecao.valorCentavos

  const rec = regra.recorrencia
  if (rec.tipo === 'parcelada') {
    const offset = diffMeses(rec.inicio, mes)
    return valorDaParcela(regra.valorCentavos, rec.parcelas, offset)
  }

  return regra.valorCentavos
}
