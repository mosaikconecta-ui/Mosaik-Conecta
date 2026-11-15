/**
 * Adaptadores para plataformas de dropshipping com API oficial.
 *
 * IMPORTANTE: estas integrações NÃO estão ativas. Elas definem o contrato e o
 * ponto de extensão, mas não fazem chamadas reais porque dependem de credenciais
 * aprovadas pelas plataformas. Veja docs/INTEGRACOES.md para o passo a passo.
 */
import { env } from "../env";
import type { SupplierAdapter } from "./types";

const notAvailable = (label: string, docs: string) => async () => ({
  ok: false as const,
  message: `Integração ${label} ainda não implementada/ativada. Encaminhe manualmente e registre no painel. Documentação: ${docs}`,
});

export const aliexpressAdapter: SupplierAdapter = {
  kind: "ALIEXPRESS",
  label: "AliExpress (Open Platform — Dropshipping)",
  capabilities: { forwardOrder: false, stockSync: false, priceSync: false, tracking: false },
  status: () => ({
    configured: false,
    missing: [
      ...(env.aliexpress.appKey ? [] : ["ALIEXPRESS_APP_KEY"]),
      ...(env.aliexpress.appSecret ? [] : ["ALIEXPRESS_APP_SECRET"]),
      ...(env.aliexpress.accessToken ? [] : ["ALIEXPRESS_ACCESS_TOKEN (OAuth do vendedor)"]),
      "Implementação das chamadas aliexpress.ds.* (pendente de app aprovado)",
    ],
    docsUrl: "https://openservice.aliexpress.com/doc/api.htm",
    notes: "Requer cadastro no AliExpress Open Platform como Dropshipper e aprovação do app.",
  }),
  forwardOrder: notAvailable("AliExpress", "https://openservice.aliexpress.com"),
};

export const cjAdapter: SupplierAdapter = {
  kind: "CJ",
  label: "CJdropshipping (API v2)",
  capabilities: { forwardOrder: false, stockSync: false, priceSync: false, tracking: false },
  status: () => ({
    configured: false,
    missing: [
      ...(env.cj.apiKey ? [] : ["CJ_API_KEY"]),
      "Implementação das chamadas /api2.0/v1 (shopping/order/createOrderV2, product/stock) — pendente de credenciais para validação",
    ],
    docsUrl: "https://developers.cjdropshipping.com/",
    notes: "Gere a API Key em CJ → Authorization → API. O token de acesso expira e precisa ser renovado.",
  }),
  forwardOrder: notAvailable("CJdropshipping", "https://developers.cjdropshipping.com/"),
};

export const customApiAdapter: SupplierAdapter = {
  kind: "CUSTOM_API",
  label: "API própria do fornecedor",
  capabilities: { forwardOrder: false, stockSync: false, priceSync: false, tracking: false },
  status: () => ({ configured: false, missing: ["Especificação da API do fornecedor", "Credenciais"], notes: "Implemente um SupplierAdapter em src/lib/suppliers/." }),
  forwardOrder: notAvailable("API própria", "docs/INTEGRACOES.md"),
};
