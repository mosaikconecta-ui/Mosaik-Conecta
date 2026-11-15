import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";

export const SESSION_COOKIE = "mk_session";
const SESSION_DAYS = 30;

export type Permission =
  | "dashboard" | "orders" | "customers" | "carts" | "products" | "catalog"
  | "coupons" | "suppliers" | "shipping" | "reviews" | "logs" | "users";

const PERMISSIONS: Record<Role, Permission[]> = {
  CUSTOMER: [],
  OPERATOR: ["dashboard", "orders", "customers", "carts", "suppliers", "reviews"],
  ADMIN: ["dashboard", "orders", "customers", "carts", "products", "catalog", "coupons", "suppliers", "shipping", "reviews", "logs", "users"],
};

export const can = (role: Role, perm: Permission) => PERMISSIONS[role].includes(perm);
export const isStaff = (role: Role) => role === "ADMIN" || role === "OPERATOR";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function createSession(userId: string) {
  const token = randomToken();
  const h = await headers();
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "phone" | "cpf">;

/** Usuário da sessão atual (memoizado por requisição). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, cpf: true, anonymizedAt: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.anonymizedAt) return null;
  const { anonymizedAt: _a, ...user } = session.user;
  return user;
});

export async function requireUser(next = "/conta"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/conta/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Protege páginas e ações administrativas. Usuário sem permissão recebe 404 (não revela o painel). */
export async function requireStaff(perm: Permission = "dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/conta/entrar?next=/admin`);
  if (!can(user.role, perm)) redirect("/admin/sem-permissao");
  return user;
}

/** Para ações (server actions / route handlers): lança erro em vez de redirecionar. */
export async function assertStaff(perm: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, perm)) throw new Error("Operação não autorizada.");
  return user;
}

// ── Limite de tentativas de login (força bruta) ──
const WINDOW_MS = 15 * 60_000;

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { key: `e:${email}`, success: false, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { key: `i:${ip}`, success: false, createdAt: { gte: since } } }),
  ]);
  return byEmail >= 5 || byIp >= 25;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await db.loginAttempt.createMany({ data: [{ key: `e:${email}`, success }, { key: `i:${ip}`, success }] });
}
