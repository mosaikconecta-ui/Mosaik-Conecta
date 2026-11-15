import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, FileText, GraduationCap, Link2, Mail, MapPin, Phone } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, EDUCATION_LEVELS, type ApplicationStatus } from "@/lib/constants";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { planAllows } from "@/lib/plan";
import { Avatar, Badge, Card } from "@/components/ui/misc";
import { StatusSelect } from "@/components/company/status-select";
import { NoteForm } from "@/components/company/note-form";
import type { Applicant } from "@/lib/types";

export const metadata = { title: "Candidato" };

const month = (m?: string | null) => (m ? new Date(m + "-02").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "");

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { company, plan } = await requireCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("company_applicants").select("*").eq("application_id", id).eq("company_id", company.id).maybeSingle();
  if (!data) notFound();
  const a = data as Applicant;
  const pipeline = planAllows(plan, "pipeline");
  const [{ data: events }, { data: notes }] = await Promise.all([
    supabase.from("application_events").select("from_status, to_status, created_at").eq("application_id", id).order("created_at"),
    pipeline ? supabase.from("application_notes").select("id, body, created_at, profiles(full_name)").eq("application_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const st = APPLICATION_STATUS[a.status as ApplicationStatus];

  return (
    <>
      <Link href="/empresa/candidatos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-900"><ArrowLeft className="size-4" />Candidatos</Link>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <Avatar name={a.full_name} size={56} />
                <div>
                  <h1 className="text-xl font-bold">{a.full_name}</h1>
                  {a.headline && <p className="text-sm text-navy-600">{a.headline}</p>}
                  <p className="mt-1 text-[13px] text-muted">Candidatura para <strong className="text-navy-700">{a.job_title}</strong> em {formatDate(a.created_at)}</p>
                </div>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-navy-700">
              <li className="flex items-center gap-1.5"><Mail className="size-4 text-navy-400" /><a href={`mailto:${a.email}`} className="hover:text-brand-700">{a.email}</a></li>
              {a.phone && <li className="flex items-center gap-1.5"><Phone className="size-4 text-navy-400" /><a href={`tel:${a.phone}`}>{a.phone}</a></li>}
              {a.city && <li className="flex items-center gap-1.5"><MapPin className="size-4 text-navy-400" />{a.city} – {a.state}{a.available_to_relocate ? " · disponível para mudança" : ""}</li>}
              {a.linkedin_url && <li className="flex items-center gap-1.5"><Link2 className="size-4 text-navy-400" /><a href={a.linkedin_url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-brand-700">Perfil profissional</a></li>}
              {a.desired_salary && <li>Pretensão: <strong>{formatBRL(a.desired_salary)}</strong></li>}
            </ul>
          </div>

          {a.cover_letter && <Card title="Mensagem do candidato"><p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{a.cover_letter}</p></Card>}
          {a.summary && <Card title="Resumo profissional"><p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{a.summary}</p></Card>}

          <Card title="Experiências">
            {a.experiences.length === 0 ? <p className="text-sm text-muted">Nenhuma experiência informada.</p> : (
              <ol className="space-y-5">
                {a.experiences.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <Briefcase className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                    <div>
                      <p className="font-semibold text-navy-900">{e.role} · <span className="font-normal">{e.company}</span></p>
                      <p className="text-xs text-muted">{month(e.start)} – {e.current ? "atual" : month(e.end)}</p>
                      {e.description && <p className="mt-1.5 whitespace-pre-line text-sm text-navy-700">{e.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Formação">
            {a.education.length === 0 ? <p className="text-sm text-muted">Nenhuma formação informada.</p> : (
              <ul className="space-y-4">
                {a.education.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <GraduationCap className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                    <div>
                      <p className="font-semibold text-navy-900">{e.course}</p>
                      <p className="text-sm text-navy-700">{e.institution} · {EDUCATION_LEVELS[e.level]} ({e.status})</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {(a.skills.length > 0 || a.languages.length > 0) && (
            <Card title="Habilidades e idiomas">
              <div className="flex flex-wrap gap-1.5">{[...a.skills, ...a.languages].map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Status da candidatura">
            <StatusSelect applicationId={a.application_id} status={a.status} />
            <p className="mt-2 text-xs text-muted">O candidato é notificado a cada mudança de status.</p>
            <ol className="mt-4 space-y-2 border-t border-line pt-4">
              {(events ?? []).map((ev, i) => (
                <li key={i} className="text-[13px] text-navy-700">{APPLICATION_STATUS[ev.to_status as ApplicationStatus].label} <span className="text-muted">· {formatDateTime(ev.created_at)}</span></li>
              ))}
            </ol>
          </Card>
          <Card title="Currículo em PDF">
            {a.resume_id ? (
              <a href={`/api/curriculos/${a.resume_id}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
                <FileText className="size-4" />Abrir currículo
              </a>
            ) : <p className="text-sm text-muted">O candidato enviou apenas o currículo digital.</p>}
            <p className="mt-2 text-xs text-muted">Link temporário e protegido. Use os dados somente para este processo seletivo (LGPD).</p>
          </Card>
          <Card title="Anotações internas">
            {pipeline ? (
              <>
                <NoteForm applicationId={a.application_id} />
                <ul className="mt-4 space-y-3">
                  {(notes ?? []).map((n) => (
                    <li key={n.id} className="rounded-lg bg-surface p-3 text-sm">
                      <p className="whitespace-pre-line text-navy-800">{n.body}</p>
                      <p className="mt-1 text-xs text-muted">{(n.profiles as unknown as { full_name: string } | null)?.full_name} · {formatDateTime(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="text-sm text-muted">Disponível no plano Profissional (Gestão de processos seletivos). <Link href="/empresa/assinatura" className="font-semibold text-brand-700">Upgrade</Link></p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
