import { SITE_NAME, SITE_URL, publicStorageUrl } from "@/lib/env";
import type { PublicJob } from "@/lib/types";

const EMPLOYMENT_TYPE: Record<string, string> = {
  clt: "FULL_TIME",
  pj: "CONTRACTOR",
  estagio: "INTERN",
  temporario: "TEMPORARY",
  aprendiz: "PART_TIME",
  trainee: "FULL_TIME",
  freelancer: "CONTRACTOR",
};

const toHtml = (s?: string | null) =>
  (s ?? "").split(/\n{2,}/).map((p) => `<p>${p.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!).replace(/\n/g, "<br>")}</p>`).join("");

/** Dados estruturados schema.org/JobPosting (Google for Jobs). */
export function jobPostingJsonLd(job: PublicJob, companyWebsite?: string | null) {
  const published = job.published_at ?? job.updated_at;
  const validThrough = job.application_deadline
    ? `${job.application_deadline}T23:59:59-03:00`
    : new Date(new Date(published).getTime() + 60 * 86400_000).toISOString();

  const description = [
    toHtml(job.description),
    job.responsibilities ? `<h3>Responsabilidades</h3>${toHtml(job.responsibilities)}` : "",
    job.requirements ? `<h3>Requisitos</h3>${toHtml(job.requirements)}` : "",
    job.benefits ? `<h3>Benefícios</h3>${toHtml(job.benefits)}` : "",
  ].join("");

  const data: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description,
    identifier: { "@type": "PropertyValue", name: job.company_name, value: job.id },
    datePosted: published,
    validThrough,
    employmentType: EMPLOYMENT_TYPE[job.contract_type] ?? "OTHER",
    totalJobOpenings: job.openings,
    directApply: true,
    url: `${SITE_URL}/vaga/${job.slug}`,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      ...(companyWebsite ? { sameAs: companyWebsite } : {}),
      ...(job.company_logo ? { logo: publicStorageUrl("company-logos", job.company_logo) } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.city, addressRegion: job.state, addressCountry: "BR" },
    },
  };
  if (job.work_mode === "remoto") {
    data.jobLocationType = "TELECOMMUTE";
    data.applicantLocationRequirements = { "@type": "Country", name: "Brasil" };
  }
  if (job.salary_min || job.salary_max) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "BRL",
      value: {
        "@type": "QuantitativeValue",
        ...(job.salary_min ? { minValue: job.salary_min } : {}),
        ...(job.salary_max ? { maxValue: job.salary_max } : {}),
        ...(!job.salary_min || !job.salary_max ? { value: job.salary_min ?? job.salary_max } : {}),
        unitText: "MONTH",
      },
    };
  }
  return data;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/vagas?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Serializa JSON-LD de forma segura para <script>. */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
