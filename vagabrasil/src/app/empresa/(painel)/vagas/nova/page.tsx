import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { JobForm } from "@/components/company/job-form";

export const metadata = { title: "Publicar vaga" };

export default async function NewJobPage() {
  const { company, plan } = await requireCompany();
  const supabase = await createClient();
  const [{ data: categories }, { count }] = await Promise.all([
    supabase.from("job_categories").select("id, name").order("sort_order"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", company.id).in("status", ["active", "pending_review"]),
  ]);
  const canPublish = Boolean(plan) && (count ?? 0) < (plan?.max_active_jobs ?? 0) && company.status === "active";
  return (
    <>
      <PageHeader title="Publicar vaga" description={company.verification_status === "verified" ? "A vaga entra no ar imediatamente após a publicação." : "Como sua empresa ainda está em verificação, a vaga passará por moderação antes de ser publicada."} />
      <JobForm categories={categories ?? []} canPublish={canPublish} defaults={{ city: company.city, state: company.state as never }} />
    </>
  );
}
