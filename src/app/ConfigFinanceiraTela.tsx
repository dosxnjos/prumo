import { useState } from 'react'
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
  const { espacoAtivo, dados, salvarConfig } = useEspaco()
  const configInicial = dados?.config
  const [config, setConfig] = useState<ConfigFinanceira | null>(configInicial ?? null)
  const [custoTexto, setCustoTexto] = useState(configInicial ? paraTextoMoeda(configInicial.custoSobrevivenciaCentavos) : '')
  const [peDeMeiaTexto, setPeDeMeiaTexto] = useState(configInicial ? paraTextoMoeda(configInicial.peDeMeiaAtualCentavos) : '')
  const [reservaTexto, setReservaTexto] = useState(configInicial ? paraTextoMoeda(configInicial.reservaAtualCentavos) : '')
  const [salvando, setSalvando] = useState(false)

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

      <fieldset className="secao-config">
        <legend>Rendimento</legend>

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
        <p className="microcopy">não sabe o % do banco? 100% é o comum.</p>

        <p className="preview-derivado">
          taxa de rendimento líquida (IR 22,5% descontado): <strong>{(taxaPreview * 100).toFixed(4)}% a.m.</strong>
        </p>
      </fieldset>

      <fieldset className="secao-config">
        <legend>Dívida</legend>

        <label>
          Taxa de juros da dívida (% ao mês)
          <input
            type="number"
            step="0.01"
            value={config.taxaJurosDividaMensal * 100}
            onChange={(e) => atualizar('taxaJurosDividaMensal', Number(e.target.value) / 100)}
          />
        </label>
        <p className="microcopy">não tem dívida (ou não sabe a taxa)? deixa 0.</p>
      </fieldset>

      <fieldset className="secao-config">
        <legend>Meta</legend>

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
        <p className="microcopy">quanto você gasta por mês pra se manter, sem luxo — a base da meta.</p>

        <p className="preview-derivado">
          meta do pé de meia: <strong>{formatarBRL(metaPreview)}</strong>
        </p>
      </fieldset>

      <fieldset className="secao-config">
        <legend>Estado atual</legend>
        <p className="subtitulo">
          ⚠️ digitado à mão, porque o fechamento de mês (Fase 4) ainda não
          existe para calcular isso sozinho
        </p>

        <label>
          Pé de meia atual
          <input value={peDeMeiaTexto} onChange={(e) => setPeDeMeiaTexto(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>

        <label>
          Reserva livre atual
          <input value={reservaTexto} onChange={(e) => setReservaTexto(e.target.value)} placeholder="0,00" inputMode="decimal" />
        </label>
      </fieldset>

      <div className="acoes">
        <button type="button" onClick={onFechar}>cancelar</button>
        <button type="submit" className="salvar" disabled={salvando}>
          salvar
        </button>
      </div>
    </Modal>
  )
}
