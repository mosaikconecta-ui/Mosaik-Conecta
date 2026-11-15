/**
 * Motor de preços — funções puras (sem banco), reutilizadas no carrinho,
 * no checkout e na criação do pedido. O servidor SEMPRE recalcula os valores;
 * nada vindo do navegador é usado como preço.
 */
import { REGION_BY_UF, type UF } from "./br";

export type PricedLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string | null;
  sku: string;
  supplierSku: string | null;
  supplierId: string | null;
  image: string | null;
  unitCents: number;
  compareAtCents: number | null;
  costCents: number;
  quantity: number;
  stock: number;
  weightGrams: number;
  processingDays: number;
  shippingDaysMin: number;
  shippingDaysMax: number;
};

export type BundleDef = { id: string; name: string; discountPct: number; productIds: string[] };

export type CouponDef = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotalCents: number;
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
};

export type AppliedBundle = { id: string; name: string; sets: number; discountCents: number };

export function effectivePrice(variant: { priceCents: number | null; compareAtCents?: number | null }, product: { priceCents: number; compareAtCents?: number | null }) {
  const unit = variant.priceCents ?? product.priceCents;
  const compare = variant.priceCents != null ? variant.compareAtCents ?? null : product.compareAtCents ?? null;
  return { unitCents: unit, compareAtCents: compare && compare > unit ? compare : null };
}

export function lineSubtotal(lines: PricedLine[]) {
  return lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
}

/** Aplica combos: desconto só quando todos os produtos do combo estão no carrinho. Sem sobreposição. */
export function applyBundles(lines: PricedLine[], bundles: BundleDef[]): AppliedBundle[] {
  const qtyByProduct = new Map<string, number>();
  const minUnitByProduct = new Map<string, number>();
  for (const l of lines) {
    qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
    minUnitByProduct.set(l.productId, Math.min(minUnitByProduct.get(l.productId) ?? Infinity, l.unitCents));
  }
  const applied: AppliedBundle[] = [];
  const sorted = [...bundles].filter((b) => b.productIds.length >= 2).sort((a, b) => b.discountPct - a.discountPct);
  for (const b of sorted) {
    const sets = Math.min(...b.productIds.map((p) => qtyByProduct.get(p) ?? 0));
    if (!Number.isFinite(sets) || sets <= 0) continue;
    const setValue = b.productIds.reduce((s, p) => s + (minUnitByProduct.get(p) ?? 0), 0);
    const discountCents = Math.round((setValue * sets * Math.min(Math.max(b.discountPct, 0), 50)) / 100);
    if (discountCents <= 0) continue;
    for (const p of b.productIds) qtyByProduct.set(p, (qtyByProduct.get(p) ?? 0) - sets);
    applied.push({ id: b.id, name: b.name, sets, discountCents });
  }
  return applied;
}

export type CouponResult =
  | { ok: true; discountCents: number; freeShipping: boolean }
  | { ok: false; error: string };

export function evaluateCoupon(coupon: CouponDef | null, baseCents: number, now = new Date()): CouponResult {
  if (!coupon || !coupon.active) return { ok: false, error: "Cupom inválido ou inativo." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "Este cupom ainda não está válido." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, error: "Este cupom expirou." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: "Este cupom atingiu o limite de usos." };
  if (baseCents < coupon.minSubtotalCents) {
    const falta = ((coupon.minSubtotalCents - baseCents) / 100).toFixed(2).replace(".", ",");
    return { ok: false, error: `Faltam R$ ${falta} para usar este cupom.` };
  }
  if (coupon.type === "FREE_SHIPPING") return { ok: true, discountCents: 0, freeShipping: true };
  const raw = coupon.type === "PERCENT" ? Math.round((baseCents * Math.min(coupon.value, 100)) / 100) : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(raw, baseCents)), freeShipping: false };
}

export type ShippingMethodDef = {
  id: string;
  name: string;
  carrier: string;
  description: string | null;
  baseCents: number;
  perKgCents: number;
  freeOverCents: number | null;
  extraDaysMin: number;
  extraDaysMax: number;
  regionMultiplier: Record<string, number>;
};

export type ShippingQuote = {
  id: string;
  name: string;
  carrier: string;
  description: string | null;
  priceCents: number;
  daysMin: number;
  daysMax: number;
  free: boolean;
};

/** Prazo = processamento do fornecedor + transporte do fornecedor + dias extras do método (pior caso entre os itens). */
export function quoteShipping(methods: ShippingMethodDef[], lines: PricedLine[], uf: UF | null, subtotalAfterDiscountCents: number, forceFree = false): ShippingQuote[] {
  if (lines.length === 0) return [];
  const region = uf ? REGION_BY_UF[uf] : "SE";
  const weightKg = Math.max(0.3, lines.reduce((s, l) => s + l.weightGrams * l.quantity, 0) / 1000);
  const leadMin = Math.max(...lines.map((l) => l.processingDays + l.shippingDaysMin));
  const leadMax = Math.max(...lines.map((l) => l.processingDays + l.shippingDaysMax));
  return methods.map((m) => {
    const mult = Number(m.regionMultiplier?.[region] ?? 1) || 1;
    const price = Math.round((m.baseCents + m.perKgCents * Math.ceil(weightKg)) * mult);
    const free = forceFree || (m.freeOverCents != null && subtotalAfterDiscountCents >= m.freeOverCents);
    return {
      id: m.id, name: m.name, carrier: m.carrier, description: m.description,
      priceCents: free ? 0 : price,
      daysMin: Math.max(1, leadMin + m.extraDaysMin),
      daysMax: Math.max(1, leadMin + m.extraDaysMin, leadMax + m.extraDaysMax),
      free,
    };
  });
}

export type Totals = {
  subtotalCents: number;
  bundles: AppliedBundle[];
  bundleDiscountCents: number;
  couponDiscountCents: number;
  couponError: string | null;
  freeShipping: boolean;
  shippingCents: number | null;
  totalCents: number;
  costCents: number;
  itemCount: number;
};

export function computeTotals(input: {
  lines: PricedLine[];
  bundles: BundleDef[];
  coupon: CouponDef | null;
  couponCode?: string | null;
  shippingCents?: number | null;
}): Totals {
  const subtotal = lineSubtotal(input.lines);
  const bundles = applyBundles(input.lines, input.bundles);
  const bundleDiscount = bundles.reduce((s, b) => s + b.discountCents, 0);
  const base = subtotal - bundleDiscount;
  let couponDiscount = 0;
  let couponError: string | null = null;
  let freeShipping = false;
  if (input.couponCode) {
    const r = evaluateCoupon(input.coupon, base);
    if (r.ok) {
      couponDiscount = r.discountCents;
      freeShipping = r.freeShipping;
    } else couponError = r.error;
  }
  const shipping = input.shippingCents ?? null;
  const total = Math.max(0, base - couponDiscount + (freeShipping ? 0 : shipping ?? 0));
  return {
    subtotalCents: subtotal,
    bundles,
    bundleDiscountCents: bundleDiscount,
    couponDiscountCents: couponDiscount,
    couponError,
    freeShipping,
    shippingCents: shipping === null ? null : freeShipping ? 0 : shipping,
    totalCents: total,
    costCents: input.lines.reduce((s, l) => s + l.costCents * l.quantity, 0),
    itemCount: input.lines.reduce((s, l) => s + l.quantity, 0),
  };
}
