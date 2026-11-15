import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";
import { formatBRL, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Table, Td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; p?: string }> }) {
  await requireStaff("orders");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.status && sp.status in ORDER_STATUS) where.status = sp.status as OrderStatus;
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [{ number: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { fulfillments: { some: { trackingCode: { contains: q, mode: "insensitive" } } } }];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { _count: { select: { items: true } }, fulfillments: { select: { status: true } } } }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: Record<string, string | undefined>) => { const s = new URLSearchParams(); for (const [k, v] of Object.entries({ status: sp.status, q: sp.q, ...p })) if (v) s.set(k, v); return `/admin/pedidos?${s}`; };
  const exportQs = new URLSearchParams(); if (sp.status) exportQs.set("status", sp.status);

  return (
    <div>
      <PageHeader title="Pedidos" description={`${total} pedido(s)`} actions={<ButtonLink href={`/api/admin/pedidos/export?${exportQs}`} variant="outline" size="sm" prefetch={false}>Exportar CSV</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/pedidos">
        <input name="q" defaultValue={sp.q} placeholder="Nº, cliente, e-mail ou rastreio" className="field h-10 min-h-0 max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="field h-10 min-h-0 max-w-[220px]">
          <option value="">Todos os status</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="h-10 bg-ink px-4 text-sm font-semibold text-paper">Filtrar</button>
      </form>
      <Table head={["Pedido", "Data", "Cliente", "Itens", "Total", "Pagamento", "Status", "Fulfillment"]} empty={orders.length ? undefined : "Nenhum pedido encontrado."}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-paper">
            <Td><Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:underline">{o.number}</Link></Td>
            <Td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</Td>
            <Td>{o.customerName}<br /><span className="text-[12px] text-muted">{o.customerEmail}</span></Td>
            <Td>{o._count.items}</Td>
            <Td className="tabular-nums">{formatBRL(o.totalCents)}</Td>
            <Td className="text-[13px]">{PAYMENT_STATUS[o.paymentStatus]}</Td>
            <Td><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></Td>
            <Td className="text-[12px] text-muted">{o.fulfillments.length ? `${o.fulfillments.filter((f) => ["SHIPPED", "DELIVERED"].includes(f.status)).length}/${o.fulfillments.length} enviados` : "—"}</Td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && <Link href={qs({ p: String(page - 1) })} className="underline">Anterior</Link>}
          <span className="text-muted">Página {page} de {pages}</span>
          {page < pages && <Link href={qs({ p: String(page + 1) })} className="underline">Próxima</Link>}
        </div>
      )}
    </div>
  );
}
