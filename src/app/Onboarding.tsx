import { useState } from 'react'
import { useEspaco } from './ContextoEspaco'
import type { Regra } from '../dominio/tipos'
import { mesAtual, somarMeses } from '../dominio/mes'

const CORES = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac']

interface RascunhoMembro {
  nome: string
  cor: string
}

function regrasExemplo(espacoId: string, membroId: string): Regra[] {
  const agora = new Date().toISOString()
  const mes = mesAtual()
  const base = {
    espacoId,
    pagamento: { tipo: 'conta' as const },
    ativa: true,
    excecoes: {},
    criadoEm: agora,
    atualizadoEm: agora,
  }
  return [
    {
      id: crypto.randomUUID(),
      ...base,
      nome: 'Salário (exemplo)',
      fluxo: 'entrada',
      membroId,
      categoria: 'renda',
      valorCentavos: 350000,
      recorrencia: { tipo: 'mensal', inicio: mes, fim: null },
    },
    {
      id: crypto.randomUUID(),
      ...base,
      nome: 'Aluguel (exemplo)',
      fluxo: 'saida',
      membroId: 'compartilhado',
      categoria: 'moradia',
      valorCentavos: 150000,
      recorrencia: { tipo: 'mensal', inicio: mes, fim: null },
    },
    {
      id: crypto.randomUUID(),
      ...base,
      nome: 'Assinatura anual (exemplo)',
      fluxo: 'saida',
      membroId,
      categoria: 'lazer',
      valorCentavos: 12000,
      recorrencia: { tipo: 'unica', mes: somarMeses(mes, 3) },
    },
  ]
}

export function Onboarding() {
  const { criarEspaco, atualizarEspacoAtivo, salvarRegras } = useEspaco()
  const [nomeEspaco, setNomeEspaco] = useState('')
  const [membros, setMembros] = useState<RascunhoMembro[]>([{ nome: '', cor: CORES[0] }])
  const [caixaCompartilhado, setCaixaCompartilhado] = useState(true)
  const [comExemplo, setComExemplo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function atualizarMembro(indice: number, campo: keyof RascunhoMembro, valor: string) {
    setMembros((atual) => atual.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m)))
  }

  function adicionarMembro() {
    setMembros((atual) => [...atual, { nome: '', cor: CORES[atual.length % CORES.length] }])
  }

  function removerMembro(indice: number) {
    setMembros((atual) => atual.filter((_, i) => i !== indice))
  }

  const podeConfirmar = nomeEspaco.trim().length > 0 && membros.some((m) => m.nome.trim().length > 0)

  async function confirmar() {
    if (!podeConfirmar) return
    setEnviando(true)
    try {
      const espaco = await criarEspaco(nomeEspaco.trim())
      const membrosValidos = membros
        .filter((m) => m.nome.trim().length > 0)
        .map((m, i) => ({
          id: crypto.randomUUID(),
          nome: m.nome.trim(),
          cor: m.cor,
          papel: (i === 0 ? 'dono' : 'membro') as 'dono' | 'membro',
        }))
      await atualizarEspacoAtivo({ ...espaco, membros: membrosValidos, caixaCompartilhado })
      if (comExemplo) {
        await salvarRegras(espaco.id, regrasExemplo(espaco.id, membrosValidos[0].id))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="onboarding">
      <h1>Prumo</h1>
      <p className="subtitulo">Finanças da casa, no prumo. Vamos começar.</p>

      <section>
        <label htmlFor="nome-espaco">Nome do espaço</label>
        <input
          id="nome-espaco"
          placeholder="ex. Casa"
          value={nomeEspaco}
          onChange={(e) => setNomeEspaco(e.target.value)}
        />
      </section>

      <section>
        <label>Membros</label>
        {membros.map((membro, i) => (
          <div className="linha-membro" key={i}>
            <input
              placeholder={i === 0 ? 'seu nome (vira dono)' : 'nome'}
              value={membro.nome}
              onChange={(e) => atualizarMembro(i, 'nome', e.target.value)}
            />
            <div className="cores">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={`cor ${cor}`}
                  className={cor === membro.cor ? 'cor selecionada' : 'cor'}
                  style={{ background: cor }}
                  onClick={() => atualizarMembro(i, 'cor', cor)}
                />
              ))}
            </div>
            {membros.length > 1 && (
              <button type="button" className="remover" onClick={() => removerMembro(i)}>
                remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={adicionarMembro}>
          + adicionar membro
        </button>
      </section>

      <section>
        <label>
          <input
            type="checkbox"
            checked={caixaCompartilhado}
            onChange={(e) => setCaixaCompartilhado(e.target.checked)}
          />
          Caixa único (saldo comum, dono por item)
        </label>
      </section>

      <section>
        <label>
          <input type="radio" checked={!comExemplo} onChange={() => setComExemplo(false)} />
          Começar vazio
        </label>
        <label>
          <input type="radio" checked={comExemplo} onChange={() => setComExemplo(true)} />
          Carregar exemplo fictício
        </label>
      </section>

      <button type="button" className="confirmar" disabled={!podeConfirmar || enviando} onClick={confirmar}>
        {enviando ? 'criando…' : 'Começar'}
      </button>
    </main>
  )
}
