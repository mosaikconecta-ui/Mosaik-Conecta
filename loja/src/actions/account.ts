"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, requireUser } from "@/lib/auth";
import { verifyPassword, randomToken } from "@/lib/crypto";
import { addressSchema, fieldErrors, profileSchema, reviewSchema } from "@/lib/validation";
import { onlyDigits } from "@/lib/br";
import { audit } from "@/lib/audit";

export type AccountState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

export async function updateProfileAction(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name"), phone: formData.get("phone"), cpf: formData.get("cpf"), marketingOptIn: formData.get("marketingOptIn") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ? onlyDigits(parsed.data.phone) : null, cpf: parsed.data.cpf ? onlyDigits(parsed.data.cpf) : null, marketingOptIn: !!parsed.data.marketingOptIn },
  });
  revalidatePath("/conta/dados");
  return { ok: true, message: "Dados atualizados." };
}

export async function addAddressAction(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse({ ...Object.fromEntries(formData), isDefault: formData.get("isDefault") === "on" });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 10) return { message: "Limite de 10 endereços." };
  const makeDefault = parsed.data.isDefault || count === 0;
  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.create({
      data: {
        userId: user.id, label: parsed.data.label || "Endereço", recipient: parsed.data.recipient, cep: onlyDigits(parsed.data.cep),
        street: parsed.data.street, number: parsed.data.number, complement: parsed.data.complement || null, district: parsed.data.district,
        city: parsed.data.city, state: parsed.data.state, isDefault: makeDefault,
      },
    });
  });
  revalidatePath("/conta/enderecos");
  return { ok: true, message: "Endereço salvo." };
}

export async function deleteAddressAction(id: string) {
  const user = await requireUser();
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/conta/enderecos");
}

export async function setDefaultAddressAction(id: string) {
  const user = await requireUser();
  const addr = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!addr) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/conta/enderecos");
}

/** LGPD — eliminação: anonimiza a conta. Pedidos são mantidos de forma anonimizada pelo prazo fiscal. */
export async function deleteAccountAction(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!password.success) return { errors: { password: "Confirme com sua senha." } };
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password.data, full.passwordHash))) return { errors: { password: "Senha incorreta." } };
  const anonEmail = `removido-${randomToken(8)}@anonimo.invalid`;
  await db.$transaction([
    db.address.deleteMany({ where: { userId: user.id } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.cart.updateMany({ where: { userId: user.id }, data: { email: null, phone: null, name: null } }),
    db.review.updateMany({ where: { userId: user.id }, data: { authorName: "Cliente" } }),
    db.user.update({ where: { id: user.id }, data: { name: "Conta removida", email: anonEmail, phone: null, cpf: null, marketingOptIn: false, anonymizedAt: new Date(), passwordHash: "removed" } }),
  ]);
  await db.newsletterSubscriber.updateMany({ where: { email: full.email }, data: { unsubscribedAt: new Date() } });
  await audit("lgpd.account_deleted", { userId: user.id });
  await destroySession();
  redirect("/?conta=removida");
}

export async function submitReviewAction(_: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const item = await db.orderItem.findUnique({ where: { id: parsed.data.orderItemId }, include: { order: true, review: true } });
  if (!item || item.order.userId !== user.id) return { message: "Item não encontrado." };
  if (item.order.status !== "DELIVERED") return { message: "Você poderá avaliar assim que o pedido for entregue." };
  if (item.review) return { message: "Você já avaliou este item." };
  await db.review.create({
    data: {
      productId: item.productId, userId: user.id, orderItemId: item.id, authorName: `${user.name.split(" ")[0]} ${user.name.split(" ").slice(-1)[0]?.[0] ?? ""}.`.trim(),
      rating: parsed.data.rating, title: parsed.data.title || null, body: parsed.data.body,
    },
  });
  return { ok: true, message: "Obrigado! Sua avaliação será publicada após moderação." };
}
