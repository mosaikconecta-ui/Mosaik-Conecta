import Link from "next/link";
import {
  ArrowRight, BadgeCheck, Bell, Building2, FileText, Search, Send, ShieldCheck, Users, BriefcaseBusiness,
} from "lucide-react";
import { SearchBar } from "@/components/jobs/search-bar";
import { JobCard } from "@/components/jobs/job-card";
import { CategoryIcon } from "@/components/category-icon";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, publicStorageUrl } from "@/lib/env";
import { getCategories, JOB_CARD_COLUMNS, type JobCard as JobCardData } from "@/lib/jobs";
import { jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { formatCents } from "@/lib/format";

const FAQ = [
  {
    q: "O VagaBrasil é gratuito para candidatos?",
    a: "Sim. Candidatos criam conta, cadastram currículo e se candidatam a quantas vagas quiserem sem pagar nada. Nenhuma empresa pode cobrar taxas de candidatos — se isso acontecer, denuncie a vaga.",
  },
  {
    q: "Como me candidato a uma vaga?",
    a: "Crie sua conta, preencha seu currículo (ou envie um PDF) e clique em “Candidatar-se” na página da vaga. Você acompanha o status de cada candidatura no seu painel.",
  },
  {
    q: "Quem pode ver meus dados?",
    a: "Seu currículo não é público. Apenas as empresas para as quais você se candidatou podem visualizá-lo, por meio de links temporários. Você pode exportar ou excluir seus dados a qualquer momento.",
  },
  {
    q: "Como minha empresa anuncia vagas?",
    a: "Cadastre a empresa com CNPJ, escolha um plano mensal e publique vagas pelo painel. Empresas passam por verificação para manter a plataforma livre de anúncios falsos.",
  },
  {
    q: "Posso cancelar a assinatura da empresa?",
    a: "Sim, a qualquer momento pelo painel. O plano continua válido até o fim do período já pago, sem multa.",
  },
];

async function getHomeData() {
  if (!isSupabaseConfigured) return { recent: [], featured: [], companies: [], testimonials: [], totalJobs: 0 };
  const supabase = await createClient();
  const base = () => supabase.from("public_jobs").select(JOB_CARD_COLUMNS).eq("status", "active").eq("is_closed", false);
  const [recent, featured, companies, testimonials, total] = await Promise.all([
    base().order("published_at", { ascending: false }).limit(6),
    base().eq("is_featured", true).order("published_at", { ascending: false }).limit(4),
    supabase.from("public_companies").select("id, trade_name, slug, logo_path, city, state, is_verified, active_jobs, is_demo")
      .gt("active_jobs", 0).order("active_jobs", { ascending: false }).limit(8),
    supabase.from("testimonials").select("id, author_name, author_role, body").eq("approved", true).order("created_at", { ascending: false }).limit(3),
    supabase.from("public_jobs").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_closed", false),
  ]);
  return {
    recent: (recent.data ?? []) as JobCardData[],
    featured: (featured.data ?? []) as JobCardData[],
    companies: companies.data ?? [],
    testimonials: testimonials.data ?? [],
    totalJobs: total.count ?? 0,
  };
}

export default async function HomePage() {
  const [{ recent, featured, companies, testimonials, totalJobs }, categories] = await Promise.all([getHomeData(), getCategories()]);
  const popular = categories.filter((c) => (c.total ?? 0) > 0).slice(0, 5);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([organizationJsonLd(), websiteJsonLd(), faqLd])} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-navy-50/70 to-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-navy-100)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="container-page relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            {totalJobs > 0 && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[13px] font-medium text-navy-700">
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                {totalJobs.toLocaleString("pt-BR")} {totalJobs === 1 ? "vaga aberta" : "vagas abertas"} agora
              </p>
            )}
            <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-[56px]">
              Seu próximo emprego <span className="text-brand-600">começa aqui.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-navy-600">
              Encontre oportunidades em todo o Brasil e dê o próximo passo na sua carreira.
            </p>
          </div>
          <SearchBar className="mx-auto mt-10 max-w-3xl" />
          {popular.length > 0 && (
            <div className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted">Populares:</span>
              {popular.map((c) => (
                <Link key={c.slug} href={`/vagas/${c.slug}`} className="rounded-full border border-line bg-white px-3 py-1 text-navy-700 hover:border-brand-300 hover:text-brand-700">
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categorias */}
      <section className="container-page py-16" aria-labelledby="categorias">
        <SectionHeading id="categorias" title="Explore por área profissional" link={{ href: "/vagas", label: "Ver todas as vagas" }} />
        {categories.length === 0 ? (
          <EmptyState icon={BriefcaseBusiness} title="Categorias indisponíveis" description="Não foi possível carregar as categorias agora." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 12).map((c) => (
              <li key={c.id}>
                <Link href={`/vagas/${c.slug}`} className="card flex h-full items-center gap-3 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <CategoryIcon name={c.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy-900">{c.name}</span>
                    <span className="text-xs text-muted">{Number(c.total ?? 0) === 0 ? "Sem vagas no momento" : `${c.total} ${Number(c.total) === 1 ? "vaga" : "vagas"}`}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vagas em destaque */}
      {featured.length > 0 && (
        <section className="border-y border-line bg-surface py-16" aria-labelledby="destaques">
          <div className="container-page">
            <SectionHeading id="destaques" title="Vagas em destaque" />
            <div className="grid gap-4 md:grid-cols-2">
              {featured.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          </div>
        </section>
      )}

      {/* Vagas recentes */}
      <section className="container-page py-16" aria-labelledby="recentes">
        <SectionHeading id="recentes" title="Vagas recentes" link={{ href: "/vagas", label: "Ver todas" }} />
        {recent.length === 0 ? (
          <EmptyState icon={Search} title="Ainda não há vagas publicadas"
            description="Novas oportunidades aparecem aqui assim que as empresas publicarem. Cadastre seu currículo para receber alertas."
            action={<ButtonLink href="/cadastro">Cadastrar currículo</ButtonLink>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((j) => <JobCard key={j.id} job={j} compact />)}
          </div>
        )}
      </section>

      {/* Empresas contratando */}
      {companies.length > 0 && (
        <section className="border-t border-line bg-surface py-16" aria-labelledby="empresas">
          <div className="container-page">
            <SectionHeading id="empresas" title="Empresas que estão contratando" link={{ href: "/empresas", label: "Ver empresas" }} />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {companies.map((c) => (
                <li key={c.id}>
                  <Link href={`/empresas/${c.slug}`} className="card flex items-center gap-3 p-4 hover:border-brand-200">
                    <Avatar name={c.trade_name} src={publicStorageUrl("company-logos", c.logo_path)} size={44} square />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-sm font-semibold text-navy-900">
                        {c.trade_name}
                        {c.is_verified && <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verificada" />}
                      </span>
                      <span className="text-xs text-muted">{c.active_jobs} {c.active_jobs === 1 ? "vaga aberta" : "vagas abertas"}{c.is_demo ? " · Demonstração" : ""}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section id="como-funciona" className="container-page py-20" aria-labelledby="como-funciona-titulo">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="como-funciona-titulo" className="text-3xl font-bold">Como funciona</h2>
          <p className="mt-3 text-navy-600">Processo simples para quem procura emprego e para quem contrata.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <HowItWorks title="Para candidatos" badge="Gratuito" steps={[
            { icon: FileText, title: "Crie seu currículo", text: "Cadastre experiências, formação e habilidades ou envie seu currículo em PDF." },
            { icon: Search, title: "Encontre vagas", text: "Filtre por cidade, área, salário, modalidade e tipo de contratação." },
            { icon: Send, title: "Candidate-se e acompanhe", text: "Envie sua candidatura com um clique e acompanhe cada etapa no painel." },
          ]} />
          <HowItWorks title="Para empresas" badge="A partir de R$ 99,90/mês" steps={[
            { icon: Building2, title: "Cadastre sua empresa", text: "Informe o CNPJ e os dados da empresa. Fazemos a verificação para garantir a confiança." },
            { icon: BriefcaseBusiness, title: "Publique vagas", text: "Descreva a oportunidade, requisitos e benefícios. A vaga entra no ar e no Google." },
            { icon: Users, title: "Gerencie candidatos", text: "Analise currículos, mova candidatos entre etapas e mantenha todos informados." },
          ]} />
        </div>
      </section>

      {/* CTA empresas */}
      <section className="bg-navy-900" aria-labelledby="cta-empresas">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 id="cta-empresas" className="text-3xl font-bold text-white">Sua empresa precisa contratar?</h2>
            <p className="mt-3 max-w-xl text-navy-200">
              Publique vagas para candidatos de todo o Brasil, receba currículos organizados e conduza seus processos seletivos em um só lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/cadastro/empresa" size="lg">Anunciar vagas</ButtonLink>
              <ButtonLink href="/planos" size="lg" variant="outline" className="border-navy-700 bg-transparent text-white hover:bg-navy-800 hover:border-navy-600">Ver planos</ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 text-sm text-navy-100">
            {[
              [ShieldCheck, "Empresas verificadas por CNPJ e moderação de vagas"],
              [Bell, "Notificação a cada nova candidatura"],
              [Users, "Painel de candidatos com status e histórico"],
              [BadgeCheck, `Planos a partir de ${formatCents(9990)}/mês, sem fidelidade`],
            ].map(([Icon, text]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={text as string} className="flex items-center gap-3 rounded-lg border border-navy-800 bg-navy-950/40 px-4 py-3">
                  <I className="size-5 shrink-0 text-brand-300" aria-hidden /> {text as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Depoimentos reais (somente quando existirem e forem aprovados) */}
      {testimonials.length > 0 && (
        <section className="container-page py-16" aria-labelledby="depoimentos">
          <SectionHeading id="depoimentos" title="Quem usa o VagaBrasil" />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="card p-6">
                <blockquote className="text-[15px] leading-relaxed text-navy-700">“{t.body}”</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-semibold text-navy-900">{t.author_name}</span>{t.author_role && <span className="text-muted"> · {t.author_role}</span>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-line bg-surface py-16" aria-labelledby="faq">
        <div className="container-page max-w-3xl">
          <h2 id="faq" className="text-center text-3xl font-bold">Perguntas frequentes</h2>
          <div className="mt-10 divide-y divide-line rounded-(--radius-card) border border-line bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900">
                  {f.q}
                  <span className="text-xl leading-none text-navy-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-navy-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ id, title, link }: { id: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <h2 id={id} className="text-2xl font-bold">{title}</h2>
      {link && (
        <Link href={link.href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
          {link.label} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function HowItWorks({ title, badge, steps }: { title: string; badge: string; steps: { icon: typeof Search; title: string; text: string }[] }) {
  return (
    <div className="card p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{badge}</span>
      </div>
      <ol className="mt-6 space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white"><s.icon className="size-5" aria-hidden /></span>
            <div>
              <p className="font-semibold text-navy-900"><span className="mr-1.5 text-muted">{i + 1}.</span>{s.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-navy-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
