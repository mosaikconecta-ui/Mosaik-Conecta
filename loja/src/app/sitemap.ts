import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  const u = (p: string) => `${env.siteUrl}${p}`;
  const staticPages = ["/", "/produtos", "/sobre", "/contato", "/ajuda", "/rastreamento", "/politica-de-privacidade", "/trocas-e-devolucoes", "/termos-de-uso", "/politica-de-entrega"];
  return [
    ...staticPages.map((p) => ({ url: u(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.5 })),
    ...categories.map((c) => ({ url: u(`/categoria/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: u(`/produto/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "daily" as const, priority: 0.9, images: p.images.map((i) => u(i.url)) })),
  ];
}
