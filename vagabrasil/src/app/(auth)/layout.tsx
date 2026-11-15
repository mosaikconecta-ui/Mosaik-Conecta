import Link from "next/link";
import { Logo } from "@/components/logo";
import { ConfigNotice } from "@/components/config-notice";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <ConfigNotice />
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/vagas" className="text-sm font-medium text-navy-700 hover:text-navy-900">Ver vagas</Link>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 py-8 sm:py-14">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        <Link href="/termos" className="hover:text-navy-800">Termos de uso</Link> · <Link href="/privacidade" className="hover:text-navy-800">Privacidade</Link>
      </footer>
    </div>
  );
}
