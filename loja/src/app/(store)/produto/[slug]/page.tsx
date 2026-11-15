import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApprovedReviews, getBundlesForProduct, getProductBySlug, getRelated } from "@/lib/catalog";
import { effectivePrice } from "@/lib/pricing";
import { breadcrumbJsonLd, JsonLd, pageMetadata, productJsonLd } from "@/lib/seo";
import { store } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { ProductDetail, type DetailProduct } from "@/components/store/product-detail";
import { ProductGrid } from "@/components/store/product-card";
import { BundleOffer } from "@/components/store/bundle-offer";
import { SectionHeading, Stars } from "@/components/ui/misc";

export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Produto não encontrado" };
  return pageMetadata({
    title: p.seoTitle || p.name,
    description: p.seoDescription || `${p.name} — ${p.subtitle ?? ""}`.slice(0, 160),
    path: `/produto/${p.slug}`,
    image: p.images[0]?.url,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, bundles, reviews] = await Promise.all([
    getRelated(product.id, product.categoryId, 4),
    getBundlesForProduct(product.id),
    getApprovedReviews(product.id),
  ]);

  const variants = product.variants.map((v) => {
    const { unitCents, compareAtCents } = effectivePrice(v, product);
    return { id: v.id, sku: v.sku, color: v.color, colorHex: v.colorHex, size: v.size, unitCents, compareAtCents, stock: v.stock };
  });
  if (variants.length === 0) notFound();
  const specs = (Array.isArray(product.specs) ? product.specs : []) as { label: string; value: string }[];
  const lead = {
    processing: product.supplier?.processingDays ?? 2,
    min: product.supplier?.shippingDaysMin ?? 5,
    max: product.supplier?.shippingDaysMax ?? 12,
  };
  const detail: DetailProduct = {
    id: product.id, name: product.name, slug: product.slug, subtitle: product.subtitle, isDemo: product.isDemo,
    colorLabel: product.colorLabel, sizeLabel: product.sizeLabel,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt, colorKey: i.colorKey })),
    variants, leadTime: lead,
  };

  return (
    <div className="container-x pt-6 md:pt-10">
      <nav aria-label="Trilha" className="mb-6 text-[13px] text-muted">
        <Link href="/" className="link-draw">Início</Link> / {product.category && <><Link href={`/categoria/${product.category.slug}`} className="link-draw">{product.category.name}</Link> / </>}
        <span className="text-ink">{product.name}</span>
      </nav>

      <ProductDetail product={detail} lowStock={store.lowStockThreshold} />

      {/* Descrição, especificações, entrega */}
      <section className="mt-20 grid gap-12 border-t border-line pt-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        <div>
          <h2 className="display text-[32px] md:text-[40px]">Sobre o produto</h2>
          <div className="prose-store mt-6 max-w-2xl text-[17px]">
            {product.description.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        </div>
        <div className="space-y-2">
          <details className="group border-b border-line pb-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">Especificações <span className="transition-transform group-open:rotate-45">+</span></summary>
            <dl className="divide-y divide-line text-sm">
              {specs.map((s) => (
                <div key={s.label} className="grid grid-cols-[140px_1fr] gap-4 py-2.5"><dt className="text-muted">{s.label}</dt><dd>{s.value}</dd></div>
              ))}
              <div className="grid grid-cols-[140px_1fr] gap-4 py-2.5"><dt className="text-muted">SKU</dt><dd className="tabular-nums">{variants[0].sku}{variants.length > 1 ? " (varia por opção)" : ""}</dd></div>
            </dl>
          </details>
          <details className="group border-b border-line pb-4">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">Entrega <span className="transition-transform group-open:rotate-45">+</span></summary>
            <div className="space-y-2 text-sm leading-relaxed text-ink-2">
              <p>Separação e postagem em até {lead.processing} dias úteis após a aprovação do pagamento. Transporte estimado de {lead.min} a {lead.max} dias úteis, conforme a região e a modalidade escolhida.</p>
              <p>Frete grátis na modalidade Econômica para compras acima de R$ 299. Todos os envios têm código de rastreamento. <Link href="/politica-de-entrega" className="underline underline-offset-2">Política de entrega</Link>.</p>
            </div>
          </details>
          <details className="group border-b border-line pb-4">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold">Trocas e devoluções <span className="transition-transform group-open:rotate-45">+</span></summary>
            <p className="text-sm leading-relaxed text-ink-2">Você pode desistir da compra em até {store.returnDays} dias corridos após o recebimento, com reembolso integral. Peças com defeito ou avaria no transporte são trocadas sem custo. <Link href="/trocas-e-devolucoes" className="underline underline-offset-2">Saiba como</Link>.</p>
          </details>
        </div>
      </section>

      {bundles.length > 0 && (
        <section className="mt-20 space-y-5">
          {bundles.map((b) => (
            <BundleOffer key={b.id} bundle={{
              id: b.id, name: b.name, description: b.description, discountPct: b.discountPct,
              products: b.items.map((i) => ({
                id: i.product.id, name: i.product.name, slug: i.product.slug, image: i.product.images[0]?.url ?? null,
                priceCents: Math.min(...i.product.variants.map((v) => v.priceCents ?? i.product.priceCents)),
                inStock: i.product.variants.some((v) => v.stock > 0),
              })),
            }} />
          ))}
        </section>
      )}

      {/* Avaliações: só aparecem quando existem avaliações verificadas e aprovadas */}
      {reviews.count > 0 && (
        <section className="mt-20 border-t border-line pt-14" id="avaliacoes">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-[32px] md:text-[40px]">Avaliações verificadas</h2>
            <p className="flex items-center gap-3"><Stars value={reviews.avg} size={18} /> <span className="font-semibold">{reviews.avg.toFixed(1)}</span> <span className="text-muted">({reviews.count})</span></p>
          </div>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {reviews.reviews.map((r) => (
              <li key={r.id} className="border border-line p-6">
                <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-[12px] text-muted">{formatDate(r.createdAt)}</span></div>
                {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                <p className="mt-2 leading-relaxed text-ink-2">{r.body}</p>
                <p className="mt-4 text-sm text-muted">{r.authorName} · Compra verificada</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-24">
        <SectionHeading eyebrow="Para combinar" title="Você também pode gostar" />
        <ProductGrid products={related} />
      </section>

      <JsonLd data={productJsonLd({
        name: product.name, slug: product.slug, description: product.description, images: product.images.map((i) => i.url),
        sku: variants[0].sku, category: product.category?.name, priceCents: Math.min(...variants.map((v) => v.unitCents)),
        inStock: variants.some((v) => v.stock > 0), rating: { avg: reviews.avg, count: reviews.count }, shippingDaysMax: lead.processing + lead.max,
      })} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Início", path: "/" }, ...(product.category ? [{ name: product.category.name, path: `/categoria/${product.category.slug}` }] : []), { name: product.name, path: `/produto/${product.slug}` }])} />
    </div>
  );
}
