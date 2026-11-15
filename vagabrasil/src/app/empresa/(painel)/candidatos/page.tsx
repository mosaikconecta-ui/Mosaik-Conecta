import Link from "next/link";
import { Columns3, List, Lock, Users } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, APPLICATION_STATUS_KEYS, UFS, type ApplicationStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { planAllows } from "@/lib/plan";
import { Badge, EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/form";
import { AutoSubmitForm } from "@/components/jobs/auto-submit";
import { StatusSelect } from "@/components/company/status-select";
import type { Applicant, Experience } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata = { title: "Candidatos" };
const PER_PAGE = 25;

type SP = { vaga?: string; status?: string; q?: string; uf?: string; habilidade?: string; pagina?: string; visao?: string };

export default async function ApplicantsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { company, plan } = await requireCompany();
  const supabase = await createClient();
  const filters = planAllows(plan, "candidate_filters");
  const pipeline = planAllows(plan, "pipeline") && sp.visao === "pipeline";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const { data: jobs } = await supabase.from("jobs").select("id, title").eq("company_id", company.id).neq("status", "draft").order("created_at", { ascending: false });

  let q = supabase.from("company_applicants")
    .select("application_id, job_id, job_title, status, created_at, full_name, city, state, headline, skills, experiences", { count: "exact" })
    .eq("company_id", company.id);
  if (sp.vaga && /^[0-9a-f-]{36}$/.test(sp.vaga)) q = q.eq("job_id", sp.vaga);
  if (filters) {
    if (sp.status && APPLICATION_STATUS_KEYS.includes(sp.status as ApplicationStatus)) q = q.eq("status", sp.status);
    if (sp.q) q = q.ilike("full_name", `%${sp.q.replace(/[%_,()]/g, " ").slice(0, 60)}%`);
    if (sp.uf && UFS.some((u) => u[0] === sp.uf)) q = q.eq("state", sp.uf);
    if (sp.habilidade) q = q.contains("skills", [sp.habilidade.slice(0, 40)]);
  }
  q = q.order("created_at", { ascending: false });
  const { data, count } = pipeline ? await q.limit(500) : await q.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const list = (data ?? []) as Pick<Applicant, "application_id" | "job_id" | "job_title" | "status" | "created_at" | "full_name" | "city" | "state" | "headline" | "skills" | "experiences">[];

  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][]);
    return `?${p.toString()}`;
  };
  const years = (exps: Experience[]) => {
    const months = exps.reduce((acc, e) => {
      const s = new Date(e.start + "-01"); const end = e.current || !e.end ? new Date() : new Date(e.end + "-01");
      return acc + Math.max(0, (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth());
    }, 0);
    return months < 12 ? `${months} meses de experiência` : `${(months / 12).toFixed(months >= 120 ? 0 : 1)} anos de experiência`;
  };

  return (
    <>
      <PageHeader title="Candidatos" description={`${count ?? 0} candidaturas`}
        actions={planAllows(plan, "pipeline") ? (
          <div className="flex rounded-lg border border-line bg-white p-0.5">
            <Link href={qs({ visao: undefined })} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", !pipeline ? "bg-navy-900 text-white" : "text-navy-700")}><List className="size-4" />Lista</Link>
            <Link href={qs({ visao: "pipeline", pagina: undefined })} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", pipeline ? "bg-navy-900 text-white" : "text-navy-700")}><Columns3 className="size-4" />Processo seletivo</Link>
          </div>
        ) : null} />

      <AutoSubmitForm method="get" className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros de candidatos">
        {pipeline && <input type="hidden" name="visao" value="pipeline" />}
        <Select name="vaga" defaultValue={sp.vaga ?? ""} aria-label="Vaga">
          <option value="">Todas as vagas</option>
          {(jobs ?? []).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </Select>
        {filters ? (
          <>
            <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status">
              <option value="">Todos os status</option>
              {APPLICATION_STATUS_KEYS.map((k) => <option key={k} value={k}>{APPLICATION_STATUS[k].label}</option>)}
            </Select>
            <Input name="q" defaultValue={sp.q} placeholder="Buscar por nome" aria-label="Buscar por nome" />
            <Select name="uf" defaultValue={sp.uf ?? ""} aria-label="Estado do candidato">
              <option value="">Qualquer estado</option>
              {UFS.map(([uf, n]) => <option key={uf} value={uf}>{n}</option>)}
            </Select>
            <Input name="habilidade" defaultValue={sp.habilidade} placeholder="Habilidade (ex.: Excel)" aria-label="Habilidade" />
          </>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted sm:col-span-1 lg:col-span-4">
            <Lock className="size-3.5" />Filtros por status, nome, localização e habilidades estão disponíveis no plano Profissional. <Link href="/empresa/assinatura" className="font-semibold text-brand-700">Fazer upgrade</Link>
          </p>
        )}
        <noscript><button type="submit" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Filtrar</button></noscript>
      </AutoSubmitForm>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum candidato encontrado" description="Quando candidatos se inscreverem nas suas vagas, eles aparecerão aqui." />
      ) : pipeline ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {APPLICATION_STATUS_KEYS.map((k) => {
            const col = list.filter((a) => a.status === k);
            return (
              <section key={k} className="w-72 shrink-0 rounded-(--radius-card) border border-line bg-white">
                <header className="flex items-center justify-between border-b border-line px-4 py-3">
                  <h2 className="text-sm font-semibold">{APPLICATION_STATUS[k].label}</h2>
                  <Badge tone={APPLICATION_STATUS[k].tone}>{col.length}</Badge>
                </header>
                <ul className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
                  {col.length === 0 && <li className="py-4 text-center text-xs text-muted">Vazio</li>}
                  {col.map((a) => (
                    <li key={a.application_id} className="rounded-lg border border-line p-3">
                      <Link href={`/empresa/candidatos/${a.application_id}`} className="text-sm font-semibold text-navy-900 hover:text-brand-700">{a.full_name}</Link>
                      <p className="truncate text-xs text-muted">{a.job_title}</p>
                      <div className="mt-2"><StatusSelect applicationId={a.application_id} status={a.status} compact /></div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <tr><th className="px-4 py-3">Candidato</th><th className="px-4 py-3">Vaga</th><th className="px-4 py-3">Experiência</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((a) => (
                  <tr key={a.application_id} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={`/empresa/candidatos/${a.application_id}`} className="font-semibold text-navy-900 hover:text-brand-700">{a.full_name}</Link>
                      <p className="text-xs text-muted">{a.headline ?? "—"}</p>
                      <p className="text-xs text-muted">{a.city ? `${a.city} – ${a.state}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-navy-700">{a.job_title}</td>
                    <td className="px-4 py-3 text-navy-600">{a.experiences?.length ? years(a.experiences) : "Primeiro emprego"}<p className="text-xs text-muted">{a.skills?.slice(0, 3).join(", ")}</p></td>
                    <td className="px-4 py-3 whitespace-nowrap text-navy-600">{formatDate(a.created_at)}</td>
                    <td className="px-4 py-3"><StatusSelect applicationId={a.application_id} status={a.status} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={count ?? 0} pageSize={PER_PAGE} href={(p) => qs({ pagina: String(p) })} />
        </>
      )}
    </>
  );
}
