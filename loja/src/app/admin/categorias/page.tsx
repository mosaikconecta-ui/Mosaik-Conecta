import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { InlineAction } from "@/components/admin/inline-actions";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireStaff("catalog");
  const cats = await db.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <div>
      <PageHeader title="Categorias" description="Aparecem no menu principal na ordem definida. URL: /categoria/slug." />
      <div className="grid gap-4 xl:grid-cols-2">
        {cats.map((c) => (
          <Card key={c.id} title={`${c.name} (${c._count.products})`} actions={<InlineAction run={deleteCategoryAction.bind(null, c.id)} label="Excluir" tone="danger" confirm="Excluir a categoria? Os produtos ficarão sem categoria." />}>
            <ActionForm action={saveCategoryAction} submitLabel="Salvar" size="sm" className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={c.id} />
              <label><span className="label">Nome</span><input name="name" defaultValue={c.name} className="field" /></label>
              <label><span className="label">Slug</span><input name="slug" defaultValue={c.slug} className="field" /></label>
              <label><span className="label">Ordem</span><input name="position" type="number" defaultValue={c.position} className="field" /></label>
              <label className="sm:col-span-3"><span className="label">Descrição (SEO)</span><input name="description" defaultValue={c.description ?? ""} className="field" /></label>
            </ActionForm>
          </Card>
        ))}
        <Card title="Nova categoria">
          <ActionForm action={saveCategoryAction} submitLabel="Criar categoria" resetOnSuccess className="grid gap-3 sm:grid-cols-3">
            <label><span className="label">Nome</span><input name="name" className="field" /></label>
            <label><span className="label">Slug</span><input name="slug" className="field" placeholder="automático" /></label>
            <label><span className="label">Ordem</span><input name="position" type="number" defaultValue={cats.length} className="field" /></label>
            <label className="sm:col-span-3"><span className="label">Descrição (SEO)</span><input name="description" className="field" /></label>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
