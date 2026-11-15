import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/** Registra operações importantes (alterações administrativas, pagamentos, acessos sensíveis). */
export async function audit(action: string, opts: { userId?: string | null; entity?: string; entityId?: string; details?: Prisma.InputJsonValue; ip?: string } = {}) {
  try {
    await db.auditLog.create({
      data: { action, userId: opts.userId ?? null, entity: opts.entity, entityId: opts.entityId, details: opts.details, ip: opts.ip },
    });
  } catch (err) {
    // log de auditoria nunca deve derrubar a operação principal
    console.error("[audit] falha ao registrar", action, err);
  }
}

export function logError(scope: string, err: unknown, extra?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", scope, message: err instanceof Error ? err.message : String(err), ...extra, at: new Date().toISOString() }));
}

export function logInfo(scope: string, message: string, extra?: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", scope, message, ...extra, at: new Date().toISOString() }));
}
