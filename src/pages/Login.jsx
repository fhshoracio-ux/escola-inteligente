import { useState } from 'react'
import api from '../api'
import logoTraipu from '../assets/logo-traipu.webp'
import { Card, Button } from '../components/ui'
import { colors, tones, radius } from '../theme'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar() {
    if (!email || !senha) { setErro('Preencha email e senha.'); return }
    setLoading(true)
    setErro('')
    try {
      const res = await api.post('/auth/login', { email, senha })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('nome', res.data.nome)
      localStorage.setItem('perfil', res.data.perfil)
      localStorage.setItem('turmas_ids', JSON.stringify(res.data.turmas_ids || []))
      onLogin(res.data)
    } catch {
      setErro('Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors.pageBg, padding: 16,
    }}>
      <Card padding={32} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={logoTraipu} alt="Prefeitura de Traipu"
            style={{ width: 200, maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textStrong, margin: 0 }}>Escola Inteligente</h1>
          <p style={{ color: colors.textMuted, fontSize: 13, margin: '4px 0 0' }}>Entre com seu email e senha para acessar o painel</p>
        </div>

        {erro && (
          <div style={{
            background: tones.error.bg, color: '#991B1B', padding: '10px 12px',
            borderRadius: radius.control, marginBottom: 16, fontSize: 13,
          }}>
            {erro}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="login-email" className="ui-label">Email</label>
          <input id="login-email" className="ui-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && entrar()}
            placeholder="seu@email.com" autoComplete="username" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="login-senha" className="ui-label">Senha</label>
          <input id="login-senha" className="ui-input" type="password" value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && entrar()}
            placeholder="••••••••" autoComplete="current-password" />
        </div>

        <Button fullWidth onClick={entrar} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </Card>
    </div>
  )
}