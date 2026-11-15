import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { emptyVariant, type ProductFormData } from "@/components/admin/product-form-data";

export default async function NewProduct() {
  await requireStaff("products");
  const [categories, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const initial: ProductFormData = {
    id: null, name: "", slug: "", subtitle: "", description: "", status: "DRAFT", featured: false, categoryId: "", supplierId: "", price: "", compareAt: "",
    cost: "", weight: "500", colorLabel: "Cor", sizeLabel: "Tamanho", seoTitle: "", seoDescription: "", tags: "", specs: [], images: [], variants: [emptyVariant()],
  };
  return (
    <div>
      <PageHeader back={{ href: "/admin/produtos", label: "Produtos" }} title="Novo produto" description="Produtos começam como rascunho. Publique quando imagens, preço e estoque estiverem prontos." />
      <ProductForm initial={initial} categories={categories} suppliers={suppliers} />
    </div>
  );
}
