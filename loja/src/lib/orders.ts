import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";
import { onlyDigits, type UF } from "./br";
import { audit, logError, logInfo } from "./audit";
import { emails } from "./email";
import { clearCartCookie, getCart, loadPricingContext, toPricedLines } from "./cart";
import { computeTotals, quoteShipping } from "./pricing";
import { getPaymentProvider, type RemotePayment } from "./payments";
import { getSupplierAdapter } from "./suppliers";
import { ALLOWED_TRANSITIONS, ORDER_STATUS, trackingUrlFor } from "./order-status";
import type { CheckoutInput } from "./validation";

export class CheckoutError extends Error {}

export const orderAccessUrl = (number: string, token: string) => `${env.siteUrl}/pedido/${number}?t=${token}`;

async function generateOrderNumber(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const n = `MK-${Math.floor(100000 + Math.random() * 900000)}`;
    if (!(await db.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  return `MK-${Date.now().toString().slice(-8)}`;
}

/** Cria o pedido a partir do carrinho. Preços, descontos e frete são recalculados no servidor. */
export async function createOrderFromCart(input: CheckoutInput, userId: string | null) {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) throw new CheckoutError("Seu carrinho está vazio.");
  const ctx = await loadPricingContext(cart.couponCode);
  const lines = toPricedLines(cart);
  const problems = lines.filter((l) => l.stock < l.quantity);
  if (problems.length) {
    throw new CheckoutError(
      `Estoque insuficiente para: ${problems.map((p) => `${p.name}${p.variantName ? ` (${p.variantName})` : ""} — disponível: ${Math.max(p.stock, 0)}`).join("; ")}. Ajuste o carrinho.`,
    );
  }
  if (lines.length === 0) throw new CheckoutError("Nenhum item disponível no carrinho.");

  const pre = computeTotals({ lines, bundles: ctx.bundles, coupon: ctx.coupon, couponCode: cart.couponCode });
  if (cart.couponCode && pre.couponError) throw new CheckoutError(`Cupom ${cart.couponCode}: ${pre.couponError} Remova o cupom para continuar.`);

  const coupon = cart.couponCode ? await db.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
  if (coupon?.perCustomerLimit) {
    const used = await db.order.count({ where: { couponId: coupon.id, customerEmail: input.email, status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } } });
    if (used >= coupon.perCustomerLimit) throw new CheckoutError(`O cupom ${coupon.code} já foi usado o máximo de vezes por cliente.`);
  }

  const afterDiscount = pre.subtotalCents - pre.bundleDiscountCents - pre.couponDiscountCents;
  const quotes = quoteShipping(ctx.shippingMethods, lines, input.state as UF, afterDiscount, pre.freeShipping);
  const quote = quotes.find((q) => q.id === input.shippingMethodId);
  if (!quote) throw new CheckoutError("Selecione uma opção de entrega válida.");
  const totals = computeTotals({ lines, bundles: ctx.bundles, coupon: ctx.coupon, couponCode: cart.couponCode, shippingCents: quote.priceCents });

  const accessToken = randomToken(24);
  const number = await generateOrderNumber();

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        number,
        accessTokenHash: sha256(accessToken),
        userId,
        customerName: input.name,
        customerEmail: input.email,
        customerPhone: onlyDigits(input.phone),
        customerCpf: input.cpf ? onlyDigits(input.cpf) : null,
        shipCep: onlyDigits(input.cep),
        shipStreet: input.street,
        shipNumber: input.number,
        shipComplement: input.complement || null,
        shipDistrict: input.district,
        shipCity: input.city,
        shipState: input.state,
        shippingMethodId: quote.id,
        shippingName: `${quote.name} (${quote.carrier})`,
        deliveryDaysMin: quote.daysMin,
        deliveryDaysMax: quote.daysMax,
        subtotalCents: totals.subtotalCents,
        bundleDiscountCents: totals.bundleDiscountCents,
        discountCents: totals.couponDiscountCents + totals.bundleDiscountCents,
        shippingCents: totals.shippingCents ?? 0,
        totalCents: totals.totalCents,
        costCents: totals.costCents,
        couponId: coupon?.id ?? null,
        couponCode: totals.couponError ? null : cart.couponCode,
        cartId: cart.id,
        notes: input.notes || null,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId, productId: l.productId, productName: l.name, variantName: l.variantName, sku: l.sku,
            supplierSku: l.supplierSku, supplierId: l.supplierId, image: l.image, quantity: l.quantity, unitCents: l.unitCents,
            costCents: l.costCents, totalCents: l.unitCents * l.quantity,
          })),
        },
        events: { create: { type: "status_change", message: "Pedido recebido. Aguardando confirmação do pagamento." } },
      },
      include: { items: true },
    });
    await tx.cart.update({
      where: { id: cart.id },
      data: { convertedAt: new Date(), email: input.email, name: input.name, phone: onlyDigits(input.phone), userId: userId ?? cart.userId },
    });
    if (userId && input.saveAddress) {
      const exists = await tx.address.findFirst({ where: { userId, cep: onlyDigits(input.cep), number: input.number } });
      if (!exists) {
        const count = await tx.address.count({ where: { userId } });
        await tx.address.create({
          data: {
            userId, recipient: input.name, cep: onlyDigits(input.cep), street: input.street, number: input.number,
            complement: input.complement || null, district: input.district, city: input.city, state: input.state, isDefault: count === 0,
          },
        });
      }
    }
    if (userId) {
      await tx.user.update({ where: { id: userId }, data: { phone: onlyDigits(input.phone), ...(input.cpf ? { cpf: onlyDigits(input.cpf) } : {}) } });
    }
    return created;
  });

  await clearCartCookie();
  await audit("order.created", { userId, entity: "order", entityId: order.id, details: { number, totalCents: order.totalCents } });
  emails.orderCreated({
    number, customerName: order.customerName, customerEmail: order.customerEmail, totalCents: order.totalCents,
    accessUrl: orderAccessUrl(number, accessToken), items: order.items,
  }).catch(() => {});
  return { order, accessToken };
}

/** Inicia (ou reinicia) o pagamento no gateway. Nunca aprova nada localmente. */
export async function startPayment(orderId: string, accessToken: string): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, reason: "Pedido não encontrado." };
  if (order.status !== "PENDING_PAYMENT") return { ok: false, reason: "Este pedido não está aguardando pagamento." };
  const provider = getPaymentProvider();
  if (!provider.isConfigured()) {
    return { ok: false, reason: "O pagamento online ainda não foi configurado nesta loja. Nenhuma cobrança foi feita." };
  }
  try {
    const session = await provider.createCheckout({
      id: order.id, number: order.number, accessToken, customerName: order.customerName, customerEmail: order.customerEmail,
      customerCpf: order.customerCpf, customerPhone: order.customerPhone, totalCents: order.totalCents, shippingCents: order.shippingCents,
      discountCents: order.discountCents,
      items: order.items.map((i) => ({ sku: i.sku, name: i.productName + (i.variantName ? ` — ${i.variantName}` : ""), quantity: i.quantity, unitCents: i.unitCents, image: i.image })),
    });
    await db.payment.create({
      data: { orderId: order.id, provider: provider.id, preferenceId: session.preferenceId, checkoutUrl: session.checkoutUrl, amountCents: order.totalCents, sandbox: session.sandbox },
    });
    return { ok: true, url: session.checkoutUrl };
  } catch (err) {
    logError("payment.start", err, { orderId });
    return { ok: false, reason: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." };
  }
}

/** Aplica um status de pagamento consultado na API oficial do gateway (chamado pelo webhook). */
export async function applyPaymentUpdate(providerId: string, remote: RemotePayment) {
  if (!remote.externalReference) {
    logInfo("payment.update", "Pagamento sem external_reference ignorado", { paymentId: remote.id });
    return;
  }
  const order = await db.order.findUnique({ where: { id: remote.externalReference } });
  if (!order) {
    logInfo("payment.update", "Pedido não encontrado para pagamento", { paymentId: remote.id });
    return;
  }
  const existing = await db.payment.findUnique({ where: { provider_providerPaymentId: { provider: providerId, providerPaymentId: remote.id } } });
  const data = {
    status: remote.status, rawStatus: remote.rawStatus, method: remote.method, installments: remote.installments,
    amountCents: remote.amountCents, sandbox: remote.sandbox, lastWebhookAt: new Date(),
  };
  if (existing) await db.payment.update({ where: { id: existing.id }, data });
  else {
    // vincula ao checkout iniciado (sem providerPaymentId) ou cria registro novo
    const pending = await db.payment.findFirst({ where: { orderId: order.id, provider: providerId, providerPaymentId: null }, orderBy: { createdAt: "desc" } });
    if (pending) await db.payment.update({ where: { id: pending.id }, data: { ...data, providerPaymentId: remote.id } });
    else await db.payment.create({ data: { ...data, orderId: order.id, provider: providerId, providerPaymentId: remote.id } });
  }

  if (remote.status === "APPROVED") {
    if (remote.amountCents !== order.totalCents) {
      await db.orderEvent.create({ data: { orderId: order.id, type: "payment", isPublic: false, message: `ALERTA: valor pago (${remote.amountCents}) diverge do total do pedido (${order.totalCents}). Pedido não liberado automaticamente.` } });
      await audit("payment.amount_mismatch", { entity: "order", entityId: order.id, details: { paid: remote.amountCents, total: order.totalCents } });
      return;
    }
    await markOrderPaid(order.id);
  } else if (remote.status === "REFUNDED" || remote.status === "CHARGED_BACK") {
    await setOrderStatus(order.id, "REFUNDED", null, `Pagamento ${remote.status === "REFUNDED" ? "reembolsado" : "contestado"} no gateway.`, { fromWebhook: true });
  } else if (order.status === "PENDING_PAYMENT") {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: remote.status } });
    if (remote.status === "REJECTED") {
      await db.orderEvent.create({ data: { orderId: order.id, type: "payment", message: "Pagamento recusado. Você pode tentar novamente com outro meio de pagamento." } });
    }
  }
}

export async function markOrderPaid(orderId: string) {
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paymentStatus: "APPROVED", paidAt: new Date(), stockCommitted: true },
    });
    if (updated.count === 0) return null; // idempotente: já processado
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    for (const item of order.items) {
      if (!item.variantId) continue;
      const dec = await tx.productVariant.updateMany({ where: { id: item.variantId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
      if (dec.count === 0) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: 0 } });
        await tx.orderEvent.create({ data: { orderId, type: "note", isPublic: false, message: `Estoque insuficiente para ${item.sku} no momento da aprovação. Confirme disponibilidade com o fornecedor.` } });
      }
    }
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    const bySupplier = new Map<string | null, string[]>();
    for (const item of order.items) {
      const key = item.supplierId ?? null;
      bySupplier.set(key, [...(bySupplier.get(key) ?? []), item.id]);
    }
    for (const [supplierId, itemIds] of bySupplier) {
      await tx.fulfillment.create({
        data: {
          orderId, supplierId,
          supplierCostCents: order.items.filter((i) => itemIds.includes(i.id)).reduce((s, i) => s + i.costCents * i.quantity, 0),
          items: { connect: itemIds.map((id) => ({ id })) },
        },
      });
    }
    await tx.orderEvent.create({ data: { orderId, type: "payment", message: "Pagamento aprovado. Seu pedido está sendo preparado." } });
    return order;
  });
  if (!result) return;
  await audit("order.paid", { entity: "order", entityId: orderId, details: { totalCents: result.totalCents } });
  await db.analyticsEvent.create({ data: { sessionId: `order:${orderId}`, name: "purchase", valueCents: result.totalCents } });
  // Token de acesso não é recuperável (só o hash é guardado): o e-mail leva para a área do cliente / rastreamento.
  emails.orderPaid({
    number: result.number, customerName: result.customerName, customerEmail: result.customerEmail, totalCents: result.totalCents,
    accessUrl: `${env.siteUrl}/rastreamento?pedido=${result.number}`, items: result.items,
  }).catch(() => {});
  // encaminhamento automático para fornecedores configurados
  const fulfillments = await db.fulfillment.findMany({ where: { orderId, supplier: { autoForward: true, active: true } } });
  for (const f of fulfillments) await forwardFulfillment(f.id, null).catch((e) => logError("fulfillment.autoforward", e));
}

/** Envia o pedido ao fornecedor pelo adaptador da integração. */
export async function forwardFulfillment(fulfillmentId: string, actorId: string | null) {
  const f = await db.fulfillment.findUnique({ where: { id: fulfillmentId }, include: { supplier: true, items: true, order: true } });
  if (!f) throw new Error("Fulfillment não encontrado.");
  if (!f.supplier) return { ok: false as const, message: "Itens sem fornecedor associado. Associe o produto a um fornecedor." };
  const adapter = getSupplierAdapter(f.supplier.integration);
  const o = f.order;
  const res = await adapter.forwardOrder({
    supplier: f.supplier, fulfillmentId: f.id, orderNumber: o.number,
    shipTo: { name: o.customerName, phone: o.customerPhone, cpf: o.customerCpf, cep: o.shipCep, street: o.shipStreet, number: o.shipNumber, complement: o.shipComplement, district: o.shipDistrict, city: o.shipCity, state: o.shipState },
    items: f.items.map((i) => ({ sku: i.sku, supplierSku: i.supplierSku, name: i.productName, variantName: i.variantName, quantity: i.quantity, costCents: i.costCents })),
  });
  await db.supplierSyncLog.create({ data: { supplierId: f.supplier.id, kind: "order_forward", success: res.ok, summary: `${o.number}: ${res.message}` } });
  if (res.ok) await markFulfillmentForwarded(f.id, res.supplierOrderId, actorId, res.message);
  return res;
}

export async function markFulfillmentForwarded(fulfillmentId: string, supplierOrderId: string | null, actorId: string | null, note?: string) {
  const f = await db.fulfillment.update({
    where: { id: fulfillmentId },
    data: { status: "FORWARDED", forwardedAt: new Date(), ...(supplierOrderId ? { supplierOrderId } : {}) },
  });
  await db.order.updateMany({ where: { id: f.orderId, status: "PAID" }, data: { status: "PROCESSING" } });
  await db.orderEvent.create({ data: { orderId: f.orderId, type: "fulfillment", message: "Pedido encaminhado para separação.", createdBy: actorId } });
  if (note) await db.orderEvent.create({ data: { orderId: f.orderId, type: "fulfillment", message: note, isPublic: false, createdBy: actorId } });
  await audit("fulfillment.forwarded", { userId: actorId, entity: "fulfillment", entityId: fulfillmentId });
}

export async function updateFulfillment(
  fulfillmentId: string,
  data: { status: Prisma.FulfillmentUpdateInput["status"]; supplierOrderId?: string | null; carrier?: string | null; trackingCode?: string | null; trackingUrl?: string | null; notes?: string | null; supplierCostCents?: number | null },
  actorId: string,
) {
  const before = await db.fulfillment.findUniqueOrThrow({ where: { id: fulfillmentId } });
  const now = new Date();
  const status = data.status as string;
  const f = await db.fulfillment.update({
    where: { id: fulfillmentId },
    data: {
      ...data,
      ...(status === "SHIPPED" && !before.shippedAt ? { shippedAt: now } : {}),
      ...(status === "DELIVERED" && !before.deliveredAt ? { deliveredAt: now } : {}),
      ...(status === "FORWARDED" && !before.forwardedAt ? { forwardedAt: now } : {}),
    },
  });
  if (data.trackingCode && data.trackingCode !== before.trackingCode) {
    await db.orderEvent.create({ data: { orderId: f.orderId, type: "tracking", message: `Código de rastreamento: ${data.trackingCode}${data.carrier ? ` (${data.carrier})` : ""}.`, createdBy: actorId } });
  }
  // sincroniza o status do pedido com o conjunto de fulfillments
  const all = await db.fulfillment.findMany({ where: { orderId: f.orderId, status: { not: "CANCELLED" } } });
  const order = await db.order.findUniqueOrThrow({ where: { id: f.orderId } });
  if (all.length && all.every((x) => x.status === "DELIVERED") && order.status !== "DELIVERED") await setOrderStatus(order.id, "DELIVERED", actorId, "Pedido entregue.", { force: true });
  else if (all.length && all.every((x) => x.status === "SHIPPED" || x.status === "DELIVERED") && ["PAID", "PROCESSING"].includes(order.status)) await setOrderStatus(order.id, "SHIPPED", actorId, "Pedido enviado.", { force: true });
  else if (["FORWARDED", "CONFIRMED"].includes(status) && order.status === "PAID") await setOrderStatus(order.id, "PROCESSING", actorId, "Pedido em preparação.", { force: true });
  await audit("fulfillment.updated", { userId: actorId, entity: "fulfillment", entityId: fulfillmentId, details: { status, trackingCode: data.trackingCode ?? null } });
}

export async function setOrderStatus(orderId: string, to: OrderStatus, actorId: string | null, message?: string, opts: { force?: boolean; fromWebhook?: boolean; notify?: boolean } = {}) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, fulfillments: true } });
  if (order.status === to) return order;
  if (!opts.force && !opts.fromWebhook && !ALLOWED_TRANSITIONS[order.status].includes(to)) {
    throw new Error(`Transição não permitida: ${ORDER_STATUS[order.status].label} → ${ORDER_STATUS[to].label}.`);
  }
  await db.$transaction(async (tx) => {
    const restock = (to === "CANCELLED" || to === "REFUNDED") && order.stockCommitted && order.status !== "SHIPPED" && order.status !== "DELIVERED";
    if (restock) {
      for (const i of order.items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.quantity } } });
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(restock ? { stockCommitted: false } : {}),
        ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        ...(to === "REFUNDED" ? { paymentStatus: "REFUNDED" } : {}),
      },
    });
    if (to === "CANCELLED") await tx.fulfillment.updateMany({ where: { orderId, status: { in: ["PENDING", "FORWARDED", "CONFIRMED"] } }, data: { status: "CANCELLED" } });
    await tx.orderEvent.create({ data: { orderId, type: "status_change", message: message || `Status atualizado: ${ORDER_STATUS[to].label}.`, createdBy: actorId } });
  });
  await audit("order.status", { userId: actorId, entity: "order", entityId: orderId, details: { from: order.status, to } });
  if (opts.notify !== false) {
    const base = { number: order.number, customerName: order.customerName, customerEmail: order.customerEmail, totalCents: order.totalCents, accessUrl: `${env.siteUrl}/rastreamento?pedido=${order.number}`, items: order.items };
    if (to === "SHIPPED") {
      const tracked = order.fulfillments.find((f) => f.trackingCode) ?? (await db.fulfillment.findFirst({ where: { orderId, trackingCode: { not: null } } }));
      if (tracked?.trackingCode) emails.orderShipped({ ...base, trackingCode: tracked.trackingCode, trackingUrl: trackingUrlFor(tracked.trackingCode, tracked.carrier, tracked.trackingUrl) }).catch(() => {});
      else emails.orderStatus({ ...base, statusLabel: ORDER_STATUS[to].label }).catch(() => {});
    } else if (to !== "PAID") {
      emails.orderStatus({ ...base, statusLabel: ORDER_STATUS[to].label, message }).catch(() => {});
    }
  }
  return order;
}

/** Busca pedido validando o token de acesso (cliente sem login) ou o dono logado. */
export async function getOrderForCustomer(number: string, opts: { token?: string | null; userId?: string | null; email?: string | null }) {
  const order = await db.order.findUnique({
    where: { number },
    include: {
      items: true,
      events: { where: { isPublic: true }, orderBy: { createdAt: "asc" } },
      fulfillments: { select: { id: true, status: true, carrier: true, trackingCode: true, trackingUrl: true, shippedAt: true, deliveredAt: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, method: true, checkoutUrl: true, sandbox: true } },
    },
  });
  if (!order) return null;
  const tokenOk = opts.token ? sha256(opts.token) === order.accessTokenHash : false;
  const ownerOk = opts.userId ? order.userId === opts.userId : false;
  const emailOk = opts.email ? order.customerEmail.toLowerCase() === opts.email.toLowerCase() : false;
  if (!tokenOk && !ownerOk && !emailOk) return null;
  return order;
}
