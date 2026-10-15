import { useEffect, useState } from 'react'
import api from '../api'

export default function Historico() {
  const [acessos, setAcessos] = useState([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregar()
  }, [data])

  async function carregar() {
    setLoading(true)
    try {
      const res = await api.get(`/acessos/data/${data}`)
      setAcessos(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
        Histórico de Acessos
      </h1>

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontWeight: 500, color: '#374151' }}>Data:</label>
        <input
          type="date"
          value={data}
          onChange={e => setData(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}
        />
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          {acessos.length} registro(s) encontrado(s)
        </span>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : acessos.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Nenhum acesso registrado nesta data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={th}>Aluno</th>
              <th style={th}>Turma</th>
              <th style={th}>Escola</th>
              <th style={th}>Horário</th>
              <th style={th}>Confiança</th>
              <th style={th}>Evento</th>
            </tr>
          </thead>
          <tbody>
            {acessos.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{a.aluno_nome}</td>
                <td style={td}>{a.turma || '—'}</td>
                <td style={td}>{a.escola}</td>
                <td style={td}>{new Date(a.ocorrido_em).toLocaleTimeString('pt-BR')}</td>
                <td style={td}>
                  <span style={{
                    background: a.confianca >= 0.9 ? '#DCFCE7' : '#FEF9C3',
                    color: a.confianca >= 0.9 ? '#166534' : '#854d0e',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem'
                  }}>
                    {(a.confianca * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={td}>
                  <span style={{
                    background: a.tipo_evento === 'entrada' ? '#DBEAFE' : '#FEE2E2',
                    color: a.tipo_evento === 'entrada' ? '#1e40af' : '#991b1b',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem'
                  }}>
                    {a.tipo_evento}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }