"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ links, loggedIn, home }: { links: { href: string; label: string }[]; loggedIn: boolean; home: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex size-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-white px-4 py-6">
          <nav className="flex flex-col gap-1" aria-label="Menu principal">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 text-base font-medium text-navy-800 hover:bg-navy-50">{l.label}</Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
            {loggedIn ? (
              <Link href={home} className="rounded-lg bg-navy-900 px-4 py-3 text-center font-semibold text-white">Meu painel</Link>
            ) : (
              <>
                <Link href="/cadastro" className="rounded-lg bg-brand-600 px-4 py-3 text-center font-semibold text-white">Cadastrar currículo</Link>
                <Link href="/entrar" className="rounded-lg border border-line px-4 py-3 text-center font-semibold text-navy-800">Entrar</Link>
                <Link href="/cadastro/empresa" className="px-4 py-3 text-center text-sm font-medium text-brand-700">Sou empresa — anunciar vagas</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
