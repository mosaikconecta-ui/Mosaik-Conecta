"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { useCart } from "./cart-provider";

type BundleProduct = { id: string; name: string; slug: string; image: string | null; priceCents: number; inStock: boolean };

export function BundleOffer({ bundle }: { bundle: { id: string; name: string; description: string | null; discountPct: number; products: BundleProduct[] } }) {
  const { addBundle, pending } = useCart();
  const total = bundle.products.reduce((s, p) => s + p.priceCents, 0);
  const discounted = Math.round(total * (1 - bundle.discountPct / 100));
  const allInStock = bundle.products.every((p) => p.inStock);
  return (
    <div className="border border-line bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Compre junto · {bundle.discountPct}% off</p>
        <p className="text-sm text-muted">Combo {bundle.name}</p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {bundle.products.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            {i > 0 && <Plus size={16} className="text-muted" aria-hidden />}
            <Link href={`/produto/${p.slug}`} className="group lift block w-[96px] md:w-[120px]">
              <div className="zoom-frame relative aspect-[4/5] bg-paper-2">
                {p.image && <Image src={p.image} alt={p.name} fill sizes="120px" className="object-cover" />}
              </div>
              <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-snug">{p.name}</p>
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p>
          <s className="mr-2 text-sm text-muted">{formatBRL(total)}</s>
          <span className="text-xl font-semibold">{formatBRL(discounted)}</span>
          <span className="ml-2 text-sm text-moss">economize {formatBRL(total - discounted)}</span>
        </p>
        <Button onClick={() => addBundle(bundle.id)} loading={pending} disabled={!allInStock}>{allInStock ? "Adicionar combo" : "Combo indisponível"}</Button>
      </div>
      <p className="mt-2 text-[12px] text-muted">O desconto é aplicado no carrinho quando todos os itens do combo estão na sacola.</p>
    </div>
  );
}
