import { tones } from '../../theme'

// Bolinha colorida de status (ex.: verde = presente, vermelho = ausente).
// tone: neutral | info | warning | orange | success | error
export default function StatusDot({ tone = 'neutral', size = 10 }) {
  const cor = (tones[tone] || tones.neutral).color

  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: cor, flexShrink: 0,
    }} />
  )
}
