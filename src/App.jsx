import { useState } from 'react'
import logoTraipu from './assets/logo-traipu.png'

import Dashboard from './pages/Dashboard'
import Alunos from './pages/Alunos'
import Presenca from './pages/Presenca'
import Historico from './pages/Historico'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'
import CadastroRosto from './pages/CadastroRosto'
import Cadastros from './pages/Cadastros'
import Funcionarios from './pages/Funcionarios'
import Notas from './pages/Notas'
import PlanoAula from './pages/PlanoAula'
import Grafico from './pages/Grafico'
import Matriculas from './pages/Matriculas'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',          icon: '⊞' },
  { id: 'alunos',       label: 'Alunos',             icon: '👥' },
  { id: 'presenca',     label: 'Frequência',          icon: '📋' },
  { id: 'historico',    label: 'Histórico',           icon: '🕒' },
  { id: 'notas',        label: 'Notas',               icon: '📝' },
  { id: 'planoaula',    label: 'Plano de Aula',       icon: '📚' },
  { id: 'funcionarios', label: 'Funcionários',         icon: '👤' },
  { id: 'matriculas',   label: 'Matrículas',           icon: '📥' },
  { id: 'cadastros',    label: 'Cadastros',            icon: '🏫' },
  { id: 'cadastrorosto',label: 'Reconhecimento Facial',icon: '🎭' },
  { id: 'grafico',      label: 'Gráficos',             icon: '📊' },
  { id: 'relatorios',   label: 'Relatórios',           icon: '📁' },
  { id: 'usuarios',     label: 'Usuários',             icon: '⚙️' },
]

const PAGE_TITLES = {
  dashboard:     { title: 'Dashboard',           subtitle: 'Visão geral do sistema' },
  alunos:        { title: 'Alunos',              subtitle: 'Gerenciamento de alunos' },
  presenca:      { title: 'Frequência',           subtitle: 'Controle de frequência diária' },
  historico:     { title: 'Histórico',            subtitle: 'Histórico de acessos' },
  notas:         { title: 'Notas',                subtitle: 'Lançamento de notas' },
  planoaula:     { title: 'Plano de Aula',        subtitle: 'Gerenciamento de planos de aula' },
  funcionarios:  { title: 'Funcionários',          subtitle: 'Gestão de funcionários' },
  matriculas:    { title: 'Matrículas Digitais',  subtitle: 'Solicitações enviadas pelo App de Matrícula' },
  cadastros:     { title: 'Cadastros',             subtitle: 'Gerenciamento de turmas e escolas' },
  cadastrorosto: { title: 'Reconhecimento Facial', subtitle: 'Cadastro e gestão de rostos' },
  grafico:       { title: 'Gráficos',              subtitle: 'Estatísticas e gráficos' },
  relatorios:    { title: 'Relatórios',            subtitle: 'Relatórios consolidados' },
  usuarios:      { title: 'Usuários',              subtitle: 'Gestão de usuários do sistema' },
}

function PageRenderer({ active }) {
  switch (active) {
    case 'dashboard':     return <Dashboard />
    case 'alunos':        return <Alunos />
    case 'presenca':      return <Presenca />
    case 'historico':     return <Historico />
    case 'notas':         return <Notas />
    case 'planoaula':     return <PlanoAula />
    case 'funcionarios':  return <Funcionarios />
    case 'matriculas':    return <Matriculas />
    case 'cadastros':     return <Cadastros />
    case 'cadastrorosto': return <CadastroRosto />
    case 'grafico':       return <Grafico />
    case 'relatorios':    return <Relatorios />
    case 'usuarios':      return <Usuarios />
    default:              return <Dashboard />
  }
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const page = PAGE_TITLES[active] || PAGE_TITLES['dashboard']

  return (
    <div style={{ display: 'flex', height: '100svh', fontFamily: 'Inter, system-ui, sans-serif', background: '#f0f2f7' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 250, minWidth: 250, height: '100%',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #e8ecf4',
        boxShadow: '2px 0 8px rgba(0,0,0,.06)',
      }}>

        {/* Logo do município */}
        <div style={{ padding: '28px 20px 20px', textAlign: 'center' }}>
          <img
            src={logoTraipu}
            alt="Prefeitura de Traipu"
            style={{ width: 140, height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#e8ecf4', margin: '0 20px' }} />

        {/* App name + role */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2133', letterSpacing: '.3px' }}>
            Escola Inteligente
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Painel do coordenador
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  marginBottom: 2,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderRadius: 8,
                  background: isActive ? '#1e4fc8' : 'transparent',
                  color: isActive ? '#fff' : '#374151',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  transition: 'background .15s, color .15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f1f5fb' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User info bottom */}
        <div style={{ borderTop: '1px solid #e8ecf4', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#1e4fc8', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>C</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2133', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Coordenador
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>E.M.E.B. F. Mangabeira</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{
              flex: 1, padding: '6px 8px', border: '1px solid #e2e8f0',
              borderRadius: 6, background: '#fff', color: '#475569',
              fontSize: 11, cursor: 'pointer', fontWeight: 500,
            }}>
              Trocar senha
            </button>
            <button style={{
              flex: 1, padding: '6px 8px', border: '1px solid #fecaca',
              borderRadius: 6, background: '#fff', color: '#ef4444',
              fontSize: 11, cursor: 'pointer', fontWeight: 500,
            }}>
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Blue card topbar */}
        <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e4fc8, #3b6ef0)',
            borderRadius: 12,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(30,79,200,.3)',
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 500, marginBottom: 2 }}>
                {page.subtitle}
              </div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
                {page.title}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18,
              }}>👤</div>
            </div>
          </div>
        </div>

        {/* Page body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          <PageRenderer active={active} />
        </div>
      </main>
    </div>
  )
}
