import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSupplierAdapter } from "@/lib/suppliers";
import { formatBRL, formatDateTime } from "@/lib/format";
import { FULFILLMENT_STATUS } from "@/lib/order-status";
import { Alert, Badge } from "@/components/ui/misc";
import { Card, PageHeader, Table, Td } from "@/components/admin/ui";
import { SupplierForm } from "@/components/admin/supplier-form";
import { ActionForm } from "@/components/admin/action-form";
import { importInventoryAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("suppliers");
  const { id } = await params;
  const s = await db.supplier.findUnique({
    where: { id },
    include: {
      products: { include: { variants: { where: { active: true } } }, orderBy: { name: "asc" } },
      syncLogs: { orderBy: { createdAt: "desc" }, take: 15 },
      fulfillments: { where: { status: { in: ["PENDING", "FORWARDED", "CONFIRMED"] } }, include: { order: { select: { id: true, number: true, createdAt: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!s) notFound();
  const adapter = getSupplierAdapter(s.integration);
  const st = adapter.status();

  return (
    <div>
      <PageHeader back={{ href: "/admin/fornecedores", label: "Fornecedores" }} title={s.name} description={`${adapter.label}${s.isDemo ? " · fornecedor de demonstração" : ""}`} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card title="Status da integração">
            {st.configured ? <Alert tone="ok" title="Operacional">{st.notes}</Alert> : (
              <Alert tone="warn" title="Integração não ativa">
                <p>Pendências:</p>
                <ul className="mt-1 list-disc pl-5">{st.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                {st.notes && <p className="mt-2">{st.notes}</p>}
                {st.docsUrl && <p className="mt-2">Documentação oficial: <a href={st.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">{st.docsUrl}</a></p>}
                <p className="mt-2">Enquanto isso, os pedidos podem ser encaminhados manualmente e registrados no painel.</p>
              </Alert>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {Object.entries(adapter.capabilities).map(([k, v]) => (
                <div key={k}><dt className="text-muted">{({ forwardOrder: "Enviar pedidos", stockSync: "Estoque", priceSync: "Custos", tracking: "Rastreio" } as Record<string, string>)[k]}</dt><dd>{v ? "Sim" : "Manual"}</dd></div>
              ))}
            </dl>
          </Card>

          <Card title="Sincronizar estoque e custo (CSV)">
            <p className="mb-3 text-sm text-ink-2">Envie a planilha do fornecedor com as colunas <code>supplier_sku;stock;cost</code> (custo em reais). As variações são localizadas pelo “SKU fornecedor” dos produtos deste fornecedor.</p>
            <ActionForm action={importInventoryAction} submitLabel="Importar planilha" resetOnSuccess>
              <input type="hidden" name="supplierId" value={s.id} />
              <input type="file" name="file" accept=".csv,text/csv" className="text-sm" />
            </ActionForm>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent("supplier_sku;stock;cost\n" + s.products.flatMap((p) => p.variants.map((v) => `${v.supplierSku ?? ""};${v.stock};${((v.costCents ?? p.costCents) / 100).toFixed(2).replace(".", ",")}`)).join("\n"))}`}
              download={`estoque-${s.id}.csv`} className="mt-3 inline-block text-sm underline">Baixar modelo com os SKUs atuais</a>
          </Card>

          <Card title={`Pedidos em aberto (${s.fulfillments.length})`}>
            {s.fulfillments.length === 0 ? <p className="text-sm text-muted">Nenhum envio pendente.</p> : (
              <ul className="divide-y divide-line text-sm">
                {s.fulfillments.map((f) => (
                  <li key={f.id} className="flex justify-between gap-3 py-2">
                    <Link href={`/admin/pedidos/${f.order.id}`} className="font-semibold hover:underline">{f.order.number}</Link>
                    <span className="text-muted">{FULFILLMENT_STATUS[f.status]} · {formatDateTime(f.order.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Produtos associados (${s.products.length})`}>
            <Table head={["Produto", "SKUs fornecedor", "Custo", "Estoque"]}>
              {s.products.map((p) => (
                <tr key={p.id}>
                  <Td><Link href={`/admin/produtos/${p.id}`} className="hover:underline">{p.name}</Link></Td>
                  <Td className="text-[12px] text-muted">{p.variants.map((v) => v.supplierSku ?? "—").join(", ")}</Td>
                  <Td>{formatBRL(p.costCents)}</Td>
                  <Td>{p.variants.reduce((a, v) => a + v.stock, 0)}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Registro de sincronizações e encaminhamentos">
            {s.syncLogs.length === 0 ? <p className="text-sm text-muted">Nada registrado ainda.</p> : (
              <ul className="space-y-2 text-sm">
                {s.syncLogs.map((l) => (
                  <li key={l.id}><Badge tone={l.success ? "ok" : "bad"}>{l.kind}</Badge> <span className="text-muted">{formatDateTime(l.createdAt)}</span><br />{l.summary}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Dados do fornecedor" className="h-fit"><SupplierForm supplier={s} /></Card>
      </div>
    </div>
  );
}
