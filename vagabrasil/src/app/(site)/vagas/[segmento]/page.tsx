import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobListing } from "@/components/jobs/job-listing";
import { parseFilters, resolveLanding, searchJobs } from "@/lib/jobs";

type Props = {
  params: Promise<{ segmento: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { segmento } = await params;
  const landing = await resolveLanding(segmento);
  if (!landing) return {};
  const page = parseFilters(await searchParams).pagina;
  const { total } = await searchJobs({ ...landing.filters, pagina: 1 }, 1);
  const canonical = `/vagas/${segmento}${page > 1 ? `?pagina=${page}` : ""}`;
  return {
    title: `${landing.heading}${total ? ` — ${total} ${total === 1 ? "vaga" : "vagas"}` : ""}`,
    description: landing.description,
    alternates: { canonical },
    openGraph: { title: landing.heading, description: landing.description, url: canonical },
    // Não indexar páginas programáticas sem conteúdo real
    robots: total < (landing.kind === "keyword" ? 3 : 1) ? { index: false, follow: true } : undefined,
  };
}

export default async function LandingPage({ params, searchParams }: Props) {
  const { segmento } = await params;
  const landing = await resolveLanding(segmento);
  if (!landing) notFound();
  const sp = parseFilters(await searchParams);
  return (
    <JobListing
      filters={{ ...landing.filters, pagina: sp.pagina }}
      basePath={`/vagas/${segmento}`}
      heading={landing.heading}
      description={landing.description}
      preserveInPagination={false}
    />
  );
}
