import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { formatCEP, formatCPF, formatPhone } from "@/lib/br";
import { ORDER_STATUS } from "@/lib/order-status";
import { audit } from "@/lib/audit";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader, Stat, Table, Td } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { setUserRoleAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("customers");
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" } } } });
  if (!u) notFound();
  await audit("customer.viewed", { userId: staff.id, entity: "user", entityId: u.id });
  const paid = u.orders.filter((o) => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status));
  const total = paid.reduce((s, o) => s + o.totalCents, 0);
  return (
    <div>
      <PageHeader back={{ href: "/admin/clientes", label: "Clientes" }} title={u.name} description={`Cliente desde ${formatDate(u.createdAt)}`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pedidos pagos" value={paid.length} />
        <Stat label="Total gasto" value={formatBRL(total)} />
        <Stat label="Ticket médio" value={formatBRL(paid.length ? Math.round(total / paid.length) : 0)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Histórico de compras">
          <Table head={["Pedido", "Data", "Total", "Status"]} empty={u.orders.length ? undefined : "Nenhum pedido."}>
            {u.orders.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/admin/pedidos/${o.id}`} className="font-semibold hover:underline">{o.number}</Link></Td>
                <Td className="text-[13px]">{formatDateTime(o.createdAt)}</Td>
                <Td>{formatBRL(o.totalCents)}</Td>
                <Td><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="space-y-6">
          <Card title="Contato">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted">E-mail</dt><dd><a href={`mailto:${u.email}`} className="underline">{u.email}</a></dd></div>
              <div><dt className="text-muted">Telefone</dt><dd>{u.phone ? <>{formatPhone(u.phone)} · <a href={`https://wa.me/55${u.phone}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></> : "—"}</dd></div>
              <div><dt className="text-muted">CPF</dt><dd>{u.cpf ? formatCPF(u.cpf) : "—"}</dd></div>
              <div><dt className="text-muted">Marketing</dt><dd>{u.marketingOptIn ? "Aceita receber e-mails" : "Não aceita"}</dd></div>
            </dl>
          </Card>
          <Card title="Endereços">
            {u.addresses.length === 0 ? <p className="text-sm text-muted">Nenhum endereço salvo.</p> : (
              <ul className="space-y-3 text-sm">{u.addresses.map((a) => <li key={a.id}><strong>{a.label}</strong>{a.isDefault ? " (principal)" : ""}<br />{a.street}, {a.number}{a.complement ? ` — ${a.complement}` : ""} · {a.district} — {a.city}/{a.state} · {formatCEP(a.cep)}</li>)}</ul>
            )}
          </Card>
          {can(staff.role, "users") && (
            <Card title="Perfil de acesso">
              <ActionForm action={setUserRoleAction} submitLabel="Alterar perfil" size="sm">
                <input type="hidden" name="userId" value={u.id} />
                <select name="role" defaultValue={u.role} className="field">
                  <option value="CUSTOMER">Cliente</option><option value="OPERATOR">Operação (pedidos e clientes)</option><option value="ADMIN">Administrador</option>
                </select>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
