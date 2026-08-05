import type { ConfigFinanceira } from '../dominio/config'
import type { Espaco, Regra } from '../dominio/tipos'

/** Tudo o que um espaço guarda, além do próprio `Espaco` (nome/membros). */
export interface DadosEspaco {
  regras: Regra[]
  config: ConfigFinanceira
}

export interface ArquivoExportado {
  schemaVersion: number
  espaco: Espaco
  dados: DadosEspaco
}

/**
 * Fronteira única entre UI e persistência. Nenhum arquivo em `src/ui/` ou
 * `src/app/` deve importar `store-local` diretamente — só esta interface.
 * É o que o módulo online (Fase 8) troca sem tocar em UI nenhuma.
 */
export interface Store {
  listarEspacos(): Promise<Espaco[]>
  carregar(espacoId: string): Promise<DadosEspaco>
  salvar(espacoId: string, dados: DadosEspaco): Promise<void>
  criarEspaco(nome: string): Promise<Espaco>
  /** Atualiza metadados do espaço (nome, membros, caixaCompartilhado). */
  atualizarEspaco(espaco: Espaco): Promise<void>
  apagarEspaco(espacoId: string): Promise<void>
  exportarJSON(espacoId: string): Promise<string>
  /** Sempre cria um espaço NOVO (id regerado) — nunca sobrescreve um existente. */
  importarJSON(texto: string): Promise<Espaco>
}
