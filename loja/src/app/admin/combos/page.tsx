import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { InlineAction } from "@/components/admin/inline-actions";
import { deleteBundleAction, saveBundleAction } from "@/actions/admin-misc";
import type { Bundle, BundleItem } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  await requireStaff("catalog");
  const [bundles, products] = await Promise.all([
    db.bundle.findMany({ orderBy: { createdAt: "asc" }, include: { items: true } }),
    db.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, priceCents: true } }),
  ]);
  const Form = ({ b }: { b?: Bundle & { items: BundleItem[] } }) => (
    <ActionForm action={saveBundleAction} submitLabel={b ? "Salvar combo" : "Criar combo"} resetOnSuccess={!b} className="grid gap-3 sm:grid-cols-3">
      {b && <input type="hidden" name="id" value={b.id} />}
      <label className="sm:col-span-2"><span className="label">Nome</span><input name="name" defaultValue={b?.name} className="field" /></label>
      <label><span className="label">Desconto (%)</span><input name="discountPct" type="number" min={1} max={50} defaultValue={b?.discountPct ?? 10} className="field" /></label>
      <label className="sm:col-span-3"><span className="label">Descrição</span><input name="description" defaultValue={b?.description ?? ""} className="field" /></label>
      <fieldset className="sm:col-span-3">
        <legend className="label">Produtos do combo (mín. 2)</legend>
        <div className="grid max-h-52 gap-1 overflow-y-auto border border-line p-3 sm:grid-cols-2">
          {products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="productIds" value={p.id} defaultChecked={b?.items.some((i) => i.productId === p.id)} className="size-4" /> {p.name} <span className="text-muted">{formatBRL(p.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} className="size-4" /> Ativo</label>
    </ActionForm>
  );
  return (
    <div>
      <PageHeader title="Combos" description="O desconto é aplicado automaticamente no carrinho quando todos os produtos do combo estão na sacola. Combos aparecem na página dos produtos (“Compre junto”)." />
      <div className="space-y-6">
        {bundles.map((b) => (
          <Card key={b.id} title={b.name} actions={<InlineAction run={deleteBundleAction.bind(null, b.id)} label="Excluir" tone="danger" confirm="Excluir combo?" />}><Form b={b} /></Card>
        ))}
        <Card title="Novo combo"><Form /></Card>
      </div>
    </div>
  );
}
