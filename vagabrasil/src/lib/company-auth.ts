import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Company, Plan } from "@/lib/types";

/** Contexto da empresa para Server Actions (sem redirect; retorna erro amigável). */
export async function companyActionContext(opts: { ownerOnly?: boolean } = {}) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "company") return { error: "Acesso restrito a contas empresariais." } as const;
  if (current.profile.status !== "active") return { error: "Sua conta está suspensa." } as const;
  const supabase = await createClient();
  const { data: member } = await supabase.from("company_members").select("role, companies(*)").eq("profile_id", current.user.id).maybeSingle();
  const company = member?.companies as unknown as Company | null;
  if (!member || !company) return { error: "Cadastre sua empresa primeiro." } as const;
  if (opts.ownerOnly && member.role !== "owner") return { error: "Apenas o responsável pela empresa pode fazer isso." } as const;
  const { data: planRow } = await supabase.rpc("company_plan", { p_company: company.id });
  const plan = planRow && (planRow as Plan).id ? (planRow as Plan) : null;
  return { supabase, current, company, plan, memberRole: member.role as "owner" | "recruiter" } as const;
}
