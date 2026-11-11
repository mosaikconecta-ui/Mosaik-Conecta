import { site } from '../../config/site'

/**
 * Logotipo original em código (símbolo + nome). Para usar o logo do cliente,
 * defina site.logoSrc com o caminho de um SVG em /public.
 */
export function Logo({ className = '' }: { className?: string }) {
  if (site.logoSrc) return <img src={site.logoSrc} alt={site.fullName} className={`h-8 w-auto ${className}`} />
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#A4FFE1" />
            <stop offset="1" stopColor="#207A65" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="none" stroke="url(#logo-g)" strokeWidth="1.2" opacity=".6" />
        {/* símbolo: duas curvas que formam uma coroa dentária estilizada */}
        <path d="M9 12.5c0-3 2.6-4.6 5-3.6 1.2.5 2.8.5 4 0 2.4-1 5 .6 5 3.6 0 3-1.4 5.2-2 8-.4 2-1 3.5-2 3.5-1.4 0-1.2-4.2-3-4.2s-1.6 4.2-3 4.2c-1 0-1.6-1.5-2-3.5-.6-2.8-2-5-2-8Z" fill="url(#logo-g)" />
      </svg>
      <span className="font-display text-[1.28rem] font-bold tracking-[-0.04em]">
        {site.name}
        <span className="ml-1.5 hidden text-[0.62rem] font-semibold tracking-[0.24em] text-mint/80 uppercase sm:inline">Odontologia</span>
      </span>
    </span>
  )
}
