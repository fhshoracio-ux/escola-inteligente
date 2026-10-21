import { useEffect, useState } from 'react'
import api from '../api'

const STATUS_LABEL = {
  pendente:   { label: 'Pendente',    cor: '#f59e0b' },
  em_analise: { label: 'Em análise',  cor: '#3b82f6' },
  aprovado:   { label: 'Aprovado',    cor: '#10b981' },
  rejeitado:  { label: 'Rejeitado',   cor: '#ef4444' },
  correcao:   { label: 'Correção',    cor: '#8b5cf6' },
}

const TIPO_LABEL = {
  matricula:    'Matrícula',
  rematricula:  'Rematrícula',
  transferencia:'Transferência',
}

const DOC_LABEL = {
  foto:         '📷 Foto do aluno',
  rg:           '🪪 RG',
  cpf:          '📄 CPF',
  comprovante:  '🏠 Comprovante de endereço',
  historico:    '📋 Histórico escolar',
  certidao:     '📜 Certidão de nascimento',
}

export default function Matriculas() {
  const [escolas, setEscolas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [solicitacoes, setSolicitacoes] = useState([])
  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [modalStatus, setModalStatus] = useState(null)  // { sol, novoStatus }
  const [mensagemCoord, setMensagemCoord] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    carregar()
  }, [escolaId, filtroStatus])

  async function carregar() {
    setLoading(true)
    try {
      const params = { escola_id: escolaId }
      if (filtroStatus) params.status = filtroStatus
      const r = await api.get('/matriculas/', { params })
      setSolicitacoes(r.data)
    } catch {
      setErro('Erro ao carregar solicitações.')
    } finally {
      setLoading(false)
    }
  }

  async function abrirDetalhe(sol) {
    try {
      const r = await api.get(`/matriculas/${sol.id}`)
      setDetalhe(r.data)
    } catch {
      setErro('Erro ao carregar detalhes.')
    }
  }

  async function atualizarStatus() {
    if (!modalStatus) return
    setSalvando(true)
    try {
      await api.patch(`/matriculas/${modalStatus.sol.id}`, {
        status: modalStatus.novoStatus,
        mensagem_coordenador: mensagemCoord || null,
      })
      setMsg(`Solicitação ${STATUS_LABEL[modalStatus.novoStatus]?.label.toLowerCase()} com sucesso!`)
      setModalStatus(null)
      setMensagemCoord('')
      setDetalhe(null)
      await carregar()
    } catch {
      setErro('Erro ao atualizar status.')
    } finally {
      setSalvando(false)
    }
  }

  const contadores = Object.fromEntries(
    Object.keys(STATUS_LABEL).map(s => [s, solicitacoes.filter(x => x.status === s).length])
  )

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Matrículas Digitais</h2>
      <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
        Solicitações enviadas pelo App de Matrícula
      </p>

      {/* Mensagens */}
      {msg  && <div style={styles.alertVerde}>{msg}  <button onClick={() => setMsg('')}  style={styles.fechar}>×</button></div>}
      {erro && <div style={styles.alertVerm}>{erro} <button onClick={() => setErro('')} style={styles.fechar}>×</button></div>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={escolaId} onChange={e => setEscolaId(e.target.value)} style={styles.select}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={styles.select}>
          <option value=''>Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <button onClick={carregar} style={styles.btnPrimario}>🔄 Atualizar</button>
      </div>

      {/* Cards de contadores */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} onClick={() => setFiltroStatus(filtroStatus === k ? '' : k)}
            style={{ ...styles.cardContador, borderColor: v.cor, cursor: 'pointer',
              background: filtroStatus === k ? v.cor + '22' : 'transparent' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: v.cor }}>{contadores[k] || 0}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{v.label}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#6b7280', textAlign: 'center' }}>Carregando...</p>
      ) : solicitacoes.length === 0 ? (
        <div style={styles.vazio}>
          <div style={{ fontSize: 40 }}>📭</div>
          <p>Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {solicitacoes.map(sol => {
            const st = STATUS_LABEL[sol.status] || STATUS_LABEL.pendente
            return (
              <div key={sol.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{sol.nome_aluno}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {TIPO_LABEL[sol.tipo] || sol.tipo} · Resp: {sol.nome_responsavel} · {sol.telefone_responsavel}
                    </div>
                    {sol.turma_desejada && (
                      <div style={{ fontSize: 13, color: '#6b7280' }}>Turma desejada: {sol.turma_desejada}</div>
                    )}
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      {new Date(sol.criado_em).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...styles.badge, background: st.cor + '22', color: st.cor, border: `1px solid ${st.cor}` }}>
                      {st.label}
                    </span>
                    <button onClick={() => abrirDetalhe(sol)} style={styles.btnSec}>Ver detalhes</button>
                    {sol.status === 'pendente' && (
                      <button onClick={() => { setModalStatus({ sol, novoStatus: 'em_analise' }); setMensagemCoord('') }}
                        style={{ ...styles.btnSec, borderColor: '#3b82f6', color: '#3b82f6' }}>
                        Iniciar análise
                      </button>
                    )}
                    {(sol.status === 'pendente' || sol.status === 'em_analise') && (
                      <>
                        <button onClick={() => { setModalStatus({ sol, novoStatus: 'aprovado' }); setMensagemCoord('') }}
                          style={{ ...styles.btnSec, borderColor: '#10b981', color: '#10b981' }}>
                          ✓ Aprovar
                        </button>
                        <button onClick={() => { setModalStatus({ sol, novoStatus: 'rejeitado' }); setMensagemCoord('') }}
                          style={{ ...styles.btnSec, borderColor: '#ef4444', color: '#ef4444' }}>
                          ✗ Rejeitar
                        </button>
                        <button onClick={() => { setModalStatus({ sol, novoStatus: 'correcao' }); setMensagemCoord('') }}
                          style={{ ...styles.btnSec, borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                          ⚠ Correção
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Detalhe */}
      {detalhe && (
        <div style={styles.overlay} onClick={() => setDetalhe(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Detalhes da Solicitação</h3>
              <button onClick={() => setDetalhe(null)} style={styles.fechar}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 16 }}>
              {[
                ['Aluno', detalhe.nome_aluno],
                ['Tipo', TIPO_LABEL[detalhe.tipo] || detalhe.tipo],
                ['Data Nasc.', detalhe.data_nascimento || '—'],
                ['CPF Aluno', detalhe.cpf_aluno || '—'],
                ['Responsável', detalhe.nome_responsavel],
                ['CPF Resp.', detalhe.cpf_responsavel],
                ['Telefone', detalhe.telefone_responsavel],
                ['Turma desejada', detalhe.turma_desejada || '—'],
                ['Status', STATUS_LABEL[detalhe.status]?.label || detalhe.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            {detalhe.observacoes && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>Observações</div>
                <div style={{ fontSize: 14 }}>{detalhe.observacoes}</div>
              </div>
            )}

            {detalhe.mensagem_coordenador && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef3c7', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Mensagem do coordenador</div>
                <div style={{ fontSize: 14 }}>{detalhe.mensagem_coordenador}</div>
              </div>
            )}

            {/* Documentos */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Documentos enviados</div>
              {(!detalhe.documentos || detalhe.documentos.length === 0) ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Nenhum documento enviado ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detalhe.documentos.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: 14 }}>{DOC_LABEL[doc.tipo] || doc.tipo}</span>
                      <a href={`https://escolainteligente-api.6ft7qo.easypanel.host/${doc.caminho}`}
                        target='_blank' rel='noreferrer'
                        style={{ fontSize: 13, color: '#3b82f6', textDecoration: 'none' }}>
                        Visualizar →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(detalhe.status === 'pendente' || detalhe.status === 'em_analise') && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setModalStatus({ sol: detalhe, novoStatus: 'aprovado' }); setDetalhe(null); setMensagemCoord('') }}
                  style={{ ...styles.btnSec, borderColor: '#10b981', color: '#10b981' }}>✓ Aprovar</button>
                <button onClick={() => { setModalStatus({ sol: detalhe, novoStatus: 'rejeitado' }); setDetalhe(null); setMensagemCoord('') }}
                  style={{ ...styles.btnSec, borderColor: '#ef4444', color: '#ef4444' }}>✗ Rejeitar</button>
                <button onClick={() => { setModalStatus({ sol: detalhe, novoStatus: 'correcao' }); setDetalhe(null); setMensagemCoord('') }}
                  style={{ ...styles.btnSec, borderColor: '#8b5cf6', color: '#8b5cf6' }}>⚠ Pedir correção</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Confirmação de Status */}
      {modalStatus && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: 460 }}>
            <h3 style={{ margin: '0 0 12px' }}>
              {modalStatus.novoStatus === 'aprovado'  && '✓ Aprovar matrícula'}
              {modalStatus.novoStatus === 'rejeitado' && '✗ Rejeitar solicitação'}
              {modalStatus.novoStatus === 'correcao'  && '⚠ Solicitar correção'}
              {modalStatus.novoStatus === 'em_analise'&& '🔍 Iniciar análise'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              Aluno: <strong>{modalStatus.sol.nome_aluno}</strong>
            </p>
            {modalStatus.novoStatus === 'aprovado' && (
              <div style={{ padding: '10px 14px', background: '#d1fae5', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                ✅ O aluno será <strong>criado automaticamente</strong> no sistema ao aprovar.
              </div>
            )}
            <textarea
              placeholder='Mensagem para o responsável (opcional)'
              value={mensagemCoord}
              onChange={e => setMensagemCoord(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 6,
                border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalStatus(null)} style={styles.btnSec} disabled={salvando}>Cancelar</button>
              <button onClick={atualizarStatus} disabled={salvando}
                style={{ ...styles.btnPrimario,
                  background: modalStatus.novoStatus === 'aprovado' ? '#10b981'
                             : modalStatus.novoStatus === 'rejeitado' ? '#ef4444'
                             : modalStatus.novoStatus === 'correcao' ? '#8b5cf6' : '#3b82f6' }}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  select: {
    padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 14, background: 'white', cursor: 'pointer',
  },
  btnPrimario: {
    padding: '8px 16px', borderRadius: 6, border: 'none',
    background: '#3b82f6', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500,
  },
  btnSec: {
    padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db',
    background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer',
  },
  badge: {
    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  card: {
    padding: '14px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
    background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardContador: {
    padding: '10px 16px', borderRadius: 8, border: '2px solid',
    minWidth: 80, textAlign: 'center',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
  },
  modal: {
    background: 'white', borderRadius: 10, padding: 24,
    width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  alertVerde: {
    padding: '10px 14px', borderRadius: 6, background: '#d1fae5', color: '#065f46',
    marginBottom: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14,
  },
  alertVerm: {
    padding: '10px 14px', borderRadius: 6, background: '#fee2e2', color: '#991b1b',
    marginBottom: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14,
  },
  fechar: {
    background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  vazio: {
    textAlign: 'center', padding: '48px 0', color: '#9ca3af',
  },
}
