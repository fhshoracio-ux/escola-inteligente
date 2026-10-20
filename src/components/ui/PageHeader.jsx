import { colors } from '../../theme'

// Topo de cada tela: título, subtítulo e botões de ação à direita.
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      gap: 16, flexWrap: 'wrap', marginBottom: 24,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.textStrong, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}
