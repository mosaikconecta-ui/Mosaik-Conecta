import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Candidate } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui/misc";
import { PreferencesForm } from "@/components/candidate/preferences-form";

export const metadata = { title: "Preferências profissionais" };

export default async function PreferencesPage() {
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const [{ data: c }, { data: categories }] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", profile.id).single<Candidate>(),
    supabase.from("job_categories").select("id, name").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Preferências profissionais" description="Usamos suas preferências para recomendar vagas e enviar alertas." />
      <Card>
        <PreferencesForm categories={categories ?? []} defaults={{
          desired_role: c!.desired_role ?? "", desired_salary: c!.desired_salary ?? null,
          preferred_work_modes: c!.preferred_work_modes, preferred_contract_types: c!.preferred_contract_types,
          preferred_category_ids: c!.preferred_category_ids.map(String) as unknown as number[], preferred_states: c!.preferred_states as never,
          available_to_relocate: c!.available_to_relocate,
        }} />
      </Card>
    </>
  );
}
