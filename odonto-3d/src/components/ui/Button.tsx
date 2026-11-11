import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'ghost'

interface BaseProps {
  children: ReactNode
  variant?: Variant
  icon?: ReactNode
  className?: string
}
type ButtonProps = BaseProps & ({ to: string; href?: never } | { href: string; to?: never })

const styles: Record<Variant, string> = {
  primary:
    'bg-glow text-deep shadow-[0_12px_40px_-12px_rgb(164_255_225/0.6)] hover:bg-white hover:shadow-[0_16px_50px_-12px_rgb(164_255_225/0.8)]',
  ghost: 'border border-white/25 text-white hover:border-glow/70 hover:bg-white/5',
}

/** Botão pill. `to` → rota interna; `href` → link externo (abre em nova aba). */
export function Button({ children, variant = 'primary', icon, className = '', ...rest }: ButtonProps) {
  const cls = `group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 py-3 font-display text-[0.95rem] font-semibold tracking-tight transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${styles[variant]} ${className}`
  const content = (
    <>
      <span>{children}</span>
      {icon && <span className="transition-transform duration-300 group-hover:translate-x-0.5">{icon}</span>}
    </>
  )
  if ('to' in rest && rest.to) return <Link to={rest.to} className={cls}>{content}</Link>
  return (
    <a href={rest.href} className={cls} target="_blank" rel="noopener noreferrer">
      {content}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}
