"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { store } from "@/lib/env";
import { ButtonLink } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

export function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, update, pending, lastMessage } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const pct = Math.min(100, Math.round(((store.freeShippingOverCents - cart.freeShippingRemainingCents) / store.freeShippingOverCents) * 100));

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Sacola de compras">
      <div className="absolute inset-0 animate-fade bg-ink/40" onClick={closeDrawer} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[440px] animate-drawer flex-col bg-paper" aria-busy={pending}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <p className="font-semibold">Sacola <span className="text-muted">({cart.itemCount})</span></p>
          <button onClick={closeDrawer} className="grid size-11 place-items-center rounded-full hover:bg-paper-2" aria-label="Fechar sacola"><X size={22} strokeWidth={1.6} /></button>
        </div>

        {lastMessage && <p role="status" className={`px-5 py-2.5 text-sm ${lastMessage.tone === "ok" ? "bg-[#eef1e6] text-moss" : "bg-[#f8e9e4] text-danger"}`}>{lastMessage.text}</p>}

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="display text-[30px]">Sua sacola está vazia</p>
            <ButtonLink href="/produtos" onClick={closeDrawer}>Explorar produtos</ButtonLink>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-4">
              {cart.freeShippingRemainingCents > 0 ? (
                <p className="text-[13px]">Faltam <strong>{formatBRL(cart.freeShippingRemainingCents)}</strong> para o frete grátis</p>
              ) : (
                <p className="text-[13px] font-semibold text-moss">Você ganhou frete grátis</p>
              )}
              <div className="mt-2 h-1 bg-paper-3"><div className="h-full bg-ink transition-[width] duration-700" style={{ width: `${pct}%` }} /></div>
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link href={`/produto/${item.slug}`} onClick={closeDrawer} className="relative aspect-[4/5] w-[84px] shrink-0 bg-paper-2">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="84px" className="object-cover" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        {item.variantName && <p className="text-[13px] text-muted">{item.variantName}</p>}
                        {item.unavailable && <p className="text-[13px] text-danger">Esgotado</p>}
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatBRL(item.lineCents)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper value={item.quantity} max={Math.min(item.stock, 10)} onChange={(q) => update(item.id, q)} disabled={pending || item.unavailable} label={item.name} />
                      <button onClick={() => update(item.id, 0)} className="link-draw text-[13px] text-muted" disabled={pending}>Remover</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 pb-6 pt-4">
              {cart.bundleDiscountCents > 0 && (
                <div className="mb-1 flex justify-between text-sm text-moss"><span>Desconto de combo</span><span>−{formatBRL(cart.bundleDiscountCents)}</span></div>
              )}
              {cart.couponDiscountCents > 0 && (
                <div className="mb-1 flex justify-between text-sm text-moss"><span>Cupom {cart.couponCode}</span><span>−{formatBRL(cart.couponDiscountCents)}</span></div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Subtotal</span>
                <span className="text-lg font-semibold tabular-nums">{formatBRL(cart.subtotalCents - cart.bundleDiscountCents - cart.couponDiscountCents)}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">Frete e prazo calculados no carrinho ou no checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <ButtonLink href="/carrinho" variant="outline" onClick={closeDrawer}>Ver carrinho</ButtonLink>
                <ButtonLink href="/checkout" onClick={closeDrawer} data-testid="drawer-checkout">Finalizar</ButtonLink>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
