import Link from "next/link";
import { Briefcase, Building2, CreditCard, FileClock, Flag, Inbox, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDateTime } from "@/lib/format";
import { Card, PageHeader, StatCard } from "@/components/ui/misc";
import { paymentsMode } from "@/lib/env";

export const metadata = { title: "Administração" };

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ data: s }, { data: logs }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("admin_logs").select("action, target_type, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  const st = (s ?? {}) as Record<string, number>;
  return (
    <>
      <PageHeader title="Visão geral" description={`Modo de pagamentos: ${paymentsMode() === "production" ? "produção (Mercado Pago)" : "desenvolvimento (sem cobranças reais)"}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários" value={st.users ?? 0} icon={Users} hint={`${st.candidates ?? 0} candidatos`} />
        <StatCard label="Empresas" value={st.companies ?? 0} icon={Building2} hint={<Link href="/admin/empresas?verificacao=pending" className="text-brand-700">{st.companies_pending ?? 0} pendentes de verificação</Link>} />
        <StatCard label="Vagas" value={st.jobs ?? 0} icon={Briefcase} hint={`${st.jobs_active ?? 0} ativas`} />
        <StatCard label="Vagas pendentes" value={st.jobs_pending ?? 0} icon={FileClock} hint={<Link href="/admin/vagas" className="text-brand-700">Moderar</Link>} />
        <StatCard label="Candidaturas" value={st.applications ?? 0} icon={Inbox} hint={`${st.applications_30d ?? 0} nos últimos 30 dias`} />
        <StatCard label="Assinaturas ativas" value={st.subscriptions_active ?? 0} icon={CreditCard} hint={`${st.subscriptions_test ?? 0} de teste (não contam na receita)`} />
        <StatCard label="Receita recorrente (MRR)" value={formatCents(st.mrr_cents ?? 0)} icon={TrendingUp} hint={`Recebido em 30 dias: ${formatCents(st.revenue_30d_cents ?? 0)}`} />
        <StatCard label="Denúncias abertas" value={st.reports_open ?? 0} icon={Flag} hint={<Link href="/admin/denuncias" className="text-brand-700">Analisar</Link>} />
      </div>
      <Card title="Ações administrativas recentes" className="mt-6" action={<Link href="/admin/logs" className="text-sm font-semibold text-brand-700">Ver logs</Link>}>
        {(logs?.length ?? 0) === 0 ? <p className="text-sm text-muted">Nenhuma ação registrada.</p> : (
          <ul className="space-y-2 text-sm">
            {logs!.map((l, i) => <li key={i} className="flex justify-between gap-4"><span><code className="rounded bg-navy-50 px-1.5 text-xs">{l.action}</code> <span className="text-muted">por {(l.profiles as unknown as { full_name: string } | null)?.full_name ?? "sistema"}</span></span><span className="text-xs text-muted">{formatDateTime(l.created_at)}</span></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}
