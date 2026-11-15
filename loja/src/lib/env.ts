/**
 * Configuração centralizada. Integrações externas ficam desativadas (e o fluxo
 * informa isso claramente) enquanto as credenciais não forem definidas.
 */
export const env = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  isProd: process.env.NODE_ENV === "production",

  mercadoPago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
    maxInstallments: Number(process.env.MERCADOPAGO_MAX_INSTALLMENTS ?? 6),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "Mosaik <pedidos@mosaik.example>",
  },
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", // só dígitos, com DDI (ex.: 55119...)
  cronSecret: process.env.CRON_SECRET ?? "",
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  aliexpress: {
    appKey: process.env.ALIEXPRESS_APP_KEY ?? "",
    appSecret: process.env.ALIEXPRESS_APP_SECRET ?? "",
    accessToken: process.env.ALIEXPRESS_ACCESS_TOKEN ?? "",
  },
  cj: { apiKey: process.env.CJ_API_KEY ?? "" },
};

export const integrations = {
  mercadoPago: () => env.mercadoPago.accessToken.length > 0,
  mercadoPagoSandbox: () => env.mercadoPago.accessToken.startsWith("TEST-"),
  mercadoPagoWebhook: () => env.mercadoPago.webhookSecret.length > 0,
  email: () => env.resend.apiKey.length > 0,
  ga4: () => env.ga4Id.length > 0,
  metaPixel: () => env.metaPixelId.length > 0,
  whatsapp: () => /^\d{12,13}$/.test(env.whatsappNumber),
};

/** Regras comerciais da loja. */
export const store = {
  name: "Mosaik",
  tagline: "Objetos de casa",
  email: "atendimento@mosaik.example",
  freeShippingOverCents: 29900,
  installments: { max: 6, minInstallmentCents: 3000 }, // parcelamento sem juros exibido na vitrine
  returnDays: 7,
  abandonedCartAfterMinutes: 60,
  lowStockThreshold: 5,
};
