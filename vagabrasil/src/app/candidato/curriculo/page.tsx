import { Download, FileText } from "lucide-react";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteResumeAction } from "@/actions/candidate";
import { formatDate } from "@/lib/format";
import type { Candidate } from "@/lib/types";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { ProfileForm } from "@/components/candidate/profile-form";
import { ResumeBuilder } from "@/components/candidate/resume-builder";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import type { UF } from "@/lib/constants";

export const metadata = { title: "Meu currículo" };

export default async function ResumePage() {
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const [{ data: c }, { data: resumes }] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", profile.id).single<Candidate>(),
    supabase.from("resumes").select("id, file_name, size_bytes, created_at, is_primary").eq("candidate_id", profile.id).order("created_at", { ascending: false }),
  ]);
  const cand = c!;
  return (
    <>
      <PageHeader title="Meu currículo" description="Essas informações são enviadas às empresas quando você se candidata." />
      <div className="space-y-6">
        <Card title="Dados pessoais e resumo">
          <ProfileForm email={profile.email} defaults={{
            full_name: profile.full_name, phone: profile.phone ?? "", city: profile.city ?? "", state: (profile.state ?? "SP") as UF,
            headline: cand.headline ?? "", summary: cand.summary ?? "", linkedin_url: cand.linkedin_url ?? "",
          }} />
        </Card>
        <Card title="Currículo digital" description="Experiências, formação, habilidades e idiomas.">
          <ResumeBuilder defaults={{
            experiences: cand.experiences.map((e) => ({ ...e, end: e.end ?? "", description: e.description ?? "", current: Boolean(e.current) })),
            education: cand.education.map((e) => ({ ...e, start: e.start ?? "", end: e.end ?? "" })),
            skills: cand.skills, languages: cand.languages,
          }} />
        </Card>
        <div id="pdf">
          <Card title="Currículo em PDF" description="Opcional. Você pode manter até 3 arquivos; o mais recente é o principal.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                {(resumes?.length ?? 0) === 0 ? <p className="text-sm text-muted">Nenhum PDF enviado.</p> : (
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {resumes!.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                        <FileText className="size-5 shrink-0 text-navy-400" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-navy-900">{r.file_name}</p>
                          <p className="text-xs text-muted">{(r.size_bytes / 1024).toFixed(0)} KB · {formatDate(r.created_at)}</p>
                        </div>
                        {r.is_primary && <Badge tone="brand">Principal</Badge>}
                        <a href={`/api/curriculos/${r.id}`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-navy-700 hover:bg-navy-50"><Download className="size-3.5" />Abrir</a>
                        <ActionButton action={deleteResumeAction.bind(null, r.id)} confirm="Excluir este currículo?" variant="danger-outline">Excluir</ActionButton>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ResumeUpload disabled={(resumes?.length ?? 0) >= 3} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
