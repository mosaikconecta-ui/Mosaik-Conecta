import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { devApproveFeaturedAction } from "@/actions/billing";
import { devPaymentsAllowed } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { Alert, Card, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Destaque de vaga — teste" };

/** Checkout de TESTE do destaque avulso (somente modo de desenvolvimento). */
export default async function FeaturedDevCheckout({ searchParams }: { searchParams: Promise<{ pagamento?: string }> }) {
  const { pagamento } = await searchParams;
  const { company } = await requireCompany();
  if (!devPaymentsAllowed() || !pagamento) notFound();
  const supabase = await createClient();
  const { data: pay } = await supabase.from("payments").select("*").eq("id", pagamento).eq("company_id", company.id).eq("provider", "dev").maybeSingle();
  if (!pay) notFound();
  return (
    <>
      <PageHeader title="Destaque de vaga" />
      <Card>
        <Alert tone="warning" title="Modo de desenvolvimento" className="mb-5">
          Nenhuma cobrança real será feita. Em produção, este passo abre o checkout do Mercado Pago.
        </Alert>
        <p className="text-sm text-navy-700">{pay.description}</p>
        <p className="mt-2 font-display text-2xl font-bold">{formatCents(pay.amount_cents)}</p>
        <div className="mt-6 flex gap-2">
          {pay.status === "pending" && <ActionButton action={devApproveFeaturedAction.bind(null, pay.id)} variant="primary" size="md"><FlaskConical className="size-4" />Simular pagamento aprovado</ActionButton>}
          <ButtonLink href="/empresa/vagas" variant="ghost">Voltar</ButtonLink>
        </div>
      </Card>
    </>
  );
}
