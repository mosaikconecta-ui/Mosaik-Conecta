import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

const LINKS = [
  { href: "/vagas", label: "Vagas" },
  { href: "/empresas", label: "Empresas" },
  { href: "/vagas/remotas", label: "Vagas remotas" },
  { href: "/planos", label: "Para empresas" },
];

export async function SiteHeader() {
  const current = await getCurrentUser();
  const home = current ? homeForRole(current.profile.role) : "/entrar";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Menu principal">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 hover:text-navy-900">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {current ? (
            <UserMenu name={current.profile.full_name} home={home} />
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <ButtonLink href="/entrar" variant="ghost">Entrar</ButtonLink>
              <ButtonLink href="/cadastro">Cadastrar currículo</ButtonLink>
            </div>
          )}
          <MobileNav links={LINKS} loggedIn={Boolean(current)} home={home} />
        </div>
      </div>
    </header>
  );
}
