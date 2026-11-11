import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import { ctas, nav } from '../../config/site'
import { Logo } from '../ui/Logo'

/** Cabeçalho fixo: transparente sobre a hero, vidro fosco após rolar. Menu mobile acessível. */
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // fecha ao navegar
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Esc fecha, foco preso no painel, rolagem do body bloqueada
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const focusables = panel?.querySelectorAll<HTMLElement>('a, button')
    focusables?.[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab' && focusables?.length) {
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background,border-color,backdrop-filter] duration-500 ${
        scrolled || open ? 'border-b border-white/10 bg-deep/70 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-full focus:bg-glow focus:px-4 focus:py-2 focus:text-deep">
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 md:px-8">
        <Link to="/" aria-label="Página inicial" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-[0.92rem] font-medium transition-colors ${isActive ? 'text-glow' : 'text-white/75 hover:text-white'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={ctas.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center rounded-full bg-glow px-5 font-display text-sm font-semibold text-deep transition hover:bg-white sm:inline-flex"
          >
            {ctas.primary.label}
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="inline-grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        ref={panelRef}
        hidden={!open}
        className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-white/10 bg-deep/95 px-5 pt-6 pb-10 backdrop-blur-xl lg:hidden"
      >
        <nav aria-label="Menu mobile">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block border-b border-white/10 py-4 font-display text-2xl font-semibold tracking-tight ${isActive ? 'text-glow' : 'text-white'}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <a
          href={ctas.primary.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-glow font-display font-semibold text-deep"
        >
          {ctas.primary.label}
        </a>
      </div>
    </header>
  )
}
