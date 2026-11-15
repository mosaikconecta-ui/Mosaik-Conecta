import type { Metadata } from "next";
import { CatalogView, type CatalogSearch } from "@/components/store/catalog-view";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogSearch> }): Promise<Metadata> {
  const s = await searchParams;
  const base = pageMetadata({
    title: s.q ? `Busca: ${s.q}` : "Todos os produtos",
    description: "Cerâmica, mesa posta, iluminação, aromas e objetos para a casa. Frete grátis acima de R$ 299.",
    path: "/produtos",
    // páginas de busca/filtro não são indexadas para evitar conteúdo duplicado
    noindex: Boolean(s.q || s.min || s.max || s.ordem || s.estoque || s.pagina),
  });
  return base;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogSearch> }) {
  const search = await searchParams;
  return <CatalogView search={search} title="Todos os produtos" basePath="/produtos" />;
}
