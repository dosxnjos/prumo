// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TelaMes } from './TelaMes'
import { ProvedorEspaco } from './ContextoEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao, paraConfigProjecao } from '../dominio/config'
import { mesAtual, somarMeses } from '../dominio/mes'
import { criarProjetorSerie } from '../dominio/projecao'
import type { Regra } from '../dominio/tipos'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function esperar(voltas = 25) {
  for (let i = 0; i < voltas; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

describe('TelaMes — saldo unificado com a projeção (L4)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('mês com dívida encadeada do mês anterior: totais da TelaMes batem com a série projetada', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    const agora = new Date().toISOString()
    const mesAtualStr = mesAtual()
    const mesSeguinte = somarMeses(mesAtualStr, 1)

    // gasto grande só no mês atual — sem reserva/pé de meia, sobra dívida
    // que se encadeia pro mês seguinte via "Dívida do mês anterior"
    const gastoGrande: Regra = {
      id: 'r1',
      espacoId: espaco.id,
      nome: 'Rombo',
      fluxo: 'saida',
      membroId: 'compartilhado',
      categoria: 'emergencia',
      valorCentavos: 500000,
      recorrencia: { tipo: 'unica', mes: mesAtualStr },
      pagamento: { tipo: 'conta' },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    const rendaMensal: Regra = {
      id: 'r2',
      espacoId: espaco.id,
      nome: 'Salário',
      fluxo: 'entrada',
      membroId: 'compartilhado',
      categoria: 'renda',
      valorCentavos: 10000,
      recorrencia: { tipo: 'mensal', inicio: mesAtualStr, fim: null },
      pagamento: { tipo: 'conta' },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    const config = { ...configFinanceiraPadrao(), taxaJurosDividaMensal: 0.05 }
    await storeLocal.salvar(espaco.id, { regras: [gastoGrande, rendaMensal], config })
    await definirEspacoAtivoId(espaco.id)

    // valor de referência: calculado direto pelo motor, independente da UI
    const projetarSerie = criarProjetorSerie([gastoGrande, rendaMensal], paraConfigProjecao(config))
    const serie = projetarSerie(mesAtualStr, { reserva: 0, peDeMeia: 0, divida: 0 }, mesSeguinte)
    const referencia = serie[1]
    expect(referencia.ocorrencias.some((o) => o.regraId === null)).toBe(true) // tem a dívida encadeada

    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <TelaMes onEditarRegra={() => {}} />
        </ProvedorEspaco>,
      )
    })
    await esperar()

    // navega pro mês seguinte
    const botaoProximo = container.querySelector('button[aria-label="mês seguinte"]') as HTMLButtonElement
    act(() => botaoProximo.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await esperar(5)

    expect(container.textContent).toContain('Dívida do mês anterior')
    expect(container.textContent).toContain(`Saídas ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(referencia.totalSaidas / 100)}`)
    expect(container.textContent).toContain(`Entradas ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(referencia.totalEntradas / 100)}`)

    root.unmount()
  })
})
