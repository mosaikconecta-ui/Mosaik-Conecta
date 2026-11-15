import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { processAbandonedCarts } from "@/lib/recovery";
import { setOrderStatus } from "@/lib/orders";
import { logError, logInfo } from "@/lib/audit";

/**
 * Tarefas periódicas (agende a cada 30–60 min, ex.: Vercel Cron ou crontab):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://sualoja.com.br/api/cron
 * - lembretes de carrinho abandonado
 * - cancelamento de pedidos não pagos após 3 dias
 * - limpeza de sessões expiradas e tentativas de login antigas
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!env.cronSecret || !safeEqual(auth, `Bearer ${env.cronSecret}`)) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const result: Record<string, unknown> = {};
  try {
    result.abandonedCarts = await processAbandonedCarts();
    const stale = await db.order.findMany({ where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(Date.now() - 3 * 86400_000) } }, select: { id: true }, take: 100 });
    for (const o of stale) await setOrderStatus(o.id, "CANCELLED", null, "Pedido cancelado automaticamente por falta de pagamento em 3 dias.");
    result.cancelledUnpaid = stale.length;
    result.sessionsCleaned = (await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count;
    result.loginAttemptsCleaned = (await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 86400_000) } } })).count;
    result.oldCartsCleaned = (await db.cart.deleteMany({ where: { convertedAt: null, updatedAt: { lt: new Date(Date.now() - 90 * 86400_000) } } })).count;
    logInfo("cron", "execução concluída", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError("cron", err);
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }
}
