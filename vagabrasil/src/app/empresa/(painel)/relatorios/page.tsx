import { Download } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JOB_STATUS, type JobStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { planAllows } from "@/lib/plan";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { Upsell } from "@/components/company/upsell";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Relatórios" };

interface Row { job_id: string; title: string; status: JobStatus; published_at: string | null; views: number; applications: number; in_process: number; approved: number; rejected: number }

export default async function ReportsPage() {
  const { company, plan } = await requireCompany();
  if (!planAllows(plan, "reports")) {
    return (<><PageHeader title="Relatórios" /><Upsell feature="reports" description="Acompanhe visualizações, candidaturas e conversão de cada vaga." /></>);
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("company_job_report", { p_company: company.id });
  const rows = (data ?? []) as Row[];
  const totals = rows.reduce((t, r) => ({ views: t.views + r.views, apps: t.apps + Number(r.applications), approved: t.approved + Number(r.approved) }), { views: 0, apps: 0, approved: 0 });
  const full = planAllows(plan, "advanced_metrics");
  return (
    <>
      <PageHeader title="Relatórios" description="Desempenho das vagas publicadas."
        actions={full ? <a href="/api/empresa/relatorio" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-800 hover:bg-navy-50"><Download className="size-4" />Exportar CSV</a> : <span className="text-xs text-muted">Exportação CSV no plano Empresarial</span>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-[13px] text-muted">Visualizações</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.views}</p></Card>
        <Card><p className="text-[13px] text-muted">Candidaturas</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.apps}</p></Card>
        <Card><p className="text-[13px] text-muted">Taxa de conversão</p><p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.views ? ((totals.apps / totals.views) * 100).toFixed(1) : "0.0"}%</p></Card>
      </div>
      {rows.length === 0 ? <EmptyState icon={BarChart3} title="Sem dados ainda" description="Publique vagas para acompanhar o desempenho." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b border-line bg-surface text-left text-xs font-semibold tracking-wide text-muted uppercase">
              <tr><th className="px-4 py-3">Vaga</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Publicada</th><th className="px-4 py-3 text-right">Visualizações</th><th className="px-4 py-3 text-right">Candidaturas</th><th className="px-4 py-3 text-right">Conversão</th><th className="px-4 py-3 text-right">Em processo</th><th className="px-4 py-3 text-right">Aprovados</th><th className="px-4 py-3 text-right">Reprovados</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.job_id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{r.title}</td>
                  <td className="px-4 py-3"><Badge tone={JOB_STATUS[r.status].tone}>{JOB_STATUS[r.status].label}</Badge></td>
                  <td className="px-4 py-3 text-navy-600">{formatDate(r.published_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.views}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.applications}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.views ? ((Number(r.applications) / r.views) * 100).toFixed(1) : "0.0"}%</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.in_process}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.approved}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
