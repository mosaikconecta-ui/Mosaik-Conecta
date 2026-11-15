import Link from "next/link";
import { SearchX, ServerCrash } from "lucide-react";
import { JobCard } from "./job-card";
import { JobFilters } from "./job-filters";
import { Alert, EmptyState, Pagination } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/constants";
import { filtersToQuery, getActiveLocations, getCategories, searchJobs, type JobFilters as Filters } from "@/lib/jobs";

export async function JobListing({ filters, basePath, heading, description, preserveInPagination = true }: {
  filters: Filters;
  basePath: string;
  heading: string;
  description?: string;
  /** Em páginas SEO, os filtros fixos já estão na URL e não entram na query. */
  preserveInPagination?: boolean | Partial<Filters>;
}) {
  const [{ jobs, total, error }, categories, locations] = await Promise.all([
    searchJobs(filters),
    getCategories(),
    getActiveLocations(),
  ]);
  const pageQuery = typeof preserveInPagination === "object" ? preserveInPagination : preserveInPagination ? filters : {};
  const from = total === 0 ? 0 : (filters.pagina - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, filters.pagina * PAGE_SIZE);

  const topCities = locations.slice(0, 10);
  const topCategories = categories.filter((c) => Number(c.total) > 0).slice(0, 10);

  return (
    <div className="container-page py-8 sm:py-10">
      <nav aria-label="Trilha" className="mb-4 text-[13px] text-muted">
        <Link href="/" className="hover:text-navy-800">Início</Link> <span aria-hidden>/</span>{" "}
        <Link href="/vagas" className="hover:text-navy-800">Vagas</Link>
        {basePath !== "/vagas" && <> <span aria-hidden>/</span> <span className="text-navy-700">{heading}</span></>}
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{heading}</h1>
        {description && <p className="mt-2 max-w-3xl text-[15px] text-navy-600">{description}</p>}
      </header>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <JobFilters filters={filters} categories={categories} locations={locations} />
        <div className="min-w-0">
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {total > 0
              ? <>Mostrando <strong className="text-navy-800">{from}–{to}</strong> de <strong className="text-navy-800">{total.toLocaleString("pt-BR")}</strong> {total === 1 ? "vaga" : "vagas"}</>
              : "Nenhuma vaga encontrada"}
          </p>
          {error === "query_failed" && <Alert tone="danger" className="mb-4" title="Não foi possível carregar as vagas">Tente novamente em instantes.</Alert>}
          {error === "not_configured" ? (
            <EmptyState icon={ServerCrash} title="Banco de dados não configurado" description="Configure o Supabase para listar vagas." />
          ) : jobs.length === 0 ? (
            <EmptyState icon={SearchX} title="Nenhuma vaga com esses critérios"
              description="Tente remover alguns filtros, buscar por termos mais amplos ou ver vagas em outras cidades."
              action={<ButtonLink href="/vagas" variant="outline">Ver todas as vagas</ButtonLink>} />
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
          <Pagination page={filters.pagina} total={total} pageSize={PAGE_SIZE}
            href={(p) => `${basePath}${filtersToQuery(pageQuery, { pagina: p })}`} />

          {(topCities.length > 0 || topCategories.length > 0) && (
            <section className="mt-12 grid gap-8 border-t border-line pt-8 sm:grid-cols-2" aria-label="Buscas relacionadas">
              {topCities.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold">Vagas por cidade</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {topCities.map((l) => (
                      <li key={`${l.city_slug}-${l.state}`}>
                        <Link href={`/vagas/${l.city_slug}`} className="inline-block rounded-full border border-line px-3 py-1 text-[13px] text-navy-700 hover:border-brand-300 hover:text-brand-700">
                          {l.city} – {l.state}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topCategories.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold">Vagas por área</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {topCategories.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/vagas/${c.slug}`} className="inline-block rounded-full border border-line px-3 py-1 text-[13px] text-navy-700 hover:border-brand-300 hover:text-brand-700">{c.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
