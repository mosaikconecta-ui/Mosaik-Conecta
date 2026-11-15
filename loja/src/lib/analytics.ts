"use client";

/**
 * Camada única de eventos de conversão. Encaminha para GA4 (gtag), Meta Pixel (fbq)
 * e para o funil interno (/api/events) — somente com consentimento de cookies de análise.
 * Nomes seguem o padrão de e-commerce do GA4.
 */
type Item = { item_id: string; item_name: string; price: number; quantity?: number; item_variant?: string | null };
type EventName = "view_item" | "add_to_cart" | "begin_checkout" | "add_shipping_info" | "purchase" | "search" | "page_view";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const CONSENT_COOKIE = "mk_consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${CONSENT_COOKIE}=all`);
}

function sessionId(): string {
  const key = "mk_sid";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

const META_MAP: Partial<Record<EventName, string>> = {
  view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", search: "Search",
};

export function track(name: EventName, data: { value?: number; items?: Item[]; transaction_id?: string; search_term?: string; productId?: string } = {}) {
  if (!hasAnalyticsConsent()) return;
  const { productId, ...params } = data;
  const payload = { currency: "BRL", ...params };
  try {
    window.gtag?.("event", name, payload);
    const meta = META_MAP[name];
    if (meta && window.fbq) {
      window.fbq("track", meta, {
        currency: "BRL",
        value: data.value,
        content_ids: data.items?.map((i) => i.item_id),
        content_type: "product",
        ...(data.search_term ? { search_string: data.search_term } : {}),
      }, data.transaction_id ? { eventID: data.transaction_id } : undefined);
    }
    if (name !== "search") {
      const body = JSON.stringify({ name, sessionId: sessionId(), productId: productId ?? null, valueCents: data.value != null ? Math.round(data.value * 100) : null });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      else fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* analytics nunca deve quebrar a compra */
  }
}
