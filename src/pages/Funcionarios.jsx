import { useEffect, useState } from 'react'
import api from '../api'

export default function Funcionarios() {
  const [escolas, setEscolas] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [pontos, setPontos] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [aba, setAba] = useState('lista')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', cargo: '', departamento: '', telefone: '', email: '', cpf: ''
  })

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get(`/funcionarios/escola/${escolaId}`).then(r => setFuncionarios(r.data))
    api.get(`/funcionarios/ponto/hoje/escola/${escolaId}`).then(r => setPontos(r.data))
  }, [escolaId])

  async function salvarFuncionario() {
    if (!form.nome || !form.cargo) { setErro('Nome e cargo sao obrigatorios.'); return }
    try {
      await api.post('/funcionarios/', { ...form, escola_id: escolaId })
      setMensagem('Funcionario cadastrado com sucesso!')
      setErro('')
      setForm({ nome: '', cargo: '', departamento: '', telefone: '', email: '', cpf: '' })
      const res = await api.get(`/funcionarios/escola/${escolaId}`)
      setFuncionarios(res.data)
    } catch { setErro('Erro ao cadastrar funcionario.'); setMensagem('') }
  }

  const input = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Funcionarios</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['lista', 'ponto', 'cadastro'].map(a => (
          <button key={a} onClick={() => { setAba(a); setMensagem(''); setErro('') }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
              background: aba === a ? '#6366f1' : '#f3f4f6',
              color: aba === a ? 'white' : '#374151',
            }}>
            {a === 'lista' ? 'Funcionarios' : a === 'ponto' ? 'Ponto Hoje' : 'Novo'}
          </button>
        ))}
      </div>

      {aba === 'lista' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          {funcionarios.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum funcionario cadastrado.</p>
          ) : (
            <div className="tabela-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={th}>Nome</th>
                  <th style={th}>Cargo</th>
                  <th style={th}>Departamento</th>
                  <th style={th}>Telefone</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                          {f.nome.charAt(0)}
                        </div>
                        {f.nome}
                      </div>
                    </td>
                    <td style={td}>{f.cargo}</td>
                    <td style={td}>{f.departamento || '—'}</td>
                    <td style={td}>{f.telefone || '—'}</td>
                    <td style={td}>
                      <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>Ativo</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {aba === 'ponto' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          {pontos.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum ponto registrado hoje.</p>
          ) : (
            <div className="tabela-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={th}>Funcionario</th>
                  <th style={th}>Cargo</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Horario</th>
                  <th style={th}>Confianca</th>
                </tr>
              </thead>
              <tbody>
                {pontos.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{p.nome}</td>
                    <td style={td}>{p.cargo}</td>
                    <td style={td}>
                      <span style={{
                        background: p.tipo === 'entrada' ? '#DBEAFE' : '#FEE2E2',
                        color: p.tipo === 'entrada' ? '#1e40af' : '#991b1b',
                        padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem'
                      }}>{p.tipo}</span>
                    </td>
                    <td style={td}>{new Date(p.ocorrido_em).toLocaleTimeString('pt-BR')}</td>
                    <td style={td}>{(p.confianca * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {aba === 'cadastro' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Novo Funcionario</h2>
          {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{mensagem}</div>}
          {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}
          <input style={input} placeholder="Nome completo *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <input style={input} placeholder="Cargo *" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} />
          <input style={input} placeholder="Departamento" value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} />
          <input style={input} placeholder="CPF" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} />
          <input style={input} placeholder="Telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
          <input style={input} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <button onClick={salvarFuncionario}
            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            Salvar Funcionario
          </button>
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }