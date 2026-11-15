import type { Supplier } from "@prisma/client";
import { SUPPLIER_KINDS } from "@/lib/suppliers";
import { ActionForm } from "./action-form";
import { saveSupplierAction } from "@/actions/admin-misc";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const s = supplier;
  return (
    <ActionForm action={saveSupplierAction} submitLabel={s ? "Salvar fornecedor" : "Cadastrar fornecedor"} resetOnSuccess={!s} className="grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="sm:col-span-2"><span className="label">Nome</span><input name="name" defaultValue={s?.name} className="field" required /></label>
      <label><span className="label">Integração</span>
        <select name="integration" defaultValue={s?.integration ?? "MANUAL"} className="field">{SUPPLIER_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select></label>
      <label><span className="label">Contato</span><input name="contactName" defaultValue={s?.contactName ?? ""} className="field" /></label>
      <label><span className="label">E-mail para pedidos</span><input name="email" type="email" defaultValue={s?.email ?? ""} className="field" /></label>
      <label><span className="label">Telefone</span><input name="phone" defaultValue={s?.phone ?? ""} className="field" /></label>
      <label className="sm:col-span-2"><span className="label">Site / painel do fornecedor</span><input name="website" defaultValue={s?.website ?? ""} className="field" /></label>
      <label><span className="label">Processamento (dias úteis)</span><input name="processingDays" type="number" min={0} defaultValue={s?.processingDays ?? 2} className="field" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="label">Transporte mín.</span><input name="shippingDaysMin" type="number" min={0} defaultValue={s?.shippingDaysMin ?? 5} className="field" /></label>
        <label><span className="label">Transporte máx.</span><input name="shippingDaysMax" type="number" min={0} defaultValue={s?.shippingDaysMax ?? 12} className="field" /></label>
      </div>
      <label className="sm:col-span-2"><span className="label">Observações (condições, contrato, SLA)</span><textarea name="notes" defaultValue={s?.notes ?? ""} className="field min-h-[80px]" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoForward" defaultChecked={s?.autoForward ?? false} className="size-4" /> Encaminhar pedidos pagos automaticamente</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="size-4" /> Ativo</label>
    </ActionForm>
  );
}
