import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/ui/misc";
import { CartProvider } from "@/components/store/cart-provider";
import { ConsentManager } from "@/components/store/consent";
import { DemoNotice } from "@/components/store/demo-notice";
import { env } from "@/lib/env";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {env.demoMode && <DemoNotice />}
      <header className="border-b border-line bg-paper">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" aria-label="Voltar para a loja"><Logo /></Link>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted"><Lock size={14} /> Compra segura</p>
        </div>
      </header>
      <main id="conteudo" className="pb-24">{children}</main>
      <footer className="border-t border-line py-6 text-center text-[12px] text-muted">
        <Link href="/politica-de-privacidade" className="underline underline-offset-2">Privacidade</Link> · <Link href="/termos-de-uso" className="underline underline-offset-2">Termos</Link> · <Link href="/trocas-e-devolucoes" className="underline underline-offset-2">Trocas</Link> · <Link href="/contato" className="underline underline-offset-2">Ajuda</Link>
      </footer>
      <ConsentManager ga4Id={env.ga4Id} metaPixelId={env.metaPixelId} />
    </CartProvider>
  );
}
