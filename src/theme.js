// Tema visual do painel: mude cores, cantos, sombras e fontes AQUI.
// As cores também viram variáveis CSS (ex.: --primary) para o index.css usar.

export const colors = {
  pageBg: '#F8FAFC',     // fundo da página
  surface: '#FFFFFF',    // fundo de cards e do menu lateral
  border: '#E5E7EB',     // bordas
  borderSoft: '#F1F5F9', // linhas de tabela, hover do menu
  textStrong: '#0F172A', // títulos e números
  text: '#334155',       // texto normal
  textMuted: '#64748B',  // legendas e subtítulos
  primary: '#2563EB',    // botões, item ativo, barras
  primaryHover: '#1D4ED8',
  heroFrom: '#1D4ED8',   // degradê do banner (esquerda)
  heroTo: '#3B82F6',     // degradê do banner (direita)
  track: '#E5E7EB',      // trilho das barras de progresso
  danger: '#EF4444',
  dangerHover: '#DC2626',
}

// Cores de status: ícone colorido sobre fundo claro da mesma cor
export const tones = {
  neutral: { color: '#64748B', bg: '#F1F5F9' },
  info:    { color: '#2563EB', bg: '#DBEAFE' },
  warning: { color: '#F59E0B', bg: '#FEF3C7' },
  orange:  { color: '#F97316', bg: '#FFEDD5' },
  success: { color: '#22C55E', bg: '#DCFCE7' },
  error:   { color: '#EF4444', bg: '#FEE2E2' },
}

export const radius = {
  card: 14,
  banner: 16,
  control: 10, // botões, campos e itens do menu
}

export const shadow = {
  card: '0 1px 2px rgba(15,23,42,0.06)',
}

export const fonts = {
  sans: "'Inter', 'Segoe UI', system-ui, sans-serif",
}

export const spacing = {
  cardPadding: 20,
  gap: 16,          // espaço entre cards
  pagePadding: 32,
  contentMaxWidth: 1100,
}

// Copia as cores para variáveis CSS no <html> (ex.: colors.primary -> --primary)
export function aplicarTema() {
  const root = document.documentElement
  Object.entries(colors).forEach(([nome, valor]) => {
    root.style.setProperty(`--${nome}`, valor)
  })
  root.style.setProperty('--font-sans', fonts.sans)
  root.style.setProperty('--radius-control', `${radius.control}px`)
}

const theme = { colors, tones, radius, shadow, fonts, spacing }
export default theme
