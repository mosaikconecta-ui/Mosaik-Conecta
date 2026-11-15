"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { companyActionContext } from "@/lib/company-auth";
import { devPaymentsAllowed, paymentsMode } from "@/lib/env";
import { dbErrorMessage, type ActionResult } from "@/lib/actions";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import {
  activateSubscription, applyFeaturedJob, cancelPreapproval, createFeaturedCheckout, createSubscriptionCheckout,
} from "@/lib/payments/mercadopago";
import type { Plan } from "@/lib/types";

const planId = z.enum(["starter", "profissional", "empresarial"]);
const SERVICE_MISSING: ActionResult<never> = { ok: false, error: "Pagamentos indisponíveis: SUPABASE_SERVICE_ROLE_KEY não configurada." };

/**
 * Inicia a assinatura de um plano.
 * - production: cria a assinatura recorrente no Mercado Pago e redireciona ao checkout.
 * - development: cria uma assinatura de TESTE pendente (nenhuma cobrança é feita).
 */
export async function startSubscriptionAction(plan: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const parsed = planId.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Plano inválido." };
  if (!hasServiceRole()) return SERVICE_MISSING;
  if (!(await rateLimit("checkout", 10, 3600, ctx.company.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  if (ctx.company.status !== "active") return { ok: false, error: "Empresa suspensa." };

  const admin = createAdminClient();
  const { data: planRow } = await admin.from("plans").select("*").eq("id", parsed.data).eq("is_active", true).single<Plan>();
  if (!planRow) return { ok: false, error: "Plano indisponível." };
  if (ctx.plan?.id === planRow.id) return { ok: false, error: "Sua empresa já possui este plano ativo." };

  const mode = paymentsMode();
  if (mode === "development" && !devPaymentsAllowed()) {
    return { ok: false, error: "Pagamentos ainda não estão habilitados. Configure as credenciais do Mercado Pago (veja o README)." };
  }

  // Descarta tentativas pendentes anteriores
  await admin.from("subscriptions").update({ status: "expired" }).eq("company_id", ctx.company.id).eq("status", "pending");

  const { data: sub, error } = await admin.from("subscriptions")
    .insert({ company_id: ctx.company.id, plan_id: planRow.id, status: "pending", provider: mode === "production" ? "mercadopago" : "dev" })
    .select("id").single();
  if (error || !sub) return { ok: false, error: dbErrorMessage(error) };

  if (mode === "development") redirect(`/empresa/assinatura/checkout?plano=${planRow.id}&assinatura=${sub.id}`);

  let checkoutUrl: string;
  try {
    const res = await createSubscriptionCheckout({ subscriptionId: sub.id, plan: planRow, payerEmail: ctx.current.profile.email });
    checkoutUrl = res.checkoutUrl;
    await admin.from("subscriptions").update({ provider_subscription_id: res.providerId, checkout_url: res.checkoutUrl }).eq("id", sub.id);
  } catch (e) {
    console.error("[mp] preapproval", e);
    await admin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
    return { ok: false, error: "Não foi possível iniciar o pagamento no Mercado Pago. Tente novamente em instantes." };
  }
  redirect(checkoutUrl);
}

/** SOMENTE MODO DE DESENVOLVIMENTO: simula a aprovação do pagamento, sem cobrança real. */
export async function devApproveSubscriptionAction(subscriptionId: string): Promise<ActionResult<never>> {
  if (!devPaymentsAllowed()) return { ok: false, error: "Simulação de pagamento desabilitada neste ambiente." };
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!hasServiceRole()) return SERVICE_MISSING;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("*, plans(name, price_cents)")
    .eq("id", subscriptionId).eq("company_id", ctx.company.id).eq("provider", "dev").eq("status", "pending").maybeSingle();
  if (!sub) return { ok: false, error: "Assinatura de teste não encontrada." };
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  await activateSubscription(sub.id, ctx.company.id, end);
  const plan = sub.plans as { name: string; price_cents: number };
  await admin.from("payments").insert({
    company_id: ctx.company.id, subscription_id: sub.id, kind: "subscription", provider: "dev",
    provider_payment_id: `dev-${sub.id}`, amount_cents: plan.price_cents, status: "approved",
    description: `[TESTE] Assinatura ${plan.name} — nenhuma cobrança real`, paid_at: new Date().toISOString(),
  });
  redirect("/empresa/assinatura?ativada=1");
}

export async function cancelSubscriptionAction(): Promise<ActionResult<never>> {
  const ctx = await companyActionContext({ ownerOnly: true });
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!hasServiceRole()) return SERVICE_MISSING;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("*").eq("company_id", ctx.company.id).in("status", ["active", "past_due"]).maybeSingle();
  if (!sub) return { ok: false, error: "Nenhuma assinatura ativa." };
  if (sub.provider === "mercadopago" && sub.provider_subscription_id) {
    try {
      await cancelPreapproval(sub.provider_subscription_id);
    } catch (e) {
      console.error("[mp] cancel", e);
      return { ok: false, error: "Não foi possível cancelar no Mercado Pago. Tente novamente." };
    }
  }
  // Acesso permanece até o fim do período pago
  const { error } = await admin.from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_at_period_end: true }).eq("id", sub.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Assinatura cancelada. Seu plano continua ativo até o fim do período já pago." };
}

/** Destaque avulso de vaga (pagamento único). */
export async function buyFeaturedAction(jobId: string): Promise<ActionResult<never>> {
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (!z.string().uuid().safeParse(jobId).success) return { ok: false, error: "Vaga inválida." };
  if (!hasServiceRole()) return SERVICE_MISSING;
  if (!(await rateLimit("featured-checkout", 10, 3600, ctx.company.id))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const { data: job } = await ctx.supabase.from("jobs").select("id, title, status").eq("id", jobId).eq("company_id", ctx.company.id).maybeSingle();
  if (!job || job.status !== "active") return { ok: false, error: "Somente vagas ativas podem ser destacadas." };

  const admin = createAdminClient();
  const { data: settings } = await admin.from("platform_settings").select("key, value").in("key", ["featured_job_price_cents", "featured_job_days"]);
  const price = Number(settings?.find((s) => s.key === "featured_job_price_cents")?.value ?? 4990);
  const days = Number(settings?.find((s) => s.key === "featured_job_days")?.value ?? 30);
  const mode = paymentsMode();
  if (mode === "development" && !devPaymentsAllowed()) return { ok: false, error: "Pagamentos ainda não estão habilitados neste ambiente." };

  const { data: pay, error } = await admin.from("payments").insert({
    company_id: ctx.company.id, job_id: job.id, kind: "featured_job", provider: mode === "production" ? "mercadopago" : "dev",
    amount_cents: price, status: "pending",
    description: `${mode === "development" ? "[TESTE] " : ""}Destaque por ${days} dias — ${job.title}`,
  }).select("id").single();
  if (error || !pay) return { ok: false, error: dbErrorMessage(error) };

  if (mode === "development") redirect(`/empresa/vagas/destaque?pagamento=${pay.id}`);

  let url: string;
  try {
    const res = await createFeaturedCheckout({ paymentId: pay.id, jobTitle: job.title, amountCents: price, payerEmail: ctx.current.profile.email, days });
    url = res.checkoutUrl;
    await admin.from("payments").update({ checkout_url: url }).eq("id", pay.id);
  } catch (e) {
    console.error("[mp] preference", e);
    await admin.from("payments").update({ status: "cancelled" }).eq("id", pay.id);
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
  redirect(url);
}

/** SOMENTE MODO DE DESENVOLVIMENTO. */
export async function devApproveFeaturedAction(paymentId: string): Promise<ActionResult<never>> {
  if (!devPaymentsAllowed()) return { ok: false, error: "Simulação de pagamento desabilitada neste ambiente." };
  const ctx = await companyActionContext();
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const admin = createAdminClient();
  const { data: pay } = await admin.from("payments").select("*").eq("id", paymentId).eq("company_id", ctx.company.id)
    .eq("provider", "dev").eq("status", "pending").maybeSingle();
  if (!pay?.job_id) return { ok: false, error: "Pagamento de teste não encontrado." };
  await admin.from("payments").update({ status: "approved", paid_at: new Date().toISOString(), provider_payment_id: `dev-${pay.id}` }).eq("id", pay.id);
  await applyFeaturedJob(pay.job_id);
  redirect("/empresa/vagas?destaque=sucesso");
}
