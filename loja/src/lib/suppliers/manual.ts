import { emails } from "../email";
import { integrations } from "../env";
import type { ForwardContext, ForwardResult, SupplierAdapter } from "./types";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function supplierOrderHtml(ctx: ForwardContext) {
  const a = ctx.shipTo;
  return `<p>Novo pedido para envio direto ao cliente (dropshipping). Referência: <strong>${ctx.orderNumber}</strong>.</p>
  <table width="100%" style="border-collapse:collapse;font-size:14px"><tr><th align="left">SKU fornecedor</th><th align="left">Item</th><th align="right">Qtd</th></tr>
  ${ctx.items.map((i) => `<tr><td style="padding:6px 0">${esc(i.supplierSku ?? i.sku)}</td><td>${esc(i.name)}${i.variantName ? ` (${esc(i.variantName)})` : ""}</td><td align="right">${i.quantity}</td></tr>`).join("")}
  </table>
  <h3 style="margin-top:20px">Entregar para</h3>
  <p>${esc(a.name)}<br>${esc(a.street)}, ${esc(a.number)}${a.complement ? ` — ${esc(a.complement)}` : ""}<br>${esc(a.district)} — ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.cep)}<br>Tel.: ${esc(a.phone)}${a.cpf ? `<br>CPF: ${esc(a.cpf)}` : ""}</p>
  <p>Por favor, responda com o número do pedido no seu sistema e o código de rastreamento assim que houver postagem.</p>`;
}

/** Fornecedor sem API: o pedido é enviado por e-mail (se configurado) ou encaminhado manualmente pelo painel. */
export const manualAdapter: SupplierAdapter = {
  kind: "MANUAL",
  label: "Manual (e-mail / painel)",
  capabilities: { forwardOrder: true, stockSync: false, priceSync: false, tracking: false },
  status: () => ({ configured: true, missing: [], notes: "Encaminhamento por e-mail exige RESEND_API_KEY; sem ele, use 'Marcar como encaminhado' após enviar manualmente." }),
  async forwardOrder(ctx: ForwardContext): Promise<ForwardResult> {
    if (!ctx.supplier.email) return { ok: false, message: "Fornecedor sem e-mail cadastrado. Encaminhe manualmente e registre no painel." };
    if (!integrations.email()) return { ok: false, message: "Envio de e-mail não configurado (RESEND_API_KEY). Encaminhe manualmente e registre no painel." };
    const r = await emails.supplierOrder(ctx.supplier.email, `Pedido ${ctx.orderNumber} — Mosaik`, supplierOrderHtml(ctx));
    return r.sent ? { ok: true, supplierOrderId: null, message: `Pedido enviado por e-mail para ${ctx.supplier.email}.` } : { ok: false, message: "Falha ao enviar o e-mail ao fornecedor." };
  },
};

export const csvAdapter: SupplierAdapter = {
  ...manualAdapter,
  kind: "CSV",
  label: "Planilha CSV (estoque e custo) + pedidos por e-mail",
  capabilities: { forwardOrder: true, stockSync: true, priceSync: true, tracking: false },
  status: () => ({ configured: true, missing: [], notes: "Importe a planilha do fornecedor em Fornecedores → Sincronizar." }),
};
