import 'fake-indexeddb/auto'
import { set } from 'idb-keyval'
import { describe, expect, it } from 'vitest'
import { definirEspacoAtivoId, obterEspacoAtivoId, storeLocal } from './store-local'

// createStore('prumo-db', 'prumo-store') abre um IndexedDB por processo; como
// fake-indexeddb reinicia a cada teste (import fresco não limpa o banco), a
// forma segura de isolar é usar espaçoIds novos por teste em vez de limpar DB.

describe('criarEspaco + carregar', () => {
  it('cria um espaço vazio persistido, recuperável por carregar()', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    expect(espaco.membros).toEqual([])

    const dados = await storeLocal.carregar(espaco.id)
    expect(dados.regras).toEqual([])
  })

  it('espaço criado aparece em listarEspacos()', async () => {
    const espaco = await storeLocal.criarEspaco('Pessoal')
    const lista = await storeLocal.listarEspacos()
    expect(lista.some((e) => e.id === espaco.id)).toBe(true)
  })
})

describe('salvar + carregar — "recarregar a página" preserva os dados', () => {
  it('dados salvos sobrevivem a uma nova leitura (simula reload)', async () => {
    const espaco = await storeLocal.criarEspaco('Casa reload')
    const regra = {
      id: 'r1',
      espacoId: espaco.id,
      nome: 'Aluguel',
      fluxo: 'saida' as const,
      membroId: 'compartilhado' as const,
      categoria: 'moradia',
      valorCentavos: 150000,
      recorrencia: { tipo: 'mensal' as const, inicio: '2026-01', fim: null },
      pagamento: { tipo: 'conta' as const },
      ativa: true,
      excecoes: {},
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-01T00:00:00.000Z',
    }
    await storeLocal.salvar(espaco.id, { regras: [regra], config: { taxaRendimentoMensal: 0, taxaJurosDividaMensal: 0, metaPeDeMeiaCentavos: 0 } })

    // "reload": nova leitura do zero, sem estado em memória do teste anterior
    const dadosRecarregados = await storeLocal.carregar(espaco.id)
    expect(dadosRecarregados.regras).toHaveLength(1)
    expect(dadosRecarregados.regras[0].nome).toBe('Aluguel')
  })
})

describe('atualizarEspaco + apagarEspaco', () => {
  it('atualiza metadados (nome, membros) sem tocar em regras/config', async () => {
    const espaco = await storeLocal.criarEspaco('Nome antigo')
    await storeLocal.atualizarEspaco({ ...espaco, nome: 'Nome novo' })

    const lista = await storeLocal.listarEspacos()
    const atualizado = lista.find((e) => e.id === espaco.id)
    expect(atualizado?.nome).toBe('Nome novo')
  })

  it('apaga o espaço do índice e dos dados', async () => {
    const espaco = await storeLocal.criarEspaco('Descartável')
    await storeLocal.apagarEspaco(espaco.id)

    const lista = await storeLocal.listarEspacos()
    expect(lista.some((e) => e.id === espaco.id)).toBe(false)
    await expect(storeLocal.carregar(espaco.id)).rejects.toThrow()
  })
})

describe('espaço ativo', () => {
  it('persiste e recupera o espaço ativo', async () => {
    const espaco = await storeLocal.criarEspaco('Ativo')
    await definirEspacoAtivoId(espaco.id)
    const ativo = await obterEspacoAtivoId()
    expect(ativo).toBe(espaco.id)
  })
})

describe('schemaVersion desconhecida falha alto', () => {
  it('carregar() lança erro em vez de tentar adivinhar o formato', async () => {
    const espaco = await storeLocal.criarEspaco('Schema quebrado')
    // grava um registro com schemaVersion inválida direto no idb-keyval,
    // simulando um estado gravado por uma versão futura/incompatível do app
    const { createStore } = await import('idb-keyval')
    const db = createStore('prumo-db', 'prumo-store')
    await set(`espaco-${espaco.id}`, { schemaVersion: 999, dados: { regras: [], config: {} } }, db)

    await expect(storeLocal.carregar(espaco.id)).rejects.toThrow(/schemaVersion/)
  })
})

describe('exportarJSON + importarJSON', () => {
  it('exportar e importar reconstrói o espaço como NOVO (id regerado)', async () => {
    const original = await storeLocal.criarEspaco('Exportável')
    const regra = {
      id: 'r1',
      espacoId: original.id,
      nome: 'Salário',
      fluxo: 'entrada' as const,
      membroId: 'compartilhado' as const,
      categoria: 'renda',
      valorCentavos: 500000,
      recorrencia: { tipo: 'mensal' as const, inicio: '2026-01', fim: null },
      pagamento: { tipo: 'conta' as const },
      ativa: true,
      excecoes: {},
      criadoEm: '2026-01-01T00:00:00.000Z',
      atualizadoEm: '2026-01-01T00:00:00.000Z',
    }
    await storeLocal.salvar(original.id, { regras: [regra], config: { taxaRendimentoMensal: 0.005, taxaJurosDividaMensal: 0.1, metaPeDeMeiaCentavos: 100000 } })

    const json = await storeLocal.exportarJSON(original.id)
    const importado = await storeLocal.importarJSON(json)

    expect(importado.id).not.toBe(original.id) // id regerado, nunca sobrescreve
    expect(importado.nome).toBe('Exportável')

    const dadosImportados = await storeLocal.carregar(importado.id)
    expect(dadosImportados.regras).toHaveLength(1)
    expect(dadosImportados.regras[0].nome).toBe('Salário')

    // o espaço original continua intacto — import nunca sobrescreve
    const dadosOriginais = await storeLocal.carregar(original.id)
    expect(dadosOriginais.regras).toHaveLength(1)
  })

  it('rejeita schemaVersion desconhecida no arquivo importado', async () => {
    const arquivoFalso = JSON.stringify({
      schemaVersion: 999,
      espaco: { id: 'x', nome: 'Falso', membros: [], criadoEm: '', atualizadoEm: '' },
      dados: { regras: [], config: {} },
    })
    await expect(storeLocal.importarJSON(arquivoFalso)).rejects.toThrow(/schemaVersion/)
  })
})
