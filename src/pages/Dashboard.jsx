import { useEffect, useState } from 'react'
import { Users, DoorOpen, Camera, School, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import api from '../api'
import { Card, StatCard, HeroBanner, ProgressBar, StatusDot } from '../components/ui'
import { colors, tones, radius } from '../theme'

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

  const nome = localStorage.getItem('nome') || ''
  const presentes = new Set(acessos.map(a => a.aluno_id)).size

  // Confiança média do reconhecimento facial (em %)
  const confiancaMedia = acessos.length > 0
    ? (acessos.reduce((soma, a) => soma + (a.confianca || 0), 0) / acessos.length) * 100
    : 0

  // Grafico entradas por hora
  const porHora = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, '0')}h`,
    entradas: acessos.filter(a => new Date(a.ocorrido_em).getHours() === h).length
  })).filter(h => h.entradas > 0 || (parseInt(h.hora) >= 6 && parseInt(h.hora) <= 18))

  // Ranking de entradas por turma (maior primeiro)
  const porTurma = Object.entries(
    acessos.reduce((acc, a) => {
      const turma = a.turma || 'Sem turma'
      acc[turma] = (acc[turma] || 0) + 1
      return acc
    }, {})
  ).map(([turma, entradas]) => ({ turma, entradas }))
    .sort((a, b) => b.entradas - a.entradas)
  const maiorTurma = porTurma[0]?.entradas || 0

  // Rosca: entradas com confiança alta (>= 90%) x média (< 90%)
  const altas = acessos.filter(a => a.confianca >= 0.9).length
  const fatiasConfianca = [
    { nome: 'Confiança alta (≥ 90%)', valor: altas, cor: tones.success.color },
    { nome: 'Confiança média (< 90%)', valor: acessos.length - altas, cor: tones.warning.color },
  ]

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <HeroBanner eyebrow="Painel escolar" title={nome ? `Olá, ${nome}!` : 'Olá!'}>
        Acompanhe presença, acessos e alunos em tempo real.
      </HeroBanner>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: 16 }}>
        <StatCard icon={School} tone="neutral" value={escolas.length} label="Escolas" />
        <StatCard icon={Users} tone="success" value={presentes} label="Alunos presentes hoje" />
        <StatCard icon={DoorOpen} tone="info" value={acessos.length} label="Entradas hoje" />
        <StatCard icon={Camera} tone="orange" value={escolas.length} label="Câmeras ativas" />
        <StatCard icon={ShieldCheck} tone="warning" value={`${confiancaMedia.toFixed(0)}%`} label="Confiança média" />
      </div>

      {/* Cards de análise */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
        <Card title="Reconhecimento facial" subtitle="Confiança das entradas de hoje">
          {acessos.length === 0 ? <Vazio /> : (
            <>
              <div style={{ position: 'relative', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fatiasConfianca} dataKey="valor" nameKey="nome"
                      innerRadius={58} outerRadius={80} startAngle={90} endAngle={-270}
                      stroke="none">
                      {fatiasConfianca.map(f => <Cell key={f.nome} fill={f.cor} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Total no centro da rosca */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: colors.textStrong }}>{acessos.length}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' }}>Total</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fatiasConfianca.map(f => (
                  <div key={f.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.textMuted }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.cor, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{f.nome}</span>
                    <span style={{ color: colors.textStrong, fontWeight: 600 }}>{f.valor}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Entradas por hora" subtitle="Quantidade de entradas ao longo do dia">
          {acessos.length === 0 ? <Vazio /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porHora} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={colors.borderSoft} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: colors.borderSoft }}
                  contentStyle={{ borderRadius: radius.control, border: `1px solid ${colors.border}`, fontSize: 12 }} />
                <Bar dataKey="entradas" fill={colors.primary} radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Entradas por turma" subtitle="Turmas com mais entradas hoje">
          {porTurma.length === 0 ? <Vazio /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {porTurma.slice(0, 8).map((t, i) => (
                <div key={t.turma}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: colors.textMuted, width: 22 }}>{i + 1}º</span>
                    <span style={{ flex: 1, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.turma}</span>
                    <span style={{ color: colors.textStrong, fontWeight: 600 }}>{t.entradas}</span>
                  </div>
                  <ProgressBar value={t.entradas} max={maiorTurma} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Últimas entradas */}
      <Card title="Últimas entradas" subtitle={`${acessos.length} entradas hoje · atualiza a cada 30 segundos`}>
        {loading ? (
          <p style={{ textAlign: 'center', color: colors.textMuted, padding: '24px 0', margin: 0 }}>Carregando...</p>
        ) : acessos.length === 0 ? (
          <p style={{ textAlign: 'center', color: colors.textMuted, padding: '24px 0', margin: 0 }}>Nenhuma entrada registrada hoje.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 12 }}>
            {acessos.slice(0, 20).map((a, i) => {
              const alta = a.confianca >= 0.9
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: `1px solid ${colors.border}`, borderRadius: 12, padding: '12px 14px',
                }}>
                  <StatusDot tone={alta ? 'success' : 'warning'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colors.textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.aluno_nome}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.turma || 'Sem turma'} · {a.escola} · {new Date(a.ocorrido_em).toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                  <span style={{
                    background: alta ? tones.success.bg : tones.warning.bg,
                    color: alta ? '#166534' : '#92400E',
                    padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 500, flexShrink: 0,
                  }}>
                    {(a.confianca * 100).toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function Vazio() {
  return (
    <p style={{ color: colors.textMuted, textAlign: 'center', padding: '48px 0', margin: 0, fontSize: 13 }}>
      Nenhuma entrada hoje.
    </p>
  )
}
