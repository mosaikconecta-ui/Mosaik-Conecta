"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { CheckoutError, createOrderFromCart, getOrderForCustomer, startPayment } from "@/lib/orders";
import { checkoutSchema, emailSchema, fieldErrors } from "@/lib/validation";
import { onlyDigits, ufFromCEP } from "@/lib/br";
import { randomToken, sha256 } from "@/lib/crypto";
import { logError } from "@/lib/audit";

export type PlaceOrderResult =
  | { ok: true; redirectTo: string; orderNumber: string; totalCents: number; paymentStarted: boolean }
  | { ok: false; error?: string; errors?: Record<string, string> };

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), error: "Revise os campos destacados." };
  const data = parsed.data;
  const cepUf = ufFromCEP(data.cep);
  if (cepUf && cepUf !== data.state) return { ok: false, errors: { state: `O CEP informado pertence a ${cepUf}.` } };
  const user = await getCurrentUser();
  try {
    const { order, accessToken } = await createOrderFromCart(data, user?.id ?? null);
    const pay = await startPayment(order.id, accessToken);
    const orderUrl = `/pedido/${order.number}?t=${accessToken}`;
    return { ok: true, redirectTo: pay.ok ? pay.url : `${orderUrl}&aviso=pagamento`, orderNumber: order.number, totalCents: order.totalCents, paymentStarted: pay.ok };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    logError("checkout", err);
    return { ok: false, error: "Não foi possível concluir o pedido agora. Nenhuma cobrança foi feita. Tente novamente." };
  }
}

/** Guarda o contato no carrinho para recuperação de carrinho abandonado. */
export async function saveCheckoutContactAction(email: string, name?: string, phone?: string) {
  const e = emailSchema.safeParse(email);
  if (!e.success) return;
  const cart = await getCart();
  if (!cart) return;
  await db.cart.update({
    where: { id: cart.id },
    data: { email: e.data, name: name?.trim().slice(0, 120) || cart.name, phone: phone ? onlyDigits(phone).slice(0, 11) : cart.phone },
  });
}

/** Nova tentativa de pagamento a partir da página do pedido. */
export async function retryPaymentAction(number: string, token: string | null): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const n = z.string().max(20).safeParse(number);
  if (!n.success) return { ok: false, error: "Pedido inválido." };
  const user = await getCurrentUser();
  const order = await getOrderForCustomer(n.data, { token, userId: user?.id });
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  let accessToken = token;
  if (!accessToken) {
    // cliente logado sem o token do link: gera um novo token de acesso
    accessToken = randomToken(24);
    await db.order.update({ where: { id: order.id }, data: { accessTokenHash: sha256(accessToken) } });
  }
  const r = await startPayment(order.id, accessToken);
  return r.ok ? r : { ok: false, error: r.reason };
}
