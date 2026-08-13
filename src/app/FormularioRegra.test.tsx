// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FormularioRegra } from './FormularioRegra'
import { ProvedorEspaco } from './ContextoEspaco'
import { definirEspacoAtivoId, storeLocal } from '../dados/store-local'
import { configFinanceiraPadrao } from '../dominio/config'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * `FormularioRegra` renderiza os inputs mesmo antes do `ProvedorEspaco`
 * terminar de carregar (`espacoAtivo` chega `null` no primeiro render) — o
 * DOM não é sinal de "carregado". Por isso a espera é por um número fixo de
 * voltas do loop de eventos (cada uma no seu próprio `act`), não por
 * aparecer um elemento.
 */
async function esperarContextoCarregar(voltas = 20) {
  for (let i = 0; i < voltas; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
  }
}

async function montar(container: HTMLDivElement) {
  const espaco = await storeLocal.criarEspaco('Casa')
  await storeLocal.salvar(espaco.id, { regras: [], config: configFinanceiraPadrao() })
  await definirEspacoAtivoId(espaco.id)

  const root = createRoot(container)
  act(() => {
    root.render(
      <ProvedorEspaco>
        <FormularioRegra regra={null} onFechar={() => {}} />
      </ProvedorEspaco>,
    )
  })
  await esperarContextoCarregar()
  return root
}

function disparar(el: Element, tipo: string) {
  el.dispatchEvent(new Event(tipo, { bubbles: true }))
}

function clicar(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function setValor(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, valor)
  disparar(input, 'input')
}

function botaoSalvar(container: HTMLDivElement): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'salvar')!
}

function inputPorRotulo(container: HTMLDivElement, rotulo: string): HTMLInputElement {
  const label = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.startsWith(rotulo))!
  return label.querySelector('input')!
}

describe('FormularioRegra — validação antes de salvar (L7)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('valor zero ou negativo bloqueia o save', async () => {
    const root = await montar(container)

    act(() => setValor(inputPorRotulo(container, 'Nome'), 'Aluguel'))
    act(() => setValor(inputPorRotulo(container, 'Valor'), '0'))
    await act(async () => clicar(botaoSalvar(container)))

    expect(container.textContent).toContain('valor precisa ser maior que zero')
    expect(container.querySelector('input')).toBeTruthy() // formulário continua aberto

    root.unmount()
  })

  it('valor válido salva e fecha (regressão — não bloqueia caso saudável)', async () => {
    const espaco = await storeLocal.criarEspaco('Casa 2')
    await storeLocal.salvar(espaco.id, { regras: [], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    let fechou = false
    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <FormularioRegra regra={null} onFechar={() => { fechou = true }} />
        </ProvedorEspaco>,
      )
    })
    await esperarContextoCarregar()

    act(() => setValor(inputPorRotulo(container, 'Nome'), 'Aluguel'))
    act(() => setValor(inputPorRotulo(container, 'Valor'), '150,00'))
    act(() => clicar(botaoSalvar(container)))
    for (let i = 0; i < 30 && !fechou; i++) {
      await new Promise((r) => setTimeout(r, 10))
    }

    expect(fechou).toBe(true)
    root.unmount()
  })

  it('período com fim antes do início bloqueia o save', async () => {
    const root = await montar(container)

    act(() => setValor(inputPorRotulo(container, 'Nome'), 'Aluguel'))
    act(() => setValor(inputPorRotulo(container, 'Valor'), '100,00'))

    const radioPeriodo = Array.from(container.querySelectorAll('input[type="radio"]'))[1] as HTMLInputElement
    act(() => clicar(radioPeriodo))

    const camposMes = Array.from(container.querySelectorAll('input[type="month"]')) as HTMLInputElement[]
    act(() => setValor(camposMes[0], '2026-06'))
    act(() => setValor(camposMes[1], '2026-01'))

    await act(async () => clicar(botaoSalvar(container)))

    expect(container.textContent).toContain('não pode vir antes do início')

    root.unmount()
  })

  it('parcelas < 1 bloqueia o save', async () => {
    const root = await montar(container)

    act(() => setValor(inputPorRotulo(container, 'Nome'), 'Geladeira'))
    act(() => setValor(inputPorRotulo(container, 'Valor'), '100,00'))

    const radioParcelada = Array.from(container.querySelectorAll('input[type="radio"]'))[4] as HTMLInputElement
    act(() => clicar(radioParcelada))

    const campoParcelas = container.querySelector('input[type="number"]') as HTMLInputElement
    act(() => setValor(campoParcelas, '0'))

    await act(async () => clicar(botaoSalvar(container)))

    expect(container.textContent).toContain('precisa ser 1 ou mais')

    root.unmount()
  })
})

describe('FormularioRegra — confirmação inline ao apagar (L3)', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('primeiro clique não apaga; confirmação apaga', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    const agora = new Date().toISOString()
    const regra = {
      id: 'r1',
      espacoId: espaco.id,
      nome: 'Aluguel',
      fluxo: 'saida' as const,
      membroId: 'compartilhado' as const,
      categoria: 'moradia',
      valorCentavos: 10000,
      recorrencia: { tipo: 'mensal' as const, inicio: '2026-01', fim: null },
      pagamento: { tipo: 'conta' as const },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    await storeLocal.salvar(espaco.id, { regras: [regra], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    let fechou = false
    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <FormularioRegra regra={regra} onFechar={() => { fechou = true }} />
        </ProvedorEspaco>,
      )
    })
    await esperarContextoCarregar()

    const botaoApagar = () => Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'apagar')!

    // primeiro clique: só entra em modo de confirmação, não apaga
    act(() => clicar(botaoApagar()))
    expect(fechou).toBe(false)
    expect(container.textContent).toContain('Isso remove o item de TODOS os meses')

    // segundo clique (no botão "apagar" da confirmação): apaga de verdade
    act(() => clicar(botaoApagar()))
    for (let i = 0; i < 20 && !fechou; i++) {
      await new Promise((r) => setTimeout(r, 10))
    }
    expect(fechou).toBe(true)

    const dadosFinais = await storeLocal.carregar(espaco.id)
    expect(dadosFinais.regras).toHaveLength(0)

    root.unmount()
  })

  it('confirmação oferece "desligar" como alternativa a apagar', async () => {
    const espaco = await storeLocal.criarEspaco('Casa')
    const agora = new Date().toISOString()
    const regra = {
      id: 'r1',
      espacoId: espaco.id,
      nome: 'Aluguel',
      fluxo: 'saida' as const,
      membroId: 'compartilhado' as const,
      categoria: 'moradia',
      valorCentavos: 10000,
      recorrencia: { tipo: 'mensal' as const, inicio: '2026-01', fim: null },
      pagamento: { tipo: 'conta' as const },
      ativa: true,
      excecoes: {},
      criadoEm: agora,
      atualizadoEm: agora,
    }
    await storeLocal.salvar(espaco.id, { regras: [regra], config: configFinanceiraPadrao() })
    await definirEspacoAtivoId(espaco.id)

    let fechou = false
    const root = createRoot(container)
    act(() => {
      root.render(
        <ProvedorEspaco>
          <FormularioRegra regra={regra} onFechar={() => { fechou = true }} />
        </ProvedorEspaco>,
      )
    })
    await esperarContextoCarregar()

    const botaoApagar = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'apagar')!
    act(() => clicar(botaoApagar))

    const botaoDesligar = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'desligar')!
    act(() => clicar(botaoDesligar))
    for (let i = 0; i < 20 && !fechou; i++) {
      await new Promise((r) => setTimeout(r, 10))
    }
    expect(fechou).toBe(true)

    const dadosFinais = await storeLocal.carregar(espaco.id)
    expect(dadosFinais.regras).toHaveLength(1)
    expect(dadosFinais.regras[0].ativa).toBe(false)

    root.unmount()
  })
})
