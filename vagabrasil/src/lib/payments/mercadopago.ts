import "server-only";
import { Invoice, MercadoPagoConfig, Payment as MpPayment, PreApproval, Preference } from "mercadopago";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCompanyOwners } from "@/lib/notifications";
import type { Plan } from "@/lib/types";

function config() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const webhookUrl = () => `${SITE_URL}/api/webhooks/mercadopago`;

// ---------------------------------------------------------------------
// Criação de cobranças
// ---------------------------------------------------------------------

/** Cria uma assinatura mensal (preapproval) e devolve o link de checkout do Mercado Pago. */
export async function createSubscriptionCheckout(params: { subscriptionId: string; plan: Plan; payerEmail: string }) {
  const res = await new PreApproval(config()).create({
    body: {
      reason: `VagaBrasil — Plano ${params.plan.name}`,
      external_reference: params.subscriptionId,
      payer_email: params.payerEmail,
      back_url: `${SITE_URL}/empresa/assinatura?retorno=mercadopago`,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.plan.price_cents / 100,
        currency_id: "BRL",
      },
    },
    requestOptions: { idempotencyKey: params.subscriptionId },
  });
  if (!res.id || !res.init_point) throw new Error("Resposta inválida do Mercado Pago.");
  return { providerId: res.id, checkoutUrl: res.init_point };
}

export async function cancelPreapproval(providerId: string) {
  await new PreApproval(config()).update({ id: providerId, body: { status: "cancelled" } });
}

/** Pagamento avulso (Checkout Pro) para destacar uma vaga. */
export async function createFeaturedCheckout(params: { paymentId: string; jobTitle: string; amountCents: number; payerEmail: string; days: number }) {
  const res = await new Preference(config()).create({
    body: {
      items: [
        {
          id: `destaque-${params.paymentId}`,
          title: `Destaque de vaga por ${params.days} dias — ${params.jobTitle}`.slice(0, 250),
          quantity: 1,
          unit_price: params.amountCents / 100,
          currency_id: "BRL",
        },
      ],
      payer: { email: params.payerEmail },
      external_reference: params.paymentId,
      notification_url: webhookUrl(),
      back_urls: {
        success: `${SITE_URL}/empresa/vagas?destaque=sucesso`,
        pending: `${SITE_URL}/empresa/vagas?destaque=pendente`,
        failure: `${SITE_URL}/empresa/vagas?destaque=falha`,
      },
      auto_return: "approved",
      statement_descriptor: "VAGABRASIL",
    },
    requestOptions: { idempotencyKey: params.paymentId },
  });
  if (!res.id || !res.init_point) throw new Error("Resposta inválida do Mercado Pago.");
  return { providerId: res.id, checkoutUrl: res.init_point };
}

// ---------------------------------------------------------------------
// Sincronização (webhooks). Sempre consultamos a API: o payload do webhook
// nunca é considerado fonte de verdade.
// ---------------------------------------------------------------------

const addMonth = (d: Date) => {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
};

function mapPaymentStatus(s?: string): "pending" | "approved" | "rejected" | "refunded" | "cancelled" | "in_process" {
  switch (s) {
    case "approved":
    case "authorized":
    case "processed":
      return "approved";
    case "rejected":
    case "recycling":
      return "rejected";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "cancelled":
      return "cancelled";
    case "in_process":
    case "in_mediation":
    case "scheduled":
      return "in_process";
    default:
      return "pending";
  }
}

async function activateSubscription(subscriptionId: string, companyId: string, periodEnd: Date) {
  const admin = createAdminClient();
  // Encerra outras assinaturas vivas da empresa (upgrade/downgrade)
  const { data: others } = await admin
    .from("subscriptions")
    .select("id, provider, provider_subscription_id, current_period_end")
    .eq("company_id", companyId)
    .in("status", ["active", "past_due"])
    .neq("id", subscriptionId);
  for (const o of others ?? []) {
    await admin
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), current_period_end: new Date().toISOString() })
      .eq("id", o.id);
    if (o.provider === "mercadopago" && o.provider_subscription_id) {
      await cancelPreapproval(o.provider_subscription_id).catch((e) => console.error("[mp] cancel old", e));
    }
  }
  await admin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      last_payment_failed_at: null,
      expiry_notice_sent_at: null,
    })
    .eq("id", subscriptionId);
}

export async function syncPreapproval(preapprovalId: string) {
  const admin = createAdminClient();
  const pre = await new PreApproval(config()).get({ id: preapprovalId });
  const ref = pre.external_reference;
  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .or(`provider_subscription_id.eq.${preapprovalId}${ref && UUID.test(ref) ? `,id.eq.${ref}` : ""}`)
    .maybeSingle();
  if (!sub) return { ignored: "subscription_not_found" };

  if (!sub.provider_subscription_id) {
    await admin.from("subscriptions").update({ provider_subscription_id: preapprovalId }).eq("id", sub.id);
  }

  const nextPayment = pre.next_payment_date ? new Date(pre.next_payment_date) : addMonth(new Date());
  switch (pre.status) {
    case "authorized":
      if (sub.status !== "active") await activateSubscription(sub.id, sub.company_id, nextPayment);
      else await admin.from("subscriptions").update({ current_period_end: nextPayment.toISOString() }).eq("id", sub.id);
      break;
    case "paused":
      await admin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id);
      break;
    case "cancelled":
      await admin
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: sub.cancelled_at ?? new Date().toISOString() })
        .eq("id", sub.id);
      break;
  }
  return { ok: true, status: pre.status };
}

export async function syncAuthorizedPayment(invoiceId: string) {
  const admin = createAdminClient();
  const inv = await new Invoice(config()).get({ id: invoiceId });
  if (!inv.preapproval_id) return { ignored: "no_preapproval" };
  const { data: sub } = await admin
    .from("subscriptions")
    .select("*, plans(name, price_cents)")
    .eq("provider_subscription_id", inv.preapproval_id)
    .maybeSingle();
  if (!sub) return { ignored: "subscription_not_found" };

  const status = mapPaymentStatus(inv.payment?.status ?? inv.status);
  const plan = sub.plans as { name: string; price_cents: number } | null;
  const amountCents = Math.round(((inv as { transaction_amount?: number }).transaction_amount ?? (plan?.price_cents ?? 0) / 100) * 100);

  await admin.from("payments").upsert(
    {
      company_id: sub.company_id,
      subscription_id: sub.id,
      kind: "subscription",
      provider: "mercadopago",
      provider_payment_id: String(inv.id),
      amount_cents: amountCents,
      status,
      status_detail: inv.payment?.status_detail ?? null,
      description: `Assinatura ${plan?.name ?? ""} — mensalidade`,
      paid_at: status === "approved" ? new Date().toISOString() : null,
    },
    { onConflict: "provider,provider_payment_id" },
  );

  if (status === "approved") {
    const base = inv.debit_date ? new Date(inv.debit_date) : new Date();
    await activateSubscription(sub.id, sub.company_id, addMonth(base));
  } else if (status === "rejected") {
    await admin.from("subscriptions").update({ status: "past_due", last_payment_failed_at: new Date().toISOString() }).eq("id", sub.id);
    await notifyCompanyOwners(
      sub.company_id,
      "payment_failed",
      "Pagamento da assinatura recusado",
      "Não conseguimos processar a mensalidade do seu plano. Atualize a forma de pagamento para manter suas vagas ativas.",
      "/empresa/assinatura",
    );
  }
  return { ok: true, status };
}

export async function syncPayment(paymentId: string) {
  const admin = createAdminClient();
  const pay = await new MpPayment(config()).get({ id: paymentId });
  const ref = pay.external_reference;
  if (!ref || !UUID.test(ref)) return { ignored: "no_reference" };
  const { data: local } = await admin.from("payments").select("*").eq("id", ref).maybeSingle();
  if (!local) return { ignored: "payment_not_found" };

  const status = mapPaymentStatus(pay.status);
  const wasApproved = local.status === "approved";
  await admin
    .from("payments")
    .update({
      status,
      status_detail: pay.status_detail ?? null,
      provider_payment_id: String(pay.id),
      paid_at: status === "approved" ? (pay.date_approved ?? new Date().toISOString()) : local.paid_at,
    })
    .eq("id", local.id);

  if (status === "approved" && !wasApproved && local.kind === "featured_job" && local.job_id) {
    await applyFeaturedJob(local.job_id);
  }
  return { ok: true, status };
}

export async function applyFeaturedJob(jobId: string) {
  const admin = createAdminClient();
  const { data: setting } = await admin.from("platform_settings").select("value").eq("key", "featured_job_days").maybeSingle();
  const days = Number(setting?.value ?? 30);
  const { data: job } = await admin.from("jobs").select("featured_until").eq("id", jobId).single();
  const start = job?.featured_until && new Date(job.featured_until) > new Date() ? new Date(job.featured_until) : new Date();
  start.setDate(start.getDate() + days);
  await admin.from("jobs").update({ is_featured: true, featured_until: start.toISOString() }).eq("id", jobId);
}

export { activateSubscription };
