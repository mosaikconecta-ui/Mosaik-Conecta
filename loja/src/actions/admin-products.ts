"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/auth";
import { fieldErrors, productInputSchema } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { storeImage } from "@/lib/storage";
import { audit } from "@/lib/audit";

export type SaveResult = { ok: true; id: string; message: string } | { ok: false; message: string; errors?: Record<string, string> };

export async function saveProductAction(id: string | null, input: unknown): Promise<SaveResult> {
  const user = await assertStaff("products");
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const slug = d.slug || slugify(d.name);
  if (!slug) return { ok: false, message: "Slug inválido.", errors: { slug: "Informe um slug." } };

  const skus = d.variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) return { ok: false, message: "SKUs repetidos.", errors: { variants: "Cada variação precisa de um SKU único." } };
  const clash = await db.productVariant.findFirst({ where: { sku: { in: skus }, ...(id ? { productId: { not: id } } : {}) }, select: { sku: true } });
  if (clash) return { ok: false, message: `SKU ${clash.sku} já está em uso em outro produto.`, errors: { variants: `SKU ${clash.sku} já existe.` } };
  const slugClash = await db.product.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (slugClash) return { ok: false, message: "Já existe produto com este slug.", errors: { slug: "Slug em uso." } };

  const data = {
    name: d.name, slug, subtitle: d.subtitle || null, description: d.description, specs: d.specs as Prisma.InputJsonValue, status: d.status,
    featured: d.featured, categoryId: d.categoryId || null, supplierId: d.supplierId || null, priceCents: d.priceCents,
    compareAtCents: d.compareAtCents && d.compareAtCents > d.priceCents ? d.compareAtCents : null, costCents: d.costCents,
    weightGrams: d.weightGrams, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, tags: d.tags,
    colorLabel: d.colorLabel || "Cor",
    sizeLabel: d.sizeLabel || "Tamanho",
  };

  try {
    const saved = await db.$transaction(async (tx) => {
      const product = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (d.images.length) await tx.productImage.createMany({ data: d.images.map((im, position) => ({ productId: product.id, url: im.url, alt: im.alt || d.name, colorKey: im.colorKey || null, position })) });
      const keepIds = d.variants.map((v) => v.id).filter(Boolean) as string[];
      // variações removidas: desativa se já foram vendidas, senão exclui
      const removed = await tx.productVariant.findMany({ where: { productId: product.id, id: { notIn: keepIds } }, include: { _count: { select: { orderItems: true } } } });
      for (const r of removed) {
        if (r._count.orderItems > 0) await tx.productVariant.update({ where: { id: r.id }, data: { active: false, sku: `${r.sku}-ARQ-${Date.now() % 100000}` } });
        else await tx.productVariant.delete({ where: { id: r.id } });
      }
      for (const [position, v] of d.variants.entries()) {
        const vData = {
          sku: v.sku.toUpperCase(), color: v.color || null, colorHex: v.colorHex || null, size: v.size || null,
          priceCents: v.priceCents ?? null, compareAtCents: v.compareAtCents ?? null, costCents: v.costCents ?? null,
          stock: v.stock, supplierSku: v.supplierSku || null, active: v.active, position,
        };
        if (v.id && keepIds.includes(v.id)) await tx.productVariant.update({ where: { id: v.id, productId: product.id }, data: vData });
        else await tx.productVariant.create({ data: { ...vData, productId: product.id } });
      }
      return product;
    });
    await audit(id ? "product.updated" : "product.created", { userId: user.id, entity: "product", entityId: saved.id, details: { name: saved.name, priceCents: saved.priceCents } });
    revalidatePath("/", "layout");
    return { ok: true, id: saved.id, message: "Produto salvo." };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Não foi possível salvar o produto." };
  }
}

export async function deleteProductAction(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await assertStaff("products");
  const sold = await db.orderItem.count({ where: { productId: id } });
  if (sold > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit("product.archived", { userId: user.id, entity: "product", entityId: id });
    revalidatePath("/", "layout");
    return { ok: true, message: "Produto com vendas foi arquivado (o histórico de pedidos foi preservado)." };
  }
  await db.product.delete({ where: { id } });
  await audit("product.deleted", { userId: user.id, entity: "product", entityId: id });
  revalidatePath("/", "layout");
  return { ok: true, message: "Produto excluído." };
}

export async function uploadImageAction(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await assertStaff("products");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Selecione uma imagem." };
  try {
    return { ok: true, url: await storeImage(file) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha no upload." };
  }
}

export async function quickStockAction(variantId: string, stock: number) {
  const user = await assertStaff("products");
  const s = z.number().int().min(0).max(1_000_000).parse(stock);
  const v = await db.productVariant.update({ where: { id: variantId }, data: { stock: s } });
  await audit("stock.updated", { userId: user.id, entity: "variant", entityId: variantId, details: { stock: s } });
  revalidatePath("/admin/produtos");
  revalidatePath(`/produto`, "layout");
  return v.stock;
}
