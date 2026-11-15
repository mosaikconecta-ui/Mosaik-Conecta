import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALLOWED_TRANSITIONS, FULFILLMENT_STATUS, ORDER_STATUS, PAYMENT_STATUS, trackingUrlFor } from "@/lib/order-status";
import { centsToInput, formatBRL, formatDateTime, marginPct } from "@/lib/format";
import { formatCEP, formatCPF, formatPhone } from "@/lib/br";
import { env, integrations } from "@/lib/env";
import { getSupplierAdapter } from "@/lib/suppliers";
import { audit } from "@/lib/audit";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { addOrderNoteAction, changeOrderStatusAction, forwardFulfillmentAction, markForwardedAction, updateFulfillmentAction } from "@/actions/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } },
      fulfillments: { include: { supplier: true, items: true }, orderBy: { createdAt: "asc" } }, coupon: true, user: { select: { id: true } },
    },
  });
  if (!order) notFound();
  await audit("order.viewed", { userId: user.id, entity: "order", entityId: order.id }); // acesso a dados pessoais (LGPD)

  const goods = order.totalCents - order.shippingCents;
  const transitions = ALLOWED_TRANSITIONS[order.status];
  const waText = encodeURIComponent(`Olá, ${order.customerName.split(" ")[0]}! Aqui é da Mosaik, sobre o seu pedido ${order.number}.`);

  return (
    <div>
      <PageHeader back={{ href: "/admin/pedidos", label: "Pedidos" }} title={`Pedido ${order.number}`}
        description={<>Criado em {formatDateTime(order.createdAt)} · <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge> · Pagamento: {PAYMENT_STATUS[order.paymentStatus]}</>} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Itens e margem">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4 py-3 text-sm">
                  <div className="relative aspect-[4/5] w-12 shrink-0 bg-paper-2">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{i.productName}{i.variantName ? ` · ${i.variantName}` : ""}</p>
                    <p className="text-muted">SKU {i.sku} · Fornecedor: {i.supplierSku ?? "—"}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p>{i.quantity} × {formatBRL(i.unitCents)}</p>
                    <p className="text-[12px] text-muted">custo {formatBRL(i.costCents)} · margem {marginPct(i.unitCents, i.costCents)}%</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line pt-3 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Subtotal</dt><dd>{formatBRL(order.subtotalCents)}</dd></div>
              <div><dt className="text-muted">Descontos</dt><dd>−{formatBRL(order.discountCents)}{order.couponCode ? ` (${order.couponCode})` : ""}</dd></div>
              <div><dt className="text-muted">Frete</dt><dd>{formatBRL(order.shippingCents)}</dd></div>
              <div><dt className="text-muted">Total</dt><dd className="font-semibold">{formatBRL(order.totalCents)}</dd></div>
              <div><dt className="text-muted">Custo produtos</dt><dd>{formatBRL(order.costCents)}</dd></div>
              <div><dt className="text-muted">Margem bruta</dt><dd className="font-semibold">{formatBRL(goods - order.costCents)} ({marginPct(goods, order.costCents)}%)</dd></div>
            </dl>
          </Card>

          <Card title="Fulfillment por fornecedor">
            {order.fulfillments.length === 0 ? (
              <p className="text-sm text-muted">Os envios por fornecedor são criados automaticamente quando o pagamento é aprovado.</p>
            ) : (
              <div className="space-y-6">
                {order.fulfillments.map((f) => {
                  const adapter = f.supplier ? getSupplierAdapter(f.supplier.integration) : null;
                  return (
                    <div key={f.id} className="border border-line p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{f.supplier ? <Link href={`/admin/fornecedores/${f.supplier.id}`} className="hover:underline">{f.supplier.name}</Link> : "Sem fornecedor"}</p>
                        <Badge tone={f.status === "DELIVERED" ? "ok" : f.status === "FAILED" || f.status === "CANCELLED" ? "bad" : "info"}>{FULFILLMENT_STATUS[f.status]}</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-muted">{f.items.map((i) => `${i.quantity}× ${i.supplierSku ?? i.sku}`).join(", ")} · custo estimado {formatBRL(f.supplierCostCents ?? 0)} · integração: {adapter?.label ?? "—"}</p>
                      {f.trackingCode && <p className="mt-1 text-sm">Rastreio: <a href={trackingUrlFor(f.trackingCode, f.carrier, f.trackingUrl)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{f.trackingCode}</a> {f.carrier && `(${f.carrier})`}</p>}

                      {f.status === "PENDING" && (
                        <div className="mt-4 flex flex-wrap gap-6 border-t border-line pt-4">
                          {f.supplier && adapter?.capabilities.forwardOrder && (
                            <ActionForm action={forwardFulfillmentAction} submitLabel={`Encaminhar via ${f.supplier.integration === "MANUAL" || f.supplier.integration === "CSV" ? "e-mail" : "API"}`} size="sm">
                              <input type="hidden" name="fulfillmentId" value={f.id} /><input type="hidden" name="orderId" value={order.id} />
                            </ActionForm>
                          )}
                          <ActionForm action={markForwardedAction} submitLabel="Marcar como encaminhado" variant="outline" size="sm" className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="fulfillmentId" value={f.id} /><input type="hidden" name="orderId" value={order.id} />
                            <label className="text-sm"><span className="label">Nº do pedido no fornecedor (opcional)</span><input name="supplierOrderId" className="field h-9 min-h-0" /></label>
                          </ActionForm>
                        </div>
                      )}

                      <details className="mt-4 border-t border-line pt-3">
                        <summary className="cursor-pointer text-sm font-semibold">Atualizar envio / rastreamento</summary>
                        <ActionForm action={updateFulfillmentAction} submitLabel="Salvar envio" className="mt-3 grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="fulfillmentId" value={f.id} /><input type="hidden" name="orderId" value={order.id} />
                          <label className="text-sm"><span className="label">Status</span>
                            <select name="status" defaultValue={f.status} className="field h-10 min-h-0">{Object.entries(FULFILLMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                          <label className="text-sm"><span className="label">Nº pedido no fornecedor</span><input name="supplierOrderId" defaultValue={f.supplierOrderId ?? ""} className="field h-10 min-h-0" /></label>
                          <label className="text-sm"><span className="label">Transportadora</span><input name="carrier" defaultValue={f.carrier ?? ""} placeholder="Correios, Jadlog, Cainiao…" className="field h-10 min-h-0" /></label>
                          <label className="text-sm"><span className="label">Código de rastreamento</span><input name="trackingCode" defaultValue={f.trackingCode ?? ""} className="field h-10 min-h-0 uppercase" /></label>
                          <label className="text-sm"><span className="label">URL de rastreamento (opcional)</span><input name="trackingUrl" defaultValue={f.trackingUrl ?? ""} placeholder="https://" className="field h-10 min-h-0" /></label>
                          <label className="text-sm"><span className="label">Custo real cobrado (R$)</span><input name="supplierCost" defaultValue={centsToInput(f.supplierCostCents)} className="field h-10 min-h-0" /></label>
                          <label className="text-sm sm:col-span-2"><span className="label">Notas internas</span><textarea name="notes" defaultValue={f.notes ?? ""} className="field min-h-[70px]" /></label>
                        </ActionForm>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Histórico">
            <ActionForm action={addOrderNoteAction} submitLabel="Adicionar nota" size="sm" resetOnSuccess className="mb-5">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea name="message" placeholder="Nota sobre o pedido…" className="field min-h-[64px]" />
              <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" className="size-4" /> Visível ao cliente no rastreamento</label>
            </ActionForm>
            <ol className="space-y-3 border-l border-line pl-4 text-sm">
              {order.events.map((e) => (
                <li key={e.id}>
                  <p>{e.message} {!e.isPublic && <Badge>interno</Badge>}</p>
                  <p className="text-[12px] text-muted">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status do pedido">
            {transitions.length === 0 ? <p className="text-sm text-muted">Status final — sem transições disponíveis.</p> : (
              <ActionForm action={changeOrderStatusAction} submitLabel="Atualizar status">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="status" className="field" defaultValue={transitions[0]}>
                  {transitions.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                </select>
                <input name="note" placeholder="Mensagem ao cliente (opcional)" className="field mt-2" />
                <p className="mt-2 text-[12px] text-muted">“Pagamento aprovado” só é definido pelo gateway (webhook). Cancelamento/reembolso devolve o estoque. Reembolsos financeiros devem ser feitos no painel do Mercado Pago.</p>
              </ActionForm>
            )}
          </Card>

          <Card title="Cliente">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted">Nome</dt><dd>{order.customerName} {order.user && <Link href={`/admin/clientes/${order.user.id}`} className="text-[12px] underline">ver cadastro</Link>}</dd></div>
              <div><dt className="text-muted">E-mail</dt><dd><a href={`mailto:${order.customerEmail}`} className="underline">{order.customerEmail}</a></dd></div>
              <div><dt className="text-muted">Telefone</dt><dd>{formatPhone(order.customerPhone)} · <a href={`https://wa.me/55${order.customerPhone}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></dd></div>
              <div><dt className="text-muted">CPF</dt><dd>{order.customerCpf ? formatCPF(order.customerCpf) : "—"}</dd></div>
              <div><dt className="text-muted">Entrega</dt><dd>{order.shipStreet}, {order.shipNumber}{order.shipComplement ? ` — ${order.shipComplement}` : ""}<br />{order.shipDistrict} — {order.shipCity}/{order.shipState} · CEP {formatCEP(order.shipCep)}</dd></div>
              <div><dt className="text-muted">Modalidade</dt><dd>{order.shippingName} · {order.deliveryDaysMin}–{order.deliveryDaysMax} dias úteis</dd></div>
              {order.notes && <div><dt className="text-muted">Observações</dt><dd>{order.notes}</dd></div>}
            </dl>
          </Card>

          <Card title="Pagamentos">
            {order.payments.length === 0 ? <p className="text-sm text-muted">{integrations.mercadoPago() ? "Pagamento ainda não iniciado pelo cliente." : "Gateway não configurado: nenhum pagamento iniciado."}</p> : (
              <ul className="space-y-3 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="border-b border-line pb-3 last:border-0">
                    <p className="font-semibold">{p.provider} · {PAYMENT_STATUS[p.status]} {p.sandbox && <Badge>sandbox</Badge>}</p>
                    <p className="text-muted">{formatBRL(p.amountCents)}{p.method ? ` · ${p.method}` : ""}{p.installments ? ` · ${p.installments}x` : ""}</p>
                    <p className="text-[12px] text-muted">ID gateway: {p.providerPaymentId ?? "—"} · preferência: {p.preferenceId ?? "—"}</p>
                    <p className="text-[12px] text-muted">Criado {formatDateTime(p.createdAt)}{p.lastWebhookAt ? ` · webhook ${formatDateTime(p.lastWebhookAt)}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-muted">Link do cliente: {env.siteUrl}/rastreamento?pedido={order.number}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
