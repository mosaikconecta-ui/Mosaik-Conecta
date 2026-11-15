import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@prisma/client";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "warn" | "ok" | "bad" | "info" }> = {
  PENDING_PAYMENT: { label: "Aguardando pagamento", tone: "warn" },
  PAID: { label: "Pagamento aprovado", tone: "info" },
  PROCESSING: { label: "Em preparação", tone: "info" },
  SHIPPED: { label: "Enviado", tone: "info" },
  DELIVERED: { label: "Entregue", tone: "ok" },
  CANCELLED: { label: "Cancelado", tone: "bad" },
  REFUNDED: { label: "Reembolsado", tone: "bad" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
  CHARGED_BACK: "Contestado (chargeback)",
};

export const FULFILLMENT_STATUS: Record<FulfillmentStatus, string> = {
  PENDING: "Aguardando encaminhamento",
  FORWARDED: "Encaminhado ao fornecedor",
  CONFIRMED: "Confirmado pelo fornecedor",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

/** Transições permitidas manualmente no painel. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const TIMELINE: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

/** Link público de rastreamento. 17TRACK reconhece códigos nacionais e internacionais (Correios, Cainiao, etc.). */
export function trackingUrlFor(code: string, carrier?: string | null, explicit?: string | null): string {
  if (explicit) return explicit;
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("jadlog")) return `https://www.jadlog.com.br/jadlog/tracking?cte=${encodeURIComponent(code)}`;
  return `https://t.17track.net/pt#nums=${encodeURIComponent(code)}`;
}
