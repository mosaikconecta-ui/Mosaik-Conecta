import Link from "next/link";
import { Briefcase, Eye, Pencil, Star, Users } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buyFeaturedAction } from "@/actions/billing";
import { deleteDraftAction, setJobStatusAction, toggleFeaturedAction } from "@/actions/company";
import { JOB_STATUS, type JobStatus } from "@/lib/constants";
import { formatDate, formatDay } from "@/lib/format";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata = { title: "Vagas" };

const TABS = [["", "Todas"], ["active", "Ativas"], ["pending_review", "Em análise"], ["paused", "Pausadas"], ["draft", "Rascunhos"], ["closed", "Encerradas"]] as const;

export default async function CompanyJobsPage({ searchParams }: { searchParams: Promise<{ status?: string; destaque?: string }> }) {
  const sp = await searchParams;
  const { company, plan } = await requireCompany();
  const supabase = await createClient();
  let q = supabase.from("jobs").select("*, applications(count)").eq("company_id", company.id).order("created_at", { ascending: false });
  if (sp.status && sp.status in JOB_STATUS) q = q.eq("status", sp.status);
  const { data } = await q;
  const jobs = (data ?? []) as (Job & { applications: { count: number }[] })[];
  const planFeatured = jobs.filter((j) => j.is_featured && !j.featured_until && j.status === "active").length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Vagas" description={plan ? `Plano ${plan.name}: até ${plan.max_active_jobs} vagas ativas${plan.featured_slots ? ` e ${plan.featured_slots} destaques (${planFeatured} em uso)` : ""}.` : "Sem plano ativo."}
        actions={<ButtonLink href="/empresa/vagas/nova">Publicar vaga</ButtonLink>} />
      {sp.destaque === "sucesso" && <Alert tone="success" className="mb-4">Pagamento confirmado. A vaga está em destaque.</Alert>}
      {sp.destaque === "pendente" && <Alert tone="info" className="mb-4">Pagamento em processamento. O destaque será ativado após a confirmação.</Alert>}
      {sp.destaque === "falha" && <Alert tone="danger" className="mb-4">O pagamento não foi concluído.</Alert>}
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtrar vagas">
        {TABS.map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} aria-current={(sp.status ?? "") === k ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", (sp.status ?? "") === k ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-navy-700 hover:bg-navy-50")}>{l}</Link>
        ))}
      </nav>
      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhuma vaga aqui" description="Publique sua primeira vaga para começar a receber candidaturas." action={<ButtonLink href="/empresa/vagas/nova">Publicar vaga</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            const st = JOB_STATUS[j.status as JobStatus];
            const apps = j.applications?.[0]?.count ?? 0;
            const featuredNow = j.is_featured && (!j.featured_until || j.featured_until > new Date().toISOString());
            const expired = j.application_deadline && j.application_deadline < today;
            return (
              <li key={j.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {featuredNow && <Badge tone="brand"><Star className="size-3" />Destaque{j.featured_until ? ` até ${formatDate(j.featured_until)}` : ""}</Badge>}
                      {expired && j.status === "active" && <Badge tone="warning">Prazo encerrado</Badge>}
                    </div>
                    <p className="mt-1.5 font-semibold text-navy-900">{j.title}</p>
                    <p className="text-[13px] text-muted">{j.city} – {j.state} · Criada em {formatDate(j.created_at)}{j.application_deadline ? ` · Inscrições até ${formatDay(j.application_deadline)}` : ""}</p>
                    <p className="mt-2 flex gap-4 text-[13px] text-navy-600">
                      <Link href={`/empresa/candidatos?vaga=${j.id}`} className="flex items-center gap-1 hover:text-brand-700"><Users className="size-3.5" />{apps} candidatos</Link>
                      <span className="flex items-center gap-1"><Eye className="size-3.5" />{j.views_count} visualizações</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["active", "paused", "closed"].includes(j.status) && <ButtonLink href={`/vaga/${j.slug}`} variant="ghost" size="sm" target="_blank">Ver</ButtonLink>}
                    {j.status !== "removed" && <ButtonLink href={`/empresa/vagas/${j.id}/editar`} variant="outline" size="sm"><Pencil className="size-3.5" />Editar</ButtonLink>}
                    {j.status === "draft" && <ActionButton action={setJobStatusAction.bind(null, j.id, "publish")} variant="primary">Publicar</ActionButton>}
                    {j.status === "active" && <ActionButton action={setJobStatusAction.bind(null, j.id, "pause")}>Pausar</ActionButton>}
                    {["paused", "closed"].includes(j.status) && <ActionButton action={setJobStatusAction.bind(null, j.id, "reopen")}>Reabrir</ActionButton>}
                    {["active", "paused", "pending_review"].includes(j.status) && <ActionButton action={setJobStatusAction.bind(null, j.id, "close")} confirm="Encerrar esta vaga? Ela deixará de receber candidaturas.">Encerrar</ActionButton>}
                    {j.status === "active" && !featuredNow && (plan?.featured_slots ?? 0) > planFeatured && <ActionButton action={toggleFeaturedAction.bind(null, j.id, true)} variant="secondary"><Star className="size-3.5" />Destacar (plano)</ActionButton>}
                    {j.status === "active" && j.is_featured && !j.featured_until && <ActionButton action={toggleFeaturedAction.bind(null, j.id, false)} variant="ghost">Remover destaque</ActionButton>}
                    {j.status === "active" && !(j.is_featured && !j.featured_until) && <ActionButton action={buyFeaturedAction.bind(null, j.id)} variant="secondary"><Star className="size-3.5" />{featuredNow ? "Estender destaque" : "Destacar por 30 dias"}</ActionButton>}
                    {j.status === "draft" && <ActionButton action={deleteDraftAction.bind(null, j.id)} variant="danger-outline" confirm="Excluir este rascunho?">Excluir</ActionButton>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
