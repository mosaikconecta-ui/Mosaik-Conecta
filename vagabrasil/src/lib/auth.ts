import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Company, Plan, Profile, Role, Subscription } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return { user, profile };
});

export function homeForRole(role: Role) {
  return role === "admin" ? "/admin" : role === "company" ? "/empresa" : "/candidato";
}

export async function requireRole(role: Role, from?: string) {
  const current = await getCurrentUser();
  if (!current) redirect(`/entrar${from ? `?redirect=${encodeURIComponent(from)}` : ""}`);
  if (current.profile.status === "suspended") redirect("/conta-suspensa");
  if (current.profile.role !== role) redirect(homeForRole(current.profile.role));
  return current;
}

export const requireCandidate = () => requireRole("candidate", "/candidato");
export const requireAdmin = () => requireRole("admin", "/admin");

export interface CompanyContext {
  profile: Profile;
  userId: string;
  company: Company;
  memberRole: "owner" | "recruiter";
  plan: Plan | null;
  subscription: Subscription | null;
}

/** Usuário empresarial com empresa cadastrada (senão, envia ao onboarding). */
export const requireCompany = cache(async (): Promise<CompanyContext> => {
  const { user, profile } = await requireRole("company", "/empresa");
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("company_members")
    .select("role, companies(*)")
    .eq("profile_id", user.id)
    .maybeSingle();
  const company = (member?.companies ?? null) as unknown as Company | null;
  if (!member || !company) redirect("/empresa/cadastro");

  const [{ data: planRow }, { data: subscription }] = await Promise.all([
    supabase.rpc("company_plan", { p_company: company.id }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Subscription>(),
  ]);
  const plan = planRow && (planRow as Plan).id ? (planRow as Plan) : null;
  return { profile, userId: user.id, company, memberRole: member.role as "owner" | "recruiter", plan, subscription };
});
