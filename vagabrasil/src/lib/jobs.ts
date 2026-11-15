import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  CONTRACT_TYPES, PAGE_SIZE, PUBLISHED_WITHIN, UFS, WORK_MODES,
  ufBySlug, type ContractType, type UF, type WorkMode,
} from "@/lib/constants";
import { slugify, stripAccents } from "@/lib/slug";
import type { JobCategory, PublicJob } from "@/lib/types";

export const JOB_CARD_COLUMNS =
  "id, slug, title, city, city_slug, state, work_mode, contract_type, salary_min, salary_max, description, published_at, application_deadline, is_featured, is_closed, is_demo, company_name, company_slug, company_logo, company_verified, category_slug, category_name, status";

export type JobCard = Pick<
  PublicJob,
  | "id" | "slug" | "title" | "city" | "city_slug" | "state" | "work_mode" | "contract_type" | "salary_min" | "salary_max"
  | "description" | "published_at" | "application_deadline" | "is_featured" | "is_closed" | "is_demo" | "company_name"
  | "company_slug" | "company_logo" | "company_verified" | "category_slug" | "category_name" | "status"
>;

export interface JobFilters {
  q?: string;
  uf?: UF;
  cidade?: string;
  categoria?: string;
  salario?: number;
  modalidade?: WorkMode;
  contrato?: ContractType;
  publicada?: keyof typeof PUBLISHED_WITHIN;
  empresa?: string;
  pagina: number;
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Interpreta texto livre de localização ("São Paulo", "SP", "Minas Gerais"). */
export function parseLocation(raw?: string): Pick<JobFilters, "uf" | "cidade"> {
  if (!raw) return {};
  const clean = raw.split(/[,\-–/]/)[0]!.trim();
  const tail = raw.match(/[,\-–/]\s*([A-Za-z]{2})\s*$/)?.[1]?.toUpperCase();
  const asUf = UFS.find((u) => u[0] === clean.toUpperCase() || slugify(u[1]) === slugify(clean));
  if (asUf && !tail) return { uf: asUf[0] };
  const uf = UFS.find((u) => u[0] === tail)?.[0];
  return { cidade: slugify(clean) || undefined, uf };
}

export function parseFilters(sp: SP): JobFilters {
  const f: JobFilters = { pagina: Math.max(1, Math.min(500, Number(one(sp.pagina)) || 1)) };
  const q = one(sp.q);
  if (q) f.q = q.slice(0, 100);
  const uf = one(sp.uf)?.toUpperCase();
  if (uf && UFS.some((u) => u[0] === uf)) f.uf = uf as UF;
  const cidade = one(sp.cidade);
  if (cidade) f.cidade = slugify(cidade).slice(0, 80) || undefined;
  const local = one(sp.local);
  if (local && !f.uf && !f.cidade) Object.assign(f, parseLocation(local));
  const categoria = one(sp.categoria);
  if (categoria && /^[a-z0-9-]{2,60}$/.test(categoria)) f.categoria = categoria;
  const salario = Number(one(sp.salario));
  if (salario > 0) f.salario = Math.min(salario, 1_000_000);
  const modalidade = one(sp.modalidade);
  if (modalidade && modalidade in WORK_MODES) f.modalidade = modalidade as WorkMode;
  const contrato = one(sp.contrato);
  if (contrato && contrato in CONTRACT_TYPES) f.contrato = contrato as ContractType;
  const publicada = one(sp.publicada);
  if (publicada && publicada in PUBLISHED_WITHIN) f.publicada = publicada as JobFilters["publicada"];
  const empresa = one(sp.empresa);
  if (empresa && /^[a-z0-9-]{2,120}$/.test(empresa)) f.empresa = empresa;
  return f;
}

export function filtersToQuery(f: Partial<JobFilters>, overrides: Partial<JobFilters> = {}) {
  const merged = { ...f, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === null || v === "" || (k === "pagina" && Number(v) <= 1)) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const hasActiveFilters = (f: JobFilters) =>
  Boolean(f.q || f.uf || f.cidade || f.categoria || f.salario || f.modalidade || f.contrato || f.publicada || f.empresa);

export async function searchJobs(f: JobFilters, pageSize = PAGE_SIZE) {
  if (!isSupabaseConfigured) return { jobs: [] as JobCard[], total: 0, error: "not_configured" as const };
  const supabase = await createClient();
  let query = supabase
    .from("public_jobs")
    .select(JOB_CARD_COLUMNS, { count: "exact" })
    .eq("status", "active")
    .eq("is_closed", false);

  if (f.q) {
    const terms = stripAccents(f.q).replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
    if (terms) query = query.textSearch("search", terms, { type: "websearch", config: "portuguese" });
  }
  if (f.uf) query = query.eq("state", f.uf);
  if (f.cidade) query = query.eq("city_slug", f.cidade);
  if (f.categoria) query = query.eq("category_slug", f.categoria);
  if (f.modalidade) query = query.eq("work_mode", f.modalidade);
  if (f.contrato) query = query.eq("contract_type", f.contrato);
  if (f.empresa) query = query.eq("company_slug", f.empresa);
  if (f.salario) query = query.or(`salary_max.gte.${f.salario},and(salary_max.is.null,salary_min.gte.${f.salario})`);
  if (f.publicada) {
    const since = new Date(Date.now() - Number(f.publicada) * 86400_000).toISOString();
    query = query.gte("published_at", since);
  }

  const from = (f.pagina - 1) * pageSize;
  const { data, count, error } = await query
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    // Página fora do intervalo retorna 416 do PostgREST
    if (error.code === "PGRST103") return { jobs: [], total: count ?? 0, error: null };
    console.error("[searchJobs]", error);
    return { jobs: [] as JobCard[], total: 0, error: "query_failed" as const };
  }
  return { jobs: (data ?? []) as JobCard[], total: count ?? 0, error: null };
}

export const getCategories = cache(async (): Promise<JobCategory[]> => {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("active_job_categories");
  return (data ?? []) as JobCategory[];
});

export const getActiveLocations = cache(async () => {
  if (!isSupabaseConfigured) return [] as { city: string; city_slug: string; state: string; total: number }[];
  const supabase = await createClient();
  const { data } = await supabase.rpc("active_job_locations", { p_limit: 300 });
  return (data ?? []) as { city: string; city_slug: string; state: string; total: number }[];
});

const titleCase = (s: string) =>
  s.replace(/\b([a-zà-ú])([a-zà-ú]*)/g, (_, a: string, b: string) => (["de", "da", "do", "das", "dos", "e"].includes(a + b) ? a + b : a.toUpperCase() + b));

export interface Landing {
  filters: Partial<JobFilters>;
  heading: string;
  description: string;
  kind: "remote" | "category" | "state" | "city" | "keyword_city" | "keyword";
}

/** Resolve URLs amigáveis como /vagas/sao-paulo, /vagas/logistica, /vagas/auxiliar-logistica-sao-paulo. */
export const resolveLanding = cache(async (segment: string): Promise<Landing | null> => {
  const seg = slugify(decodeURIComponent(segment));
  if (!seg || seg.length > 120) return null;
  if (seg === "remotas" || seg === "remoto" || seg === "home-office") {
    return {
      kind: "remote",
      filters: { modalidade: "remoto" },
      heading: "Vagas remotas (home office)",
      description: "Vagas de trabalho remoto e home office para profissionais de todo o Brasil.",
    };
  }
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === seg);
  if (cat) {
    return {
      kind: "category",
      filters: { categoria: cat.slug },
      heading: `Vagas de ${cat.name}`,
      description: cat.description ?? `Vagas de emprego em ${cat.name} em todo o Brasil.`,
    };
  }
  const state = ufBySlug(seg) ?? UFS.find((u) => u[0].toLowerCase() === seg);
  if (state) {
    return {
      kind: "state",
      filters: { uf: state[0] },
      heading: `Vagas de emprego em ${state[1]}`,
      description: `Oportunidades de emprego em ${state[1]} (${state[0]}) publicadas por empresas da região.`,
    };
  }
  const locations = await getActiveLocations();
  const city = locations.find((l) => l.city_slug === seg);
  if (city) {
    return {
      kind: "city",
      filters: { cidade: city.city_slug },
      heading: `Vagas de emprego em ${city.city}`,
      description: `Vagas abertas em ${city.city} – ${city.state}. Encontre oportunidades perto de você.`,
    };
  }
  const suffix = locations
    .filter((l) => seg.endsWith(`-${l.city_slug}`))
    .sort((a, b) => b.city_slug.length - a.city_slug.length)[0];
  if (suffix) {
    const term = seg.slice(0, -(suffix.city_slug.length + 1)).replace(/-/g, " ");
    return {
      kind: "keyword_city",
      filters: { q: term, cidade: suffix.city_slug },
      heading: `Vagas de ${titleCase(term)} em ${suffix.city}`,
      description: `Vagas de ${term} em ${suffix.city} – ${suffix.state}.`,
    };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+){0,5}$/.test(seg)) return null;
  const term = seg.replace(/-/g, " ");
  return {
    kind: "keyword",
    filters: { q: term },
    heading: `Vagas de ${titleCase(term)}`,
    description: `Vagas de emprego para ${term} em todo o Brasil.`,
  };
});
