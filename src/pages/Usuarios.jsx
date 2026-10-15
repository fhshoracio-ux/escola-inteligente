import { useEffect, useState } from 'react'
import api from '../api'

const PERFIS = [
  { value: 'admin_rede', label: 'Administrador da Rede', cor: '#6366f1' },
  { value: 'diretor', label: 'Diretor', cor: '#10b981' },
  { value: 'professor', label: 'Professor', cor: '#f59e0b' },
  { value: 'operador', label: 'Operador', cor: '#6b7280' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [escolas, setEscolas] = useState([])
  const [aba, setAba] = useState('lista')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', perfil: 'professor', escola_id: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const [resU, resE] = await Promise.all([
        api.get('/usuarios/'),
        api.get('/escolas/')
      ])
      setUsuarios(resU.data)
      setEscolas(resE.data)
    } catch (e) {
      console.error(e)
    }
  }

  async function salvar() {
    if (!form.nome || !form.email || !form.senha) {
      setErro('Nome, email e senha sao obrigatorios.')
      return
    }
    try {
      await api.post('/usuarios/', form)
      setMensagem('Usuario cadastrado com sucesso!')
      setErro('')
      setForm({ nome: '', email: '', senha: '', perfil: 'professor', escola_id: '' })
      carregarDados()
      setAba('lista')
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao cadastrar usuario.')
      setMensagem('')
    }
  }

  async function desativar(id, nome) {
    if (!window.confirm(`Desativar o usuario ${nome}?`)) return
    try {
      await api.delete(`/usuarios/${id}`)
      carregarDados()
    } catch {
      setErro('Erro ao desativar usuario.')
    }
  }

  const input = {
    width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem',
    boxSizing: 'border-box'
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Usuarios</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['lista', 'novo'].map(a => (
          <button key={a} onClick={() => { setAba(a); setMensagem(''); setErro('') }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
              background: aba === a ? '#6366f1' : '#f3f4f6',
              color: aba === a ? 'white' : '#374151',
            }}>
            {a === 'lista' ? 'Usuarios' : 'Novo Usuario'}
          </button>
        ))}
      </div>

      {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{mensagem}</div>}
      {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}

      {aba === 'lista' && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          {usuarios.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum usuario cadastrado.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={th}>Nome</th>
                  <th style={th}>Email</th>
                  <th style={th}>Perfil</th>
                  <th style={th}>Status</th>
                  <th style={th}>Acao</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => {
                  const perfil = PERFIS.find(p => p.value === u.perfil)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: perfil?.cor || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
                            {u.nome.charAt(0)}
                          </div>
                          {u.nome}
                        </div>
                      </td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>
                        <span style={{ background: `${perfil?.cor}20`, color: perfil?.cor, padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500 }}>
                          {perfil?.label || u.perfil}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>
                          Ativo
                        </span>
                      </td>
                      <td style={td}>
                        {u.perfil !== 'admin_rede' && (
                          <button onClick={() => desativar(u.id, u.nome)}
                            style={{ padding: '4px 10px', background: '#FEE2E2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Desativar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {aba === 'novo' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Novo Usuario</h2>
          <input style={input} placeholder="Nome completo *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <input style={input} placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input style={input} placeholder="Senha *" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} />
          <select style={input} value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
            {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {form.perfil !== 'admin_rede' && (
            <select style={input} value={form.escola_id} onChange={e => setForm({ ...form, escola_id: e.target.value })}>
              <option value="">Selecione a escola</option>
              {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          )}
          <button onClick={salvar}
            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            Salvar Usuario
          </button>
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }