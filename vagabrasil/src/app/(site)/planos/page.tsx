import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Planos para empresas",
  description: "Publique vagas no VagaBrasil a partir de R$ 99,90/mês. Planos Starter, Profissional e Empresarial, sem fidelidade.",
  alternates: { canonical: "/planos" },
};

// Fallback exibido se o banco não estiver disponível (mesmos valores da migration)
const FALLBACK: Plan[] = [
  { id: "starter", name: "Starter", price_cents: 9990, max_active_jobs: 3, max_recruiters: 1, featured_slots: 0, candidate_filters: false, reports: false, pipeline: false, advanced_metrics: false, team_management: false, sort_order: 1, features: ["Até 3 vagas ativas", "Página da empresa", "Recebimento de candidaturas", "Painel básico"] },
  { id: "profissional", name: "Profissional", price_cents: 19990, max_active_jobs: 10, max_recruiters: 1, featured_slots: 2, candidate_filters: true, reports: true, pipeline: true, advanced_metrics: false, team_management: false, sort_order: 2, features: ["Até 10 vagas ativas", "2 vagas em destaque simultâneas", "Filtros de candidatos", "Relatórios", "Gestão de processos seletivos"] },
  { id: "empresarial", name: "Empresarial", price_cents: 39990, max_active_jobs: 30, max_recruiters: 10, featured_slots: 5, candidate_filters: true, reports: true, pipeline: true, advanced_metrics: true, team_management: true, sort_order: 3, features: ["Até 30 vagas ativas", "5 vagas em destaque simultâneas", "Até 10 recrutadores", "Indicadores avançados", "Gestão de equipe", "Relatórios completos com exportação"] },
];

const DESCRIPTIONS: Record<string, string> = {
  starter: "Para pequenos negócios com contratações pontuais.",
  profissional: "Para empresas com contratação contínua.",
  empresarial: "Para operações com várias equipes de recrutamento.",
};

export default async function PlansPage() {
  let plans = FALLBACK;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
    if (data?.length) plans = data as Plan[];
  }
  const current = await getCurrentUser();
  const isCompany = current?.profile.role === "company";

  return (
    <div>
      <section className="border-b border-line bg-gradient-to-b from-navy-50/60 to-white">
        <div className="container-page py-16 text-center">
          <h1 className="text-4xl font-extrabold">Planos para empresas</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-navy-600">
            Publique vagas, receba candidaturas e gerencie processos seletivos. Assinatura mensal, sem fidelidade — cancele quando quiser.
          </p>
        </div>
      </section>
      <section className="container-page py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => {
            const highlight = p.id === "profissional";
            const href = isCompany ? `/empresa/assinatura/checkout?plano=${p.id}` : `/cadastro/empresa?plano=${p.id}`;
            return (
              <div key={p.id} className={cn("card relative flex flex-col p-7", highlight && "border-brand-300 ring-2 ring-brand-100")}>
                {highlight && <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">Mais escolhido</span>}
                <h2 className="text-xl font-bold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted">{DESCRIPTIONS[p.id]}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-navy-900">{formatCents(p.price_cents)}</span>
                  <span className="text-sm text-muted">/mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-navy-700"><Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />{f}</li>
                  ))}
                </ul>
                <ButtonLink href={href} variant={highlight ? "primary" : "navy"} size="lg" className="mt-8 w-full">
                  {isCompany ? "Assinar plano" : "Começar agora"}
                </ButtonLink>
              </div>
            );
          })}
        </div>
        <div className="mt-12 grid gap-6 rounded-(--radius-card) border border-line bg-surface p-7 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">Vaga em destaque avulsa</h3>
            <p className="mt-1 text-sm text-navy-600">Destaque qualquer vaga por 30 dias no topo das buscas e na página inicial, em qualquer plano.</p>
          </div>
          <div>
            <h3 className="font-semibold">Pagamento seguro</h3>
            <p className="mt-1 text-sm text-navy-600">Cobrança recorrente processada pelo Mercado Pago com cartão de crédito. Você recebe o comprovante por e-mail.</p>
          </div>
          <div>
            <h3 className="font-semibold">Dúvidas?</h3>
            <p className="mt-1 text-sm text-navy-600">Veja as <Link href="/#faq" className="font-medium text-brand-700">perguntas frequentes</Link> ou fale com nossa equipe comercial.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
