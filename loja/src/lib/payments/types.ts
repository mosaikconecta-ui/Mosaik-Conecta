import type { PaymentStatus } from "@prisma/client";

export type CheckoutOrder = {
  id: string;
  number: string;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string | null;
  customerPhone: string;
  totalCents: number;
  shippingCents: number;
  discountCents: number;
  items: { sku: string; name: string; quantity: number; unitCents: number; image: string | null }[];
};

export type CheckoutSession = { preferenceId: string; checkoutUrl: string; sandbox: boolean };

export type RemotePayment = {
  id: string;
  status: PaymentStatus;
  rawStatus: string;
  method: string | null;
  installments: number | null;
  amountCents: number;
  externalReference: string | null;
  sandbox: boolean;
};

export type WebhookCheck = { valid: true; paymentId: string | null; eventKey: string } | { valid: false; reason: string };

export interface PaymentProvider {
  id: string;
  label: string;
  isConfigured(): boolean;
  createCheckout(order: CheckoutOrder): Promise<CheckoutSession>;
  fetchPayment(paymentId: string): Promise<RemotePayment>;
}

export class PaymentNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Gateway ${provider} não configurado. Defina as credenciais no arquivo .env (veja docs/INTEGRACOES.md).`);
  }
}
