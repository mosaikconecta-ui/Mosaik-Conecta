"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductCardData } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";
import { Price } from "@/components/ui/misc";
import { FavoriteButton, useFavorites } from "./favorites";

export function FavoritesList() {
  const { ids } = useFavorites();
  const [items, setItems] = useState<ProductCardData[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!key) { setItems([]); return; }
    fetch(`/api/produtos?ids=${encodeURIComponent(key)}`).then((r) => r.json()).then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [key]);

  if (items === null) return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] animate-pulse bg-paper-2" />)}</div>;
  const visible = items.filter((p) => ids.includes(p.id));
  if (visible.length === 0) {
    return (
      <div className="border border-line py-16 text-center">
        <p className="display text-[30px]">Nenhum favorito ainda</p>
        <ButtonLink href="/produtos" className="mt-6">Explorar produtos</ButtonLink>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
      {visible.map((p) => (
        <article key={p.id} className="group relative">
          <Link href={`/produto/${p.slug}`} className="zoom-frame relative block aspect-[4/5] bg-paper-2">
            {p.images[0] && <Image src={p.images[0].url} alt={p.images[0].alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />}
          </Link>
          <FavoriteButton productId={p.id} name={p.name} className="absolute right-1.5 top-1.5 bg-paper/80" />
          <h2 className="mt-3 text-[15px] font-semibold"><Link href={`/produto/${p.slug}`} className="link-draw">{p.name}</Link></h2>
          <div className="mt-1"><Price cents={p.priceCents} compareAtCents={p.compareAtCents} /></div>
        </article>
      ))}
    </div>
  );
}
