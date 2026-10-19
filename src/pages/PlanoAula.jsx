import { useEffect, useState } from 'react'
import api from '../api'

export default function PlanoAula() {
  const [escolas, setEscolas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [professores, setProfessores] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [plano, setPlano] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState('plano')
  const [vinculo, setVinculo] = useState({ usuario_id: '', disciplina_id: '', turma_id: '', escola_id: '' })
  const [professor, setProfessor] = useState({ nome: '', email: '', senha: '', escola_id: '' })

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get('/turmas/escola/' + escolaId).then(r => setTurmas(r.data))
    api.get('/professores/escola/' + escolaId).then(r => setProfessores(r.data)).catch(() => setProfessores([]))
    api.get('/professores/plano/' + escolaId).then(r => setPlano(r.data)).catch(() => setPlano([]))
  }, [escolaId])

  useEffect(() => {
    if (!turmaId) return
    api.get('/boletim/disciplinas/turma/' + turmaId).then(r => setDisciplinas(r.data)).catch(() => setDisciplinas([]))
    setVinculo(prev => ({ ...prev, turma_id: turmaId }))
  }, [turmaId])

  async function cadastrarProfessor() {
    if (!professor.nome || !professor.email || !professor.senha) {
      setErro('Nome, email e senha sao obrigatorios.'); return
    }
    try {
      await api.post('/professores/', { ...professor, escola_id: escolaId })
      setMensagem('Professor cadastrado!')
      setErro('')
      setProfessor({ nome: '', email: '', senha: '', escola_id: '' })
      api.get('/professores/escola/' + escolaId).then(r => setProfessores(r.data))
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao cadastrar professor.')
    }
  }

  async function vincular() {
    if (!vinculo.usuario_id || !vinculo.disciplina_id || !vinculo.turma_id) {
      setErro('Selecione professor, disciplina e turma.'); return
    }
    try {
      await api.post('/professores/vincular', { ...vinculo, escola_id: escolaId })
      setMensagem('Professor vinculado!')
      setErro('')
      api.get('/professores/plano/' + escolaId).then(r => setPlano(r.data))
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao vincular.')
    }
  }

  async function removerVinculo(id) {
    try {
      await api.delete('/professores/vincular/' + id)
      api.get('/professores/plano/' + escolaId).then(r => setPlano(r.data))
    } catch { setErro('Erro ao remover vinculo.') }
  }

  const input = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box'
  }
  const btn = {
    background: '#6366f1', color: 'white', border: 'none',
    padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer',
    fontSize: '0.9rem', fontWeight: 500
  }

  const turnoLabel = { manha: 'Manha', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }
  const corTurno = { manha: '#dbeafe', tarde: '#fef9c3', noite: '#ede9fe', integral: '#dcfce7' }
  const txtTurno = { manha: '#1d4ed8', tarde: '#854d0e', noite: '#6d28d9', integral: '#166534' }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Plano de Aula</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'plano', label: 'Plano de Aula' },
          { id: 'vincular', label: 'Vincular Professor' },
          { id: 'professor', label: 'Novo Professor' },
        ].map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setMensagem(''); setErro('') }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
              background: aba === a.id ? '#6366f1' : '#f3f4f6',
              color: aba === a.id ? 'white' : '#374151',
            }}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>✓ {mensagem}</div>}
      {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}

      {aba === 'plano' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Plano de Aula Completo</span>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{plano.length} vinculos</span>
          </div>
          {plano.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum vinculo cadastrado. Vá em Vincular Professor.</p>
          ) : (
            <div className="tabela-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={th}>Turma</th>
                  <th style={th}>Serie</th>
                  <th style={th}>Turno</th>
                  <th style={th}>Disciplina</th>
                  <th style={th}>Professor</th>
                  <th style={th}>Acao</th>
                </tr>
              </thead>
              <tbody>
                {plano.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}><b>{p.turma}</b></td>
                    <td style={td}>{p.serie}º Ano</td>
                    <td style={td}>
                      <span style={{ background: corTurno[p.turno] || '#f3f4f6', color: txtTurno[p.turno] || '#374151', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }}>
                        {turnoLabel[p.turno] || p.turno}
                      </span>
                    </td>
                    <td style={td}>📚 {p.disciplina}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
                          {p.professor.charAt(0)}
                        </div>
                        {p.professor}
                      </div>
                    </td>
                    <td style={td}>
                      <button onClick={() => removerVinculo(p.id)}
                        style={{ padding: '3px 8px', background: '#FEE2E2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {aba === 'vincular' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Vincular Professor a Disciplina/Turma</h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Turma *</label>
            <select style={{ ...input, marginBottom: 0 }} value={turmaId} onChange={e => setTurmaId(e.target.value)}>
              <option value="">Selecione a turma</option>
              {turmas.filter(t => t.turno !== 'noite').map(t => (
                <option key={t.id} value={t.id}>{t.nome} — {t.serie}º Ano — {turnoLabel[t.turno]}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '0.75rem', marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Disciplina *</label>
            <select style={{ ...input, marginBottom: 0 }} value={vinculo.disciplina_id} onChange={e => setVinculo({ ...vinculo, disciplina_id: e.target.value })}>
              <option value="">Selecione a disciplina</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '0.75rem', marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Professor *</label>
            <select style={{ ...input, marginBottom: 0 }} value={vinculo.usuario_id} onChange={e => setVinculo({ ...vinculo, usuario_id: e.target.value })}>
              <option value="">Selecione o professor</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <button style={{ ...btn, marginTop: '1rem' }} onClick={vincular}>Vincular Professor</button>
        </div>
      )}

      {aba === 'professor' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Cadastrar Professor</h2>
          <input style={input} placeholder="Nome completo *" value={professor.nome} onChange={e => setProfessor({ ...professor, nome: e.target.value })} />
          <input style={input} placeholder="Email *" type="email" value={professor.email} onChange={e => setProfessor({ ...professor, email: e.target.value })} />
          <input style={input} placeholder="Senha *" type="password" value={professor.senha} onChange={e => setProfessor({ ...professor, senha: e.target.value })} />
          <button style={btn} onClick={cadastrarProfessor}>Cadastrar Professor</button>

          {professores.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>Professores cadastrados</h3>
              {professores.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                    {p.nome.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{p.nome}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }
