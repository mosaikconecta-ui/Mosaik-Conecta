"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertStaff } from "@/lib/auth";
import { forwardFulfillment, markFulfillmentForwarded, setOrderStatus, updateFulfillment } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { parseBRLToCents } from "@/lib/format";

export type AdminState = { ok?: boolean; message?: string } | null;

const STATUSES = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;

export async function changeOrderStatusAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const user = await assertStaff("orders");
  const p = z.object({ orderId: z.string(), status: z.enum(STATUSES), note: z.string().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!p.success) return { message: "Dados inválidos." };
  try {
    await setOrderStatus(p.data.orderId, p.data.status, user.id, p.data.note || undefined);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Falha ao atualizar." };
  }
  revalidatePath(`/admin/pedidos/${p.data.orderId}`);
  return { ok: true, message: "Status atualizado." };
}

export async function forwardFulfillmentAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const user = await assertStaff("orders");
  const id = z.string().parse(formData.get("fulfillmentId"));
  const orderId = z.string().parse(formData.get("orderId"));
  const r = await forwardFulfillment(id, user.id);
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: r.ok, message: r.message };
}

export async function markForwardedAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const user = await assertStaff("orders");
  const id = z.string().parse(formData.get("fulfillmentId"));
  const orderId = z.string().parse(formData.get("orderId"));
  const supplierOrderId = String(formData.get("supplierOrderId") ?? "").trim().slice(0, 80) || null;
  await markFulfillmentForwarded(id, supplierOrderId, user.id, "Encaminhado manualmente pelo painel.");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true, message: "Marcado como encaminhado." };
}

export async function updateFulfillmentAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const user = await assertStaff("orders");
  const p = z.object({
    fulfillmentId: z.string(), orderId: z.string(),
    status: z.enum(["PENDING", "FORWARDED", "CONFIRMED", "SHIPPED", "DELIVERED", "FAILED", "CANCELLED"]),
    supplierOrderId: z.string().max(80).optional(), carrier: z.string().max(60).optional(),
    trackingCode: z.string().max(60).optional(), trackingUrl: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(), supplierCost: z.string().max(20).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) return { message: "Dados inválidos." };
  const d = p.data;
  if (d.trackingUrl && !/^https:\/\//.test(d.trackingUrl)) return { message: "URL de rastreamento deve começar com https://" };
  if (d.status === "SHIPPED" && !d.trackingCode?.trim()) return { message: "Informe o código de rastreamento para marcar como enviado." };
  await updateFulfillment(d.fulfillmentId, {
    status: d.status,
    supplierOrderId: d.supplierOrderId?.trim() || null,
    carrier: d.carrier?.trim() || null,
    trackingCode: d.trackingCode?.trim().toUpperCase() || null,
    trackingUrl: d.trackingUrl?.trim() || null,
    notes: d.notes?.trim() || null,
    supplierCostCents: d.supplierCost ? parseBRLToCents(d.supplierCost) : null,
  }, user.id);
  revalidatePath(`/admin/pedidos/${d.orderId}`);
  return { ok: true, message: "Fulfillment atualizado." };
}

export async function addOrderNoteAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const user = await assertStaff("orders");
  const p = z.object({ orderId: z.string(), message: z.string().trim().min(2).max(1000), isPublic: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!p.success) return { message: "Escreva a nota." };
  await db.orderEvent.create({ data: { orderId: p.data.orderId, type: "note", message: p.data.message, isPublic: p.data.isPublic === "on", createdBy: user.id } });
  await audit("order.note", { userId: user.id, entity: "order", entityId: p.data.orderId });
  revalidatePath(`/admin/pedidos/${p.data.orderId}`);
  return { ok: true, message: "Nota registrada." };
}
