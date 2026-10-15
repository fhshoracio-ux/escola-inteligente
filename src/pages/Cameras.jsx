import { useEffect, useState } from 'react'
import api from '../api'

const BASE_URL = api.defaults.baseURL.replace('/api/v1', '')

export default function Cameras() {
  const [turmas, setTurmas] = useState([])
  const [escolas, setEscolas] = useState([])
  const [escolaId, setEscolaId] = useState('')
  const [streams, setStreams] = useState({})
  const [loading, setLoading] = useState({})
  const [erros, setErros] = useState({})

  useEffect(() => {
    api.get('/escolas/').then(r => {
      setEscolas(r.data)
      if (r.data.length > 0) setEscolaId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!escolaId) return
    api.get('/turmas/escola/' + escolaId).then(r => setTurmas(r.data))
  }, [escolaId])

  async function iniciarStream(turmaId) {
    setLoading(prev => ({ ...prev, [turmaId]: true }))
    setErros(prev => ({ ...prev, [turmaId]: null }))
    try {
      const res = await api.post('/cameras/iniciar/' + turmaId)
      const url = BASE_URL + res.data.stream_url
      setTimeout(() => {
        setStreams(prev => ({ ...prev, [turmaId]: url }))
        setLoading(prev => ({ ...prev, [turmaId]: false }))
      }, 3000)
    } catch {
      setErros(prev => ({ ...prev, [turmaId]: 'Camera nao disponivel' }))
      setLoading(prev => ({ ...prev, [turmaId]: false }))
    }
  }

  function pararStream(turmaId) {
    setStreams(prev => { const n = { ...prev }; delete n[turmaId]; return n })
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cameras ao Vivo</h1>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Monitoramento em tempo real das salas de aula</p>
      <div style={{ marginBottom: '1.5rem' }}>
        <select value={escolaId} onChange={e => setEscolaId(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
          {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      </div>
      {turmas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
          <p>Nenhuma turma encontrada.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem' }}>
        {turmas.map(turma => (
          <div key={turma.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ background: '#1e1b4b', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>📹 {turma.nome}</span>
                <span style={{ color: '#a5b4fc', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{turma.serie} - {turma.turno}</span>
              </div>
              {streams[turma.id] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>AO VIVO</span>
                </div>
              )}
            </div>
            <div style={{ background: '#0f172a', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!streams[turma.id] && !loading[turma.id] && !erros[turma.id] && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>Camera desconectada</p>
                  <button onClick={() => iniciarStream(turma.id)}
                    style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                    Conectar Camera
                  </button>
                </div>
              )}
              {loading[turma.id] && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTop: '4px solid transparent', borderRadius: '50%', margin: '0 auto 1rem' }} />
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Conectando...</p>
                </div>
              )}
              {erros[turma.id] && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                  <p style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem' }}>{erros[turma.id]}</p>
                  <button onClick={() => iniciarStream(turma.id)}
                    style={{ background: '#374151', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Tentar novamente
                  </button>
                </div>
              )}
              {streams[turma.id] && !loading[turma.id] && (
                <video key={streams[turma.id]} src={streams[turma.id]} autoPlay muted controls
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={() => setErros(prev => ({ ...prev, [turma.id]: 'Erro ao carregar stream' }))} />
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{streams[turma.id] ? 'Stream ativo' : 'Clique para conectar'}</span>
              {streams[turma.id] && (
                <button onClick={() => pararStream(turma.id)}
                  style={{ background: '#FEE2E2', color: '#991b1b', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Desconectar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
