import { colors, radius, shadow, spacing } from '../../theme'

// Caixa branca com borda e cantos arredondados.
// title/subtitle/actions são opcionais e formam o cabeçalho do card.
export default function Card({ title, subtitle, actions, padding = spacing.cardPadding, style, children }) {
  const temCabecalho = title || subtitle || actions

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.card,
      boxShadow: shadow.card,
      padding,
      ...style,
    }}>
      {temCabecalho && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 12, flexWrap: 'wrap', marginBottom: 16,
        }}>
          <div>
            {title && <div style={{ fontSize: 15, fontWeight: 600, color: colors.textStrong }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
