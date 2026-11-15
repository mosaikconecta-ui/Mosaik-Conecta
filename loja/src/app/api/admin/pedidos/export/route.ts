import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { getCurrentUser, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";
import { audit } from "@/lib/audit";

const csvCell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // evita injeção de fórmulas em planilhas
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "orders")) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  const orders = await db.order.findMany({
    where: status && status in ORDER_STATUS ? { status: status as OrderStatus } : {},
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { items: true, fulfillments: { include: { supplier: { select: { name: true } } } } },
  });
  const header = ["numero", "data", "status", "pagamento", "cliente", "email", "telefone", "cep", "endereco", "cidade", "uf", "itens", "subtotal", "descontos", "frete", "total", "custo_produtos", "margem_bruta", "cupom", "entrega", "fornecedores", "rastreios"];
  const rows = orders.map((o) => [
    o.number, o.createdAt.toISOString(), ORDER_STATUS[o.status].label, PAYMENT_STATUS[o.paymentStatus], o.customerName, o.customerEmail, o.customerPhone,
    o.shipCep, `${o.shipStreet}, ${o.shipNumber}${o.shipComplement ? ` ${o.shipComplement}` : ""} - ${o.shipDistrict}`, o.shipCity, o.shipState,
    o.items.map((i) => `${i.quantity}x ${i.sku}`).join(" | "), money(o.subtotalCents), money(o.discountCents), money(o.shippingCents), money(o.totalCents),
    money(o.costCents), money(o.totalCents - o.shippingCents - o.costCents), o.couponCode ?? "", o.shippingName,
    [...new Set(o.fulfillments.map((f) => f.supplier?.name ?? "—"))].join(" | "), o.fulfillments.map((f) => f.trackingCode).filter(Boolean).join(" | "),
  ]);
  await audit("orders.export", { userId: user.id, details: { count: orders.length, status } });
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
