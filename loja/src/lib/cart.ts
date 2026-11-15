import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env, store } from "./env";
import { ufFromCEP, onlyDigits } from "./br";
import { computeTotals, effectivePrice, quoteShipping, type BundleDef, type CouponDef, type PricedLine, type ShippingMethodDef } from "./pricing";
import { EMPTY_CART, type CartView } from "./cart-types";

export const CART_COOKIE = "mk_cart";
export const MAX_QTY_PER_ITEM = 10;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: { position: "asc" } },
              supplier: { select: { id: true, processingDays: true, shippingDaysMin: true, shippingDaysMax: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export async function getCart(): Promise<CartWithItems | null> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findFirst({ where: { tokenHash: sha256(token), convertedAt: null }, include: cartInclude });
}

export async function getOrCreateCart(): Promise<CartWithItems> {
  const existing = await getCart();
  if (existing) return existing;
  const token = randomToken();
  const cart = await db.cart.create({ data: { tokenHash: sha256(token) }, include: cartInclude });
  const jar = await cookies();
  jar.set(CART_COOKIE, token, { httpOnly: true, secure: env.isProd, sameSite: "lax", path: "/", maxAge: 60 * 86400 });
  return cart;
}

export async function clearCartCookie() {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

function variantLabel(v: { color: string | null; size: string | null }) {
  return [v.color, v.size].filter(Boolean).join(" · ") || null;
}

export function toPricedLines(cart: CartWithItems): PricedLine[] {
  return cart.items
    .filter((i) => i.variant.active && i.variant.product.status === "ACTIVE")
    .map((i) => {
      const v = i.variant;
      const p = v.product;
      const { unitCents, compareAtCents } = effectivePrice(v, p);
      const img = p.images.find((im) => im.colorKey && im.colorKey === v.color) ?? p.images[0];
      return {
        variantId: v.id,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        variantName: variantLabel(v),
        sku: v.sku,
        supplierSku: v.supplierSku,
        supplierId: p.supplierId,
        image: img?.url ?? null,
        unitCents,
        compareAtCents,
        costCents: v.costCents ?? p.costCents,
        quantity: i.quantity,
        stock: v.stock,
        weightGrams: p.weightGrams,
        processingDays: p.supplier?.processingDays ?? 2,
        shippingDaysMin: p.supplier?.shippingDaysMin ?? 5,
        shippingDaysMax: p.supplier?.shippingDaysMax ?? 12,
      };
    });
}

export async function loadPricingContext(couponCode: string | null) {
  const [bundlesRaw, coupon, methods] = await Promise.all([
    db.bundle.findMany({ where: { active: true }, include: { items: { select: { productId: true } } } }),
    couponCode ? db.coupon.findUnique({ where: { code: couponCode } }) : Promise.resolve(null),
    db.shippingMethod.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
  ]);
  const bundles: BundleDef[] = bundlesRaw.map((b) => ({ id: b.id, name: b.name, discountPct: b.discountPct, productIds: b.items.map((i) => i.productId) }));
  const couponDef: CouponDef | null = coupon
    ? { code: coupon.code, type: coupon.type, value: coupon.value, minSubtotalCents: coupon.minSubtotalCents, active: coupon.active, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt, maxUses: coupon.maxUses, usedCount: coupon.usedCount }
    : null;
  const shippingMethods: ShippingMethodDef[] = methods.map((m) => ({
    id: m.id, name: m.name, carrier: m.carrier, description: m.description, baseCents: m.baseCents, perKgCents: m.perKgCents,
    freeOverCents: m.freeOverCents, extraDaysMin: m.extraDaysMin, extraDaysMax: m.extraDaysMax,
    regionMultiplier: (m.regionMultiplier ?? {}) as Record<string, number>,
  }));
  return { bundles, coupon: couponDef, couponId: coupon?.id ?? null, shippingMethods };
}

export function buildCartView(cart: CartWithItems, ctx: Awaited<ReturnType<typeof loadPricingContext>>): CartView {
  const lines = toPricedLines(cart);
  const warnings: string[] = [];
  const available = lines.filter((l) => l.stock > 0);
  for (const l of lines) {
    if (l.stock <= 0) warnings.push(`${l.name} está esgotado e não será incluído no pedido.`);
    else if (l.quantity > l.stock) warnings.push(`Só temos ${l.stock} unidade(s) de ${l.name}. Ajustamos a quantidade.`);
  }
  const effective = available.map((l) => ({ ...l, quantity: Math.min(l.quantity, l.stock) }));
  const base = computeTotals({ lines: effective, bundles: ctx.bundles, coupon: ctx.coupon, couponCode: cart.couponCode });
  const afterDiscount = base.subtotalCents - base.bundleDiscountCents - base.couponDiscountCents;
  const uf = cart.cep ? ufFromCEP(cart.cep) : null;
  const quotes = cart.cep ? quoteShipping(ctx.shippingMethods, effective, uf, afterDiscount, base.freeShipping) : [];
  const cheapest = quotes.length ? Math.min(...quotes.map((q) => q.priceCents)) : null;
  const totals = computeTotals({ lines: effective, bundles: ctx.bundles, coupon: ctx.coupon, couponCode: cart.couponCode, shippingCents: cheapest });

  return {
    items: lines.map((l) => {
      const cartItem = cart.items.find((i) => i.variantId === l.variantId)!;
      const qty = Math.min(l.quantity, Math.max(l.stock, 0)) || l.quantity;
      return {
        id: cartItem.id, variantId: l.variantId, productId: l.productId, slug: l.slug, name: l.name, variantName: l.variantName,
        image: l.image, unitCents: l.unitCents, compareAtCents: l.compareAtCents, quantity: qty, lineCents: l.unitCents * qty,
        stock: l.stock, unavailable: l.stock <= 0,
      };
    }),
    itemCount: totals.itemCount,
    subtotalCents: totals.subtotalCents,
    bundles: totals.bundles,
    bundleDiscountCents: totals.bundleDiscountCents,
    couponCode: cart.couponCode,
    couponDiscountCents: totals.couponDiscountCents,
    couponError: totals.couponError,
    freeShipping: totals.freeShipping,
    cep: cart.cep,
    shippingQuotes: quotes,
    estimatedShippingCents: totals.shippingCents,
    totalCents: totals.totalCents,
    freeShippingRemainingCents: Math.max(0, store.freeShippingOverCents - afterDiscount),
    warnings,
  };
}

export async function getCartView(): Promise<CartView> {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) return { ...EMPTY_CART, cep: cart?.cep ?? null, couponCode: cart?.couponCode ?? null };
  const ctx = await loadPricingContext(cart.couponCode);
  return buildCartView(cart, ctx);
}

export async function addToCart(variantId: string, quantity: number) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { status: true } } } });
  if (!variant || !variant.active || variant.product.status !== "ACTIVE") throw new Error("Produto indisponível.");
  if (variant.stock <= 0) throw new Error("Produto esgotado.");
  const cart = await getOrCreateCart();
  const current = cart.items.find((i) => i.variantId === variantId)?.quantity ?? 0;
  const qty = Math.min(current + Math.max(1, quantity), variant.stock, MAX_QTY_PER_ITEM);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: qty },
    update: { quantity: qty },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function setCartQuantity(itemId: string, quantity: number) {
  const cart = await getCart();
  if (!cart) return;
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return;
  if (quantity <= 0) await db.cartItem.delete({ where: { id: itemId } });
  else await db.cartItem.update({ where: { id: itemId }, data: { quantity: Math.min(quantity, item.variant.stock, MAX_QTY_PER_ITEM) } });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function setCartCoupon(code: string | null) {
  const cart = await getOrCreateCart();
  const normalized = code ? code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30) : null;
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: normalized || null } });
}

export async function setCartCep(cep: string) {
  const cart = await getOrCreateCart();
  const d = onlyDigits(cep);
  await db.cart.update({ where: { id: cart.id }, data: { cep: d.length === 8 ? d : null } });
}
