import { redirect } from "next/navigation";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { devApproveSubscriptionAction, startSubscriptionAction } from "@/actions/billing";
import { devPaymentsAllowed, paymentsMode } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import type { Plan } from "@/lib/types";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plano?: string; assinatura?: string }> }) {
  const sp = await searchParams;
  const { company, plan: currentPlan, memberRole } = await requireCompany();
  if (memberRole !== "owner") redirect("/empresa");
  const supabase = await createClient();
  const { data: plan } = await supabase.from("plans").select("*").eq("id", sp.plano ?? "").eq("is_active", true).maybeSingle<Plan>();
  if (!plan) redirect("/empresa/assinatura");
  const mode = paymentsMode();
  const pendingDev = sp.assinatura
    ? (await supabase.from("subscriptions").select("id, status").eq("id", sp.assinatura).eq("company_id", company.id).eq("provider", "dev").maybeSingle()).data
    : null;

  return (
    <>
      <PageHeader title="Confirmar assinatura" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title={`Plano ${plan.name}`}>
          <ul className="space-y-1.5 text-sm text-navy-700">{plan.features.map((f) => <li key={f}>• {f}</li>)}</ul>
          {currentPlan && <Alert tone="info" className="mt-5">Ao confirmar, o plano {currentPlan.name} será substituído assim que o pagamento do novo plano for aprovado.</Alert>}
          {mode === "development" ? (
            <Alert tone="warning" className="mt-5" title="Ambiente de testes — nenhuma cobrança real">
              {devPaymentsAllowed()
                ? "As credenciais do Mercado Pago não estão configuradas. Você pode simular a aprovação para testar as funcionalidades do plano. A assinatura ficará marcada como TESTE."
                : "Pagamentos ainda não estão disponíveis neste ambiente."}
            </Alert>
          ) : (
            <p className="mt-5 flex items-center gap-2 text-sm text-navy-600"><ShieldCheck className="size-4 text-emerald-600" />Você será redirecionado ao Mercado Pago para cadastrar o cartão com segurança.</p>
          )}
        </Card>
        <Card title="Resumo">
          <div className="flex justify-between text-sm"><span>Plano {plan.name}</span><span className="tabular-nums">{formatCents(plan.price_cents)}</span></div>
          <div className="mt-3 flex justify-between border-t border-line pt-3 font-semibold"><span>Total mensal</span><span className="tabular-nums">{formatCents(plan.price_cents)}</span></div>
          <p className="mt-2 text-xs text-muted">Cobrança recorrente mensal. Cancele quando quiser.</p>
          <div className="mt-5 flex flex-col gap-2">
            {pendingDev?.status === "pending" ? (
              <ActionButton action={devApproveSubscriptionAction.bind(null, pendingDev.id)} variant="primary" size="lg" className="w-full"><FlaskConical className="size-4" />Simular pagamento aprovado</ActionButton>
            ) : (
              (mode === "production" || devPaymentsAllowed()) && (
                <ActionButton action={startSubscriptionAction.bind(null, plan.id)} variant="primary" size="lg" className="w-full">
                  {mode === "production" ? "Ir para o pagamento" : "Criar assinatura de teste"}
                </ActionButton>
              )
            )}
            <ButtonLink href="/empresa/assinatura" variant="ghost">Voltar</ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}
