import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/format";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/action-form";
import { saveShippingAction } from "@/actions/admin-misc";
import type { ShippingMethod } from "@prisma/client";

export const dynamic = "force-dynamic";
const REGIONS: [string, string][] = [["SE", "Sudeste"], ["S", "Sul"], ["CO", "Centro-Oeste"], ["NE", "Nordeste"], ["N", "Norte"]];

function ShippingForm({ m }: { m?: ShippingMethod }) {
  const mult = (m?.regionMultiplier ?? {}) as Record<string, number>;
  return (
    <ActionForm action={saveShippingAction} submitLabel={m ? "Salvar" : "Criar modalidade"} resetOnSuccess={!m} className="grid gap-3 sm:grid-cols-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <label className="sm:col-span-2"><span className="label">Nome exibido</span><input name="name" defaultValue={m?.name} className="field" /></label>
      <label className="sm:col-span-2"><span className="label">Transportadora</span><input name="carrier" defaultValue={m?.carrier} className="field" /></label>
      <label className="sm:col-span-4"><span className="label">Descrição</span><input name="description" defaultValue={m?.description ?? ""} className="field" /></label>
      <label><span className="label">Base (R$)</span><input name="base" defaultValue={centsToInput(m?.baseCents ?? 0)} className="field" /></label>
      <label><span className="label">Por kg (R$)</span><input name="perKg" defaultValue={centsToInput(m?.perKgCents ?? 0)} className="field" /></label>
      <label><span className="label">Grátis acima de (R$)</span><input name="freeOver" defaultValue={centsToInput(m?.freeOverCents)} placeholder="vazio = nunca" className="field" /></label>
      <label><span className="label">Ordem</span><input name="position" type="number" defaultValue={m?.position ?? 0} className="field" /></label>
      <label><span className="label">Dias extras mín.</span><input name="extraDaysMin" type="number" defaultValue={m?.extraDaysMin ?? 0} className="field" /></label>
      <label><span className="label">Dias extras máx.</span><input name="extraDaysMax" type="number" defaultValue={m?.extraDaysMax ?? 0} className="field" /></label>
      <fieldset className="sm:col-span-4">
        <legend className="label">Multiplicador por região</legend>
        <div className="grid grid-cols-5 gap-2">{REGIONS.map(([k, label]) => <label key={k} className="text-[12px]">{label}<input name={`m_${k}`} defaultValue={String(mult[k] ?? 1)} className="field mt-1 h-9 min-h-0" /></label>)}</div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} className="size-4" /> Ativa no checkout</label>
    </ActionForm>
  );
}

export default async function ShippingPage() {
  await requireStaff("shipping");
  const methods = await db.shippingMethod.findMany({ orderBy: { position: "asc" } });
  return (
    <div>
      <PageHeader title="Frete" description="Preço = (base + por kg × peso arredondado) × multiplicador da região. Prazo = separação do fornecedor + transporte do fornecedor + dias extras." />
      <div className="space-y-6">
        {methods.map((m) => <Card key={m.id} title={`${m.name} · ${m.carrier}`}><ShippingForm m={m} /></Card>)}
        <Card title="Nova modalidade"><ShippingForm /></Card>
        <p className="text-sm text-muted">Para cotação em tempo real (Correios/Melhor Envio/Frenet), implemente um provedor em <code>src/lib/pricing.ts → quoteShipping</code>. Veja docs/INTEGRACOES.md.</p>
      </div>
    </div>
  );
}
