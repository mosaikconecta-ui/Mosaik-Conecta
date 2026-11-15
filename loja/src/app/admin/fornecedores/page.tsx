import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSupplierAdapter } from "@/lib/suppliers";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { SupplierForm } from "@/components/admin/supplier-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  await requireStaff("suppliers");
  const suppliers = await db.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } }, fulfillments: { where: { status: { in: ["PENDING", "FORWARDED", "CONFIRMED"] } }, select: { id: true } } },
  });
  return (
    <div>
      <PageHeader title="Fornecedores" description="Cadastro, prazos, integração e encaminhamento de pedidos (dropshipping)." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Table head={["Fornecedor", "Integração", "Prazo total", "Produtos", "Em aberto", "Última sincronização"]} empty={suppliers.length ? undefined : "Nenhum fornecedor."}>
          {suppliers.map((s) => {
            const a = getSupplierAdapter(s.integration);
            const st = a.status();
            return (
              <tr key={s.id}>
                <Td><Link href={`/admin/fornecedores/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>{!s.active && <Badge className="ml-2">inativo</Badge>}<br /><span className="text-[12px] text-muted">{s.email ?? "sem e-mail"}</span></Td>
                <Td className="text-[13px]">{a.label}<br /><Badge tone={st.configured ? "ok" : "warn"}>{st.configured ? "operacional" : "não configurada"}</Badge></Td>
                <Td className="text-[13px]">{s.processingDays} + {s.shippingDaysMin}–{s.shippingDaysMax} dias</Td>
                <Td>{s._count.products}</Td>
                <Td>{s.fulfillments.length}</Td>
                <Td className="text-[13px] text-muted">{s.lastSyncAt ? formatDateTime(s.lastSyncAt) : "—"}</Td>
              </tr>
            );
          })}
        </Table>
        <Card title="Novo fornecedor"><SupplierForm /></Card>
      </div>
    </div>
  );
}
