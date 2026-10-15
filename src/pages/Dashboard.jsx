import { useEffect, useState } from 'react'
import { Users, DoorOpen, Camera, School } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import api from '../api'

export default function Dashboard() {
  const [acessos, setAcessos] = useState([])
  const [escolas, setEscolas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregar()
    const intervalo = setInterval(carregar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  async function carregar() {
    try {
      const [resEscolas, resAcessos] = await Promise.all([
        api.get('/escolas/'),
        api.get('/acessos/hoje'),
      ])
      setEscolas(resEscolas.data)
      setAcessos(resAcessos.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const presentes = new Set(acessos.map(a => a.aluno_id)).size

  // Grafico entradas por hora
  const porHora = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, '0')}h`,
    entradas: acessos.filter(a => new Date(a.ocorrido_em).getHours() === h).length
  })).filter(h => h.entradas > 0 || (parseInt(h.hora) >= 6 && parseInt(h.hora) <= 18))

  // Grafico entradas por turma
  const porTurma = Object.entries(
    acessos.reduce((acc, a) => {
      const turma = a.turma || 'Sem turma'
      acc[turma] = (acc[turma] || 0) + 1
      return acc
    }, {})
  ).map(([turma, entradas]) => ({ turma, entradas }))

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Dashboard</h1>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          Atualiza automaticamente a cada 30 segundos
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card icon={<School size={24} color="#6366f1" />} titulo="Escolas" valor={escolas.length} cor="#EEF2FF" />
        <Card icon={<Users size={24} color="#10b981" />} titulo="Alunos presentes" valor={presentes} cor="#ECFDF5" />
        <Card icon={<DoorOpen size={24} color="#f59e0b" />} titulo="Total de entradas" valor={acessos.length} cor="#FFFBEB" />
        <Card icon={<Camera size={24} color="#3b82f6" />} titulo="Cameras ativas" valor={escolas.length} cor="#EFF6FF" />
      </div>

      {/* Graficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>Entradas por Hora</h2>
          {porHora.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="entradas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '3rem' }}>Nenhuma entrada hoje.</p>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#374151' }}>Entradas por Turma</h2>
          {porTurma.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porTurma} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="turma" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="entradas" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '3rem' }}>Nenhuma entrada hoje.</p>
          )}
        </div>
      </div>

      {/* Ultimas entradas */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151' }}>Ultimas Entradas</h2>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{acessos.length} entradas hoje</span>
        </div>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Carregando...</p>
        ) : acessos.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma entrada registrada hoje.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={th}>Aluno</th>
                <th style={th}>Turma</th>
                <th style={th}>Escola</th>
                <th style={th}>Horario</th>
                <th style={th}>Confianca</th>
              </tr>
            </thead>
            <tbody>
              {acessos.slice(0, 20).map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>
                        {a.aluno_nome?.charAt(0)}
                      </div>
                      {a.aluno_nome}
                    </div>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Card({ icon, titulo, valor, cor }) {
  return (
    <div style={{ background: cor, borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{titulo}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{valor}</div>
      </div>
    </div>
  )
}

const th = { padding: '0.75rem 1rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' }
const td = { padding: '0.75rem 1rem', color: '#374151' }