import Link from "next/link";
import { BadgeCheck, Briefcase, CheckCircle2, Eye, FileClock, Inbox, Users, XCircle } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, APPLICATION_STATUS_KEYS, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatDay } from "@/lib/format";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Painel da empresa" };

interface Stats {
  total_jobs: number; active_jobs: number; pending_jobs: number; closed_jobs: number; total_applications: number;
  new_applications: number; applications_7d: number; total_views: number; approved: number;
  by_status: Partial<Record<ApplicationStatus, number>>; avg_days_to_decision: number | null;
}

export default async function CompanyDashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { company, plan, subscription } = await requireCompany();
  const supabase = await createClient();
  const [{ data: statsRaw }, { data: recent }, { data: activeCount }] = await Promise.all([
    supabase.rpc("company_dashboard_stats", { p_company: company.id }),
    supabase.from("company_applicants").select("application_id, full_name, job_title, status, created_at").eq("company_id", company.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("jobs").select("id", { count: "exact" }).eq("company_id", company.id).in("status", ["active", "pending_review"]),
  ]);
  const s = (statsRaw ?? {}) as Stats;
  const used = activeCount?.length ?? 0;
  const conversion = s.total_views ? ((s.total_applications / s.total_views) * 100).toFixed(1) : "0.0";

  return (
    <>
      {sp.empresa === "criada" && <Alert tone="success" className="mb-6" title="Empresa cadastrada!">Agora escolha um plano e envie o documento de verificação para publicar vagas sem moderação prévia.</Alert>}
      <PageHeader title={company.trade_name} description="Acompanhe suas vagas e candidaturas."
        actions={<ButtonLink href="/empresa/vagas/nova">Publicar vaga</ButtonLink>} />

      {company.verification_status !== "verified" && (
        <Alert tone={company.verification_status === "rejected" ? "danger" : "info"} className="mb-6"
          title={company.verification_status === "rejected" ? "Verificação recusada" : "Empresa em verificação"}>
          {company.verification_status === "rejected"
            ? "Revise os dados e envie um novo documento."
            : "Enquanto a verificação não é concluída, novas vagas passam por moderação antes de serem publicadas."}{" "}
          <Link href="/empresa/perfil#verificacao" className="font-semibold underline">Enviar documento</Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vagas publicadas" value={s.total_jobs ?? 0} icon={Briefcase} hint={`${s.closed_jobs ?? 0} encerradas`} />
        <StatCard label="Vagas ativas" value={s.active_jobs ?? 0} icon={CheckCircle2} hint={plan ? `${used} de ${plan.max_active_jobs} do plano${s.pending_jobs ? ` · ${s.pending_jobs} em análise` : ""}` : "Sem plano ativo"} />
        <StatCard label="Total de candidatos" value={s.total_applications ?? 0} icon={Users} hint={`${s.applications_7d ?? 0} nos últimos 7 dias`} />
        <StatCard label="Novas candidaturas" value={s.new_applications ?? 0} icon={Inbox} hint="Aguardando análise" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card title="Candidaturas recentes" action={<Link href="/empresa/candidatos" className="text-sm font-semibold text-brand-700">Ver todas</Link>}>
          {(recent?.length ?? 0) === 0 ? (
            <EmptyState className="border-0 py-6" icon={Inbox} title="Nenhuma candidatura ainda" description="Publique vagas para começar a receber candidatos." />
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {recent!.map((a) => {
                const st = APPLICATION_STATUS[a.status as ApplicationStatus];
                return (
                  <li key={a.application_id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/empresa/candidatos/${a.application_id}`} className="block truncate text-sm font-semibold text-navy-900 hover:text-brand-700">{a.full_name}</Link>
                      <p className="truncate text-[13px] text-muted">{a.job_title} · {formatDate(a.created_at)}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Indicadores de desempenho">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="flex items-center gap-2 text-navy-600"><Eye className="size-4" />Visualizações das vagas</dt><dd className="font-semibold tabular-nums">{s.total_views ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-2 text-navy-600"><Users className="size-4" />Conversão (candidaturas/visitas)</dt><dd className="font-semibold tabular-nums">{conversion}%</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-2 text-navy-600"><BadgeCheck className="size-4" />Candidatos aprovados</dt><dd className="font-semibold tabular-nums">{s.approved ?? 0}</dd></div>
              {plan?.advanced_metrics && (
                <div className="flex justify-between"><dt className="flex items-center gap-2 text-navy-600"><FileClock className="size-4" />Tempo médio até decisão</dt><dd className="font-semibold tabular-nums">{s.avg_days_to_decision != null ? `${s.avg_days_to_decision} dias` : "—"}</dd></div>
              )}
            </dl>
            {plan?.advanced_metrics && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Funil de candidaturas</p>
                <ul className="space-y-2">
                  {APPLICATION_STATUS_KEYS.map((k) => {
                    const n = s.by_status?.[k] ?? 0;
                    const pct = s.total_applications ? Math.round((n / s.total_applications) * 100) : 0;
                    return (
                      <li key={k} className="text-[13px]">
                        <div className="flex justify-between"><span className="text-navy-700">{APPLICATION_STATUS[k].label}</span><span className="tabular-nums text-muted">{n}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-navy-50"><div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
          <Card title="Plano">
            {plan ? (
              <div className="text-sm">
                <p className="font-semibold text-navy-900">{plan.name}</p>
                <p className="text-muted">{subscription?.status === "cancelled" ? "Cancelado — válido até " : "Renovação em "}{formatDay(subscription?.current_period_end?.slice(0, 10) ?? null)}</p>
                {subscription?.provider === "dev" && <Badge tone="warning" className="mt-2">Assinatura de teste</Badge>}
              </div>
            ) : (
              <div className="text-sm"><p className="flex items-center gap-2 text-navy-700"><XCircle className="size-4 text-red-500" />Nenhum plano ativo</p><ButtonLink href="/empresa/assinatura" size="sm" className="mt-3">Escolher plano</ButtonLink></div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
