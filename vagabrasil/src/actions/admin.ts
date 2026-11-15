"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit";
import { notifyCompanyOwners, notifyUser } from "@/lib/notifications";
import { dbErrorMessage, type ActionResult } from "@/lib/actions";

async function adminContext() {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin" || current.profile.status !== "active") return { error: "Acesso negado." } as const;
  if (!hasServiceRole()) return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada." } as const;
  return { adminId: current.user.id, db: createAdminClient() } as const;
}

const uuid = z.string().uuid();
const note = z.string().trim().max(1000).optional();

export async function reviewCompanyAction(companyId: string, decision: "verified" | "rejected", notes?: string): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(companyId).success || !["verified", "rejected"].includes(decision)) return { ok: false, error: "Dados inválidos." };
  const n = note.parse(notes);
  if (decision === "rejected" && !n) return { ok: false, error: "Informe o motivo da recusa." };
  const now = new Date().toISOString();
  const { error } = await ctx.db.from("companies").update({ verification_status: decision }).eq("id", companyId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await ctx.db.from("company_verifications").insert({ company_id: companyId, status: decision, notes: n ?? null, reviewed_by: ctx.adminId, reviewed_at: now });
  await logAdminAction(ctx.adminId, `company.${decision}`, "company", companyId, { notes: n });
  await notifyCompanyOwners(companyId, "company_verification",
    decision === "verified" ? "Empresa verificada!" : "Verificação da empresa recusada",
    decision === "verified" ? "Sua empresa foi verificada. Novas vagas serão publicadas imediatamente." : `Motivo: ${n}. Corrija os dados e envie um novo documento.`,
    "/empresa/perfil");
  revalidatePath("/admin", "layout");
  return { ok: true, message: decision === "verified" ? "Empresa verificada." : "Verificação recusada." };
}

export async function setCompanyStatusAction(companyId: string, status: "active" | "suspended", reason?: string): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(companyId).success) return { ok: false, error: "Empresa inválida." };
  const { error } = await ctx.db.from("companies").update({ status }).eq("id", companyId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await logAdminAction(ctx.adminId, `company.${status === "suspended" ? "suspend" : "reactivate"}`, "company", companyId, { reason });
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "suspended" ? "Empresa suspensa. As vagas deixaram de ser exibidas." : "Empresa reativada." };
}

export async function moderateJobAction(jobId: string, action: "approve" | "reject" | "remove" | "restore", reason?: string): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(jobId).success) return { ok: false, error: "Vaga inválida." };
  const n = note.parse(reason);
  if ((action === "reject" || action === "remove") && !n) return { ok: false, error: "Informe o motivo." };
  const { data: job } = await ctx.db.from("jobs").select("id, title, company_id, status").eq("id", jobId).single();
  if (!job) return { ok: false, error: "Vaga não encontrada." };
  const update =
    action === "approve" ? { status: "active", moderation_note: null } :
    action === "reject" ? { status: "draft", moderation_note: n } :
    action === "remove" ? { status: "removed", moderation_note: n, is_featured: false } :
    { status: "paused", moderation_note: null };
  const { error } = await ctx.db.from("jobs").update(update).eq("id", jobId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (action === "remove") {
    // Encerra candidaturas em andamento de vagas fraudulentas
    await ctx.db.from("applications").update({ status: "closed" }).eq("job_id", jobId).in("status", ["received", "in_review", "in_process"]);
  }
  await logAdminAction(ctx.adminId, `job.${action}`, "job", jobId, { title: job.title, reason: n, previous: job.status });
  const msgs = {
    approve: ["Vaga aprovada", `A vaga "${job.title}" foi aprovada e já está publicada.`],
    reject: ["Vaga precisa de ajustes", `A vaga "${job.title}" voltou para rascunho. Motivo: ${n}`],
    remove: ["Vaga removida pela moderação", `A vaga "${job.title}" foi removida por violar os termos de uso. Motivo: ${n}`],
    restore: ["Vaga restaurada", `A vaga "${job.title}" foi restaurada como pausada.`],
  } as const;
  await notifyCompanyOwners(job.company_id, "job_moderation", msgs[action][0], msgs[action][1], "/empresa/vagas");
  revalidatePath("/admin", "layout");
  return { ok: true, message: msgs[action][0] + "." };
}

export async function setUserStatusAction(userId: string, status: "active" | "suspended", reason?: string): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Usuário inválido." };
  if (userId === ctx.adminId) return { ok: false, error: "Você não pode suspender a própria conta." };
  const { data: target } = await ctx.db.from("profiles").select("role").eq("id", userId).single();
  if (target?.role === "admin") return { ok: false, error: "Contas de administrador não podem ser suspensas por aqui." };
  const { error } = await ctx.db.from("profiles").update({ status, suspended_reason: status === "suspended" ? (reason ?? null) : null }).eq("id", userId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  // Bloqueia também o login no Supabase Auth
  await ctx.db.auth.admin.updateUserById(userId, { ban_duration: status === "suspended" ? "876000h" : "none" });
  await logAdminAction(ctx.adminId, `user.${status === "suspended" ? "suspend" : "reactivate"}`, "profile", userId, { reason });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: status === "suspended" ? "Conta suspensa." : "Conta reativada." };
}

export async function resolveReportAction(reportId: string, outcome: "resolved" | "dismissed" | "reviewing", resolution?: string): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(reportId).success) return { ok: false, error: "Denúncia inválida." };
  const r = note.parse(resolution);
  const { data: report, error } = await ctx.db.from("reports").update({
    status: outcome, resolution: r ?? null,
    resolved_by: outcome === "reviewing" ? null : ctx.adminId, resolved_at: outcome === "reviewing" ? null : new Date().toISOString(),
  }).eq("id", reportId).select("reporter_id").single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await logAdminAction(ctx.adminId, `report.${outcome}`, "report", reportId, { resolution: r });
  if (report?.reporter_id && outcome !== "reviewing") {
    await notifyUser(report.reporter_id, "report_update", "Sua denúncia foi analisada", "Obrigado por ajudar a manter o VagaBrasil seguro. Nossa equipe concluiu a análise.", undefined);
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Denúncia atualizada." };
}

const settingsSchema = z.object({
  require_job_approval: z.boolean(),
  featured_job_price_cents: z.coerce.number().int().min(0).max(1_000_000),
  featured_job_days: z.coerce.number().int().min(1).max(365),
  signups_enabled: z.boolean(),
  support_email: z.string().email(),
});

export async function updateSettingsAction(input: unknown): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valores inválidos." };
  const rows = Object.entries(parsed.data).map(([key, value]) => ({ key, value, updated_by: ctx.adminId, updated_at: new Date().toISOString() }));
  const { error } = await ctx.db.from("platform_settings").upsert(rows);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await logAdminAction(ctx.adminId, "settings.update", "platform_settings", null, parsed.data);
  revalidatePath("/admin/configuracoes");
  return { ok: true, message: "Configurações salvas." };
}

export async function setTestimonialAction(id: string, approved: boolean): Promise<ActionResult<never>> {
  const ctx = await adminContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(id).success) return { ok: false, error: "Inválido." };
  await ctx.db.from("testimonials").update({ approved }).eq("id", id);
  await logAdminAction(ctx.adminId, approved ? "testimonial.approve" : "testimonial.hide", "testimonial", id);
  revalidatePath("/admin/configuracoes");
  return { ok: true };
}
