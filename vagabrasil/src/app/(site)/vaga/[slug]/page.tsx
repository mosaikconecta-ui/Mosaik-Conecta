import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import {
  BadgeCheck, Banknote, Briefcase, CalendarClock, Clock, GraduationCap, MapPin, Timer, Users, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured, publicStorageUrl } from "@/lib/env";
import { CONTRACT_TYPES, EDUCATION_LEVELS, EXPERIENCE_LEVELS, WORK_MODES, type ApplicationStatus } from "@/lib/constants";
import { formatDay, formatSalary, timeAgo } from "@/lib/format";
import { JOB_CARD_COLUMNS, type JobCard as JobCardData } from "@/lib/jobs";
import { jobPostingJsonLd, jsonLd } from "@/lib/seo";
import type { PublicJob } from "@/lib/types";
import { Alert, Avatar, Badge } from "@/components/ui/misc";
import { JobCard, summarize } from "@/components/jobs/job-card";
import { ApplyPanel, ReportJob, SaveJobButton } from "@/components/jobs/job-actions";

type Props = { params: Promise<{ slug: string }> };

const getJob = cache(async (slug: string) => {
  if (!isSupabaseConfigured || !/^[a-z0-9-]{3,200}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_jobs").select("*").eq("slug", slug).maybeSingle<PublicJob>();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJob((await params).slug);
  if (!job) return { title: "Vaga não encontrada", robots: { index: false } };
  const title = `${job.title} em ${job.city} – ${job.state} | ${job.company_name}`;
  const description = summarize(job.description, 155);
  const indexable = !job.is_closed && !job.is_demo;
  return {
    title,
    description,
    alternates: { canonical: `/vaga/${job.slug}` },
    openGraph: { title, description, url: `/vaga/${job.slug}`, type: "article" },
    // Vagas encerradas/expiradas/pausadas deixam de ser indexadas
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();

  const supabase = await createClient();
  const current = await getCurrentUser();
  const viewer = !current ? "anonymous" : current.profile.role;

  const [company, similar, candidateData] = await Promise.all([
    supabase.from("public_companies").select("trade_name, slug, description, website, city, state, is_verified, active_jobs").eq("id", job.company_id).maybeSingle(),
    supabase.from("public_jobs").select(JOB_CARD_COLUMNS).eq("status", "active").eq("is_closed", false)
      .eq("category_id", job.category_id).neq("id", job.id).order("published_at", { ascending: false }).limit(4),
    viewer === "candidate" ? Promise.all([
      supabase.from("applications").select("status").eq("job_id", job.id).eq("candidate_id", current!.user.id).maybeSingle(),
      supabase.from("saved_jobs").select("job_id").eq("job_id", job.id).eq("candidate_id", current!.user.id).maybeSingle(),
      supabase.from("resumes").select("id, file_name").eq("candidate_id", current!.user.id).order("is_primary", { ascending: false }),
      supabase.from("candidates").select("summary, experiences").eq("id", current!.user.id).single(),
    ]) : null,
  ]);

  if (job.status === "active" && !job.is_closed) {
    after(async () => { await supabase.rpc("increment_job_view", { p_job: job.id }); });
  }

  const [application, saved, resumes, cand] = candidateData ?? [];
  const resumeList = resumes?.data ?? [];
  const profileComplete = resumeList.length > 0 || Boolean(cand?.data?.summary) || ((cand?.data?.experiences as unknown[]) ?? []).length > 0;
  const salary = formatSalary(job.salary_min, job.salary_max);
  const closed = job.is_closed;
  const c = company.data;

  const facts = [
    { icon: MapPin, label: "Local", value: `${job.city} – ${job.state}` },
    { icon: Briefcase, label: "Modalidade", value: WORK_MODES[job.work_mode] },
    { icon: Clock, label: "Contratação", value: CONTRACT_TYPES[job.contract_type] },
    { icon: Banknote, label: "Salário", value: salary ?? "A combinar" },
    { icon: Timer, label: "Horário", value: job.schedule || "Não informado" },
    { icon: Users, label: "Vagas", value: String(job.openings) },
    { icon: GraduationCap, label: "Escolaridade", value: EDUCATION_LEVELS[job.education_level] },
    { icon: CalendarClock, label: "Experiência", value: EXPERIENCE_LEVELS[job.experience_level] },
  ];

  return (
    <div className="bg-surface">
      {!closed && !job.is_demo && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(jobPostingJsonLd(job, c?.website))} />}
      <div className="container-page py-8 sm:py-10">
        <nav aria-label="Trilha" className="mb-4 flex flex-wrap gap-1 text-[13px] text-muted">
          <Link href="/vagas" className="hover:text-navy-800">Vagas</Link><span aria-hidden>/</span>
          <Link href={`/vagas/${job.category_slug}`} className="hover:text-navy-800">{job.category_name}</Link><span aria-hidden>/</span>
          <Link href={`/vagas/${job.city_slug}`} className="hover:text-navy-800">{job.city}</Link>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <article className="min-w-0 space-y-6">
            <header className="card p-6 sm:p-8">
              {closed && (
                <Alert tone="warning" className="mb-5" title={job.status === "paused" ? "Vaga pausada" : "Vaga encerrada"}>
                  {job.status === "paused" ? "A empresa pausou temporariamente esta vaga." : "Esta vaga não está mais recebendo candidaturas."}{" "}
                  <Link href={`/vagas/${job.category_slug}`} className="font-semibold underline">Veja vagas semelhantes</Link>.
                </Alert>
              )}
              {job.is_demo && <Alert tone="warning" className="mb-5" title="Dados de demonstração">Esta vaga e a empresa são fictícias e servem apenas para demonstrar a plataforma.</Alert>}
              <div className="flex items-start gap-4">
                <Avatar name={job.company_name} src={publicStorageUrl("company-logos", job.company_logo)} size={56} square />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold leading-tight sm:text-[28px]">{job.title}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-[15px] text-navy-700">
                    <Link href={`/empresas/${job.company_slug}`} className="font-medium hover:text-brand-700">{job.company_name}</Link>
                    {job.company_verified && <BadgeCheck className="size-4 text-brand-600" aria-label="Empresa verificada" />}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.is_featured && <Badge tone="brand">Destaque</Badge>}
                    <Badge>{job.category_name}</Badge>
                    <Badge tone="muted">Publicada {timeAgo(job.published_at)}</Badge>
                    {job.application_deadline && <Badge tone={closed ? "muted" : "warning"}>Inscrições até {formatDay(job.application_deadline)}</Badge>}
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-muted"><f.icon className="size-3.5" aria-hidden />{f.label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-navy-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </header>

            <section className="card space-y-8 p-6 sm:p-8">
              <TextBlock title="Descrição da vaga" text={job.description} />
              {job.responsibilities && <TextBlock title="Responsabilidades" text={job.responsibilities} />}
              {job.requirements && <TextBlock title="Requisitos" text={job.requirements} />}
              {job.benefits && <TextBlock title="Benefícios" text={job.benefits} />}
              <div className="border-t border-line pt-5"><ReportJob jobId={job.id} viewer={viewer} slug={job.slug} /></div>
            </section>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="card space-y-3 p-5">
              <ApplyPanel jobId={job.id} slug={job.slug} viewer={viewer} closed={closed} isDemo={job.is_demo}
                existingStatus={(application?.data?.status as ApplicationStatus) ?? null} resumes={resumeList} profileComplete={profileComplete} />
              {!closed && <SaveJobButton jobId={job.id} slug={job.slug} viewer={viewer} initialSaved={Boolean(saved?.data)} />}
            </div>
            {c && (
              <div className="card p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="size-4" aria-hidden />Sobre a empresa</h2>
                <p className="mt-3 font-semibold text-navy-900">{c.trade_name}</p>
                <p className="text-[13px] text-muted">{c.city} – {c.state}</p>
                {c.description && <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-navy-600">{c.description}</p>}
                <Link href={`/empresas/${c.slug}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
                  {c.active_jobs > 1 ? `Ver ${c.active_jobs} vagas da empresa` : "Ver página da empresa"}
                </Link>
              </div>
            )}
            <div className="rounded-lg border border-line bg-white p-4 text-[13px] leading-relaxed text-navy-600">
              <strong className="text-navy-800">Dica de segurança:</strong> nenhuma empresa pode cobrar valores para você participar do processo seletivo.{" "}
              <Link href="/seguranca" className="font-medium text-brand-700">Saiba mais</Link>
            </div>
          </aside>
        </div>

        {(similar.data?.length ?? 0) > 0 && (
          <section className="mt-12" aria-labelledby="semelhantes">
            <div className="mb-5 flex items-end justify-between">
              <h2 id="semelhantes" className="text-xl font-bold">Vagas semelhantes</h2>
              <Link href={`/vagas/${job.category_slug}`} className="text-sm font-semibold text-brand-700">Mais vagas de {job.category_name}</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(similar.data as JobCardData[]).map((j) => <JobCard key={j.id} job={j} compact />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="prose-job mt-3">
        {text.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </div>
    </div>
  );
}
