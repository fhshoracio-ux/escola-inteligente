// Botão padrão do painel. As cores e o efeito de passar o mouse ficam no index.css (.ui-btn).
// variant: primary (azul cheio) | secondary (branco com borda) | danger (vermelho)
export default function Button({ variant = 'primary', icon: Icon, fullWidth, className = '', children, type = 'button', ...props }) {
  const classes = ['ui-btn', `ui-btn-${variant}`, fullWidth ? 'ui-btn-full' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}
