"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { companyActionContext } from "@/lib/company-auth";
import { dbErrorMessage, invalid, type ActionResult } from "@/lib/actions";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { processEmailQueue } from "@/lib/notifications";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { planAllows } from "@/lib/plan";
import { SITE_URL } from "@/lib/env";
import { APPLICATION_STATUS_KEYS, MAX_LOGO_BYTES } from "@/lib/constants";
import { companySchema, inviteSchema } from "@/lib/validation/company";
import { jobSchema } from "@/lib/validation/job";

const uuid = z.string().uuid();

// ---------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------
export async function createCompanyAction(input: unknown): Promise<ActionResult<never>> {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "company") return { ok: false, error: "Acesso restrito a contas empresariais." };
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("company-create", 5, 3600, current.user.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.from("companies").insert({
    ...d, phone: d.phone ?? null, website: d.website ?? null, address: d.address ?? null, description: d.description ?? null,
    slug: "pendente", owner_id: current.user.id,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  redirect("/empresa?empresa=criada");
}

export async function updateCompanyAction(input: unknown): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const { error } = await ctx.supabase.from("companies").update({
    ...d, phone: d.phone ?? null, website: d.website ?? null, address: d.address ?? null, description: d.description ?? null,
  }).eq("id", ctx.company.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/empresa", "layout");
  const reverify = d.cnpj !== ctx.company.cnpj || d.legal_name !== ctx.company.legal_name;
  return { ok: true, message: reverify ? "Dados salvos. A alteração de CNPJ/razão social exige nova verificação." : "Dados da empresa salvos." };
}

function sniffImage(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "webp";
  return null;
}
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

export async function uploadLogoAction(formData: FormData): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecione uma imagem." };
  if (file.size > MAX_LOGO_BYTES) return { ok: false, error: "A imagem deve ter no máximo 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Formato inválido. Use PNG, JPG ou WEBP." };
  const path = `${ctx.company.id}/logo-${crypto.randomUUID()}.${kind}`;
  const up = await ctx.supabase.storage.from("company-logos").upload(path, bytes, { contentType: MIME[kind], cacheControl: "31536000" });
  if (up.error) return { ok: false, error: "Falha ao enviar a imagem." };
  const old = ctx.company.logo_path;
  const { error } = await ctx.supabase.from("companies").update({ logo_path: path }).eq("id", ctx.company.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (old) await ctx.supabase.storage.from("company-logos").remove([old]);
  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Logotipo atualizado." };
}

export async function submitVerificationAction(formData: FormData): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (ctx.company.verification_status === "verified") return { ok: false, error: "Sua empresa já está verificada." };
  if (!(await rateLimit("verification", 5, 86400, ctx.company.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Anexe o cartão CNPJ ou contrato social." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "O arquivo deve ter no máximo 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const img = sniffImage(bytes);
  if (!isPdf && img !== "png" && img !== "jpg") return { ok: false, error: "Envie um PDF, PNG ou JPG." };
  const ext = isPdf ? "pdf" : img!;
  const path = `${ctx.company.id}/verificacao-${Date.now()}.${ext}`;
  const up = await ctx.supabase.storage.from("company-documents").upload(path, bytes, { contentType: isPdf ? "application/pdf" : MIME[img!] });
  if (up.error) return { ok: false, error: "Falha ao enviar o documento." };
  const { error } = await ctx.supabase.from("company_verifications").insert({
    company_id: ctx.company.id, status: "pending", document_path: path, submitted_by: ctx.current.user.id,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/empresa/perfil");
  return { ok: true, message: "Documento enviado. A verificação é feita em até 2 dias úteis." };
}

// ---------------------------------------------------------------------
// Vagas
// ---------------------------------------------------------------------
export async function saveJobAction(jobId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("job-save", 60, 3600, ctx.current.user.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const { publish, ...d } = parsed.data;
  const row = {
    ...d,
    responsibilities: d.responsibilities ?? null, requirements: d.requirements ?? null, benefits: d.benefits ?? null,
    schedule: d.schedule ?? null, application_deadline: d.application_deadline ?? null,
  };

  if (jobId) {
    if (!uuid.safeParse(jobId).success) return { ok: false, error: "Vaga inválida." };
    const update: Record<string, unknown> = { ...row };
    if (publish) update.status = "active";
    const { error } = await ctx.supabase.from("jobs").update(update).eq("id", jobId).eq("company_id", ctx.company.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/empresa/vagas");
    return { ok: true, message: "Vaga atualizada.", data: { id: jobId } };
  }

  const { data, error } = await ctx.supabase.from("jobs")
    .insert({ ...row, company_id: ctx.company.id, slug: "pendente", city_slug: "pendente", status: publish ? "active" : "draft" })
    .select("id, status").single();
  if (error) {
    // Se não puder publicar (plano/limite), salva como rascunho para não perder o conteúdo
    if (publish && /NO_ACTIVE_PLAN|PLAN_JOB_LIMIT|COMPANY_SUSPENDED/.test(error.message)) {
      const draft = await ctx.supabase.from("jobs").insert({ ...row, company_id: ctx.company.id, slug: "pendente", city_slug: "pendente", status: "draft" }).select("id").single();
      if (!draft.error) {
        revalidatePath("/empresa/vagas");
        return { ok: false, error: `${dbErrorMessage(error)} A vaga foi salva como rascunho.` };
      }
    }
    return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/empresa/vagas");
  const msg = data.status === "pending_review"
    ? "Vaga enviada para análise. Ela será publicada após a aprovação da moderação."
    : data.status === "active" ? "Vaga publicada!" : "Rascunho salvo.";
  return { ok: true, message: msg, data: { id: data.id } };
}

const JOB_TRANSITIONS = { pause: "paused", reopen: "active", close: "closed", publish: "active" } as const;

export async function setJobStatusAction(jobId: string, action: keyof typeof JOB_TRANSITIONS): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(jobId).success || !(action in JOB_TRANSITIONS)) return { ok: false, error: "Ação inválida." };
  const { data: job } = await ctx.supabase.from("jobs").select("status").eq("id", jobId).eq("company_id", ctx.company.id).maybeSingle();
  if (!job) return { ok: false, error: "Vaga não encontrada." };
  const allowedFrom: Record<string, string[]> = {
    pause: ["active"], reopen: ["paused", "closed"], close: ["active", "paused", "pending_review"], publish: ["draft"],
  };
  if (!allowedFrom[action]!.includes(job.status)) return { ok: false, error: "Esta ação não está disponível para o status atual da vaga." };
  const { error } = await ctx.supabase.from("jobs").update({ status: JOB_TRANSITIONS[action] }).eq("id", jobId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/empresa", "layout");
  return { ok: true };
}

export async function deleteDraftAction(jobId: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error, count } = await ctx.supabase.from("jobs").delete({ count: "exact" }).eq("id", jobId).eq("company_id", ctx.company.id).eq("status", "draft");
  if (error || !count) return { ok: false, error: "Somente rascunhos podem ser excluídos." };
  revalidatePath("/empresa/vagas");
  return { ok: true };
}

export async function toggleFeaturedAction(jobId: string, featured: boolean): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.supabase.rpc("set_job_featured", { p_job: jobId, p_featured: featured });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/empresa/vagas");
  return { ok: true, message: featured ? "Vaga destacada." : "Destaque removido." };
}

// ---------------------------------------------------------------------
// Candidaturas
// ---------------------------------------------------------------------
export async function updateApplicationStatusAction(applicationId: string, status: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!uuid.safeParse(applicationId).success || !APPLICATION_STATUS_KEYS.includes(status as never)) return { ok: false, error: "Status inválido." };
  const { error, count } = await ctx.supabase.from("applications").update({ status }, { count: "exact" }).eq("id", applicationId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!count) return { ok: false, error: "Candidatura não encontrada." };
  after(() => processEmailQueue(20));
  revalidatePath("/empresa/candidatos", "layout");
  return { ok: true, message: "Status atualizado. O candidato foi notificado." };
}

export async function addApplicationNoteAction(applicationId: string, body: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!planAllows(ctx.plan, "pipeline")) return { ok: false, error: "Anotações fazem parte da Gestão de processos seletivos (plano Profissional ou superior)." };
  const text = body.trim();
  if (!text || text.length > 2000) return { ok: false, error: "A anotação deve ter entre 1 e 2000 caracteres." };
  const { error } = await ctx.supabase.from("application_notes").insert({ application_id: applicationId, author_id: ctx.current.user.id, body: text });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath(`/empresa/candidatos/${applicationId}`);
  return { ok: true, message: "Anotação adicionada." };
}

// ---------------------------------------------------------------------
// Equipe (plano Empresarial)
// ---------------------------------------------------------------------
export async function inviteRecruiterAction(input: unknown): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!planAllows(ctx.plan, "team_management")) return { ok: false, error: "A gestão de equipe está disponível no plano Empresarial." };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("invite", 20, 86400, ctx.company.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const [{ count: members }, { count: pending }] = await Promise.all([
    ctx.supabase.from("company_members").select("profile_id", { count: "exact", head: true }).eq("company_id", ctx.company.id),
    ctx.supabase.from("company_invites").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.id).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  if ((members ?? 0) + (pending ?? 0) >= (ctx.plan?.max_recruiters ?? 1)) return { ok: false, error: "Limite de recrutadores do plano atingido." };
  const { data, error } = await ctx.supabase.from("company_invites")
    .insert({ company_id: ctx.company.id, email: parsed.data.email, invited_by: ctx.current.user.id }).select("token").single();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  const link = `${SITE_URL}/convite/${data.token}`;
  await sendEmail({
    to: parsed.data.email,
    subject: `Convite para recrutar na ${ctx.company.trade_name}`,
    html: emailLayout({
      title: `Você foi convidado para a equipe da ${escapeHtml(ctx.company.trade_name)}`,
      body: `<p>${escapeHtml(ctx.current.profile.full_name)} convidou você para gerenciar vagas e candidatos no VagaBrasil. O convite expira em 7 dias.</p>`,
      cta: { label: "Aceitar convite", href: link },
    }),
  });
  revalidatePath("/empresa/equipe");
  return { ok: true, message: `Convite enviado para ${parsed.data.email}.` };
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  await ctx.supabase.from("company_invites").delete().eq("id", inviteId).eq("company_id", ctx.company.id);
  revalidatePath("/empresa/equipe");
  return { ok: true };
}

export async function removeMemberAction(profileId: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error, count } = await ctx.supabase.from("company_members").delete({ count: "exact" }).eq("company_id", ctx.company.id).eq("profile_id", profileId).neq("role", "owner");
  if (error || !count) return { ok: false, error: "Não foi possível remover o membro." };
  revalidatePath("/empresa/equipe");
  return { ok: true, message: "Recrutador removido." };
}

/** Aceite de convite: usa service_role após validar token, e-mail e papel do usuário. */
export async function acceptInviteAction(token: string): Promise<ActionResult<never>> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: "Entre na sua conta para aceitar o convite." };
  if (current.profile.role !== "company") return { ok: false, error: "Convites são aceitos apenas com contas empresariais. Crie uma conta empresarial com este e-mail." };
  if (!/^[a-f0-9]{48}$/.test(token) || !hasServiceRole()) return { ok: false, error: "Convite inválido." };
  const admin = createAdminClient();
  const { data: invite } = await admin.from("company_invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) return { ok: false, error: "Convite inválido ou expirado." };
  if (invite.email.toLowerCase() !== current.profile.email.toLowerCase()) return { ok: false, error: "Este convite foi enviado para outro e-mail." };
  const { data: existing } = await admin.from("company_members").select("company_id").eq("profile_id", current.user.id).maybeSingle();
  if (existing) return { ok: false, error: "Sua conta já está vinculada a uma empresa." };
  const { error } = await admin.from("company_members").insert({ company_id: invite.company_id, profile_id: current.user.id, role: "recruiter" });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await admin.from("company_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  redirect("/empresa");
}
