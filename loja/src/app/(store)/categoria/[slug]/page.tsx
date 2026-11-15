import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CatalogView, type CatalogSearch } from "@/components/store/catalog-view";
import { breadcrumbJsonLd, JsonLd, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<CatalogSearch> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await searchParams;
  const cat = await db.category.findUnique({ where: { slug } });
  if (!cat) return {};
  return pageMetadata({
    title: cat.name,
    description: cat.description ?? `${cat.name} na Mosaik. Frete grátis acima de R$ 299.`,
    path: `/categoria/${slug}`,
    noindex: Boolean(s.min || s.max || s.ordem || s.estoque || s.pagina),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = await db.category.findUnique({ where: { slug } });
  if (!cat) notFound();
  return (
    <>
      <CatalogView search={await searchParams} fixedCategory={slug} title={cat.name} description={cat.description} basePath={`/categoria/${slug}`} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Produtos", path: "/produtos" }, { name: cat.name, path: `/categoria/${slug}` }])} />
    </>
  );
}
