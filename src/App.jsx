import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import Historico from './pages/Historico'
import Grafico from './pages/Grafico'
import Cadastros from './pages/Cadastros'
import Presenca from './pages/Presenca'
import Funcionarios from './pages/Funcionarios'
import CadastroRosto from './pages/CadastroRosto'
import Relatorios from './pages/Relatorios'
import Notas from './pages/Notas'
import PlanoAula from './pages/PlanoAula'
import Usuarios from './pages/Usuarios'
import Cameras from './pages/Cameras'
import api from './api'

const BASE_URL = api.defaults.baseURL.replace('/api/v1', '')
const ESCOLA_ID = '7399dddd-91bb-4f88-8fb4-0842f169dead'

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    const token = localStorage.getItem('token')
    const nome = localStorage.getItem('nome')
    return token ? { token, nome } : null
  })
  const [pagina, setPagina] = useState('dashboard')
  const [logoUrl, setLogoUrl] = useState(null)
  const [marcaDagua, setMarcaDagua] = useState(null)

  useEffect(() => {
    if (usuario) {
      api.get('/escolas/').then(r => {
        const primeira = r.data[0]
        if (primeira?.logo_url) setLogoUrl(`${BASE_URL}${primeira.logo_url}`)
      }).catch(() => {})
      api.get('/configuracoes/marca-dagua').then(r => {
        if (r.data.url) setMarcaDagua(`${window.location.protocol}//${window.location.host}${r.data.url}`)
      }).catch(() => {})
    }
  }, [usuario])

  function sair() {
    localStorage.clear()
    setUsuario(null)
  }

  if (!usuario) return <Login onLogin={setUsuario} />

  const menu = [
    { id: 'dashboard',      label: '📊 Painel' },
    { id: 'presenca',       label: '✅ Presença' },
    { id: 'funcionarios',   label: '👷 Funcionarios' },
    { id: 'historico',      label: '📋 Histórico' },
    { id: 'grafico',        label: '📈 Gráfico' },
    { id: 'alunos',         label: '🎒 Alunos' },
    { id: 'cadastros',      label: '📝 Cadastros' },
    { id: 'cadastro-rosto', label: '😊 Cadastro de Rosto' },
    { id: 'cameras',        label: '📷 Câmeras' },
    { id: 'notas',          label: '📓 Notas' },
    { id: 'plano-aula',     label: '📚 Plano de Aula' },
    { id: 'relatorios',     label: '📄 Relatórios' },
    { id: 'usuarios',       label: '👤 Usuários' },
    { id: 'configuracoes',  label: '⚙️ Configurações' },
  ]

  const paginas = {
    dashboard:        Dashboard,
    presenca:         Presenca,
    funcionarios:     Funcionarios,
    historico:        Historico,
    grafico:          Grafico,
    alunos:           Alunos,
    cadastros:        Cadastros,
    'cadastro-rosto': CadastroRosto,
    cameras:          Cameras,
    notas:            Notas,
    'plano-aula':     PlanoAula,
    relatorios:       Relatorios,
    usuarios:         Usuarios,
    configuracoes:    () => <Configuracoes onSalvar={url => setMarcaDagua(`${BASE_URL}${url}`)} />,
  }

  const Pagina = paginas[pagina] || Dashboard

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      {marcaDagua && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `url(${marcaDagua})`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
          backgroundSize: '40%', opacity: 0.06,
        }} />
      )}
      <aside style={{
        width: 220, background: '#1e1b4b', padding: '1.5rem 0',
        display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflowY: 'auto',
      }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          {logoUrl
            ? <img src={logoUrl} style={{ height: 50, objectFit: 'contain', marginBottom: '0.5rem', borderRadius: '8px' }} />
            : <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🏫</div>
          }
          <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Escola Inteligente</div>
          <div style={{ color: '#a5b4fc', fontSize: '0.75rem' }}>Olá, {usuario.nome}</div>
        </div>
        {menu.map(item => (
          <button key={item.id} onClick={() => setPagina(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1.5rem', border: 'none', cursor: 'pointer',
              background: pagina === item.id ? '#312e81' : 'transparent',
              color: pagina === item.id ? 'white' : '#a5b4fc',
              fontSize: '0.9rem', textAlign: 'left', width: '100%',
              borderLeft: pagina === item.id ? '3px solid #818cf8' : '3px solid transparent',
            }}>
            {item.label}
          </button>
        ))}
        <button onClick={sair}
          style={{
            marginTop: 'auto', padding: '0.75rem 1.5rem', border: 'none',
            cursor: 'pointer', background: 'transparent', color: '#f87171',
            fontSize: '0.9rem', textAlign: 'left', width: '100%',
          }}>
          🚪 Sair
        </button>
      </aside>
      <main style={{ flex: 1, background: '#f9fafb', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <Pagina />
      </main>
      <BotaoPanico escolaId={ESCOLA_ID} />
    </div>
  )
}

function BotaoPanico({ escolaId }) {
  const [acionando, setAcionando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [numero, setNumero] = useState('')
  const [local, setLocal] = useState('')

  const locais = [
    'Entrada principal', 'Sala de aula', 'Corredor', 'Pátio',
    'Quadra', 'Banheiro', 'Secretaria', 'Direção',
    'Refeitório', 'Estacionamento', 'Portão', 'Outro',
  ]

  async function acionar() {
    if (!numero) { alert('Informe o número da Guarda Municipal!'); return }
    if (!local) { alert('Informe o local da emergência!'); return }
    if (!window.confirm('⚠️ Confirma o acionamento de EMERGÊNCIA?')) return
    setAcionando(true)
    try {
      await api.post('/emergencia/acionar', {
        escola_id: escolaId,
        local: local,
        descricao: 'Emergencia acionada pelo painel',
        acionado_por: 'Administrador',
        numero_guarda: numero,
      })
      alert('🚨 Emergência acionada! Alertas enviados!')
      setAberto(false)
      setNumero('')
      setLocal('')
    } catch {
      alert('Erro ao acionar emergência.')
    } finally {
      setAcionando(false)
    }
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          width: 64, height: 64, borderRadius: '50%',
          background: '#ef4444', color: 'white', border: 'none',
          cursor: 'pointer', fontSize: '1.8rem', zIndex: 9999,
          boxShadow: '0 4px 20px rgba(239,68,68,0.6)',
        }}>
        🚨
      </button>
      {aberto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ color: '#ef4444', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              🚨 Acionar Emergência
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Preencha os dados para enviar o alerta via WhatsApp.
            </p>
            <label style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
              Local da Emergência
            </label>
            <select value={local} onChange={e => setLocal(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', marginTop: '0.4rem', marginBottom: '1rem',
                border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem',
                boxSizing: 'border-box', background: 'white',
              }}>
              <option value="">Selecione o local...</option>
              {locais.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <label style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
              Número da Guarda Municipal
            </label>
            <input type="tel" placeholder="Ex: 82999999999"
              value={numero} onChange={e => setNumero(e.target.value)}
              style={{
                width: '100%', padding: '0.6rem', marginTop: '0.4rem', marginBottom: '1.5rem',
                border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setAberto(false); setNumero(''); setLocal('') }}
                style={{
                  flex: 1, padding: '0.6rem', background: '#f3f4f6',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 500, color: '#374151',
                }}>
                Cancelar
              </button>
              <button onClick={acionar} disabled={acionando}
                style={{
                  flex: 1, padding: '0.6rem',
                  background: acionando ? '#991b1b' : '#ef4444',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 700,
                }}>
                {acionando ? 'Acionando...' : '🚨 ACIONAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Configuracoes({ onSalvar }) {
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState(null)
  const [arquivo, setArquivo] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function salvar() {
    if (!arquivo) { setErro('Selecione uma imagem.'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('imagem', arquivo)
      const res = await api.post('/configuracoes/marca-dagua', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMensagem('Marca dagua salva com sucesso!')
      setErro('')
      if (onSalvar) onSalvar(res.data.url)
    } catch {
      setErro('Erro ao salvar marca dagua.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Configurações</h1>
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', maxWidth: 500 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Marca D'água do Painel</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
          A imagem aparecerá com baixa opacidade no fundo de todas as páginas.
        </p>
        {mensagem && <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{mensagem}</div>}
        {erro && <div style={{ background: '#FEE2E2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{erro}</div>}
        <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
          {preview
            ? <img src={preview} style={{ maxHeight: 120, marginBottom: '0.75rem', opacity: 0.5, borderRadius: '8px' }} />
            : <div style={{ color: '#9ca3af', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🖼️</div>
                <p style={{ fontSize: '0.85rem' }}>PNG, JPG ou SVG</p>
              </div>
          }
          <input type="file" accept="image/*" id="inputMarca" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files[0]
              if (f) { setArquivo(f); setPreview(URL.createObjectURL(f)) }
            }} />
          <label htmlFor="inputMarca"
            style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
            Escolher imagem
          </label>
        </div>
        <button onClick={salvar} disabled={uploading}
          style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
          {uploading ? 'Salvando...' : "Salvar Marca D'água"}
        </button>
      </div>
    </div>
  )
}