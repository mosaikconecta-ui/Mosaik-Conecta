"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { dbErrorMessage, invalid, type ActionResult } from "@/lib/actions";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation/job";

export async function reportJobAction(input: unknown): Promise<ActionResult<never>> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: "Entre na sua conta para denunciar uma vaga." };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("report", 10, 3600, current.user.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const supabase = await createClient();
  const { data: job } = await supabase.from("public_jobs").select("id, company_id").eq("id", parsed.data.job_id).maybeSingle();
  if (!job) return { ok: false, error: "Vaga não encontrada." };
  const { error } = await supabase.from("reports").insert({
    reporter_id: current.user.id,
    job_id: job.id,
    company_id: job.company_id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true, message: "Denúncia enviada. Nossa equipe vai analisar em breve. Obrigado!" };
}
