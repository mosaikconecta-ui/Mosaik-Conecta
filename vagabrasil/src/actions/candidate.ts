"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { dbErrorMessage, invalid, type ActionResult } from "@/lib/actions";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { processEmailQueue } from "@/lib/notifications";
import { MAX_RESUME_BYTES } from "@/lib/constants";
import { preferencesSchema, privacySchema, profileSchema, resumeSchema } from "@/lib/validation/candidate";
import { optionalText } from "@/lib/validation/common";

async function candidateOrError() {
  const current = await getCurrentUser();
  if (!current) return { error: "Faça login como candidato para continuar." } as const;
  if (current.profile.status !== "active") return { error: "Sua conta está suspensa." } as const;
  if (current.profile.role !== "candidate") return { error: "Esta ação é exclusiva para candidatos." } as const;
  return { current } as const;
}

const applySchema = z.object({
  job_id: z.string().uuid(),
  resume_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
  cover_letter: optionalText(3000),
});

export async function applyToJobAction(input: unknown): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("apply", 40, 3600, auth.current.user.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = await createClient();
  const { data: candidate } = await supabase.from("candidates").select("headline, experiences, summary").eq("id", auth.current.user.id).single();
  const { count: resumes } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("candidate_id", auth.current.user.id);
  const hasCv = Boolean(resumes) || Boolean(candidate?.summary) || ((candidate?.experiences as unknown[]) ?? []).length > 0;
  if (!hasCv) {
    return { ok: false, error: "Complete seu currículo (resumo, experiências ou PDF) antes de se candidatar." };
  }

  const { error } = await supabase.from("applications").insert({
    job_id: parsed.data.job_id,
    candidate_id: auth.current.user.id,
    resume_id: parsed.data.resume_id ?? null,
    cover_letter: parsed.data.cover_letter ?? null,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  after(() => processEmailQueue(20));
  revalidatePath("/candidato/candidaturas");
  return { ok: true, message: "Candidatura enviada! Acompanhe o status no seu painel." };
}

export async function withdrawApplicationAction(applicationId: string): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  if (!z.string().uuid().safeParse(applicationId).success) return { ok: false, error: "Candidatura inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ status: "closed" }).eq("id", applicationId).eq("candidate_id", auth.current.user.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/candidato/candidaturas");
  return { ok: true, message: "Candidatura encerrada." };
}

export async function toggleSavedJobAction(jobId: string, save: boolean): Promise<ActionResult<{ saved: boolean }>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  if (!z.string().uuid().safeParse(jobId).success) return { ok: false, error: "Vaga inválida." };
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_jobs").upsert({ candidate_id: auth.current.user.id, job_id: jobId })
    : await supabase.from("saved_jobs").delete().eq("candidate_id", auth.current.user.id).eq("job_id", jobId);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/candidato/vagas-salvas");
  return { ok: true, data: { saved: save } };
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const uid = auth.current.user.id;
  const [p, c] = await Promise.all([
    supabase.from("profiles").update({ full_name: d.full_name, phone: d.phone ?? null, city: d.city, state: d.state }).eq("id", uid),
    supabase.from("candidates").update({ headline: d.headline ?? null, summary: d.summary ?? null, linkedin_url: d.linkedin_url ?? null }).eq("id", uid),
  ]);
  if (p.error || c.error) return { ok: false, error: dbErrorMessage(p.error ?? c.error) };
  revalidatePath("/candidato", "layout");
  return { ok: true, message: "Dados pessoais salvos." };
}

export async function updateResumeAction(input: unknown): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const parsed = resumeSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update(parsed.data).eq("id", auth.current.user.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/candidato", "layout");
  return { ok: true, message: "Currículo atualizado." };
}

export async function updatePreferencesAction(input: unknown): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update(parsed.data).eq("id", auth.current.user.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/candidato", "layout");
  return { ok: true, message: "Preferências salvas." };
}

export async function updatePrivacyAction(input: unknown): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { marketing_consent, ...rest } = parsed.data;
  const supabase = await createClient();
  const uid = auth.current.user.id;
  const [a, b] = await Promise.all([
    supabase.from("candidates").update(rest).eq("id", uid),
    supabase.from("profiles").update({ marketing_consent }).eq("id", uid),
  ]);
  if (a.error || b.error) return { ok: false, error: dbErrorMessage(a.error ?? b.error) };
  revalidatePath("/candidato/privacidade");
  return { ok: true, message: "Configurações de privacidade salvas." };
}

/** Upload de currículo em PDF para o bucket privado "resumes". */
export async function uploadResumeAction(formData: FormData): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  if (!(await rateLimit("resume-upload", 10, 3600, auth.current.user.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecione um arquivo PDF." };
  if (file.size > MAX_RESUME_BYTES) return { ok: false, error: "O arquivo deve ter no máximo 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Verifica a assinatura real do arquivo (%PDF-), não apenas a extensão
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  if (!isPdf || file.type !== "application/pdf") return { ok: false, error: "Envie um arquivo PDF válido." };

  const uid = auth.current.user.id;
  const supabase = await createClient();
  const { count } = await supabase.from("resumes").select("id", { count: "exact", head: true }).eq("candidate_id", uid);
  if ((count ?? 0) >= 3) return { ok: false, error: "Você pode manter até 3 currículos. Exclua um para enviar outro." };

  const path = `${uid}/${crypto.randomUUID()}.pdf`;
  const up = await supabase.storage.from("resumes").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error) return { ok: false, error: "Falha no envio do arquivo. Tente novamente." };
  const safeName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "curriculo.pdf";
  await supabase.from("resumes").update({ is_primary: false }).eq("candidate_id", uid);
  const { error } = await supabase.from("resumes").insert({ candidate_id: uid, storage_path: path, file_name: safeName, size_bytes: file.size, is_primary: true });
  if (error) {
    await supabase.storage.from("resumes").remove([path]);
    return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath("/candidato", "layout");
  return { ok: true, message: "Currículo enviado." };
}

export async function deleteResumeAction(resumeId: string): Promise<ActionResult<never>> {
  const auth = await candidateOrError();
  if ("error" in auth) return { ok: false, error: auth.error! };
  const supabase = await createClient();
  const { data: resume } = await supabase.from("resumes").select("id, storage_path").eq("id", resumeId).eq("candidate_id", auth.current.user.id).maybeSingle();
  if (!resume) return { ok: false, error: "Currículo não encontrado." };
  await supabase.storage.from("resumes").remove([resume.storage_path]);
  const { error } = await supabase.from("resumes").delete().eq("id", resume.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/candidato", "layout");
  return { ok: true, message: "Currículo excluído." };
}

export async function markNotificationsReadAction() {
  const current = await getCurrentUser();
  if (!current) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", current.user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

/**
 * Exclusão definitiva da conta (LGPD art. 18, VI): remove arquivos e o usuário;
 * as demais tabelas são apagadas em cascata.
 */
export async function deleteAccountAction(input: unknown): Promise<ActionResult<never>> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: "Sessão expirada." };
  const confirm = z.object({ confirm: z.literal("EXCLUIR") }).safeParse(input);
  if (!confirm.success) return { ok: false, error: 'Digite "EXCLUIR" para confirmar.' };
  if (current.profile.role === "admin") return { ok: false, error: "Administradores não podem se autoexcluir." };
  if (!hasServiceRole()) return { ok: false, error: "Exclusão indisponível: SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const admin = createAdminClient();
  const uid = current.user.id;
  if (current.profile.role === "company") {
    const { data: owned } = await admin.from("company_members").select("company_id").eq("profile_id", uid).eq("role", "owner").maybeSingle();
    if (owned) {
      const { data: live } = await admin.from("subscriptions").select("id").eq("company_id", owned.company_id).in("status", ["active", "past_due"]).maybeSingle();
      if (live) return { ok: false, error: "Cancele a assinatura da empresa antes de excluir a conta." };
    }
  }
  const { data: files } = await admin.from("resumes").select("storage_path").eq("candidate_id", uid);
  if (files?.length) await admin.storage.from("resumes").remove(files.map((f) => f.storage_path));
  await admin.from("admin_logs").insert({ admin_id: null, action: "account.self_delete", target_type: "profile", target_id: uid, details: { role: current.profile.role } });
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return { ok: false, error: "Não foi possível excluir a conta. Contate o suporte." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}
