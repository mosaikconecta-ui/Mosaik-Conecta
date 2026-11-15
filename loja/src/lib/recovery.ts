import "server-only";
import { db } from "./db";
import { env, integrations, store } from "./env";
import { emails } from "./email";
import { randomToken } from "./crypto";
import { formatBRL } from "./format";

export const recoveryUrl = (token: string) => `${env.siteUrl}/carrinho/recuperar/${token}`;

/** Gera (ou reaproveita) o link de recuperação do carrinho. */
export async function ensureRecoveryToken(cartId: string) {
  const cart = await db.cart.findUniqueOrThrow({ where: { id: cartId } });
  if (cart.recoveryToken) return cart.recoveryToken;
  const token = randomToken(18);
  await db.cart.update({ where: { id: cartId }, data: { recoveryToken: token } });
  return token;
}

export function whatsappRecoveryLink(phone: string | null, name: string | null, url: string) {
  if (!phone) return null;
  const text = encodeURIComponent(`Olá${name ? `, ${name.split(" ")[0]}` : ""}! Aqui é da Mosaik. Seus itens continuam reservados na sacola: ${url}`);
  return `https://wa.me/55${phone.replace(/\D/g, "")}?text=${text}`;
}

/** Envia o e-mail de recuperação (requer RESEND_API_KEY). */
export async function sendAbandonedCartRecovery(cartId: string): Promise<{ ok: boolean; message: string }> {
  const cart = await db.cart.findUnique({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: true } } } } } });
  if (!cart || !cart.email || cart.convertedAt || cart.items.length === 0) return { ok: false, message: "Carrinho sem e-mail, vazio ou já convertido." };
  if (!integrations.email()) return { ok: false, message: "Envio de e-mail não configurado (RESEND_API_KEY). Use o link do WhatsApp ou copie o link." };
  const token = await ensureRecoveryToken(cart.id);
  const items = cart.items.map((i) => `${i.quantity}× ${i.variant.product.name} — ${formatBRL((i.variant.priceCents ?? i.variant.product.priceCents) * i.quantity)}`);
  const r = await emails.abandonedCart(cart.email, cart.name, recoveryUrl(token), items);
  if (r.sent) await db.cart.update({ where: { id: cart.id }, data: { recoverySentAt: new Date() } });
  return r.sent ? { ok: true, message: "E-mail de recuperação enviado." } : { ok: false, message: "Falha ao enviar o e-mail." };
}

/** Processamento automático (cron): carrinhos com e-mail, parados há mais de X minutos, ainda sem lembrete. */
export async function processAbandonedCarts(limit = 50) {
  const before = new Date(Date.now() - store.abandonedCartAfterMinutes * 60_000);
  const after = new Date(Date.now() - 7 * 86400_000);
  const carts = await db.cart.findMany({
    where: { convertedAt: null, recoverySentAt: null, email: { not: null }, items: { some: {} }, updatedAt: { lt: before, gt: after } },
    select: { id: true },
    take: limit,
  });
  let sent = 0;
  for (const c of carts) if ((await sendAbandonedCartRecovery(c.id)).ok) sent++;
  return { candidates: carts.length, sent };
}
