import { describe, expect, it } from "vitest";
import { applyBundles, computeTotals, evaluateCoupon, quoteShipping, type CouponDef, type PricedLine, type ShippingMethodDef } from "@/lib/pricing";

const line = (over: Partial<PricedLine> = {}): PricedLine => ({
  variantId: "v1", productId: "p1", slug: "p", name: "Produto", variantName: null, sku: "SKU", supplierSku: null, supplierId: null,
  image: null, unitCents: 10000, compareAtCents: null, costCents: 4000, quantity: 1, stock: 10, weightGrams: 500,
  processingDays: 2, shippingDaysMin: 3, shippingDaysMax: 8, ...over,
});

const coupon = (over: Partial<CouponDef> = {}): CouponDef => ({
  code: "X", type: "PERCENT", value: 10, minSubtotalCents: 0, active: true, startsAt: null, expiresAt: null, maxUses: null, usedCount: 0, ...over,
});

describe("cupons", () => {
  it("aplica percentual", () => expect(evaluateCoupon(coupon(), 20000)).toEqual({ ok: true, discountCents: 2000, freeShipping: false }));
  it("valor fixo nunca passa do subtotal", () => expect(evaluateCoupon(coupon({ type: "FIXED", value: 50000 }), 20000)).toMatchObject({ ok: true, discountCents: 20000 }));
  it("frete grátis", () => expect(evaluateCoupon(coupon({ type: "FREE_SHIPPING", value: 0 }), 100)).toMatchObject({ ok: true, freeShipping: true }));
  it("respeita mínimo", () => expect(evaluateCoupon(coupon({ minSubtotalCents: 15000 }), 10000)).toMatchObject({ ok: false }));
  it("recusa expirado", () => expect(evaluateCoupon(coupon({ expiresAt: new Date(Date.now() - 1000) }), 10000)).toMatchObject({ ok: false, error: "Este cupom expirou." }));
  it("recusa ainda não iniciado", () => expect(evaluateCoupon(coupon({ startsAt: new Date(Date.now() + 86400_000) }), 10000)).toMatchObject({ ok: false }));
  it("recusa esgotado", () => expect(evaluateCoupon(coupon({ maxUses: 5, usedCount: 5 }), 10000)).toMatchObject({ ok: false }));
  it("recusa inativo/inexistente", () => {
    expect(evaluateCoupon(coupon({ active: false }), 10000).ok).toBe(false);
    expect(evaluateCoupon(null, 10000).ok).toBe(false);
  });
});

describe("combos", () => {
  const bundle = { id: "b", name: "Combo", discountPct: 10, productIds: ["p1", "p2"] };
  it("aplica desconto somente com todos os itens", () => {
    expect(applyBundles([line()], [bundle])).toEqual([]);
    const r = applyBundles([line(), line({ variantId: "v2", productId: "p2", unitCents: 5000 })], [bundle]);
    expect(r).toEqual([{ id: "b", name: "Combo", sets: 1, discountCents: 1500 }]);
  });
  it("conta conjuntos completos", () => {
    const r = applyBundles([line({ quantity: 3 }), line({ variantId: "v2", productId: "p2", unitCents: 5000, quantity: 2 })], [bundle]);
    expect(r[0].sets).toBe(2);
    expect(r[0].discountCents).toBe(3000);
  });
  it("não reutiliza o mesmo item em dois combos", () => {
    const b2 = { id: "b2", name: "Outro", discountPct: 5, productIds: ["p1", "p3"] };
    const r = applyBundles([line(), line({ variantId: "v2", productId: "p2" }), line({ variantId: "v3", productId: "p3" })], [bundle, b2]);
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });
  it("limita desconto a 50%", () => {
    const r = applyBundles([line(), line({ variantId: "v2", productId: "p2" })], [{ ...bundle, discountPct: 90 }]);
    expect(r[0].discountCents).toBe(10000);
  });
});

describe("frete", () => {
  const pac: ShippingMethodDef = { id: "pac", name: "Econômica", carrier: "PAC", description: null, baseCents: 2000, perKgCents: 500, freeOverCents: 29900, extraDaysMin: 1, extraDaysMax: 3, regionMultiplier: { SE: 1, N: 2 } };
  it("calcula por peso e região", () => {
    const [q] = quoteShipping([pac], [line({ weightGrams: 1500 })], "SP", 10000);
    expect(q.priceCents).toBe(2000 + 500 * 2);
    const [qn] = quoteShipping([pac], [line({ weightGrams: 1500 })], "AM", 10000);
    expect(qn.priceCents).toBe((2000 + 1000) * 2);
  });
  it("frete grátis acima do limite", () => expect(quoteShipping([pac], [line()], "SP", 30000)[0]).toMatchObject({ free: true, priceCents: 0 }));
  it("prazo = maior prazo entre fornecedores + extras", () => {
    const [q] = quoteShipping([pac], [line(), line({ variantId: "v2", processingDays: 5, shippingDaysMax: 20 })], "SP", 1000);
    expect(q.daysMin).toBe(5 + 3 + 1);
    expect(q.daysMax).toBe(25 + 3);
  });
  it("prazo nunca é menor que 1 dia", () => {
    const [q] = quoteShipping([{ ...pac, extraDaysMin: -20, extraDaysMax: -20 }], [line()], "SP", 1000);
    expect(q.daysMin).toBeGreaterThanOrEqual(1);
    expect(q.daysMax).toBeGreaterThanOrEqual(q.daysMin);
  });
});

describe("totais", () => {
  it("combina combo + cupom + frete", () => {
    const t = computeTotals({
      lines: [line(), line({ variantId: "v2", productId: "p2", unitCents: 5000 })],
      bundles: [{ id: "b", name: "C", discountPct: 10, productIds: ["p1", "p2"] }],
      coupon: coupon({ type: "FIXED", value: 1000 }), couponCode: "X", shippingCents: 2500,
    });
    expect(t.subtotalCents).toBe(15000);
    expect(t.bundleDiscountCents).toBe(1500);
    expect(t.couponDiscountCents).toBe(1000);
    expect(t.totalCents).toBe(15000 - 1500 - 1000 + 2500);
    expect(t.costCents).toBe(8000);
  });
  it("cupom de frete grátis zera o frete", () => {
    const t = computeTotals({ lines: [line()], bundles: [], coupon: coupon({ type: "FREE_SHIPPING" }), couponCode: "X", shippingCents: 3000 });
    expect(t.shippingCents).toBe(0);
    expect(t.totalCents).toBe(10000);
  });
  it("cupom inválido não dá desconto e informa erro", () => {
    const t = computeTotals({ lines: [line()], bundles: [], coupon: null, couponCode: "NAO" });
    expect(t.couponDiscountCents).toBe(0);
    expect(t.couponError).toBeTruthy();
  });
});
