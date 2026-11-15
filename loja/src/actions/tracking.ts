"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth";
import type { PublicTracking } from "@/components/store/order-timeline";

const attempts = new Map<string, { n: number; at: number }>();

function limited(ip: string) {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || now - cur.at > 10 * 60_000) { attempts.set(ip, { n: 1, at: now }); return false; }
  cur.n++;
  return cur.n > 30;
}

/**
 * Consulta pública de rastreamento.
 * - Número do pedido + e-mail: status completo.
 * - Código de rastreamento: status sem dados pessoais.
 */
export async function lookupOrderAction(_: unknown, formData: FormData): Promise<{ ok: true; data: PublicTracking } | { ok: false; error: string } | null> {
  const ip = await getClientIp();
  if (limited(ip)) return { ok: false, error: "Muitas consultas. Aguarde alguns minutos." };
  const mode = formData.get("mode");
  let orderId: string | null = null;
  if (mode === "code") {
    const code = z.string().trim().toUpperCase().min(5).max(40).safeParse(formData.get("code"));
    if (!code.success) return { ok: false, error: "Informe um código de rastreamento válido." };
    const f = await db.fulfillment.findFirst({ where: { trackingCode: code.data }, select: { orderId: true } });
    orderId = f?.orderId ?? null;
  } else {
    const p = z.object({ number: z.string().trim().toUpperCase().min(4).max(20), email: z.string().trim().toLowerCase().max(160) }).safeParse({ number: formData.get("number"), email: formData.get("email") });
    if (!p.success) return { ok: false, error: "Informe o número do pedido e o e-mail." };
    const num = p.data.number.startsWith("MK-") ? p.data.number : `MK-${p.data.number.replace(/\D/g, "")}`;
    const o = await db.order.findUnique({ where: { number: num }, select: { id: true, customerEmail: true } });
    orderId = o && o.customerEmail.toLowerCase() === p.data.email ? o.id : null;
  }
  if (!orderId) return { ok: false, error: "Não encontramos um pedido com esses dados. Confira e tente novamente." };
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { events: { where: { isPublic: true }, orderBy: { createdAt: "asc" } }, fulfillments: true },
  });
  return {
    ok: true,
    data: {
      number: order.number, status: order.status, createdAt: order.createdAt.toISOString(), deliveryDaysMin: order.deliveryDaysMin,
      deliveryDaysMax: order.deliveryDaysMax, shippingName: order.shippingName,
      events: order.events.map((e) => ({ message: e.message, createdAt: e.createdAt.toISOString() })),
      shipments: order.fulfillments.map((f) => ({ status: f.status, carrier: f.carrier, trackingCode: f.trackingCode, trackingUrl: f.trackingUrl })),
    },
  };
}
