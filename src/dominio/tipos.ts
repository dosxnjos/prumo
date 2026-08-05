export type Mes = string // 'AAAA-MM'
export type Fluxo = 'entrada' | 'saida'
export type Papel = 'dono' | 'membro'

/** Container de TUDO, inclusive offline. Nada existe fora de um espaço. */
export interface Espaco {
  id: string
  nome: string
  icone?: string
  membros: Membro[]
  /**
   * `true` (default): caixa único, saldo comum com dono por item.
   * `false`: dois caixas + casa rateada. Switchável — nasce `true` porque é
   * o modo do MVP, não porque o outro modo é hipotético.
   */
  caixaCompartilhado: boolean
  criadoEm: string
  atualizadoEm: string
}

/** Existe SEMPRE; sem autenticação no modo local — é o dono de um item. */
export interface Membro {
  id: string
  nome: string
  cor: string
  papel: Papel
  email?: string // preenchido só com o módulo online ligado
}

export type Recorrencia =
  | { tipo: 'unica'; mes: Mes }
  | { tipo: 'mensal'; inicio: Mes; fim: Mes | null }
  | { tipo: 'periodica'; inicio: Mes; fim: Mes | null; aCadaMeses: number }
  | { tipo: 'parcelada'; inicio: Mes; parcelas: number }

export interface Regra {
  id: string
  espacoId: string
  nome: string
  fluxo: Fluxo
  membroId: string | 'compartilhado'
  categoria: string
  valorCentavos: number
  recorrencia: Recorrencia
  pagamento: { tipo: 'conta' } | { tipo: 'cartao'; cartaoId: string }
  diaDoMes?: number
  ativa: boolean
  excecoes: Record<Mes, { valorCentavos?: number; pular?: true }>
  criadoEm: string
  atualizadoEm: string
}
