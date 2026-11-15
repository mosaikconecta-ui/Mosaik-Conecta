import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { withdrawApplicationAction } from "@/actions/candidate";
import { APPLICATION_STATUS, APPLICATION_STATUS_KEYS, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/cn";

export const metadata = { title: "Minhas candidaturas" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  let q = supabase.from("applications").select("id, status, created_at, status_changed_at, job_id, application_events(to_status, created_at)")
    .eq("candidate_id", profile.id).order("created_at", { ascending: false }).limit(200);
  if (status && APPLICATION_STATUS_KEYS.includes(status as ApplicationStatus)) q = q.eq("status", status);
  const { data: apps } = await q;
  const ids = (apps ?? []).map((a) => a.job_id);
  const { data: jobs } = ids.length ? await supabase.from("public_jobs").select("id, slug, title, company_name, city, state, is_closed").in("id", ids) : { data: [] };
  const jobMap = new Map((jobs ?? []).map((j) => [j.id, j]));

  return (
    <>
      <PageHeader title="Minhas candidaturas" description="Acompanhe o andamento de cada processo seletivo." />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filtrar por status">
        {[["", "Todas"], ...APPLICATION_STATUS_KEYS.map((k) => [k, APPLICATION_STATUS[k].label])].map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : "?"} aria-current={(status ?? "") === k ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", (status ?? "") === k ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-navy-700 hover:bg-navy-50")}>{l}</Link>
        ))}
      </nav>
      {(apps?.length ?? 0) === 0 ? (
        <EmptyState icon={ListChecks} title={status ? "Nenhuma candidatura com este status" : "Você ainda não se candidatou"}
          description="Quando você se candidatar, o andamento aparecerá aqui." action={<ButtonLink href="/vagas">Buscar vagas</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {apps!.map((a) => {
            const j = jobMap.get(a.job_id);
            const st = APPLICATION_STATUS[a.status as ApplicationStatus];
            const events = [...((a.application_events as { to_status: ApplicationStatus; created_at: string }[]) ?? [])].sort((x, y) => x.created_at.localeCompare(y.created_at));
            return (
              <li key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">{j ? <Link href={`/vaga/${j.slug}`} className="hover:text-brand-700">{j.title}</Link> : "Vaga removida ou indisponível"}</p>
                    {j && <p className="text-sm text-muted">{j.company_name} · {j.city} – {j.state}</p>}
                    <p className="mt-1 text-xs text-muted">Candidatura em {formatDate(a.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {!["approved", "rejected", "closed"].includes(a.status) && (
                      <ActionButton action={withdrawApplicationAction.bind(null, a.id)} variant="ghost" confirm="Deseja desistir desta candidatura? Esta ação não pode ser desfeita.">Desistir</ActionButton>
                    )}
                  </div>
                </div>
                {events.length > 0 && (
                  <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3" aria-label="Histórico">
                    {events.map((e, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-navy-600">
                        <span className={cn("size-2 rounded-full", i === events.length - 1 ? "bg-brand-600" : "bg-navy-200")} aria-hidden />
                        {APPLICATION_STATUS[e.to_status].label} <span className="text-muted">{formatDateTime(e.created_at)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
