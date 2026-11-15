import { mercadoPago } from "./mercadopago";
import type { PaymentProvider } from "./types";

/**
 * Registro de gateways. Para adicionar Stripe (ou outro), implemente PaymentProvider
 * em ./stripe.ts e registre aqui; o restante do fluxo (pedido, webhook, status) é reaproveitado.
 */
const providers: Record<string, PaymentProvider> = { mercadopago: mercadoPago };

export const DEFAULT_PROVIDER = "mercadopago";

export function getPaymentProvider(id: string = DEFAULT_PROVIDER): PaymentProvider {
  const p = providers[id];
  if (!p) throw new Error(`Gateway desconhecido: ${id}`);
  return p;
}

export * from "./types";
