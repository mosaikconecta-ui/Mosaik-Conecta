import "server-only";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";

/** Cria uma notificação (in-app + fila de e-mail). */
export async function notifyUser(userId: string, type: string, title: string, body: string, link?: string) {
  if (!hasServiceRole()) return;
  const { error } = await createAdminClient()
    .from("notifications")
    .insert({ user_id: userId, type, title, body, link: link ?? null });
  if (error) console.error("[notify]", error.message);
}

export async function notifyCompanyOwners(companyId: string, type: string, title: string, body: string, link?: string) {
  if (!hasServiceRole()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("company_members").select("profile_id").eq("company_id", companyId);
  await Promise.all((data ?? []).map((m) => notifyUser(m.profile_id, type, title, body, link)));
}

const CTA: Record<string, string> = {
  application_received: "Ver minhas candidaturas",
  application_status: "Ver candidatura",
  new_application: "Ver candidato",
  job_alert: "Ver vagas",
  payment_failed: "Atualizar pagamento",
  subscription_expiring: "Gerenciar assinatura",
};

/**
 * Processa a fila de e-mails (notifications.email_status = 'pending').
 * Chamado após ações (via after()) e periodicamente pelo cron.
 */
export async function processEmailQueue(limit = 50) {
  if (!hasServiceRole()) return { processed: 0 };
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("notifications")
    .select("id, user_id, type, title, body, link, profiles(email, status, candidates(email_notifications))")
    .eq("email_status", "pending")
    .order("created_at")
    .limit(limit);

  let processed = 0;
  for (const n of rows ?? []) {
    const profile = n.profiles as unknown as {
      email: string;
      status: string;
      candidates: { email_notifications: boolean } | null;
    } | null;
    const prefs = profile?.candidates;
    let status: "sent" | "skipped" | "failed" = "skipped";
    if (profile?.email && profile.status === "active" && prefs?.email_notifications !== false) {
      const res = await sendEmail({
        to: profile.email,
        subject: n.title,
        html: emailLayout({
          title: n.title,
          body: `<p>${escapeHtml(n.body ?? "")}</p>`,
          cta: n.link ? { label: CTA[n.type] ?? "Acessar o VagaBrasil", href: n.link } : undefined,
        }),
        text: `${n.title}\n\n${n.body ?? ""}`,
      });
      status = res.ok ? "sent" : res.skipped ? "skipped" : "failed";
    }
    await admin
      .from("notifications")
      .update({ email_status: status, email_sent_at: status === "sent" ? new Date().toISOString() : null })
      .eq("id", n.id);
    processed++;
  }
  return { processed };
}
