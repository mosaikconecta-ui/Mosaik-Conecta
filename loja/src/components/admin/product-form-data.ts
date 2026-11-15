import { centsToInput } from "@/lib/format";

export type Variant = { id?: string; sku: string; color: string; colorHex: string; size: string; price: string; compareAt: string; cost: string; stock: string; supplierSku: string; active: boolean };
export type Img = { url: string; alt: string; colorKey: string };
export type Spec = { label: string; value: string };

export type ProductFormData = {
  id: string | null; name: string; slug: string; subtitle: string; description: string; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean;
  categoryId: string; supplierId: string; price: string; compareAt: string; cost: string; weight: string; colorLabel: string; sizeLabel: string;
  seoTitle: string; seoDescription: string; tags: string; specs: Spec[]; images: Img[]; variants: Variant[];
};

export const emptyVariant = (): Variant => ({ sku: "", color: "", colorHex: "", size: "", price: "", compareAt: "", cost: "", stock: "0", supplierSku: "", active: true });


export function toFormData(p: {
  id: string; name: string; slug: string; subtitle: string | null; description: string; status: ProductFormData["status"]; featured: boolean; categoryId: string | null;
  supplierId: string | null; priceCents: number; compareAtCents: number | null; costCents: number; weightGrams: number; colorLabel: string; sizeLabel: string;
  seoTitle: string | null; seoDescription: string | null; tags: string[]; specs: unknown;
  images: { url: string; alt: string; colorKey: string | null }[];
  variants: { id: string; sku: string; color: string | null; colorHex: string | null; size: string | null; priceCents: number | null; compareAtCents: number | null; costCents: number | null; stock: number; supplierSku: string | null; active: boolean }[];
}): ProductFormData {
  return {
    id: p.id, name: p.name, slug: p.slug, subtitle: p.subtitle ?? "", description: p.description, status: p.status, featured: p.featured,
    categoryId: p.categoryId ?? "", supplierId: p.supplierId ?? "", price: centsToInput(p.priceCents), compareAt: centsToInput(p.compareAtCents),
    cost: centsToInput(p.costCents), weight: String(p.weightGrams), colorLabel: p.colorLabel, sizeLabel: p.sizeLabel, seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "", tags: p.tags.join(", "), specs: (Array.isArray(p.specs) ? p.specs : []) as Spec[],
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, colorKey: i.colorKey ?? "" })),
    variants: p.variants.map((v) => ({
      id: v.id, sku: v.sku, color: v.color ?? "", colorHex: v.colorHex ?? "", size: v.size ?? "", price: centsToInput(v.priceCents), compareAt: centsToInput(v.compareAtCents),
      cost: centsToInput(v.costCents), stock: String(v.stock), supplierSku: v.supplierSku ?? "", active: v.active,
    })),
  };
}
