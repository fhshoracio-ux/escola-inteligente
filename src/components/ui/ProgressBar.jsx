import { colors } from '../../theme'

// Barra fina (6px) azul e arredondada sobre um trilho cinza.
export default function ProgressBar({ value = 0, max = 100, color = colors.primary, height = 6 }) {
  const porcentagem = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div style={{ background: colors.track, borderRadius: 999, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${porcentagem}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.3s' }} />
    </div>
  )
}
