import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/br";
import { Badge } from "@/components/ui/misc";
import { PageHeader, Table, Td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  await requireStaff("customers");
  const sp = await searchParams;
  const guests = sp.tipo === "visitantes";
  const q = sp.q?.trim();

  const users = guests ? [] : await db.user.findMany({
    where: { anonymizedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) } satisfies Prisma.UserWhereInput,
    orderBy: { createdAt: "desc" }, take: 200,
    include: { orders: { where: { status: { in: [...PAID] } }, select: { totalCents: true, createdAt: true } } },
  });
  const guestRows = guests ? await db.order.groupBy({
    by: ["customerEmail", "customerName"],
    where: { userId: null, ...(q ? { OR: [{ customerEmail: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}) },
    _count: true, _sum: { totalCents: true }, _max: { createdAt: true, customerPhone: true },
    orderBy: { _max: { createdAt: "desc" } }, take: 200,
  }) : [];

  return (
    <div>
      <PageHeader title="Clientes" description="Contas cadastradas e compradores sem conta (checkout como visitante)." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex border border-line text-sm">
          <Link href="/admin/clientes" className={`px-3 py-2 ${!guests ? "bg-ink text-paper" : ""}`}>Com conta</Link>
          <Link href="/admin/clientes?tipo=visitantes" className={`px-3 py-2 ${guests ? "bg-ink text-paper" : ""}`}>Visitantes</Link>
        </div>
        <form action="/admin/clientes" className="flex gap-2">
          {guests && <input type="hidden" name="tipo" value="visitantes" />}
          <input name="q" defaultValue={q} placeholder="Nome ou e-mail" className="field h-10 min-h-0 w-64" />
          <button className="h-10 bg-ink px-4 text-sm font-semibold text-paper">Buscar</button>
        </form>
      </div>
      {!guests ? (
        <Table head={["Cliente", "Telefone", "Perfil", "Pedidos pagos", "Total gasto", "Última compra", "Cadastro"]} empty={users.length ? undefined : "Nenhum cliente."}>
          {users.map((u) => (
            <tr key={u.id}>
              <Td><Link href={`/admin/clientes/${u.id}`} className="font-semibold hover:underline">{u.name}</Link><br /><span className="text-[12px] text-muted">{u.email}</span></Td>
              <Td className="text-[13px]">{u.phone ? formatPhone(u.phone) : "—"}</Td>
              <Td>{u.role !== "CUSTOMER" ? <Badge tone="dark">{u.role === "ADMIN" ? "Admin" : "Operação"}</Badge> : <span className="text-[13px] text-muted">Cliente</span>}</Td>
              <Td>{u.orders.length}</Td>
              <Td className="tabular-nums">{formatBRL(u.orders.reduce((s, o) => s + o.totalCents, 0))}</Td>
              <Td className="text-[13px]">{u.orders.length ? formatDate(u.orders.map((o) => o.createdAt).sort((a, b) => +b - +a)[0]) : "—"}</Td>
              <Td className="text-[13px] text-muted">{formatDate(u.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={["Comprador", "Telefone", "Pedidos", "Total (todos os status)", "Último pedido"]} empty={guestRows.length ? undefined : "Nenhum comprador sem conta."}>
          {guestRows.map((g) => (
            <tr key={g.customerEmail + g.customerName}>
              <Td><Link href={`/admin/pedidos?q=${encodeURIComponent(g.customerEmail)}`} className="font-semibold hover:underline">{g.customerName}</Link><br /><span className="text-[12px] text-muted">{g.customerEmail}</span></Td>
              <Td className="text-[13px]">{g._max.customerPhone ? formatPhone(g._max.customerPhone) : "—"}</Td>
              <Td>{g._count}</Td>
              <Td className="tabular-nums">{formatBRL(g._sum.totalCents ?? 0)}</Td>
              <Td className="text-[13px]">{g._max.createdAt ? formatDate(g._max.createdAt) : "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
