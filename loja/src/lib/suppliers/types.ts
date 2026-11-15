import type { Supplier, SupplierIntegration } from "@prisma/client";

export type ForwardItem = { sku: string; supplierSku: string | null; name: string; variantName: string | null; quantity: number; costCents: number };

export type ForwardContext = {
  supplier: Supplier;
  fulfillmentId: string;
  orderNumber: string;
  shipTo: {
    name: string; phone: string; cpf: string | null; cep: string; street: string; number: string;
    complement: string | null; district: string; city: string; state: string;
  };
  items: ForwardItem[];
};

export type ForwardResult = { ok: true; supplierOrderId: string | null; message: string } | { ok: false; message: string };

export type IntegrationStatus = { configured: boolean; missing: string[]; docsUrl?: string; notes?: string };

/**
 * Contrato comum para fornecedores. Cada plataforma (AliExpress, CJ, API própria)
 * implementa este adaptador; o restante do sistema (pedidos, fulfillment, painel) não muda.
 */
export interface SupplierAdapter {
  kind: SupplierIntegration;
  label: string;
  capabilities: { forwardOrder: boolean; stockSync: boolean; priceSync: boolean; tracking: boolean };
  status(): IntegrationStatus;
  forwardOrder(ctx: ForwardContext): Promise<ForwardResult>;
  /** Consulta rastreamento no fornecedor. */
  fetchTracking?(supplierOrderId: string): Promise<{ trackingCode: string | null; carrier: string | null; status: string }>;
  /** Busca estoque/custo atualizados por SKU do fornecedor. */
  fetchInventory?(supplierSkus: string[]): Promise<{ supplierSku: string; stock: number; costCents: number | null }[]>;
}

export class IntegrationNotAvailableError extends Error {}
