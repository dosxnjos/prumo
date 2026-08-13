import { useRef, useState } from 'react'
import { useEspaco } from './useEspaco'
import { Modal } from './Modal'
import { adicionarMembro, alterarPapel, podeRebaixar, podeRemover, removerMembro } from '../dominio/espaco'
import { rotuloRelativo, diasDesde } from '../dominio/tempoRelativo'
import type { Papel } from '../dominio/tipos'

const CORES = ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac']
const DIAS_AVISO_BACKUP = 30

interface Props {
  onVoltar: () => void
}

/** U7 (nível 1): renomear, membros, apagar — só o espaço ATIVO, uma responsabilidade por tela. */
export function GerenciarEspaco({ onVoltar }: Props) {
  const { espacoAtivo, dados, atualizarEspacoAtivo, apagarEspaco, reatribuirERemoverMembro, salvarConfig, exportarEspaco, importarEspaco } = useEspaco()
  const [renomeando, setRenomeando] = useState(false)
  const [nomeRenomeado, setNomeRenomeado] = useState(espacoAtivo?.nome ?? '')
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [nomeMembroNovo, setNomeMembroNovo] = useState('')
  const [mensagemBackup, setMensagemBackup] = useState<string | null>(null)
  const inputArquivoRef = useRef<HTMLInputElement>(null)
  const [reatribuindoMembroId, setReatribuindoMembroId] = useState<string | null>(null)
  const [paraQuem, setParaQuem] = useState<string>('compartilhado')

  if (!espacoAtivo) return null

  async function renomear() {
    if (!espacoAtivo || !nomeRenomeado.trim()) return
    await atualizarEspacoAtivo({ ...espacoAtivo, nome: nomeRenomeado.trim() })
    setRenomeando(false)
  }

  async function confirmarApagar() {
    if (!espacoAtivo || nomeConfirmacao !== espacoAtivo.nome) return
    await apagarEspaco(espacoAtivo.id)
    setConfirmandoApagar(false)
    setNomeConfirmacao('')
    onVoltar()
  }

  async function adicionarNovoMembro() {
    if (!espacoAtivo || !nomeMembroNovo.trim()) return
    const cor = CORES[espacoAtivo.membros.length % CORES.length]
    const novo = adicionarMembro(espacoAtivo, {
      id: crypto.randomUUID(),
      nome: nomeMembroNovo.trim(),
      cor,
      papel: 'membro',
    })
    await atualizarEspacoAtivo(novo)
    setNomeMembroNovo('')
  }

  async function trocarPapel(membroId: string, papel: Papel) {
    if (!espacoAtivo) return
    try {
      await atualizarEspacoAtivo(alterarPapel(espacoAtivo, membroId, papel))
    } catch {
      // trava do último dono — a UI já não deveria oferecer isso, mas o
      // domínio é a fonte da verdade; se chegar aqui, simplesmente ignora.
    }
  }

  function itensDoMembro(membroId: string): number {
    return (dados?.regras ?? []).filter((r) => r.membroId === membroId).length
  }

  async function iniciarRemocao(membroId: string) {
    if (!espacoAtivo) return
    if (itensDoMembro(membroId) === 0) {
      try {
        await atualizarEspacoAtivo(removerMembro(espacoAtivo, membroId))
      } catch {
        // idem — trava do último dono.
      }
      return
    }
    setReatribuindoMembroId(membroId)
    setParaQuem('compartilhado')
  }

  async function confirmarReatribuicaoERemover() {
    if (!espacoAtivo || !reatribuindoMembroId) return
    try {
      await reatribuirERemoverMembro(espacoAtivo.id, reatribuindoMembroId, paraQuem)
    } catch {
      // idem — trava do último dono.
    }
    setReatribuindoMembroId(null)
  }

  /** U3: exportar carimba `ultimoBackupEm` — a data que o aviso de "backup velho" usa. */
  async function exportar() {
    if (!espacoAtivo || !dados) return
    const json = await exportarEspaco(espacoAtivo.id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const nomeArquivo = `prumo-${espacoAtivo.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`
    const link = document.createElement('a')
    link.href = url
    link.download = nomeArquivo
    link.click()
    URL.revokeObjectURL(url)
    await salvarConfig(espacoAtivo.id, { ...dados.config, ultimoBackupEm: new Date().toISOString() })
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

  return (
    <Modal onFechar={onVoltar} className="painel-espacos" titulo={`Gerenciar ${espacoAtivo.nome}`}>
      <button type="button" className="fantasma" onClick={onVoltar}>
        ‹ espaços
      </button>
      <h2>{espacoAtivo.nome}</h2>

      {renomeando ? (
        <div className="linha-criar">
          <input value={nomeRenomeado} onChange={(e) => setNomeRenomeado(e.target.value)} />
          <button type="button" onClick={renomear}>salvar</button>
          <button type="button" onClick={() => setRenomeando(false)}>cancelar</button>
        </div>
      ) : (
        <button type="button" onClick={() => setRenomeando(true)}>renomear</button>
      )}

      <h4>Membros</h4>
      <ul className="lista-membros">
        {espacoAtivo.membros.map((m) => (
          <li key={m.id}>
            <span className="ponto-cor" style={{ background: m.cor }} />
            {m.nome}
            <select
              value={m.papel}
              disabled={m.papel === 'dono' && !podeRebaixar(espacoAtivo, m.id)}
              onChange={(e) => trocarPapel(m.id, e.target.value as Papel)}
            >
              <option value="dono">dono</option>
              <option value="membro">membro</option>
            </select>
            {podeRemover(espacoAtivo, m.id) && (
              <button type="button" className="remover" onClick={() => iniciarRemocao(m.id)}>
                remover
              </button>
            )}

            {reatribuindoMembroId === m.id && (
              <div className="linha-criar reatribuir-itens">
                <p>
                  {itensDoMembro(m.id)} {itensDoMembro(m.id) === 1 ? 'item é' : 'itens são'} de {m.nome}. Passar
                  para:
                </p>
                <select value={paraQuem} onChange={(e) => setParaQuem(e.target.value)}>
                  <option value="compartilhado">Compartilhado</option>
                  {espacoAtivo.membros
                    .filter((outro) => outro.id !== m.id)
                    .map((outro) => (
                      <option key={outro.id} value={outro.id}>
                        {outro.nome}
                      </option>
                    ))}
                </select>
                <button type="button" className="apagar" onClick={confirmarReatribuicaoERemover}>
                  passar e remover
                </button>
                <button type="button" onClick={() => setReatribuindoMembroId(null)}>
                  cancelar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="linha-criar">
        <input
          value={nomeMembroNovo}
          onChange={(e) => setNomeMembroNovo(e.target.value)}
          placeholder="nome do novo membro"
        />
        <button type="button" onClick={adicionarNovoMembro}>+ adicionar</button>
      </div>

      <hr />
      <h4>Backup</h4>
      <p className="subtitulo">
        último backup: <strong>{rotuloRelativo(dados?.config.ultimoBackupEm, new Date())}</strong>
      </p>
      {(!dados?.config.ultimoBackupEm || diasDesde(dados.config.ultimoBackupEm, new Date()) > DIAS_AVISO_BACKUP) && (
        <p className="aviso-backup">
          ⚠️ o dado só existe neste navegador — exportar é a única cópia de
          segurança.
        </p>
      )}
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

      <hr />
      {confirmandoApagar ? (
        <div className="linha-criar">
          <p>Digite <strong>{espacoAtivo.nome}</strong> para confirmar:</p>
          <input value={nomeConfirmacao} onChange={(e) => setNomeConfirmacao(e.target.value)} />
          <button
            type="button"
            className="apagar"
            disabled={nomeConfirmacao !== espacoAtivo.nome}
            onClick={confirmarApagar}
          >
            apagar espaço
          </button>
          <button type="button" onClick={() => setConfirmandoApagar(false)}>cancelar</button>
        </div>
      ) : (
        <button type="button" className="apagar" onClick={() => setConfirmandoApagar(true)}>
          apagar espaço
        </button>
      )}
    </Modal>
  )
}
