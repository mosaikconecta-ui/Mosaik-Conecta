"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { ufFromCEP } from "@/lib/br";
import { quoteShipping, type ShippingQuote } from "@/lib/pricing";
import { loadPricingContext } from "@/lib/cart";
import { effectivePrice } from "@/lib/pricing";

/** Estimativa de frete na página do produto (sem precisar adicionar ao carrinho). */
export async function quoteProductShipping(variantId: string, quantity: number, cep: string): Promise<{ ok: true; uf: string; quotes: ShippingQuote[] } | { ok: false; error: string }> {
  const parsed = z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(10), cep: z.string() }).safeParse({ variantId, quantity, cep });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const uf = ufFromCEP(parsed.data.cep);
  if (!uf) return { ok: false, error: "CEP inválido." };
  const v = await db.productVariant.findUnique({ where: { id: parsed.data.variantId }, include: { product: { include: { supplier: true } } } });
  if (!v) return { ok: false, error: "Produto não encontrado." };
  const ctx = await loadPricingContext(null);
  const { unitCents } = effectivePrice(v, v.product);
  const line = {
    variantId: v.id, productId: v.productId, slug: v.product.slug, name: v.product.name, variantName: null, sku: v.sku, supplierSku: v.supplierSku,
    supplierId: v.product.supplierId, image: null, unitCents, compareAtCents: null, costCents: 0, quantity: parsed.data.quantity, stock: v.stock,
    weightGrams: v.product.weightGrams, processingDays: v.product.supplier?.processingDays ?? 2,
    shippingDaysMin: v.product.supplier?.shippingDaysMin ?? 5, shippingDaysMax: v.product.supplier?.shippingDaysMax ?? 12,
  };
  return { ok: true, uf, quotes: quoteShipping(ctx.shippingMethods, [line], uf, unitCents * parsed.data.quantity) };
}
