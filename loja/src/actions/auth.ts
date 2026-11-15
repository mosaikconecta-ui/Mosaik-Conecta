"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getClientIp, isLoginBlocked, isStaff, recordLoginAttempt } from "@/lib/auth";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/lib/crypto";
import { emailSchema, fieldErrors, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import { getCart } from "@/lib/cart";
import { emails } from "@/lib/email";
import { env } from "@/lib/env";
import { audit, logInfo } from "@/lib/audit";

export type AuthState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

/** Evita open redirect: só caminhos internos. */
function safeNext(v: FormDataEntryValue | null, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

async function attachCart(userId: string) {
  const cart = await getCart();
  if (cart && !cart.userId) await db.cart.update({ where: { id: cart.id }, data: { userId } });
}

// hash fictício para equalizar o tempo de resposta quando o e-mail não existe
let dummyHash: string | null = null;

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;
  const ip = await getClientIp();
  if (await isLoginBlocked(email, ip)) return { message: "Muitas tentativas. Aguarde 15 minutos ou redefina sua senha." };
  const user = await db.user.findUnique({ where: { email } });
  dummyHash ??= await hashPassword("dummy-password-1");
  const ok = await verifyPassword(password, user?.passwordHash ?? dummyHash);
  await recordLoginAttempt(email, ip, ok && !!user);
  if (!user || !ok || user.anonymizedAt) return { message: "E-mail ou senha incorretos." };
  await createSession(user.id);
  await attachCart(user.id);
  if (isStaff(user.role)) await audit("auth.staff_login", { userId: user.id, ip });
  redirect(safeNext(formData.get("next"), isStaff(user.role) ? "/admin" : "/conta"));
}

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"), password: formData.get("password"),
    marketingOptIn: formData.get("marketingOptIn") === "on", acceptTerms: formData.get("acceptTerms") === "on",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { errors: { email: "Já existe uma conta com este e-mail. Entre ou recupere sua senha." } };
  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), marketingOptIn: !!parsed.data.marketingOptIn },
  });
  // vincula pedidos anteriores feitos como visitante com o mesmo e-mail
  await db.order.updateMany({ where: { customerEmail: user.email, userId: null }, data: { userId: user.id } });
  await createSession(user.id);
  await attachCart(user.id);
  redirect(safeNext(formData.get("next"), "/conta"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const generic = { ok: true, message: "Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha em instantes." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.anonymizedAt) return generic;
  const recent = await db.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } } });
  if (recent >= 3) return generic;
  const token = randomToken();
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
  const url = `${env.siteUrl}/conta/redefinir-senha?token=${token}`;
  const r = await emails.passwordReset(user.email, user.name, url);
  if (!r.sent && !env.isProd) logInfo("auth.reset", `Link de redefinição (somente desenvolvimento): ${url}`);
  return generic;
}

export async function resetPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ token: z.string().min(20).max(100), password: passwordSchema, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] })
    .safeParse({ token: formData.get("token"), password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { message: "Link inválido ou expirado. Solicite um novo." };
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: rec.userId } }),
  ]);
  await audit("auth.password_reset", { userId: rec.userId, ip: await getClientIp() });
  await createSession(rec.userId);
  redirect("/conta?senha=alterada");
}
