import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/metrics";
import { formatBRL } from "@/lib/format";
import { db } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/order-status";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader, Stat, Table, Td } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireStaff("dashboard");
  const [m, recent] = await Promise.all([
    getDashboardMetrics(30),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, number: true, customerName: true, totalCents: true, status: true, createdAt: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Visão geral" description="Valores consideram apenas pedidos com pagamento aprovado." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Faturamento total" value={formatBRL(m.revenueCents)} hint={`${formatBRL(m.period.revenueCents)} nos últimos 30 dias`} />
        <Stat label="Pedidos pagos" value={m.orders} hint={`${m.period.orders} nos últimos 30 dias`} />
        <Stat label="Ticket médio" value={formatBRL(m.avgTicketCents)} hint={m.grossMarginPct !== null ? `Margem bruta: ${m.grossMarginPct.toFixed(1)}%` : "Sem vendas ainda"} />
        <Stat label="Taxa de conversão (30d)" value={m.conversion.rate !== null ? `${(m.conversion.rate * 100).toFixed(2)}%` : "—"}
          hint={m.conversion.rate !== null ? `${m.conversion.purchases} compras / ${m.conversion.sessions} sessões` : `Dados insuficientes: ${m.conversion.sessions} de ${m.conversion.minSessions} sessões com consentimento`} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Aguardando pagamento", m.status.pendingPayment, "PENDING_PAYMENT"],
          ["Pendentes de envio", m.status.toFulfill, "PAID"],
          ["Enviados", m.status.shipped, "SHIPPED"],
          ["Entregues", m.status.delivered, "DELIVERED"],
          ["Cancelados/reembolsados", m.status.cancelled, "CANCELLED"],
        ].map(([label, value, status]) => (
          <Link key={String(label)} href={`/admin/pedidos?status=${status}`} className="lift block border border-line bg-surface p-4">
            <p className="text-[12px] text-muted">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Faturamento diário (30 dias)">
          <RevenueChart data={m.daily} />
        </Card>
        <Card title="Produtos mais vendidos">
          {m.topProducts.length === 0 ? <p className="text-sm text-muted">Ainda não há vendas aprovadas.</p> : (
            <ol className="space-y-3 text-sm">
              {m.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3"><span className="w-4 text-muted">{i + 1}</span><Link href={`/admin/produtos/${p.productId}`} className="link-draw">{p.name}</Link></span>
                  <span className="tabular-nums text-muted">{p.quantity} un. · {formatBRL(p.revenueCents)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Pedidos recentes" actions={<Link href="/admin/pedidos" className="link-draw text-sm">Ver todos</Link>}>
          {recent.length === 0 ? <p className="text-sm text-muted">Nenhum pedido ainda.</p> : (
            <Table head={["Pedido", "Cliente", "Total", "Status"]}>
              {recent.map((o) => (
                <tr key={o.id}>
                  <Td><Link href={`/admin/pedidos/${o.id}`} className="font-semibold underline-offset-2 hover:underline">{o.number}</Link></Td>
                  <Td>{o.customerName}</Td>
                  <Td className="tabular-nums">{formatBRL(o.totalCents)}</Td>
                  <Td><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Estoque baixo" actions={<Link href="/admin/produtos?estoque=baixo" className="link-draw text-sm">Ver</Link>}>
            {m.lowStock.length === 0 ? <p className="text-sm text-muted">Nenhum item com estoque baixo.</p> : (
              <ul className="space-y-2 text-sm">
                {m.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between gap-3">
                    <Link href={`/admin/produtos/${v.productId}`} className="link-draw truncate">{v.name}{v.variant ? ` · ${v.variant}` : ""}</Link>
                    <span className={v.stock === 0 ? "font-semibold text-danger" : "text-warn"}>{v.stock === 0 ? "Esgotado" : `${v.stock} un.`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Carrinhos abandonados (30d)">
            <p className="text-2xl font-semibold">{m.abandonedCarts}</p>
            <Link href="/admin/carrinhos" className="link-draw mt-1 inline-block text-sm">Recuperar carrinhos</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
