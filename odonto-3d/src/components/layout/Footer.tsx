import { Link } from 'react-router'
import { Instagram, MapPin, MessageCircle } from 'lucide-react'
import { instagramHref, nav, site, whatsappHref } from '../../config/site'
import { Logo } from '../ui/Logo'

export function Footer() {
  const a = site.contact.address
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#06241e]">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{site.tagline}.</p>
          <p className="mt-6 text-xs text-white/40">
            Conteúdo demonstrativo. Marca, endereço e contatos fictícios.
            {site.technicalLead.name && ` Responsável técnico: ${site.technicalLead.name} — CRO ${site.technicalLead.cro}.`}
          </p>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="t-eyebrow text-mint/80">Navegação</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {nav.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-white/70 transition hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="t-eyebrow text-mint/80">Contato</h2>
          <ul className="mt-5 space-y-4 text-sm text-white/70">
            <li>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white">
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp {site.contact.whatsappLabel}
              </a>
            </li>
            <li>
              <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white">
                <Instagram size={16} aria-hidden="true" /> @{site.contact.instagram}
              </a>
            </li>
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <address className="not-italic">
                {a.street}, {a.district}
                <br />
                {a.city} — {a.state}
              </address>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {site.fullName}. Template demonstrativo.
      </div>
    </footer>
  )
}
