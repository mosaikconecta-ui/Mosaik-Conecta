import Link from "next/link";
import { ArrowRight, BookmarkCheck, CheckCircle2, Circle, ListChecks, Sparkles, Workflow } from "lucide-react";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { completeness } from "@/lib/candidate-completeness";
import { APPLICATION_STATUS, type ApplicationStatus } from "@/lib/constants";
import { JOB_CARD_COLUMNS, type JobCard as JobCardData } from "@/lib/jobs";
import { formatDate, timeAgo } from "@/lib/format";
import type { Candidate } from "@/lib/types";
import { Alert, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { JobCard } from "@/components/jobs/job-card";

export const metadata = { title: "Painel do candidato" };

export default async function CandidateHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const [{ data: cand }, { count: resumeCount }, { data: apps }, { count: savedCount }, { data: notes }] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", profile.id).single<Candidate>(),
    supabase.from("resumes").select("id", { count: "exact", head: true }).eq("candidate_id", profile.id),
    supabase.from("applications").select("id, status, created_at, job_id").eq("candidate_id", profile.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("saved_jobs").select("job_id", { count: "exact", head: true }).eq("candidate_id", profile.id),
    supabase.from("notifications").select("id, title, created_at, link, read_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const c = cand!;
  const { pct, checks } = completeness(profile, c, resumeCount ?? 0);
  const applications = apps ?? [];
  const inProcess = applications.filter((a) => ["in_review", "in_process"].includes(a.status)).length;

  // Vagas recomendadas a partir das preferências (sem critérios pessoais sensíveis)
  let rec = supabase.from("public_jobs").select(JOB_CARD_COLUMNS).eq("status", "active").eq("is_closed", false);
  if (c.preferred_category_ids.length) rec = rec.in("category_id", c.preferred_category_ids);
  if (c.preferred_states.length) rec = rec.in("state", c.preferred_states);
  else if (profile.state) rec = rec.eq("state", profile.state);
  const appliedIds = applications.map((a) => a.job_id);
  if (appliedIds.length) rec = rec.not("id", "in", `(${appliedIds.join(",")})`);
  const { data: recommended } = await rec.order("published_at", { ascending: false }).limit(4);

  const recentIds = applications.slice(0, 5).map((a) => a.job_id);
  const { data: recentJobs } = recentIds.length
    ? await supabase.from("public_jobs").select("id, title, slug, company_name").in("id", recentIds)
    : { data: [] };
  const jobMap = new Map((recentJobs ?? []).map((j) => [j.id, j]));

  return (
    <>
      {sp["bem-vindo"] && <Alert tone="success" className="mb-6" title="Conta criada com sucesso!">Complete seu currículo para se candidatar às vagas.</Alert>}
      {sp.senha === "alterada" && <Alert tone="success" className="mb-6">Senha alterada com sucesso.</Alert>}
      <PageHeader title={`Olá, ${profile.full_name.split(" ")[0]}`} description="Acompanhe suas candidaturas e mantenha seu currículo atualizado."
        actions={<ButtonLink href="/vagas">Buscar vagas</ButtonLink>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Candidaturas" value={applications.length} icon={ListChecks} />
        <StatCard label="Em análise ou processo" value={inProcess} icon={Workflow} />
        <StatCard label="Vagas salvas" value={savedCount ?? 0} icon={BookmarkCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Candidaturas recentes" action={<Link href="/candidato/candidaturas" className="text-sm font-semibold text-brand-700">Ver todas</Link>}>
            {applications.length === 0 ? (
              <EmptyState icon={ListChecks} title="Você ainda não se candidatou" description="Encontre vagas compatíveis com o seu perfil e candidate-se com um clique."
                action={<ButtonLink href="/vagas" size="sm">Ver vagas</ButtonLink>} className="border-0 py-6" />
            ) : (
              <ul className="-my-2 divide-y divide-line">
                {applications.slice(0, 5).map((a) => {
                  const j = jobMap.get(a.job_id);
                  const st = APPLICATION_STATUS[a.status as ApplicationStatus];
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-900">{j ? <Link href={`/vaga/${j.slug}`} className="hover:text-brand-700">{j.title}</Link> : "Vaga indisponível"}</p>
                        <p className="text-[13px] text-muted">{j?.company_name} · {formatDate(a.created_at)}</p>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Sparkles className="size-4 text-brand-600" aria-hidden />Vagas para você</h2>
              <Link href="/candidato/preferencias" className="text-sm font-medium text-brand-700">Ajustar preferências</Link>
            </div>
            {(recommended?.length ?? 0) === 0 ? (
              <EmptyState icon={Sparkles} title="Sem recomendações no momento" description="Defina suas áreas de interesse e estados nas preferências para receber sugestões." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">{(recommended as JobCardData[]).map((j) => <JobCard key={j.id} job={j} compact />)}</div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <Card title="Seu currículo" description={`${pct}% completo`}>
            <div className="h-2 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Currículo completo">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {checks.map((ch) => (
                <li key={ch.label}>
                  <Link href={ch.href} className="flex items-center gap-2 text-sm text-navy-700 hover:text-brand-700">
                    {ch.done ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <Circle className="size-4 text-navy-300" aria-hidden />}
                    <span className={ch.done ? "text-muted line-through decoration-navy-200" : ""}>{ch.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {pct < 100 && <ButtonLink href="/candidato/curriculo" variant="secondary" size="sm" className="mt-4 w-full">Completar currículo <ArrowRight className="size-4" /></ButtonLink>}
          </Card>
          <Card title="Notificações" action={<Link href="/candidato/notificacoes" className="text-sm font-semibold text-brand-700">Ver todas</Link>}>
            {(notes?.length ?? 0) === 0 ? <p className="text-sm text-muted">Nenhuma notificação ainda.</p> : (
              <ul className="space-y-3">
                {notes!.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className={n.read_at ? "text-navy-600" : "font-semibold text-navy-900"}>{n.title}</p>
                    <p className="text-xs text-muted">{timeAgo(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
