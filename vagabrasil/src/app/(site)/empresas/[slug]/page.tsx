import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, Globe, MapPin, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicStorageUrl } from "@/lib/env";
import { JOB_CARD_COLUMNS, type JobCard as JobCardData } from "@/lib/jobs";
import { Alert, Avatar, Badge, EmptyState } from "@/components/ui/misc";
import { JobCard } from "@/components/jobs/job-card";

const getCompany = cache(async (slug: string) => {
  if (!isSupabaseConfigured || !/^[a-z0-9-]{2,140}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_companies").select("*").eq("slug", slug).maybeSingle();
  return data;
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCompany((await params).slug);
  if (!c) return { title: "Empresa não encontrada", robots: { index: false } };
  return {
    title: `Vagas na ${c.trade_name}`,
    description: c.description?.slice(0, 155) ?? `Vagas de emprego abertas na ${c.trade_name} (${c.city} – ${c.state}).`,
    alternates: { canonical: `/empresas/${c.slug}` },
    robots: c.active_jobs === 0 || c.is_demo ? { index: false, follow: true } : undefined,
  };
}

export default async function CompanyPage({ params }: Props) {
  const c = await getCompany((await params).slug);
  if (!c) notFound();
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("public_jobs").select(JOB_CARD_COLUMNS)
    .eq("company_id", c.id).eq("status", "active").eq("is_closed", false)
    .order("is_featured", { ascending: false }).order("published_at", { ascending: false }).limit(100);
  return (
    <div className="bg-surface">
      <div className="border-b border-line bg-white">
        <div className="container-page py-10">
          {c.is_demo && <Alert tone="warning" className="mb-6" title="Empresa de demonstração">Esta empresa é fictícia e existe apenas para demonstrar a plataforma.</Alert>}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={c.trade_name} src={publicStorageUrl("company-logos", c.logo_path)} size={80} square />
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold">{c.trade_name}{c.is_verified && <BadgeCheck className="size-6 text-brand-600" aria-label="Empresa verificada" />}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-navy-600">
                <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{c.city} – {c.state}</span>
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-brand-700 hover:underline"><Globe className="size-4" aria-hidden />Site da empresa</a>}
                {c.is_verified && <Badge tone="success">Empresa verificada</Badge>}
              </div>
            </div>
          </div>
          {c.description && <p className="mt-6 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-navy-700">{c.description}</p>}
        </div>
      </div>
      <div className="container-page py-10">
        <h2 className="text-xl font-bold">Vagas abertas ({jobs?.length ?? 0})</h2>
        {!jobs?.length ? (
          <EmptyState className="mt-5" icon={SearchX} title="Nenhuma vaga aberta no momento" description="Esta empresa não possui vagas ativas agora. Volte em breve." />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">{(jobs as JobCardData[]).map((j) => <JobCard key={j.id} job={j} />)}</div>
        )}
      </div>
    </div>
  );
}
