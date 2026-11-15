export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "VagaBrasil";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("SEU-PROJETO"),
);

/**
 * Modo de pagamentos.
 * - "production": usa o Mercado Pago de verdade (exige MERCADOPAGO_ACCESS_TOKEN).
 * - "development": nenhuma cobrança é feita; assinaturas de teste ficam marcadas como provider "dev".
 */
export function paymentsMode(): "production" | "development" {
  return process.env.PAYMENTS_MODE === "production" && process.env.MERCADOPAGO_ACCESS_TOKEN
    ? "production"
    : "development";
}

/** Simulação de pagamento só é permitida fora de produção (ou se explicitamente liberada). */
export function devPaymentsAllowed() {
  return paymentsMode() === "development" &&
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_PAYMENTS === "true");
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
