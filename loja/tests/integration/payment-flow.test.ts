/**
 * Integração com o banco (requer DATABASE_URL e seed): valida o que acontece DEPOIS que o webhook
 * já confirmou o pagamento na API do gateway. Não substitui o teste em sandbox do Mercado Pago.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { applyPaymentUpdate } from "@/lib/orders";

const db = new PrismaClient();
let orderId = "";
let variantId = "";
let stockBefore = 0;
const QTY = 2;

beforeAll(async () => {
  const variant = await db.productVariant.findFirstOrThrow({ where: { stock: { gte: 5 }, product: { supplierId: { not: null } } }, include: { product: true } });
  variantId = variant.id;
  stockBefore = variant.stock;
  const unit = variant.priceCents ?? variant.product.priceCents;
  const order = await db.order.create({
    data: {
      number: `MK-T${Date.now().toString().slice(-6)}`, accessTokenHash: "x", customerName: "Teste Integração", customerEmail: "integ@exemplo.com",
      customerPhone: "11999999999", shipCep: "01310100", shipStreet: "Rua", shipNumber: "1", shipDistrict: "B", shipCity: "São Paulo", shipState: "SP",
      shippingName: "Econômica", deliveryDaysMin: 5, deliveryDaysMax: 10, subtotalCents: unit * QTY, shippingCents: 0, totalCents: unit * QTY, costCents: 0,
      items: { create: [{ variantId, productId: variant.productId, productName: variant.product.name, sku: variant.sku, supplierId: variant.product.supplierId, quantity: QTY, unitCents: unit, costCents: 100, totalCents: unit * QTY }] },
    },
  });
  orderId = order.id;
});

afterAll(async () => {
  await db.order.delete({ where: { id: orderId } }).catch(() => {});
  await db.productVariant.update({ where: { id: variantId }, data: { stock: stockBefore } });
  await db.$disconnect();
});

const remote = (over: object) => ({ id: "pay-1", status: "APPROVED" as const, rawStatus: "approved", method: "pix", installments: 1, amountCents: 0, externalReference: orderId, sandbox: true, ...over });

describe("aplicação de status de pagamento", () => {
  it("valor divergente NÃO libera o pedido", async () => {
    await applyPaymentUpdate("mercadopago", remote({ id: "pay-x", amountCents: 1 }));
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { events: true } });
    expect(o.status).toBe("PENDING_PAYMENT");
    expect(o.events.some((e) => e.message.includes("diverge"))).toBe(true);
  });

  it("pagamento aprovado: PAID, baixa estoque e cria fulfillment", async () => {
    const o0 = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await applyPaymentUpdate("mercadopago", remote({ amountCents: o0.totalCents }));
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { fulfillments: { include: { items: true } } } });
    expect(o.status).toBe("PAID");
    expect(o.paymentStatus).toBe("APPROVED");
    expect(o.fulfillments).toHaveLength(1);
    expect(o.fulfillments[0].items).toHaveLength(1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(stockBefore - QTY);
  });

  it("webhook repetido é idempotente", async () => {
    const o0 = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await applyPaymentUpdate("mercadopago", remote({ amountCents: o0.totalCents }));
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(stockBefore - QTY);
    expect(await db.fulfillment.count({ where: { orderId } })).toBe(1);
  });

  it("reembolso devolve estoque", async () => {
    const o0 = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await applyPaymentUpdate("mercadopago", remote({ status: "REFUNDED", rawStatus: "refunded", amountCents: o0.totalCents }));
    const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(o.status).toBe("REFUNDED");
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(v.stock).toBe(stockBefore);
  });
});
