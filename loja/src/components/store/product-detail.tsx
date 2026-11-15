"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Price } from "@/components/ui/misc";
import { formatBRL } from "@/lib/format";
import { formatCEP } from "@/lib/br";
import { track } from "@/lib/analytics";
import { quoteProductShipping } from "@/actions/shipping";
import type { ShippingQuote } from "@/lib/pricing";
import { useCart } from "./cart-provider";
import { FavoriteButton } from "./favorites";
import { QuantityStepper } from "./quantity-stepper";

export type DetailVariant = { id: string; sku: string; color: string | null; colorHex: string | null; size: string | null; unitCents: number; compareAtCents: number | null; stock: number };
export type DetailProduct = {
  id: string; name: string; slug: string; subtitle: string | null; isDemo: boolean; colorLabel: string; sizeLabel: string;
  images: { url: string; alt: string; colorKey: string | null }[];
  variants: DetailVariant[];
  leadTime: { processing: number; min: number; max: number };
};

export function ProductDetail({ product, lowStock }: { product: DetailProduct; lowStock: number }) {
  const { add, pending, lastMessage } = useCart();
  const router = useRouter();
  const colors = useMemo(() => [...new Map(product.variants.filter((v) => v.color).map((v) => [v.color!, v])).values()], [product.variants]);
  const sizes = useMemo(() => [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[], [product.variants]);
  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [color, setColor] = useState<string | null>(firstAvailable?.color ?? null);
  const [size, setSize] = useState<string | null>(firstAvailable?.size ?? null);
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => (v.color ?? null) === color && (v.size ?? null) === size)
    ?? product.variants.find((v) => (v.color ?? null) === color) ?? firstAvailable;
  const available = variant && variant.stock > 0;

  useEffect(() => {
    track("view_item", { value: firstAvailable.unitCents / 100, productId: product.id, items: [{ item_id: firstAvailable.sku, item_name: product.name, price: firstAvailable.unitCents / 100 }] });
  }, [product.id, product.name, firstAvailable]);

  // ao trocar de cor, mostra a foto correspondente
  useEffect(() => {
    if (!color) return;
    const i = product.images.findIndex((im) => im.colorKey === color);
    if (i >= 0) setImgIndex(i);
  }, [color, product.images]);

  useEffect(() => { setQty((q) => Math.max(1, Math.min(q, variant?.stock || 1))); }, [variant]);

  const addToCart = async (buyNow: boolean) => {
    if (!variant) return;
    const ok = await add(variant.id, qty, { openDrawer: !buyNow });
    if (ok) {
      track("add_to_cart", { value: (variant.unitCents * qty) / 100, productId: product.id, items: [{ item_id: variant.sku, item_name: product.name, price: variant.unitCents / 100, quantity: qty, item_variant: [variant.color, variant.size].filter(Boolean).join(" / ") }] });
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
      if (buyNow) router.push("/checkout");
    }
  };

  const img = product.images[imgIndex] ?? product.images[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14 xl:gap-20">
      {/* Galeria */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="grid gap-3 md:grid-cols-[76px_1fr]">
          <div className="order-2 flex gap-2 overflow-x-auto scrollbar-none md:order-1 md:flex-col">
            {product.images.map((im, i) => (
              <button key={im.url} type="button" onClick={() => setImgIndex(i)} aria-label={`Ver imagem ${i + 1}: ${im.alt}`} aria-current={i === imgIndex}
                className={clsx("relative aspect-[4/5] w-[68px] shrink-0 bg-paper-2 transition-opacity md:w-full", i === imgIndex ? "ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-70 hover:opacity-100")}>
                <Image src={im.url} alt="" fill sizes="76px" className="object-cover" />
              </button>
            ))}
          </div>
          <div className="zoom-frame relative order-1 aspect-[4/5] bg-paper-2 md:order-2">
            {img && <Image key={img.url} src={img.url} alt={img.alt} fill priority sizes="(min-width:1024px) 52vw, 100vw" quality={90} className="animate-fade object-cover" />}
          </div>
        </div>
      </div>

      {/* Compra */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            {product.isDemo && <Badge className="mb-3">Produto de demonstração</Badge>}
            <h1 className="display text-[38px] md:text-[48px]">{product.name}</h1>
            {product.subtitle && <p className="mt-2 text-ink-2">{product.subtitle}</p>}
          </div>
          <FavoriteButton productId={product.id} name={product.name} className="-mr-2 border border-line" size={20} />
        </div>

        <div className="mt-6">
          {variant && <Price cents={variant.unitCents} compareAtCents={variant.compareAtCents} size="lg" showInstallments />}
          <p className="mt-1 text-sm text-muted">no Pix, cartão ou boleto</p>
        </div>

        {colors.length > 0 && (
          <fieldset className="mt-8">
            <legend className="mb-3 text-sm"><span className="font-semibold">{product.colorLabel}:</span> {color}</legend>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const soldOut = !product.variants.some((v) => v.color === c.color && v.stock > 0);
                return (
                  <button key={c.color} type="button" onClick={() => setColor(c.color)} aria-pressed={color === c.color} aria-label={`${c.color}${soldOut ? " (esgotado)" : ""}`} title={c.color ?? ""}
                    className={clsx("relative grid size-11 place-items-center rounded-full transition-transform hover:scale-105", color === c.color ? "ring-1 ring-ink ring-offset-2 ring-offset-paper" : "")}>
                    <span className="size-9 rounded-full ring-1 ring-black/10" style={{ background: c.colorHex ?? "#ddd" }} />
                    {soldOut && <span className="absolute h-px w-10 rotate-45 bg-ink/60" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {sizes.length > 0 && (
          <fieldset className="mt-7">
            <legend className="mb-3 text-sm font-semibold">{product.sizeLabel}</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const v = product.variants.find((x) => x.size === s && (x.color ?? null) === color);
                const disabled = !v || v.stock <= 0;
                return (
                  <button key={s} type="button" onClick={() => setSize(s)} aria-pressed={size === s} disabled={!v}
                    className={clsx("h-11 min-w-16 border px-4 text-sm transition-colors", size === s ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink", disabled && "text-muted line-through decoration-1")}>
                    {s}{v && v.unitCents !== firstAvailable.unitCents ? <span className="ml-1.5 no-underline opacity-70">{formatBRL(v.unitCents)}</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-6 text-sm" aria-live="polite">
          {!available ? <p className="font-semibold text-danger">Esgotado nesta opção</p>
            : variant.stock <= lowStock ? <p className="font-semibold text-clay">Últimas {variant.stock} unidades</p>
            : <p className="flex items-center gap-1.5 text-moss"><Check size={16} /> Em estoque</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <QuantityStepper value={qty} max={Math.min(variant?.stock ?? 1, 10)} onChange={setQty} disabled={!available} label={product.name} />
          <Button className="h-12 flex-1" onClick={() => addToCart(false)} loading={pending} disabled={!available} data-testid="add-to-cart">
            {added ? "Adicionado" : "Adicionar à sacola"}
          </Button>
        </div>
        <Button variant="outline" full className="mt-3" onClick={() => addToCart(true)} disabled={!available || pending} data-testid="buy-now">Comprar agora</Button>
        {lastMessage?.tone === "bad" && <p role="alert" className="mt-3 text-sm text-danger">{lastMessage.text}</p>}

        {variant && <ShippingEstimator variantId={variant.id} qty={qty} lead={product.leadTime} />}
      </div>
    </div>
  );
}

function ShippingEstimator({ variantId, qty, lead }: { variantId: string; qty: number; lead: DetailProduct["leadTime"] }) {
  const [cep, setCep] = useState("");
  const [quotes, setQuotes] = useState<ShippingQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem("mk_cep"); if (saved) setCep(formatCEP(saved)); } catch { /* */ }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await quoteProductShipping(variantId, qty, cep);
    setLoading(false);
    if (r.ok) { setQuotes(r.quotes); try { localStorage.setItem("mk_cep", cep.replace(/\D/g, "")); } catch { /* */ } }
    else { setQuotes(null); setError(r.error); }
  };

  return (
    <div className="mt-8 border border-line p-5">
      <p className="flex items-center gap-2 text-sm font-semibold"><Truck size={18} strokeWidth={1.6} /> Calcular frete e prazo</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor="pdp-cep" className="sr-only">CEP</label>
        <input id="pdp-cep" className="field flex-1" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} />
        <Button type="submit" variant="outline" loading={loading}>Calcular</Button>
      </form>
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
      {quotes && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {quotes.map((q) => (
            <li key={q.id} className="flex items-center justify-between py-2.5">
              <span><strong>{q.name}</strong> <span className="text-muted">· {q.daysMin}–{q.daysMax} dias úteis</span></span>
              <span className={clsx("font-semibold tabular-nums", q.free && "text-moss")}>{q.free ? "Grátis" : formatBRL(q.priceCents)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Separação em até {lead.processing} dias úteis após a aprovação do pagamento. Frete grátis na Econômica acima de R$ 299.
      </p>
    </div>
  );
}
