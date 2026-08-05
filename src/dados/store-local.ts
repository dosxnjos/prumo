import { createStore, del, get, set } from 'idb-keyval'
import type { Espaco } from '../dominio/tipos'
import type { DadosEspaco, Store } from './store'

const SCHEMA_VERSION = 1

interface RegistroEspaco {
  schemaVersion: number
  dados: DadosEspaco
}

const db = createStore('prumo-db', 'prumo-store')

const CHAVE_INDICE = 'espacos-indice'
const CHAVE_ESPACO_ATIVO = 'espaco-ativo-id'
const chaveEspaco = (espacoId: string) => `espaco-${espacoId}`

async function lerIndice(): Promise<Espaco[]> {
  return (await get<Espaco[]>(CHAVE_INDICE, db)) ?? []
}

async function salvarIndice(espacos: Espaco[]): Promise<void> {
  await set(CHAVE_INDICE, espacos, db)
}

/**
 * Migração de schema: identidade para `SCHEMA_VERSION` atual. Uma versão
 * desconhecida **falha alto** — não tenta adivinhar o formato e corromper o
 * estado. Ponto único a estender quando o schema mudar.
 */
function migrar(registro: RegistroEspaco): DadosEspaco {
  if (registro.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion desconhecida: ${registro.schemaVersion} (esperada ${SCHEMA_VERSION})`,
    )
  }
  return registro.dados
}

export const storeLocal: Store = {
  async listarEspacos() {
    return lerIndice()
  },

  async carregar(espacoId) {
    const registro = await get<RegistroEspaco>(chaveEspaco(espacoId), db)
    if (!registro) {
      throw new Error(`espaço não encontrado: ${espacoId}`)
    }
    return migrar(registro)
  },

  async salvar(espacoId, dados) {
    const registro: RegistroEspaco = { schemaVersion: SCHEMA_VERSION, dados }
    await set(chaveEspaco(espacoId), registro, db)
  },

  async criarEspaco(nome) {
    const agora = new Date().toISOString()
    const espaco: Espaco = {
      id: crypto.randomUUID(),
      nome,
      membros: [],
      caixaCompartilhado: true,
      criadoEm: agora,
      atualizadoEm: agora,
    }
    const indice = await lerIndice()
    await salvarIndice([...indice, espaco])
    await this.salvar(espaco.id, { regras: [], config: configPadrao() })
    return espaco
  },

  async atualizarEspaco(espaco) {
    const indice = await lerIndice()
    const atualizado = { ...espaco, atualizadoEm: new Date().toISOString() }
    await salvarIndice(indice.map((e) => (e.id === espaco.id ? atualizado : e)))
  },

  async apagarEspaco(espacoId) {
    const indice = await lerIndice()
    await salvarIndice(indice.filter((e) => e.id !== espacoId))
    await del(chaveEspaco(espacoId), db)
  },

  async exportarJSON(espacoId) {
    const indice = await lerIndice()
    const espaco = indice.find((e) => e.id === espacoId)
    if (!espaco) {
      throw new Error(`espaço não encontrado: ${espacoId}`)
    }
    const dados = await this.carregar(espacoId)
    return JSON.stringify({ schemaVersion: SCHEMA_VERSION, espaco, dados })
  },

  async importarJSON(texto) {
    const arquivo = JSON.parse(texto) as { schemaVersion: number; espaco: Espaco; dados: DadosEspaco }
    if (arquivo.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`schemaVersion desconhecida no arquivo: ${arquivo.schemaVersion}`)
    }
    const agora = new Date().toISOString()
    const espacoNovo: Espaco = { ...arquivo.espaco, id: crypto.randomUUID(), atualizadoEm: agora }
    const indice = await lerIndice()
    await salvarIndice([...indice, espacoNovo])
    await this.salvar(espacoNovo.id, arquivo.dados)
    return espacoNovo
  },
}

function configPadrao() {
  return {
    taxaRendimentoMensal: 0,
    taxaJurosDividaMensal: 0,
    metaPeDeMeiaCentavos: 0,
  }
}

export async function obterEspacoAtivoId(): Promise<string | undefined> {
  return get<string>(CHAVE_ESPACO_ATIVO, db)
}

export async function definirEspacoAtivoId(espacoId: string): Promise<void> {
  await set(CHAVE_ESPACO_ATIVO, espacoId, db)
}
