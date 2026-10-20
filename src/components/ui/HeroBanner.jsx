import { colors, radius } from '../../theme'

// Banner azul em degradê do topo do Dashboard.
export default function HeroBanner({ eyebrow, title, children }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${colors.heroFrom}, ${colors.heroTo})`,
      borderRadius: radius.banner,
      padding: '28px 24px',
      color: 'white',
    }}>
      {eyebrow && (
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9 }}>
          {eyebrow}
        </div>
      )}
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '6px 0 8px', color: 'white', lineHeight: 1.25 }}>
        {title}
      </h1>
      {children && (
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', margin: 0, maxWidth: 600 }}>
          {children}
        </p>
      )}
    </div>
  )
}
