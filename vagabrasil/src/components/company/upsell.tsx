import { Lock } from "lucide-react";
import { FEATURE_LABEL, type PlanFeature } from "@/lib/plan";
import { ButtonLink } from "@/components/ui/button";

export function Upsell({ feature, description }: { feature: PlanFeature; description: string }) {
  const f = FEATURE_LABEL[feature];
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Lock className="size-5" aria-hidden /></span>
      <h2 className="mt-4 text-lg font-semibold">{f.label}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>
      <p className="mt-1 text-sm font-medium text-navy-700">Disponível a partir do plano {f.minPlan}.</p>
      <ButtonLink href="/empresa/assinatura" className="mt-5">Ver planos</ButtonLink>
    </div>
  );
}
