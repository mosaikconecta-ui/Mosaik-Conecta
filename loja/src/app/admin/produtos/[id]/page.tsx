import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Alert } from "@/components/ui/misc";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { toFormData } from "@/components/admin/product-form-data";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireStaff("products");
  const { id } = await params;
  const sp = await searchParams;
  const [product, categories, suppliers, sold] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, variants: { where: { active: true }, orderBy: { position: "asc" } } } }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.orderItem.aggregate({ where: { productId: id, order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } }, _sum: { quantity: true, totalCents: true } }),
  ]);
  if (!product) notFound();
  return (
    <div>
      <PageHeader back={{ href: "/admin/produtos", label: "Produtos" }} title={product.name}
        description={`${sold._sum.quantity ?? 0} unidade(s) vendida(s)${product.isDemo ? " · produto de demonstração" : ""}`} />
      {sp.salvo && <Alert tone="ok" className="mb-4">Produto salvo.</Alert>}
      <ProductForm initial={toFormData(product)} categories={categories} suppliers={suppliers} />
    </div>
  );
}
