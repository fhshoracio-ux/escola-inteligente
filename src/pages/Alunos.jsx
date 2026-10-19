import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../api'

export default function Alunos() {
  const [escolas, setEscolas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [modalEditar, setModalEditar] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [editForm, setEditForm] = useState({ nome: '', matricula: '', turma_id: '', data_nascimento: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    carregarAlunos()
    api.get('/turmas/escola/' + escolaId).then(r => setTurmas(r.data)).catch(() => setTurmas([]))
  }, [escolaId])

  async function carregarAlunos() {
    const res = await api.get('/alunos/escola/' + escolaId)
    setAlunos(res.data)
  }

  const filtrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.matricula.includes(busca)
  )

  function abrirEditar(aluno) {
    setEditForm({
      nome: aluno.nome,
      matricula: aluno.matricula,
      turma_id: aluno.turma_id || '',
      data_nascimento: aluno.data_nascimento || '',
    })
    setModalEditar(aluno)
  }

  async function salvarEdicao() {
    setSalvando(true)
    try {
      await api.put('/alunos/' + modalEditar.id, {
        ...editForm,
        turma_id: editForm.turma_id || null,
        data_nascimento: editForm.data_nascimento || null,
      })
      setMensagem('Aluno atualizado!')
      setErro('')
      setModalEditar(null)
      carregarAlunos()
      setTimeout(() => setMensagem(''), 3000)
    } catch {
      setErro('Erro ao atualizar aluno.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluirAluno() {
    setSalvando(true)
    try {
      await api.delete('/alunos/' + modalExcluir.id)
      setMensagem('Aluno excluido!')
      setErro('')
      setModalExcluir(null)
      carregarAlunos()
      setTimeout(() => setMensagem(''), 3000)
    } catch {
      setErro('Erro ao excluir aluno.')
    } finally {
      setSalvando(false)
    }
  }

  function nomeTurma(turma_id) {
    const t = turmas.find(t => t.id === turma_id)
    if (!t) return 'Sem turma'
    return t.nome + ' — ' + t.serie
  }

  const input = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Alunos</h1>

      {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>✓ {mensagem}</div>}
      {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem 1rem', flex: 1 }}>
          <Search size={16} color="#9ca3af" />
          <input placeholder="Buscar por nome ou matricula..."
            value={busca} onChange={e => setBusca(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }} />
        </div>
        <div style={{ background: '#f3f4f6', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          {filtrados.length} alunos
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="tabela-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={th}>Nome</th>
              <th style={th}>Matricula</th>
              <th style={th}>Turma</th>
              <th style={th}>Status</th>
              <th style={th}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                      {a.nome.charAt(0)}
                    </div>
                    {a.nome}
                  </div>
                </td>
                <td style={td}>{a.matricula}</td>
                <td style={td}>
                  <span style={{ color: a.turma_id ? '#374151' : '#9ca3af', fontSize: '0.85rem' }}>
                    {nomeTurma(a.turma_id)}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>
                    Ativo
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => abrirEditar(a)}
                      style={{ padding: '4px 12px', background: '#EEF2FF', color: '#6366f1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      Editar
                    </button>
                    <button onClick={() => setModalExcluir(a)}
                      style={{ padding: '4px 12px', background: '#FEE2E2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {filtrados.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>Nenhum aluno encontrado.</p>
        )}
      </div>

      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1e1b4b' }}>Editar Aluno</h2>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nome</label>
            <input style={input} value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Matricula</label>
            <input style={input} value={editForm.matricula} onChange={e => setEditForm({ ...editForm, matricula: e.target.value })} />
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Turma</label>
            <select style={input} value={editForm.turma_id} onChange={e => setEditForm({ ...editForm, turma_id: e.target.value })}>
              <option value="">Sem turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} — {t.serie} — {t.turno}</option>)}
            </select>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Data de Nascimento</label>
            <input style={input} type="date" value={editForm.data_nascimento} onChange={e => setEditForm({ ...editForm, data_nascimento: e.target.value })} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setModalEditar(null)}
                style={{ flex: 1, padding: '0.65rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvando}
                style={{ flex: 2, padding: '0.65rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                {salvando ? 'Salvando...' : 'Salvar Alteracoes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExcluir && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e1b4b' }}>Excluir Aluno</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Tem certeza que deseja excluir <strong>{modalExcluir.nome}</strong>? Esta acao nao pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalExcluir(null)}
                style={{ flex: 1, padding: '0.65rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={excluirAluno} disabled={salvando}
                style={{ flex: 1, padding: '0.65rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                {salvando ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }