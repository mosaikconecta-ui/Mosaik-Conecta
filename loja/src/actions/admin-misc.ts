"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/auth";
import { couponInputSchema, fieldErrors, supplierInputSchema } from "@/lib/validation";
import { parseBRLToCents, slugify } from "@/lib/format";
import { parseInventoryCsv } from "@/lib/suppliers";
import { audit } from "@/lib/audit";
import { sendAbandonedCartRecovery } from "@/lib/recovery";

export type State = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const optInt = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

// ── Cupons ──
export async function createCouponAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("coupons");
  const type = fd.get("type");
  const rawValue = String(fd.get("value") ?? "0");
  const parsed = couponInputSchema.safeParse({
    code: fd.get("code"), description: fd.get("description"), type,
    value: type === "FIXED" ? parseBRLToCents(rawValue) : type === "FREE_SHIPPING" ? 0 : Number(rawValue),
    minSubtotalCents: parseBRLToCents(String(fd.get("minSubtotal") ?? "0")), maxUses: optInt(fd.get("maxUses")), perCustomerLimit: optInt(fd.get("perCustomerLimit")),
    startsAt: fd.get("startsAt") || null, expiresAt: fd.get("expiresAt") ? `${fd.get("expiresAt")}T23:59:59-03:00` : null, active: true,
  });
  if (!parsed.success) return { message: "Revise os campos.", errors: fieldErrors(parsed.error) };
  if (await db.coupon.findUnique({ where: { code: parsed.data.code } })) return { message: "Já existe um cupom com este código." };
  const c = await db.coupon.create({ data: { ...parsed.data, description: parsed.data.description || null } });
  await audit("coupon.created", { userId: user.id, entity: "coupon", entityId: c.id, details: { code: c.code } });
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom criado." };
}

export async function toggleCouponAction(id: string, active: boolean) {
  const user = await assertStaff("coupons");
  await db.coupon.update({ where: { id }, data: { active } });
  await audit("coupon.toggled", { userId: user.id, entity: "coupon", entityId: id, details: { active } });
  revalidatePath("/admin/cupons");
}

// ── Fornecedores ──
function supplierFromForm(fd: FormData) {
  return supplierInputSchema.safeParse({
    name: fd.get("name"), integration: fd.get("integration"), contactName: fd.get("contactName"), email: fd.get("email"), phone: fd.get("phone"),
    website: fd.get("website"), notes: fd.get("notes"), processingDays: fd.get("processingDays"), shippingDaysMin: fd.get("shippingDaysMin"),
    shippingDaysMax: fd.get("shippingDaysMax"), autoForward: bool(fd.get("autoForward")), active: bool(fd.get("active")),
  });
}

export async function saveSupplierAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("suppliers");
  const id = fd.get("id") ? String(fd.get("id")) : null;
  const p = supplierFromForm(fd);
  if (!p.success) return { message: "Revise os campos.", errors: fieldErrors(p.error) };
  const data = { ...p.data, contactName: p.data.contactName || null, email: p.data.email || null, phone: p.data.phone || null, website: p.data.website || null, notes: p.data.notes || null };
  const s = id ? await db.supplier.update({ where: { id }, data }) : await db.supplier.create({ data });
  await audit(id ? "supplier.updated" : "supplier.created", { userId: user.id, entity: "supplier", entityId: s.id });
  revalidatePath("/admin/fornecedores");
  return { ok: true, message: id ? "Fornecedor atualizado." : "Fornecedor criado." };
}

/** Sincronização por planilha: atualiza estoque e custo das variações pelo SKU do fornecedor. */
export async function importInventoryAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("suppliers");
  const supplierId = z.string().parse(fd.get("supplierId"));
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Selecione o arquivo CSV." };
  if (file.size > 2 * 1024 * 1024) return { message: "Arquivo acima de 2 MB." };
  const { rows, errors } = parseInventoryCsv(await file.text());
  if (!rows.length) return { message: errors[0] ?? "Nenhuma linha válida." };
  let updated = 0;
  const notFound: string[] = [];
  for (const r of rows) {
    const res = await db.productVariant.updateMany({
      where: { supplierSku: r.supplierSku, product: { supplierId } },
      data: { ...(r.stock !== null ? { stock: r.stock } : {}), ...(r.costCents !== null ? { costCents: r.costCents } : {}) },
    });
    if (res.count === 0) notFound.push(r.supplierSku);
    updated += res.count;
  }
  const summary = `${updated} variação(ões) atualizada(s) de ${rows.length} linha(s). ${notFound.length ? `Sem correspondência: ${notFound.slice(0, 8).join(", ")}${notFound.length > 8 ? "…" : ""}.` : ""} ${errors.length ? `${errors.length} linha(s) com erro.` : ""}`.trim();
  await db.supplierSyncLog.create({ data: { supplierId, kind: "stock", success: updated > 0, summary, details: { errors: errors.slice(0, 50), notFound: notFound.slice(0, 200) } } });
  await db.supplier.update({ where: { id: supplierId }, data: { lastSyncAt: new Date() } });
  await audit("supplier.inventory_import", { userId: user.id, entity: "supplier", entityId: supplierId, details: { updated, rows: rows.length } });
  revalidatePath(`/admin/fornecedores/${supplierId}`);
  revalidatePath("/", "layout");
  return { ok: updated > 0, message: summary };
}

// ── Carrinhos abandonados ──
export async function sendRecoveryAction(cartId: string): Promise<{ ok: boolean; message: string }> {
  const user = await assertStaff("carts");
  const r = await sendAbandonedCartRecovery(cartId);
  await audit("cart.recovery_sent", { userId: user.id, entity: "cart", entityId: cartId, details: { ok: r.ok } });
  revalidatePath("/admin/carrinhos");
  return r;
}

// ── Frete ──
export async function saveShippingAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("shipping");
  const id = fd.get("id") ? String(fd.get("id")) : null;
  const regions = ["SE", "S", "CO", "NE", "N"];
  const p = z.object({
    name: z.string().trim().min(2).max(40), carrier: z.string().trim().min(2).max(40), description: z.string().max(120).optional(),
    extraDaysMin: z.coerce.number().int().min(-10).max(60), extraDaysMax: z.coerce.number().int().min(-10).max(60), position: z.coerce.number().int().min(0).max(99),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { message: "Revise os campos.", errors: fieldErrors(p.error) };
  const multipliers = Object.fromEntries(regions.map((r) => [r, Math.min(5, Math.max(0.1, Number(String(fd.get(`m_${r}`) ?? "1").replace(",", ".")) || 1))]));
  const freeOver = String(fd.get("freeOver") ?? "").trim();
  const data = {
    ...p.data, description: p.data.description || null, baseCents: parseBRLToCents(String(fd.get("base") ?? "0")), perKgCents: parseBRLToCents(String(fd.get("perKg") ?? "0")),
    freeOverCents: freeOver ? parseBRLToCents(freeOver) : null, regionMultiplier: multipliers, active: bool(fd.get("active")),
  };
  if (id) await db.shippingMethod.update({ where: { id }, data });
  else await db.shippingMethod.create({ data });
  await audit("shipping.saved", { userId: user.id, entity: "shipping", entityId: id ?? undefined });
  revalidatePath("/admin/frete");
  return { ok: true, message: "Frete salvo." };
}

// ── Avaliações ──
export async function moderateReviewAction(id: string, op: "approve" | "unapprove" | "feature" | "unfeature" | "delete") {
  const user = await assertStaff("reviews");
  if (op === "delete") await db.review.delete({ where: { id } });
  else await db.review.update({ where: { id }, data: op === "approve" ? { approved: true } : op === "unapprove" ? { approved: false, featured: false } : op === "feature" ? { featured: true, approved: true } : { featured: false } });
  await audit(`review.${op}`, { userId: user.id, entity: "review", entityId: id });
  revalidatePath("/admin/avaliacoes");
  revalidatePath("/", "layout");
}

// ── Categorias ──
export async function saveCategoryAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("catalog");
  const id = fd.get("id") ? String(fd.get("id")) : null;
  const p = z.object({ name: z.string().trim().min(2).max(40), description: z.string().max(300).optional(), position: z.coerce.number().int().min(0).max(99) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { message: "Revise os campos.", errors: fieldErrors(p.error) };
  const slug = slugify(String(fd.get("slug") || p.data.name));
  const clash = await db.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) return { message: "Já existe categoria com este slug." };
  const data = { name: p.data.name, description: p.data.description || null, position: p.data.position, slug };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  await audit("category.saved", { userId: user.id, entity: "category", entityId: id ?? undefined });
  revalidatePath("/", "layout");
  return { ok: true, message: "Categoria salva." };
}

export async function deleteCategoryAction(id: string) {
  const user = await assertStaff("catalog");
  await db.category.delete({ where: { id } }); // produtos ficam sem categoria (SetNull)
  await audit("category.deleted", { userId: user.id, entity: "category", entityId: id });
  revalidatePath("/", "layout");
}

// ── Combos ──
export async function saveBundleAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("catalog");
  const id = fd.get("id") ? String(fd.get("id")) : null;
  const p = z.object({ name: z.string().trim().min(2).max(60), description: z.string().max(200).optional(), discountPct: z.coerce.number().int().min(1).max(50) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { message: "Revise os campos (desconto entre 1% e 50%).", errors: fieldErrors(p.error) };
  const productIds = [...new Set(fd.getAll("productIds").map(String).filter(Boolean))];
  if (productIds.length < 2) return { message: "Selecione pelo menos 2 produtos." };
  const data = { name: p.data.name, description: p.data.description || null, discountPct: p.data.discountPct, active: bool(fd.get("active")) };
  const bundle = id ? await db.bundle.update({ where: { id }, data }) : await db.bundle.create({ data: { ...data, slug: `${slugify(p.data.name)}-${Date.now().toString(36)}` } });
  await db.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
  await db.bundleItem.createMany({ data: productIds.map((productId) => ({ bundleId: bundle.id, productId })) });
  await audit("bundle.saved", { userId: user.id, entity: "bundle", entityId: bundle.id });
  revalidatePath("/", "layout");
  return { ok: true, message: "Combo salvo." };
}

export async function deleteBundleAction(id: string) {
  const user = await assertStaff("catalog");
  await db.bundle.delete({ where: { id } });
  await audit("bundle.deleted", { userId: user.id, entity: "bundle", entityId: id });
  revalidatePath("/", "layout");
}

// ── Equipe ──
export async function setUserRoleAction(_: State, fd: FormData): Promise<State> {
  const user = await assertStaff("users");
  const p = z.object({ userId: z.string(), role: z.enum(["CUSTOMER", "OPERATOR", "ADMIN"]) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { message: "Dados inválidos." };
  if (p.data.userId === user.id) return { message: "Você não pode alterar o próprio perfil." };
  await db.user.update({ where: { id: p.data.userId }, data: { role: p.data.role } });
  await db.session.deleteMany({ where: { userId: p.data.userId } }); // força novo login com o novo perfil
  await audit("user.role_changed", { userId: user.id, entity: "user", entityId: p.data.userId, details: { role: p.data.role } });
  revalidatePath(`/admin/clientes/${p.data.userId}`);
  return { ok: true, message: "Perfil atualizado." };
}
