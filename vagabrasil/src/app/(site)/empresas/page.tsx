import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicStorageUrl } from "@/lib/env";
import { Avatar, EmptyState, Pagination } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Empresas que estão contratando",
  description: "Conheça as empresas com vagas abertas no VagaBrasil e veja as oportunidades de cada uma.",
  alternates: { canonical: "/empresas" },
};

const PER_PAGE = 24;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const page = Math.max(1, Number((await searchParams).pagina) || 1);
  let companies: { id: string; trade_name: string; slug: string; logo_path: string | null; city: string; state: string; is_verified: boolean; active_jobs: number; is_demo: boolean; description: string | null }[] = [];
  let total = 0;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data, count } = await supabase
      .from("public_companies")
      .select("id, trade_name, slug, logo_path, city, state, is_verified, active_jobs, is_demo, description", { count: "exact" })
      .gt("active_jobs", 0)
      .order("active_jobs", { ascending: false })
      .order("trade_name")
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    companies = data ?? [];
    total = count ?? 0;
  }
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Empresas que estão contratando</h1>
      <p className="mt-2 text-navy-600">Empresas com vagas abertas agora no VagaBrasil.</p>
      {companies.length === 0 ? (
        <EmptyState className="mt-8" icon={Building2} title="Nenhuma empresa com vagas abertas no momento"
          description="Sua empresa está contratando? Publique vagas e alcance candidatos em todo o Brasil."
          action={<ButtonLink href="/cadastro/empresa">Cadastrar empresa</ButtonLink>} />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id}>
              <Link href={`/empresas/${c.slug}`} className="card flex h-full flex-col p-5 hover:border-brand-200">
                <div className="flex items-center gap-3">
                  <Avatar name={c.trade_name} src={publicStorageUrl("company-logos", c.logo_path)} size={48} square />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate font-semibold text-navy-900">{c.trade_name}{c.is_verified && <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verificada" />}</p>
                    <p className="text-[13px] text-muted">{c.city} – {c.state}{c.is_demo ? " · Demonstração" : ""}</p>
                  </div>
                </div>
                {c.description && <p className="mt-3 line-clamp-2 text-sm text-navy-600">{c.description}</p>}
                <p className="mt-auto pt-4 text-sm font-semibold text-brand-700">{c.active_jobs} {c.active_jobs === 1 ? "vaga aberta" : "vagas abertas"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PER_PAGE} href={(p) => (p > 1 ? `/empresas?pagina=${p}` : "/empresas")} />
    </div>
  );
}
