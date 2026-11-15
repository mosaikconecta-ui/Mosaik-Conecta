import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { Badge, Price } from "@/components/ui/misc";
import { formatBRL } from "@/lib/format";
import { FavoriteButton } from "./favorites";

const NEW_DAYS = 30;

export function ProductCard({ product, priority, sizes = "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw" }: { product: ProductCardData; priority?: boolean; sizes?: string }) {
  const [img, alt] = product.images;
  const inStock = product.variants.some((v) => v.stock > 0);
  const prices = product.variants.map((v) => v.priceCents ?? product.priceCents);
  const minPrice = prices.length ? Math.min(...prices) : product.priceCents;
  const varies = new Set(prices).size > 1;
  const colors = [...new Map(product.variants.filter((v) => v.colorHex).map((v) => [v.color, v])).values()];
  const isNew = Date.now() - new Date(product.createdAt).getTime() < NEW_DAYS * 86400_000;
  const off = product.compareAtCents && product.compareAtCents > product.priceCents;

  return (
    <article className="group relative">
      <Link href={`/produto/${product.slug}`} className="block" aria-label={product.name}>
        <div className="zoom-frame relative aspect-[4/5] bg-paper-2">
          {img && (
            <Image src={img.url} alt={img.alt} fill sizes={sizes} priority={priority} quality={80}
              className={alt ? "object-cover transition-opacity duration-500 group-hover:opacity-0" : "object-cover"} />
          )}
          {alt && <Image src={alt.url} alt="" fill sizes={sizes} quality={80} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {!inStock && <Badge tone="dark">Esgotado</Badge>}
            {inStock && off && <Badge tone="clay">Oferta</Badge>}
            {inStock && !off && isNew && <Badge>Novo</Badge>}
          </div>
        </div>
      </Link>
      <FavoriteButton productId={product.id} name={product.name} className="absolute right-1.5 top-1.5 bg-paper/80 backdrop-blur" />
      <div className="mt-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">
            <Link href={`/produto/${product.slug}`} className="link-draw">{product.name}</Link>
          </h3>
          {product.subtitle && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{product.subtitle}</p>}
        </div>
        {colors.length > 1 && (
          <ul className="mt-1 flex shrink-0 gap-1" aria-label={`${colors.length} cores`}>
            {colors.slice(0, 4).map((c) => (
              <li key={c.id} title={c.color ?? ""} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c.colorHex ?? undefined }} />
            ))}
          </ul>
        )}
      </div>
      <div className="mt-1.5">
        {varies ? (
          <p className="text-[15px]"><span className="text-[13px] text-muted">a partir de </span><span className="font-semibold tabular-nums">{formatBRL(minPrice)}</span></p>
        ) : (
          <Price cents={minPrice} compareAtCents={product.compareAtCents} size="md" />
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < priorityCount} />)}
    </div>
  );
}
