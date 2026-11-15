import type { Metadata } from "next";
import { JobListing } from "@/components/jobs/job-listing";
import { hasActiveFilters, parseFilters } from "@/lib/jobs";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const filtered = hasActiveFilters(filters);
  return {
    title: filters.q ? `Vagas de ${filters.q}` : "Vagas de emprego em todo o Brasil",
    description: "Pesquise vagas de emprego por cargo, cidade, estado, área, salário, modalidade e tipo de contratação.",
    alternates: { canonical: filters.pagina > 1 && !filtered ? `/vagas?pagina=${filters.pagina}` : "/vagas" },
    // Combinações de filtros não são indexadas (evita conteúdo duplicado); os links são seguidos.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function JobsPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  return (
    <JobListing
      filters={filters}
      basePath="/vagas"
      heading={filters.q ? `Vagas de “${filters.q}”` : "Vagas de emprego"}
      description={filters.q ? undefined : "Oportunidades publicadas por empresas de todo o Brasil. Use os filtros para refinar sua busca."}
    />
  );
}
