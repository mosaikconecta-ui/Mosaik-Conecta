import { BookmarkCheck } from "lucide-react";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toggleSavedJobAction } from "@/actions/candidate";
import { JOB_CARD_COLUMNS, type JobCard as JobCardData } from "@/lib/jobs";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { JobCard } from "@/components/jobs/job-card";

export const metadata = { title: "Vagas salvas" };

export default async function SavedPage() {
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const { data: saved } = await supabase.from("saved_jobs").select("job_id, created_at").eq("candidate_id", profile.id).order("created_at", { ascending: false });
  const ids = (saved ?? []).map((s) => s.job_id);
  const { data: jobs } = ids.length ? await supabase.from("public_jobs").select(JOB_CARD_COLUMNS).in("id", ids) : { data: [] };
  const map = new Map(((jobs ?? []) as JobCardData[]).map((j) => [j.id, j]));
  const list = ids.map((id) => map.get(id)).filter(Boolean) as JobCardData[];
  return (
    <>
      <PageHeader title="Vagas salvas" description="Vagas que você marcou para ver depois." />
      {list.length === 0 ? (
        <EmptyState icon={BookmarkCheck} title="Nenhuma vaga salva" description="Use o botão “Salvar vaga” para guardar oportunidades." action={<ButtonLink href="/vagas">Buscar vagas</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {list.map((j) => (
            <li key={j.id} className="space-y-2">
              <JobCard job={j} compact />
              <div className="flex justify-end gap-2">
                {j.is_closed && <span className="self-center text-xs text-amber-700">Inscrições encerradas</span>}
                <ActionButton action={toggleSavedJobAction.bind(null, j.id, false)} variant="ghost">Remover dos salvos</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
