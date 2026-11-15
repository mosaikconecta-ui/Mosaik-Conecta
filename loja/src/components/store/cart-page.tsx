"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Tag, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { formatBRL } from "@/lib/format";
import { formatCEP } from "@/lib/br";
import { useCart } from "./cart-provider";
import { QuantityStepper } from "./quantity-stepper";

export function CartPage() {
  const { cart, loaded, update, applyCoupon, removeCoupon, setCep, pending, lastMessage } = useCart();
  const [coupon, setCoupon] = useState("");
  const [cep, setCepInput] = useState("");

  useEffect(() => { if (cart.cep) setCepInput(formatCEP(cart.cep)); }, [cart.cep]);

  if (!loaded) return <div className="h-96 animate-pulse bg-paper-2" aria-label="Carregando carrinho" />;

  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="display text-[40px]">Sua sacola está vazia</p>
        <p className="mt-3 text-muted">Explore a coleção e adicione o que combinar com a sua casa.</p>
        <ButtonLink href="/produtos" className="mt-8">Ver produtos</ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
      <div>
        {cart.warnings.map((w) => <Alert key={w} tone="warn" className="mb-3">{w}</Alert>)}
        <ul className="divide-y divide-line border-y border-line">
          {cart.items.map((item) => (
            <li key={item.id} className={clsx("flex gap-4 py-6 md:gap-6", item.unavailable && "opacity-60")}>
              <Link href={`/produto/${item.slug}`} className="relative aspect-[4/5] w-24 shrink-0 bg-paper-2 md:w-32">
                {item.image && <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link href={`/produto/${item.slug}`} className="link-draw font-semibold">{item.name}</Link>
                    {item.variantName && <p className="text-sm text-muted">{item.variantName}</p>}
                    <p className="mt-1 text-sm tabular-nums text-muted">{formatBRL(item.unitCents)} cada</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatBRL(item.lineCents)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <QuantityStepper value={item.quantity} max={Math.min(Math.max(item.stock, 1), 10)} onChange={(q) => update(item.id, q)} disabled={pending || item.unavailable} label={item.name} />
                  <button onClick={() => update(item.id, 0)} disabled={pending} className="inline-flex h-11 items-center gap-1 text-sm text-muted hover:text-ink"><X size={15} /> Remover</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/produtos" className="link-draw mt-6 inline-block text-sm font-semibold">← Continuar comprando</Link>
      </div>

      <aside className="h-fit border border-line bg-surface p-6 lg:sticky lg:top-24" aria-label="Resumo do pedido">
        <h2 className="text-lg font-semibold">Resumo</h2>

        <form className="mt-5" onSubmit={async (e) => { e.preventDefault(); if (await applyCoupon(coupon)) setCoupon(""); }}>
          <label htmlFor="coupon" className="label">Cupom de desconto</label>
          {cart.couponCode && !cart.couponError ? (
            <div className="flex h-12 items-center justify-between border border-dashed border-moss px-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-moss"><Tag size={15} /> {cart.couponCode}</span>
              <button type="button" onClick={removeCoupon} className="text-muted underline">remover</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input id="coupon" className="field flex-1 uppercase" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="CÓDIGO" autoComplete="off" />
              <Button type="submit" variant="outline" disabled={!coupon.trim() || pending}>Aplicar</Button>
            </div>
          )}
        </form>

        <form className="mt-5" onSubmit={async (e) => { e.preventDefault(); await setCep(cep); }}>
          <label htmlFor="cart-cep" className="label">Estimar frete</label>
          <div className="flex gap-2">
            <input id="cart-cep" className="field flex-1" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCepInput(formatCEP(e.target.value))} />
            <Button type="submit" variant="outline" disabled={cep.replace(/\D/g, "").length !== 8 || pending}>Calcular</Button>
          </div>
          {cart.shippingQuotes.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {cart.shippingQuotes.map((q) => (
                <li key={q.id} className="flex justify-between"><span>{q.name} <span className="text-muted">· {q.daysMin}–{q.daysMax} dias úteis</span></span><span className="font-semibold">{q.free ? "Grátis" : formatBRL(q.priceCents)}</span></li>
              ))}
            </ul>
          )}
        </form>

        {lastMessage && <p role="status" className={clsx("mt-3 text-sm", lastMessage.tone === "ok" ? "text-moss" : "text-danger")}>{lastMessage.text}</p>}

        <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
          <div className="flex justify-between"><dt>Subtotal ({cart.itemCount} itens)</dt><dd className="tabular-nums">{formatBRL(cart.subtotalCents)}</dd></div>
          {cart.bundles.map((b) => <div key={b.id} className="flex justify-between text-moss"><dt>Combo {b.name}</dt><dd className="tabular-nums">−{formatBRL(b.discountCents)}</dd></div>)}
          {cart.couponDiscountCents > 0 && <div className="flex justify-between text-moss"><dt>Cupom {cart.couponCode}</dt><dd className="tabular-nums">−{formatBRL(cart.couponDiscountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Frete</dt><dd className="tabular-nums">{cart.estimatedShippingCents === null ? <span className="text-muted">informe o CEP</span> : cart.estimatedShippingCents === 0 ? "Grátis" : `a partir de ${formatBRL(cart.estimatedShippingCents)}`}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums" data-testid="cart-total">{formatBRL(cart.totalCents)}</dd></div>
        </dl>
        {cart.freeShippingRemainingCents > 0 && <p className="mt-3 text-[13px] text-muted">Faltam {formatBRL(cart.freeShippingRemainingCents)} para frete grátis na Econômica.</p>}
        <ButtonLink href="/checkout" full size="lg" className="mt-6" data-testid="go-checkout">Finalizar pedido</ButtonLink>
        <p className="mt-3 text-center text-[12px] text-muted">Pagamento processado pelo Mercado Pago. Não armazenamos dados de cartão.</p>
      </aside>
    </div>
  );
}
