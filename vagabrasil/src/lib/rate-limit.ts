import "server-only";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/request";

/**
 * Rate limit por janela fixa, persistido no Postgres (funciona em serverless).
 * Retorna true quando a ação é permitida.
 */
export async function rateLimit(action: string, max: number, windowSeconds: number, identity?: string) {
  if (!hasServiceRole()) return true;
  const key = `${action}:${identity ?? (await clientIp())}`;
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true; // falha aberta para não bloquear usuários legítimos
  }
  return data === true;
}

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
