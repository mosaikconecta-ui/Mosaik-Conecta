import { notFound } from "next/navigation";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, PageHeader } from "@/components/ui/misc";
import { JobForm } from "@/components/company/job-form";
import type { Job } from "@/lib/types";

export const metadata = { title: "Editar vaga" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company, plan } = await requireCompany();
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).maybeSingle<Job>();
  if (!job) notFound();
  const { data: categories } = await supabase.from("job_categories").select("id, name").order("sort_order");
  return (
    <>
      <PageHeader title="Editar vaga" description={job.title} />
      {job.status === "removed" && <Alert tone="danger" className="mb-6" title="Vaga removida pela moderação">{job.moderation_note ?? "Esta vaga violou os termos de uso e não pode ser editada."}</Alert>}
      {job.moderation_note && job.status !== "removed" && <Alert tone="warning" className="mb-6" title="Observação da moderação">{job.moderation_note}</Alert>}
      {job.status !== "removed" && (
        <JobForm jobId={job.id} status={job.status} categories={categories ?? []} canPublish={Boolean(plan)} defaults={{
          title: job.title, category_id: job.category_id, openings: job.openings, description: job.description,
          responsibilities: job.responsibilities ?? "", requirements: job.requirements ?? "", benefits: job.benefits ?? "",
          schedule: job.schedule ?? "", salary_min: job.salary_min, salary_max: job.salary_max, city: job.city,
          state: job.state as never, work_mode: job.work_mode, contract_type: job.contract_type,
          education_level: job.education_level, experience_level: job.experience_level, application_deadline: job.application_deadline ?? "",
        }} />
      )}
    </>
  );
}
