"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { addToCart, getCartView, getOrCreateCart, setCartCep, setCartCoupon, setCartQuantity } from "@/lib/cart";
import type { CartView } from "@/lib/cart-types";

type Result = { ok: true; cart: CartView; message?: string } | { ok: false; cart: CartView; error: string };

async function run(fn: () => Promise<string | void>): Promise<Result> {
  try {
    const message = await fn();
    return { ok: true, cart: await getCartView(), ...(message ? { message } : {}) };
  } catch (err) {
    return { ok: false, cart: await getCartView(), error: err instanceof Error ? err.message : "Não foi possível atualizar o carrinho." };
  }
}

const id = z.string().min(1).max(40);

export async function fetchCartAction(): Promise<CartView> {
  return getCartView();
}

export async function addToCartAction(variantId: string, quantity = 1) {
  return run(async () => {
    await addToCart(id.parse(variantId), z.number().int().min(1).max(10).parse(quantity));
  });
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  return run(() => setCartQuantity(id.parse(itemId), z.number().int().min(0).max(10).parse(quantity)));
}

export async function applyCouponAction(code: string) {
  return run(async () => {
    const clean = z.string().trim().min(1, "Digite um cupom.").max(30).parse(code);
    await setCartCoupon(clean);
    const view = await getCartView();
    if (view.couponError) {
      await setCartCoupon(null);
      throw new Error(view.couponError);
    }
    const exists = await db.coupon.findUnique({ where: { code: view.couponCode ?? "" } });
    if (!exists) {
      await setCartCoupon(null);
      throw new Error("Cupom inválido.");
    }
    return "Cupom aplicado.";
  });
}

export async function removeCouponAction() {
  return run(() => setCartCoupon(null));
}

export async function setCepAction(cep: string) {
  return run(async () => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) throw new Error("CEP inválido.");
    await setCartCep(d);
  });
}

/** Adiciona todos os itens de um combo (primeira variação disponível de cada produto). */
export async function addBundleAction(bundleId: string, chosen: Record<string, string> = {}) {
  return run(async () => {
    const bundle = await db.bundle.findFirst({
      where: { id: id.parse(bundleId), active: true },
      include: { items: { include: { product: { include: { variants: { where: { active: true, stock: { gt: 0 } }, orderBy: { position: "asc" } } } } } } },
    });
    if (!bundle) throw new Error("Combo indisponível.");
    await getOrCreateCart();
    for (const item of bundle.items) {
      const variant = item.product.variants.find((v) => v.id === chosen[item.productId]) ?? item.product.variants[0];
      if (!variant) throw new Error(`${item.product.name} está esgotado.`);
      const view = await getCartView();
      if (view.items.some((i) => i.productId === item.productId)) continue;
      await addToCart(variant.id, 1);
    }
    return `Combo ${bundle.name} adicionado com ${bundle.discountPct}% de desconto.`;
  });
}
