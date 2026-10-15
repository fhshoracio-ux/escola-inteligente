import { useEffect, useState } from 'react'
import api from '../api'

const STATUS_CORES = {
  presente:    { bg: '#DCFCE7', color: '#166534' },
  ausente:     { bg: '#FEE2E2', color: '#991b1b' },
  atrasado:    { bg: '#FEF9C3', color: '#854d0e' },
  justificado: { bg: '#DBEAFE', color: '#1e40af' },
}

export default function Presenca() {
  const [escolas, setEscolas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [aula, setAula] = useState(null)
  const [presencas, setPresencas] = useState([])
  const [historico, setHistorico] = useState([])
  const [aba, setAba] = useState('chamada')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get(`/aulas/turmas/escola/${escolaId}`).then(r => {
      setTurmas(r.data)
      if (r.data.length > 0) setTurmaId(r.data[0].id)
    })
  }, [escolaId])

  useEffect(() => {
    if (!turmaId) return
    api.get(`/aulas/turma/${turmaId}/historico`).then(r => setHistorico(r.data))
  }, [turmaId])

  async function iniciarAula() {
    if (!turmaId || !disciplina) {
      setMensagem('Selecione a turma e informe a disciplina.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/aulas/', { turma_id: turmaId, disciplina })
      setAula(res.data)
      const pres = await api.get(`/aulas/${res.data.id}/presenca`)
      setPresencas(pres.data)
      setAba('chamada')
      setMensagem(`Aula iniciada — ${res.data.total_alunos} alunos na lista`)
    } catch {
      setMensagem('Erro ao iniciar aula.')
    } finally {
      setLoading(false)
    }
  }

  async function abrirAula(aulaId) {
    const pres = await api.get(`/aulas/${aulaId}/presenca`)
    setPresencas(pres.data)
    setAula({ id: aulaId })
    setAba('chamada')
  }

  async function atualizarPresenca(alunoId, status) {
    if (!aula) return
    await api.put(`/aulas/${aula.id}/presenca/${alunoId}`, { status })
    setPresencas(prev => prev.map(p =>
      p.aluno_id === alunoId ? { ...p, status } : p
    ))
  }

  const presentes = presencas.filter(p => p.status === 'presente').length
  const ausentes = presencas.filter(p => p.status === 'ausente').length

  const btn = (label, status, color) => ({
    padding: '4px 10px', borderRadius: '6px', border: 'none',
    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
    background: color, color: 'white', marginRight: '4px'
  })

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Lista de Presença
      </h1>

      {/* Configuração */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Escola</label>
            <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Turma</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.serie}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Disciplina</label>
            <input value={disciplina} onChange={e => setDisciplina(e.target.value)}
              placeholder="Ex: Matemática"
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem', width: 160 }} />
          </div>
          <button onClick={iniciarAula} disabled={loading}
            style={{ padding: '0.5rem 1.25rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            {loading ? 'Iniciando...' : '▶ Iniciar Aula'}
          </button>
        </div>
        {mensagem && <p style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{mensagem}</p>}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['chamada', 'historico'].map(a => (
          <button key={a} onClick={() => setAba(a)}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
              background: aba === a ? '#6366f1' : '#f3f4f6',
              color: aba === a ? 'white' : '#374151',
            }}>
            {a === 'chamada' ? '📋 Chamada' : '📅 Histórico'}
          </button>
        ))}
      </div>

      {/* Chamada */}
      {aba === 'chamada' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          {presencas.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
              Inicie uma aula para ver a lista de presença.
            </p>
          ) : (
            <>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '1rem' }}>
                <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontSize: '0.85rem' }}>
                  ✓ {presentes} presentes
                </span>
                <span style={{ background: '#FEE2E2', color: '#991b1b', padding: '4px 12px', borderRadius: '999px', fontSize: '0.85rem' }}>
                  ✗ {ausentes} ausentes
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                    <th style={th}>Aluno</th>
                    <th style={th}>Matrícula</th>
                    <th style={th}>Status</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {presencas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={td}>{p.aluno_nome}</td>
                      <td style={td}>{p.matricula}</td>
                      <td style={td}>
                        <span style={{
                          ...STATUS_CORES[p.status],
                          padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem'
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => atualizarPresenca(p.aluno_id, 'presente')}
                          style={btn('P', 'presente', '#16a34a')}>P</button>
                        <button onClick={() => atualizarPresenca(p.aluno_id, 'atrasado')}
                          style={btn('A', 'atrasado', '#d97706')}>AT</button>
                        <button onClick={() => atualizarPresenca(p.aluno_id, 'ausente')}
                          style={btn('F', 'ausente', '#dc2626')}>F</button>
                        <button onClick={() => atualizarPresenca(p.aluno_id, 'justificado')}
                          style={btn('J', 'justificado', '#2563eb')}>J</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Histórico */}
      {aba === 'historico' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          {historico.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma aula registrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={th}>Disciplina</th>
                  <th style={th}>Data</th>
                  <th style={th}>Presentes</th>
                  <th style={th}>Ausentes</th>
                  <th style={th}>Total</th>
                  <th style={th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{h.disciplina}</td>
                    <td style={td}>{new Date(h.inicio).toLocaleDateString('pt-BR')}</td>
                    <td style={td}><span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>{h.presentes}</span></td>
                    <td style={td}><span style={{ background: '#FEE2E2', color: '#991b1b', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>{h.ausentes}</span></td>
                    <td style={td}>{h.total_alunos}</td>
                    <td style={td}>
                      <button onClick={() => abrirAula(h.aula_id)}
                        style={{ padding: '4px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Ver chamada
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }