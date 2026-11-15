import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { organizationJsonLd, JsonLd } from "@/lib/seo";
import { CartProvider } from "@/components/store/cart-provider";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { CartDrawer } from "@/components/store/cart-drawer";
import { ConsentManager } from "@/components/store/consent";
import { DemoNotice } from "@/components/store/demo-notice";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await db.category.findMany({ orderBy: { position: "asc" }, select: { name: true, slug: true } });
  return (
    <CartProvider>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Pular para o conteúdo</a>
      {env.demoMode && <DemoNotice />}
      <Header categories={categories} />
      <main id="conteudo">{children}</main>
      <Footer />
      <CartDrawer />
      <ConsentManager ga4Id={env.ga4Id} metaPixelId={env.metaPixelId} />
      <JsonLd data={organizationJsonLd()} />
    </CartProvider>
  );
}
