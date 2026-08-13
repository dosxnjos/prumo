import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { entries, createStore } from 'idb-keyval'

async function baixarDadosBrutos() {
  const db = createStore('prumo-db', 'prumo-store')
  const registros = await entries(db)
  const dump = Object.fromEntries(registros.map(([chave, valor]) => [String(chave), valor]))
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `prumo-emergencia-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  return blob
}

interface Props {
  children: ReactNode
}

interface State {
  erro: Error | null
}

export class ErroApp extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('ErroApp capturou uma exceção não tratada:', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children

    return (
      <div role="alert" style={{ padding: '2rem', maxWidth: '32rem', margin: '0 auto' }}>
        <h1>Algo deu errado</h1>
        <p>
          O Prumo encontrou um erro inesperado e não consegue continuar nesta tela. Seus dados
          não foram apagados — eles continuam salvos neste navegador.
        </p>
        <p>
          <button type="button" onClick={() => window.location.reload()}>
            recarregar
          </button>{' '}
          <button type="button" onClick={() => baixarDadosBrutos()}>
            baixar meus dados
          </button>
        </p>
      </div>
    )
  }
}
