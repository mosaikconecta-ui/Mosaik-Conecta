import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";
import { getPaymentProvider } from "@/lib/payments";
import { applyPaymentUpdate } from "@/lib/orders";
import { logError, logInfo } from "@/lib/audit";

/**
 * Webhook do Mercado Pago.
 * 1. Valida a assinatura x-signature (HMAC-SHA256) — requisições inválidas são rejeitadas (401).
 * 2. Garante idempotência (WebhookEvent único por id + request-id).
 * 3. Consulta o pagamento na API oficial — o payload do webhook nunca é usado como verdade.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const raw = await req.text();
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try { body = JSON.parse(raw || "{}"); } catch { /* corpo inválido */ }

  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? null;

  const check = verifyMercadoPagoSignature({
    secret: env.mercadoPago.webhookSecret,
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId,
  });

  if (!check.valid) {
    logInfo("webhook.mercadopago", `rejeitado: ${check.reason}`);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Tipos que não são pagamento (merchant_order, etc.) são confirmados e ignorados.
  if (type !== "payment" || !dataId) return NextResponse.json({ ignored: true });

  try {
    await db.webhookEvent.create({ data: { provider: "mercadopago", eventKey: check.eventKey, valid: true, payload: body as Prisma.InputJsonValue } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NextResponse.json({ duplicate: true });
    throw err;
  }

  if (!integrations.mercadoPago()) return NextResponse.json({ error: "gateway não configurado" }, { status: 503 });

  try {
    const provider = getPaymentProvider("mercadopago");
    const payment = await provider.fetchPayment(dataId);
    await applyPaymentUpdate("mercadopago", payment);
    await db.webhookEvent.update({ where: { provider_eventKey: { provider: "mercadopago", eventKey: check.eventKey } }, data: { processed: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("webhook.mercadopago", err, { dataId });
    await db.webhookEvent.update({ where: { provider_eventKey: { provider: "mercadopago", eventKey: check.eventKey } }, data: { error: String(err).slice(0, 500) } });
    // 500 faz o Mercado Pago reenviar a notificação; remove o registro para permitir reprocessar
    await db.webhookEvent.delete({ where: { provider_eventKey: { provider: "mercadopago", eventKey: check.eventKey } } }).catch(() => {});
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
