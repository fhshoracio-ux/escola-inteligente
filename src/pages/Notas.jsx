import { useEffect, useState } from 'react'
import api from '../api'

export default function Notas() {
  const perfil = localStorage.getItem('perfil')
  const turmasIds = JSON.parse(localStorage.getItem('turmas_ids') || '[]')
  const [escolas, setEscolas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [bimestre, setBimestre] = useState(1)
  const [notas, setNotas] = useState({})
  const [salvando, setSalvando] = useState({})
  const [mensagem, setMensagem] = useState('')
  const [notasExistentes, setNotasExistentes] = useState({})

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get('/turmas/escola/' + escolaId).then(r => {
      const todas = r.data
      const filtradas = perfil === 'professor' && turmasIds.length > 0
        ? todas.filter(t => turmasIds.includes(t.id))
        : todas
      setTurmas(filtradas)
      if (filtradas.length > 0) setTurmaId(filtradas[0].id)
    })
  }, [escolaId])

  useEffect(() => {
    if (!turmaId) return
    api.get('/alunos/escola/' + escolaId).then(r => setAlunos(r.data.filter(a => a.turma_id === turmaId)))
    api.get('/boletim/disciplinas/turma/' + turmaId).then(r => {
      setDisciplinas(r.data)
      if (r.data.length > 0) setDisciplinaId(r.data[0].id)
    })
  }, [turmaId])

  useEffect(() => {
    if (!disciplinaId || !turmaId) return
    carregarNotasExistentes()
  }, [disciplinaId, bimestre, turmaId])

  async function carregarNotasExistentes() {
    try {
      const res = await api.get('/boletim/notas/turma/' + turmaId + '?disciplina_id=' + disciplinaId + '&bimestre=' + bimestre)
      const mapa = {}
      res.data.forEach(n => { mapa[n.aluno_id] = n.valor })
      setNotasExistentes(mapa)
      setNotas(mapa)
    } catch {
      setNotasExistentes({})
    }
  }

  async function salvarNota(alunoId, valor) {
    if (valor === '' || valor === null) return
    const num = parseFloat(valor)
    if (isNaN(num) || num < 0 || num > 10) {
      alert('Nota deve ser entre 0 e 10')
      return
    }
    setSalvando(prev => ({ ...prev, [alunoId]: true }))
    try {
      await api.post('/boletim/notas', {
        aluno_id: alunoId,
        disciplina_id: disciplinaId,
        bimestre: bimestre,
        valor: num,
        tipo: 'prova'
      })
      setNotasExistentes(prev => ({ ...prev, [alunoId]: num }))
      setMensagem('Nota salva!')
      setTimeout(() => setMensagem(''), 2000)
    } catch {
      alert('Erro ao salvar nota.')
    } finally {
      setSalvando(prev => ({ ...prev, [alunoId]: false }))
    }
  }

  async function salvarTodasNotas() {
    let count = 0
    for (const [alunoId, valor] of Object.entries(notas)) {
      if (valor !== '' && valor !== null && valor !== undefined) {
        const num = parseFloat(valor)
        if (!isNaN(num) && num >= 0 && num <= 10) {
          await api.post('/boletim/notas', {
            aluno_id: alunoId,
            disciplina_id: disciplinaId,
            bimestre: bimestre,
            valor: num,
            tipo: 'prova'
          })
          count++
        }
      }
    }
    setMensagem(count + ' notas salvas com sucesso!')
    setTimeout(() => setMensagem(''), 3000)
    carregarNotasExistentes()
  }

  function corNota(val) {
    if (val === null || val === undefined || val === '') return '#374151'
    const n = parseFloat(val)
    if (n >= 7) return '#16a34a'
    if (n >= 5) return '#d97706'
    return '#dc2626'
  }

  const input = { padding: '0.5rem', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.9rem', width: 70, textAlign: 'center' }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Lancamento de Notas</h1>

      {mensagem && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          ✓ {mensagem}
        </div>
      )}

      {/* Filtros */}
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
            <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Bimestre</label>
            <select value={bimestre} onChange={e => setBimestre(parseInt(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
              <option value={1}>1º Bimestre</option>
              <option value={2}>2º Bimestre</option>
              <option value={3}>3º Bimestre</option>
              <option value={4}>4º Bimestre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de alunos */}
      {alunos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <p>Selecione uma turma para ver os alunos.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#374151' }}>{alunos.length} alunos</span>
              <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                — {disciplinas.find(d => d.id === disciplinaId)?.nome} — {bimestre}º Bimestre
              </span>
            </div>
            <button onClick={salvarTodasNotas}
              style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
              Salvar Todas
            </button>
          </div>

          <div className="tabela-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={th}>Aluno</th>
                <th style={th}>Matricula</th>
                <th style={{ ...th, textAlign: 'center' }}>Nota (0-10)</th>
                <th style={{ ...th, textAlign: 'center' }}>Status</th>
                <th style={{ ...th, textAlign: 'center' }}>Acao</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno, i) => {
                const notaAtual = notas[aluno.id] ?? notasExistentes[aluno.id] ?? ''
                const notaNum = parseFloat(notaAtual)
                const temNota = !isNaN(notaNum)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                          {aluno.nome.charAt(0)}
                        </div>
                        {aluno.nome}
                      </div>
                    </td>
                    <td style={td}>{aluno.matricula}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={notas[aluno.id] ?? notasExistentes[aluno.id] ?? ''}
                        onChange={e => setNotas(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                        onBlur={e => {
                          const val = e.target.value
                          if (val !== '') salvarNota(aluno.id, val)
                        }}
                        style={{ ...input, color: corNota(notaAtual), fontWeight: 600, borderColor: temNota ? (notaNum >= 7 ? '#bbf7d0' : notaNum >= 5 ? '#fde68a' : '#fecaca') : '#e5e7eb' }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {temNota ? (
                        <span style={{
                          padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500,
                          background: notaNum >= 7 ? '#DCFCE7' : notaNum >= 5 ? '#FEF9C3' : '#FEE2E2',
                          color: notaNum >= 7 ? '#166534' : notaNum >= 5 ? '#854d0e' : '#991b1b'
                        }}>
                          {notaNum >= 7 ? 'Aprovado' : notaNum >= 5 ? 'Recuperacao' : 'Reprovado'}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Sem nota</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {salvando[aluno.id] ? (
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Salvando...</span>
                      ) : notasExistentes[aluno.id] !== undefined ? (
                        <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>✓ Salvo</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }
