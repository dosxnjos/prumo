import { useRef, useState } from 'react'
import { useEspaco } from './useEspaco'
import { Modal } from './Modal'
import { formatarBRL, paraCentavos } from '../dominio/dinheiro'
import { metaPeDeMeiaCentavos, taxaRendimentoMensalDeCDI } from '../dominio/config'
import type { ConfigFinanceira } from '../dominio/config'

interface Props {
  onFechar: () => void
}

function paraTextoMoeda(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

export function ConfigFinanceiraTela({ onFechar }: Props) {
  const { espacoAtivo, dados, salvarConfig, exportarEspaco, importarEspaco } = useEspaco()
  const configInicial = dados?.config
  const [config, setConfig] = useState<ConfigFinanceira | null>(configInicial ?? null)
  const [custoTexto, setCustoTexto] = useState(configInicial ? paraTextoMoeda(configInicial.custoSobrevivenciaCentavos) : '')
  const [peDeMeiaTexto, setPeDeMeiaTexto] = useState(configInicial ? paraTextoMoeda(configInicial.peDeMeiaAtualCentavos) : '')
  const [reservaTexto, setReservaTexto] = useState(configInicial ? paraTextoMoeda(configInicial.reservaAtualCentavos) : '')
  const [salvando, setSalvando] = useState(false)
  const [mensagemBackup, setMensagemBackup] = useState<string | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  async function exportar() {
    if (!espacoAtivo) return
    const json = await exportarEspaco(espacoAtivo.id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const nomeArquivo = `prumo-${espacoAtivo.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`
    const link = document.createElement('a')
    link.href = url
    link.download = nomeArquivo
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setMensagemBackup(null)
    try {
      const texto = await arquivo.text()
      const novo = await importarEspaco(texto)
      setMensagemBackup(
        `Importado como novo espaço: "${novo.nome}". Nada foi sobrescrito — confere o espaço novo; ` +
          'se estiver tudo lá, apaga o antigo em Espaços → apagar.',
      )
    } catch {
      setMensagemBackup('Não consegui importar esse arquivo — confere se é um backup do Prumo.')
    }
  }

  if (!config || !espacoAtivo) return null

  function atualizar<K extends keyof ConfigFinanceira>(campo: K, valor: ConfigFinanceira[K]) {
    setConfig((atual) => (atual ? { ...atual, [campo]: valor } : atual))
  }

  async function salvar() {
    if (!config || !espacoAtivo) return
    setSalvando(true)
    try {
      const configFinal: ConfigFinanceira = {
        ...config,
        custoSobrevivenciaCentavos: paraCentavos(custoTexto || '0'),
        peDeMeiaAtualCentavos: paraCentavos(peDeMeiaTexto || '0'),
        reservaAtualCentavos: paraCentavos(reservaTexto || '0'),
      }
      await salvarConfig(espacoAtivo.id, configFinal)
      onFechar()
    } finally {
      setSalvando(false)
    }
  }

  const taxaPreview = taxaRendimentoMensalDeCDI(config.cdiAnualPercent, config.percentualBanco)
  const metaPreview = metaPeDeMeiaCentavos({
    ...config,
    custoSobrevivenciaCentavos: (() => {
      try {
        return paraCentavos(custoTexto || '0')
      } catch {
        return 0
      }
    })(),
  })

  return (
    <Modal onFechar={onFechar} onSubmit={salvar} className="config-financeira" titulo="Configuração financeira">
        <h2>Configuração financeira</h2>
        <p className="subtitulo">vale só para o espaço "{espacoAtivo.nome}"</p>

        <label>
          CDI ao ano (%)
          <input
            type="number"
            step="0.01"
            value={config.cdiAnualPercent}
            onChange={(e) => atualizar('cdiAnualPercent', Number(e.target.value))}
          />
        </label>

        <label>
          % do CDI que o banco paga
          <input
            type="number"
            step="0.01"
            value={config.percentualBanco}
            onChange={(e) => atualizar('percentualBanco', Number(e.target.value))}
          />
        </label>

        <p className="preview-derivado">
          taxa de rendimento líquida (IR 22,5% descontado): <strong>{(taxaPreview * 100).toFixed(4)}% a.m.</strong>
        </p>

        <label>
          Taxa de juros da dívida (% ao mês)
          <input
            type="number"
            step="0.01"
            value={config.taxaJurosDividaMensal * 100}
            onChange={(e) => atualizar('taxaJurosDividaMensal', Number(e.target.value) / 100)}
          />
        </label>

        <label>
          Meta do pé de meia (em meses de sobrevivência)
          <input
            type="number"
            min={1}
            value={config.metaPeDeMeiaMeses}
            onChange={(e) => atualizar('metaPeDeMeiaMeses', Number(e.target.value))}
          />
        </label>

        <label>
          Custo mensal de sobrevivência
          <input value={custoTexto} onChange={(e) => setCustoTexto(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>

        <p className="preview-derivado">
          meta do pé de meia: <strong>{formatarBRL(metaPreview)}</strong>
        </p>

        <hr />
        <p className="subtitulo">
          ⚠️ estado atual — digitado à mão, porque o fechamento de mês (Fase 4)
          ainda não existe para calcular isso sozinho
        </p>

        <label>
          Pé de meia atual
          <input value={peDeMeiaTexto} onChange={(e) => setPeDeMeiaTexto(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>

        <label>
          Reserva livre atual
          <input value={reservaTexto} onChange={(e) => setReservaTexto(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>

        <div className="acoes">
          <button type="button" onClick={onFechar}>cancelar</button>
          <button type="submit" className="salvar" disabled={salvando}>
            salvar
          </button>
        </div>

        <hr />
        <p className="subtitulo">
          Backup — o dado só existe neste navegador. Exportar é a única cópia
          de segurança.
        </p>

        <div className="linha-criar">
          <button type="button" onClick={exportar}>exportar backup (JSON)</button>
          <button type="button" onClick={() => inputArquivoRef.current?.click()}>
            importar backup (JSON)
          </button>
          <input
            ref={inputArquivoRef}
            type="file"
            accept="application/json"
            onChange={importarArquivo}
            style={{ display: 'none' }}
          />
        </div>
        {mensagemBackup && <p className="preview-derivado">{mensagemBackup}</p>}
    </Modal>
  )
}

