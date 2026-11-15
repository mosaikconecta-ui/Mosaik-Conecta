import type { SupplierIntegration } from "@prisma/client";
import { csvAdapter, manualAdapter } from "./manual";
import { aliexpressAdapter, cjAdapter, customApiAdapter } from "./platforms";
import type { SupplierAdapter } from "./types";

const registry: Record<SupplierIntegration, SupplierAdapter> = {
  MANUAL: manualAdapter,
  CSV: csvAdapter,
  ALIEXPRESS: aliexpressAdapter,
  CJ: cjAdapter,
  CUSTOM_API: customApiAdapter,
};

export const getSupplierAdapter = (kind: SupplierIntegration) => registry[kind];
export const SUPPLIER_KINDS = Object.values(registry).map((a) => ({ kind: a.kind, label: a.label }));

export type InventoryRow = { supplierSku: string; stock: number | null; costCents: number | null };

/**
 * Lê planilha CSV de estoque/custo do fornecedor.
 * Cabeçalho aceito (separador , ou ;): supplier_sku, stock, cost  (custo em reais: 12,90 ou 12.90)
 */
export function parseInventoryCsv(text: string): { rows: InventoryRow[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  if (!lines.length) return { rows: [], errors: ["Arquivo vazio."] };
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].toLowerCase().split(sep).map((h) => h.trim().replace(/"/g, ""));
  const iSku = header.findIndex((h) => ["supplier_sku", "sku", "sku_fornecedor", "codigo"].includes(h));
  const iStock = header.findIndex((h) => ["stock", "estoque", "qty", "quantidade"].includes(h));
  const iCost = header.findIndex((h) => ["cost", "custo", "price", "preco", "preço"].includes(h));
  if (iSku < 0) return { rows: [], errors: ["Coluna 'supplier_sku' não encontrada no cabeçalho."] };
  if (iStock < 0 && iCost < 0) return { rows: [], errors: ["Informe ao menos uma coluna: 'stock' ou 'cost'."] };
  const rows: InventoryRow[] = [];
  lines.slice(1).forEach((line, idx) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const sku = cols[iSku];
    if (!sku) return errors.push(`Linha ${idx + 2}: SKU vazio.`);
    let stock: number | null = null;
    let cost: number | null = null;
    if (iStock >= 0 && cols[iStock] !== "") {
      stock = Number(cols[iStock]);
      if (!Number.isInteger(stock) || stock < 0) { errors.push(`Linha ${idx + 2}: estoque inválido.`); return; }
    }
    if (iCost >= 0 && cols[iCost] !== "") {
      const raw = cols[iCost].replace(/[^\d,.]/g, "");
      const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
      if (!Number.isFinite(n) || n < 0) { errors.push(`Linha ${idx + 2}: custo inválido.`); return; }
      cost = Math.round(n * 100);
    }
    rows.push({ supplierSku: sku, stock, costCents: cost });
  });
  return { rows, errors };
}

export * from "./types";
