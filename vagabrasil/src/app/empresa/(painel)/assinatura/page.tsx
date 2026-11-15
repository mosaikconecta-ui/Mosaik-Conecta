import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CreditCard, Receipt } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscriptionAction } from "@/actions/billing";
import { paymentsMode } from "@/lib/env";
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS } from "@/lib/constants";
import { formatCents, formatDate } from "@/lib/format";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import type { Payment, Plan, Subscription } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata = { title: "Assinatura" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ ativada?: string; retorno?: string }> }) {
  const sp = await searchParams;
  const { company, plan, memberRole } = await requireCompany();
  if (memberRole !== "owner") redirect("/empresa");
  const supabase = await createClient();
  const [{ data: plans }, { data: subs }, { data: payments }] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("subscriptions").select("*").eq("company_id", company.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("payments").select("*").eq("company_id", company.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const live = (subs as Subscription[] | null)?.find((s) => ["active", "past_due", "cancelled"].includes(s.status) && (!s.current_period_end || s.current_period_end > new Date().toISOString()));
  const mode = paymentsMode();

  return (
    <>
      <PageHeader title="Assinatura" description="Gerencie o plano da empresa e o histórico de pagamentos." />
      {sp.ativada && <Alert tone="success" className="mb-6" title="Plano ativado!">Você já pode publicar vagas.</Alert>}
      {sp.retorno === "mercadopago" && !plan && <Alert tone="info" className="mb-6" title="Pagamento em processamento">Assim que o Mercado Pago confirmar o pagamento, seu plano será ativado automaticamente.</Alert>}
      {mode === "development" && <Alert tone="warning" className="mb-6" title="Modo de desenvolvimento">Os pagamentos são simulados e nenhuma cobrança real é feita. Configure o Mercado Pago para produção (veja o README).</Alert>}

      <Card title="Plano atual" className="mb-6">
        {plan && live ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">{plan.name}</p>
                <Badge tone={SUBSCRIPTION_STATUS[live.status].tone}>{SUBSCRIPTION_STATUS[live.status].label}</Badge>
                {live.provider === "dev" && <Badge tone="warning">Teste</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">
                {formatCents(plan.price_cents)}/mês · {live.status === "cancelled" ? `Acesso até ${formatDate(live.current_period_end)}` : `Próxima cobrança em ${formatDate(live.current_period_end)}`}
              </p>
              {live.status === "past_due" && <p className="mt-2 text-sm text-red-700">O último pagamento foi recusado. Atualize o cartão no Mercado Pago para evitar a suspensão das vagas.</p>}
            </div>
            {live.status !== "cancelled" && (
              <ActionButton action={cancelSubscriptionAction} variant="danger-outline" size="md" confirm="Cancelar a assinatura? O plano continua válido até o fim do período pago e depois suas vagas deixam de ser publicadas.">Cancelar assinatura</ActionButton>
            )}
          </div>
        ) : (
          <p className="text-sm text-navy-700">Sua empresa não possui um plano ativo. Escolha um plano abaixo para publicar vagas.</p>
        )}
      </Card>

      <h2 className="mb-3 text-[15px] font-semibold">{plan ? "Alterar plano" : "Escolha um plano"}</h2>
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {(plans as Plan[] | null ?? []).map((p) => {
          const current = plan?.id === p.id;
          return (
            <div key={p.id} className={cn("card flex flex-col p-5", current && "border-brand-300 ring-2 ring-brand-100")}>
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 font-display text-2xl font-bold">{formatCents(p.price_cents)}<span className="text-sm font-normal text-muted">/mês</span></p>
              <ul className="mt-3 flex-1 space-y-1.5">{p.features.map((f) => <li key={f} className="flex gap-2 text-[13px] text-navy-700"><Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" />{f}</li>)}</ul>
              {current ? <p className="mt-4 text-center text-sm font-semibold text-brand-700">Plano atual</p> : (
                <ButtonLink href={`/empresa/assinatura/checkout?plano=${p.id}`} variant={p.id === "profissional" ? "primary" : "outline"} className="mt-4 w-full">
                  {plan ? (p.price_cents > plan.price_cents ? "Fazer upgrade" : "Mudar para este plano") : "Assinar"}
                </ButtonLink>
              )}
            </div>
          );
        })}
      </div>

      <Card title="Histórico de pagamentos">
        {(payments?.length ?? 0) === 0 ? (
          <EmptyState className="border-0 py-6" icon={Receipt} title="Nenhum pagamento" description="Os pagamentos de assinaturas e destaques aparecerão aqui." />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-line bg-surface text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Descrição</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(payments as Payment[]).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-navy-600">{formatDate(p.paid_at ?? p.created_at)}</td>
                    <td className="px-5 py-3 text-navy-800">{p.description}{p.provider === "dev" && <Badge tone="warning" className="ml-2">Teste</Badge>}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCents(p.amount_cents)}</td>
                    <td className="px-5 py-3"><Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted"><CreditCard className="size-3.5" />Pagamentos processados pelo Mercado Pago. Dúvidas sobre cobranças? <Link href="/termos" className="text-brand-700">Termos de uso</Link></p>
    </>
  );
}
