import { colors, tones } from '../../theme'
import Card from './Card'

// Card de resumo: ícone num quadrado colorido, número grande e legenda.
// tone: neutral | info | warning | orange | success | error
export default function StatCard({ icon: Icon, value, label, tone = 'neutral' }) {
  const cor = tones[tone] || tones.neutral

  return (
    <Card>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: cor.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        {Icon && <Icon size={20} color={cor.color} />}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: colors.textStrong, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</div>
    </Card>
  )
}
