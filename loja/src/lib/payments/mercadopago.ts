/**
 * Mercado Pago — Checkout Pro (redirecionamento).
 * O cliente paga no ambiente do Mercado Pago (Pix, cartão, boleto). Nenhum dado de cartão
 * passa pelo nosso servidor. O status do pedido só muda após consultar a API oficial
 * a partir de um webhook com assinatura válida.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 *       https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
import type { PaymentStatus } from "@prisma/client";
import { env, integrations } from "../env";
import { hmacSha256Hex, safeEqual } from "../crypto";
import { PaymentNotConfiguredError, type CheckoutOrder, type CheckoutSession, type PaymentProvider, type RemotePayment, type WebhookCheck } from "./types";

const API = "https://api.mercadopago.com";

export function mapMercadoPagoStatus(raw: string): PaymentStatus {
  switch (raw) {
    case "approved": return "APPROVED";
    case "authorized": return "AUTHORIZED";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    case "refunded": return "REFUNDED";
    case "charged_back": return "CHARGED_BACK";
    default: return "PENDING"; // pending, in_process, in_mediation
  }
}

/**
 * Valida a assinatura x-signature do webhook.
 * Template oficial: `id:{data.id};request-id:{x-request-id};ts:{ts};` assinado com HMAC-SHA256 (chave secreta do painel).
 */
export function verifyMercadoPagoSignature(params: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  toleranceSec?: number;
  now?: number;
}): WebhookCheck {
  const { secret, xSignature, xRequestId } = params;
  if (!secret) return { valid: false, reason: "MERCADOPAGO_WEBHOOK_SECRET não configurado" };
  if (!xSignature) return { valid: false, reason: "cabeçalho x-signature ausente" };
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return { valid: false, reason: "assinatura malformada" };
  const dataId = params.dataId && /^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId;
  let manifest = "";
  if (dataId) manifest += `id:${dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;
  const expected = hmacSha256Hex(secret, manifest);
  if (!safeEqual(expected, v1)) return { valid: false, reason: "assinatura inválida" };
  const tolerance = params.toleranceSec ?? 600;
  const tsNum = Number(ts);
  const tsSec = tsNum > 1e12 ? Math.floor(tsNum / 1000) : tsNum; // MP envia em ms ou s conforme a versão
  const nowSec = Math.floor((params.now ?? Date.now()) / 1000);
  if (Number.isFinite(tsSec) && Math.abs(nowSec - tsSec) > tolerance) return { valid: false, reason: "assinatura expirada" };
  return { valid: true, paymentId: params.dataId, eventKey: `${dataId}:${xRequestId ?? ts}` };
}

async function mpFetch<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.mercadoPago.accessToken}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}

export const mercadoPago: PaymentProvider = {
  id: "mercadopago",
  label: "Mercado Pago",
  isConfigured: () => integrations.mercadoPago(),

  async createCheckout(order: CheckoutOrder): Promise<CheckoutSession> {
    if (!integrations.mercadoPago()) throw new PaymentNotConfiguredError("Mercado Pago");
    const back = `${env.siteUrl}/pedido/${order.number}?t=${order.accessToken}`;
    const detailed = order.discountCents === 0;
    // Com descontos, enviamos um item consolidado (a API não aceita itens negativos) para que o total confira exatamente.
    const items = detailed
      ? order.items.map((i) => ({
          id: i.sku, title: i.name.slice(0, 250), quantity: i.quantity, unit_price: i.unitCents / 100, currency_id: "BRL",
          ...(i.image ? { picture_url: i.image.startsWith("http") ? i.image : `${env.siteUrl}${i.image}` } : {}),
        }))
      : [{
          id: order.number, title: `Pedido ${order.number} — Mosaik`, quantity: 1, currency_id: "BRL",
          unit_price: (order.totalCents - order.shippingCents) / 100,
          description: order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ").slice(0, 250),
        }];
    const [first, ...rest] = order.customerName.trim().split(/\s+/);
    const body = {
      items,
      payer: {
        name: first, surname: rest.join(" "), email: order.customerEmail,
        ...(order.customerCpf ? { identification: { type: "CPF", number: order.customerCpf } } : {}),
      },
      shipments: { cost: order.shippingCents / 100, mode: "not_specified" },
      external_reference: order.id,
      notification_url: `${env.siteUrl}/api/webhooks/mercadopago?source_news=webhooks`,
      back_urls: { success: back, pending: back, failure: back },
      ...(env.siteUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
      payment_methods: { installments: env.mercadoPago.maxInstallments },
      statement_descriptor: "MOSAIK",
      expires: true,
      expiration_date_to: new Date(Date.now() + 3 * 86400_000).toISOString(),
    };
    const pref = await mpFetch<{ id: string; init_point: string; sandbox_init_point: string }>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(body),
      idempotencyKey: `pref-${order.id}-${order.totalCents}`,
    });
    const sandbox = integrations.mercadoPagoSandbox() || process.env.MERCADOPAGO_USE_SANDBOX_URL === "true";
    return { preferenceId: pref.id, checkoutUrl: sandbox ? pref.sandbox_init_point : pref.init_point, sandbox };
  },

  async fetchPayment(paymentId: string): Promise<RemotePayment> {
    if (!integrations.mercadoPago()) throw new PaymentNotConfiguredError("Mercado Pago");
    const p = await mpFetch<{
      id: number; status: string; payment_type_id?: string; payment_method_id?: string; installments?: number;
      transaction_amount: number; external_reference?: string; live_mode?: boolean;
    }>(`/v1/payments/${encodeURIComponent(paymentId)}`);
    return {
      id: String(p.id),
      status: mapMercadoPagoStatus(p.status),
      rawStatus: p.status,
      method: p.payment_method_id === "pix" ? "pix" : p.payment_type_id ?? null,
      installments: p.installments ?? null,
      amountCents: Math.round(p.transaction_amount * 100),
      externalReference: p.external_reference ?? null,
      sandbox: p.live_mode === false,
    };
  },
};
