import "server-only";
import { db } from "./db";
import { PAID_STATUSES } from "./catalog";
import { store } from "./env";

const MIN_SESSIONS_FOR_CONVERSION = 200;

export async function getDashboardMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const paidWhere = { status: { in: [...PAID_STATUSES] } };

  const [allTime, period, byStatus, topItems, sessions, purchases, abandoned, lowStock, revenueRows] = await Promise.all([
    db.order.aggregate({ where: paidWhere, _sum: { totalCents: true, costCents: true, shippingCents: true }, _count: true }),
    db.order.aggregate({ where: { ...paidWhere, paidAt: { gte: since } }, _sum: { totalCents: true, costCents: true }, _count: true }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: paidWhere },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.analyticsEvent.findMany({ where: { name: "page_view", createdAt: { gte: since } }, distinct: ["sessionId"], select: { sessionId: true } }),
    db.order.count({ where: { ...paidWhere, paidAt: { gte: since } } }),
    db.cart.count({ where: { convertedAt: null, email: { not: null }, items: { some: {} }, updatedAt: { lt: new Date(Date.now() - store.abandonedCartAfterMinutes * 60_000), gte: since } } }),
    db.productVariant.findMany({ where: { active: true, stock: { lte: store.lowStockThreshold }, product: { status: "ACTIVE" } }, include: { product: { select: { name: true, id: true } } }, orderBy: { stock: "asc" }, take: 8 }),
    db.$queryRaw<{ day: Date; total: bigint; n: bigint }[]>`
      SELECT date_trunc('day', "paidAt" AT TIME ZONE 'America/Sao_Paulo') AS day, SUM("totalCents") AS total, COUNT(*) AS n
      FROM "Order" WHERE "paidAt" >= ${since} AND status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
      GROUP BY 1 ORDER BY 1`,
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count ?? 0;
  const revenue = allTime._sum.totalCents ?? 0;
  const orders = allTime._count;
  const goodsRevenue = revenue - (allTime._sum.shippingCents ?? 0);
  const conversion = sessions.length >= MIN_SESSIONS_FOR_CONVERSION ? purchases / sessions.length : null;

  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    const row = revenueRows.find((r) => new Date(r.day).toISOString().slice(0, 10) === key);
    return { day: key, totalCents: Number(row?.total ?? 0), orders: Number(row?.n ?? 0) };
  });

  return {
    revenueCents: revenue,
    orders,
    avgTicketCents: orders ? Math.round(revenue / orders) : 0,
    grossMarginPct: goodsRevenue > 0 ? ((goodsRevenue - (allTime._sum.costCents ?? 0)) / goodsRevenue) * 100 : null,
    period: { revenueCents: period._sum.totalCents ?? 0, orders: period._count },
    status: {
      pendingPayment: count("PENDING_PAYMENT"),
      toFulfill: count("PAID") + count("PROCESSING"),
      shipped: count("SHIPPED"),
      delivered: count("DELIVERED"),
      cancelled: count("CANCELLED") + count("REFUNDED"),
    },
    topProducts: topItems.map((t) => ({ productId: t.productId, name: t.productName, quantity: t._sum.quantity ?? 0, revenueCents: t._sum.totalCents ?? 0 })),
    conversion: { rate: conversion, sessions: sessions.length, purchases, minSessions: MIN_SESSIONS_FOR_CONVERSION },
    abandonedCarts: abandoned,
    lowStock: lowStock.map((v) => ({ id: v.id, productId: v.product.id, name: v.product.name, variant: [v.color, v.size].filter(Boolean).join(" · "), sku: v.sku, stock: v.stock })),
    daily,
  };
}
