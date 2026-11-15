"use client";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { updatePreferencesAction } from "@/actions/candidate";
import { preferencesSchema, type PreferencesInput } from "@/lib/validation/candidate";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { CONTRACT_TYPES, UFS, WORK_MODES } from "@/lib/constants";

export function PreferencesForm({ defaults, categories }: { defaults: PreferencesInput; categories: { id: number; name: string }[] }) {
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(preferencesSchema, updatePreferencesAction as never, defaults);
  const chip = "flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-800";
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo desejado" htmlFor="desired_role" error={err("desired_role")}>
          <Input id="desired_role" placeholder="Ex.: Auxiliar de logística" {...form.register("desired_role")} />
        </Field>
        <Field label="Pretensão salarial (R$/mês)" htmlFor="desired_salary" error={err("desired_salary")} hint="Visível apenas para empresas onde você se candidatar.">
          <Input id="desired_salary" inputMode="numeric" placeholder="2500" {...form.register("desired_salary")} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-navy-800">Modalidades de trabalho</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(WORK_MODES).map(([v, l]) => <label key={v} className={chip}><input type="checkbox" value={v} className="accent-brand-600" {...form.register("preferred_work_modes")} />{l}</label>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-navy-800">Tipos de contratação</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONTRACT_TYPES).map(([v, l]) => <label key={v} className={chip}><input type="checkbox" value={v} className="accent-brand-600" {...form.register("preferred_contract_types")} />{l}</label>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-navy-800">Áreas de interesse <span className="font-normal text-muted">(até 5)</span></legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => <label key={c.id} className={chip}><input type="checkbox" value={c.id} className="accent-brand-600" {...form.register("preferred_category_ids")} />{c.name}</label>)}
        </div>
        {err("preferred_category_ids") && <p className="mt-1.5 text-[13px] text-red-600">{err("preferred_category_ids")}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-navy-800">Estados de interesse <span className="font-normal text-muted">(até 5)</span></legend>
        <div className="flex flex-wrap gap-2">
          {UFS.map(([uf, name]) => <label key={uf} className={chip} title={name}><input type="checkbox" value={uf} className="accent-brand-600" {...form.register("preferred_states")} />{uf}</label>)}
        </div>
        {err("preferred_states") && <p className="mt-1.5 text-[13px] text-red-600">{err("preferred_states")}</p>}
      </fieldset>
      <Checkbox label="Tenho disponibilidade para mudança de cidade" {...form.register("available_to_relocate")} />
      <FormStatus error={serverError} success={success} />
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar preferências</Button>
    </form>
  );
}
