import { useEffect, useState } from 'react'
import api from '../api'

const BASE_URL = api.defaults.baseURL.replace('/api/v1', '')

export default function Relatorios() {
  const [aba, setAba] = useState('presenca')
  const [escolas, setEscolas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [aulas, setAulas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [aulaId, setAulaId] = useState('')
  const [alunoId, setAlunoId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [disciplina, setDisciplina] = useState('')

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
    api.get(`/aulas/turma/${turmaId}/historico`).then(r => {
      setAulas(r.data)
      const discs = [...new Set(r.data.map(a => a.disciplina))]
      setDisciplinas(discs)
    })
    api.get(`/alunos/turma/${turmaId}`).then(r => {
      setAlunos(r.data)
      if (r.data.length > 0) setAlunoId(r.data[0].id)
    }).catch(() => setAlunos([]))
  }, [turmaId])

  function baixarPDF(url) {
    window.open(`${BASE_URL}${url}`, '_blank')
  }

  const abas = [
    { id: 'presenca',   label: '📋 Lista de Presença' },
    { id: 'frequencia', label: '📊 Frequência por Aluno' },
    { id: 'turma',      label: '🏫 Resumo por Turma' },
    { id: 'acessos',    label: '🚪 Acessos do Dia' },
  ]

  const meses = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Relatórios</h1>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
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

      {/* Filtros comuns: Escola + Turma */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={label}>Escola</label>
            <select value={escolaId} onChange={e => setEscolaId(e.target.value)} style={select}>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          {aba !== 'acessos' && (
            <div>
              <label style={label}>Turma</label>
              <select value={turmaId} onChange={e => setTurmaId(e.target.value)} style={select}>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.serie}</option>)}
              </select>
            </div>
          )}
          {(aba === 'frequencia' || aba === 'turma') && (
            <>
              <div>
                <label style={label}>Mês</label>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} style={select}>
                  {meses.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Ano</label>
                <select value={ano} onChange={e => setAno(Number(e.target.value))} style={select}>
                  {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </>
          )}
          {aba === 'frequencia' && (
            <div>
              <label style={label}>Aluno</label>
              <select value={alunoId} onChange={e => setAlunoId(e.target.value)} style={select}>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          )}
          {aba === 'turma' && (
            <div>
              <label style={label}>Disciplina (opcional)</label>
              <select value={disciplina} onChange={e => setDisciplina(e.target.value)} style={select}>
                <option value="">Todas</option>
                {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {aba === 'acessos' && (
            <div>
              <label style={label}>Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} style={select} />
            </div>
          )}
        </div>
      </div>

      {/* ── PRESENÇA POR AULA ── */}
      {aba === 'presenca' && (
        <div style={card}>
          <h2 style={h2}>Lista de Presença por Aula</h2>
          {aulas.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>Nenhuma aula registrada para esta turma.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  {['Disciplina','Data','Presentes','Ausentes','Total','PDF'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aulas.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{a.disciplina}</td>
                    <td style={td}>{new Date(a.inicio).toLocaleDateString('pt-BR')}</td>
                    <td style={td}><Badge cor="#DCFCE7" txt="#166534">{a.presentes}</Badge></td>
                    <td style={td}><Badge cor="#FEE2E2" txt="#991b1b">{a.ausentes}</Badge></td>
                    <td style={td}>{a.total_alunos}</td>
                    <td style={td}>
                      <BtnPDF onClick={() => baixarPDF(`/api/v1/relatorios/presenca/${a.aula_id}`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── FREQUÊNCIA POR ALUNO ── */}
      {aba === 'frequencia' && (
        <div style={card}>
          <h2 style={h2}>Frequência Mensal por Aluno</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Gera o relatório de frequência do aluno selecionado no mês e ano escolhidos.
          </p>
          {alunos.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>Nenhum aluno encontrado nesta turma.</p>
          ) : (
            <BtnPDF
              label="📥 Baixar PDF de Frequência"
              onClick={() => baixarPDF(`/api/v1/relatorios/frequencia/aluno/${alunoId}?mes=${mes}&ano=${ano}`)}
              grande
            />
          )}
        </div>
      )}

      {/* ── RESUMO POR TURMA ── */}
      {aba === 'turma' && (
        <div style={card}>
          <h2 style={h2}>Resumo de Frequência da Turma</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Gera o relatório com a frequência de todos os alunos da turma no período selecionado.
          </p>
          <BtnPDF
            label="📥 Baixar PDF da Turma"
            onClick={() => baixarPDF(`/api/v1/relatorios/turma/${turmaId}?mes=${mes}&ano=${ano}${disciplina ? `&disciplina=${disciplina}` : ''}`)}
            grande
          />
        </div>
      )}

      {/* ── ACESSOS ── */}
      {aba === 'acessos' && (
        <div style={card}>
          <h2 style={h2}>Acessos por Data</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Gera o relatório de todos os acessos da escola na data selecionada.
          </p>
          <BtnPDF
            label="📥 Baixar PDF de Acessos"
            onClick={() => baixarPDF(`/api/v1/relatorios/acessos/${escolaId}?data=${data}`)}
            grande
          />
        </div>
      )}
    </div>
  )
}

function Badge({ cor, txt, children }) {
  return (
    <span style={{ background: cor, color: txt, padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>
      {children}
    </span>
  )
}

function BtnPDF({ onClick, label = 'Baixar PDF', grande = false }) {
  return (
    <button onClick={onClick} style={{
      padding: grande ? '0.6rem 2rem' : '4px 12px',
      background: '#6366f1', color: 'white', border: 'none',
      borderRadius: '8px', cursor: 'pointer',
      fontWeight: grande ? 600 : 400,
      fontSize: grande ? '0.95rem' : '0.8rem',
    }}>
      {label}
    </button>
  )
}

const label = { fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }
const select = { padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }
const card = { background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }
const h2 = { fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }
const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }