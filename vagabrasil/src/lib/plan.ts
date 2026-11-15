import type { Plan } from "@/lib/types";

export type PlanFeature = "candidate_filters" | "reports" | "pipeline" | "advanced_metrics" | "team_management";

export const FEATURE_LABEL: Record<PlanFeature, { label: string; minPlan: string }> = {
  candidate_filters: { label: "Filtros de candidatos", minPlan: "Profissional" },
  reports: { label: "Relatórios", minPlan: "Profissional" },
  pipeline: { label: "Gestão de processos seletivos", minPlan: "Profissional" },
  advanced_metrics: { label: "Indicadores avançados", minPlan: "Empresarial" },
  team_management: { label: "Gestão de equipe", minPlan: "Empresarial" },
};

export const planAllows = (plan: Plan | null, feature: PlanFeature) => Boolean(plan?.[feature]);
