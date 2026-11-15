import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { AutoSubmitForm } from "./auto-submit";
import { Field, Input, Select } from "@/components/ui/form";
import { CONTRACT_TYPES, PUBLISHED_WITHIN, SALARY_RANGES, UFS, WORK_MODES } from "@/lib/constants";
import type { JobFilters as Filters } from "@/lib/jobs";
import type { JobCategory } from "@/lib/types";

export function JobFilters({ filters, categories, locations }: {
  filters: Filters;
  categories: JobCategory[];
  locations: { city: string; city_slug: string; state: string }[];
}) {
  const cityName = locations.find((l) => l.city_slug === filters.cidade)?.city ?? filters.cidade?.replace(/-/g, " ");
  const content = (
    <AutoSubmitForm action="/vagas" method="get" className="space-y-4" aria-label="Filtros de vagas">
      <Field label="Palavra-chave" htmlFor="f-q">
        <Input id="f-q" name="q" defaultValue={filters.q} placeholder="Cargo, empresa…" maxLength={100} />
      </Field>
      <Field label="Estado" htmlFor="f-uf">
        <Select id="f-uf" name="uf" defaultValue={filters.uf ?? ""}>
          <option value="">Todos os estados</option>
          {UFS.map(([uf, name]) => <option key={uf} value={uf}>{name}</option>)}
        </Select>
      </Field>
      <Field label="Cidade" htmlFor="f-cidade">
        <Input id="f-cidade" name="cidade" defaultValue={cityName} placeholder="Ex.: Campinas" list="cidades-com-vagas" maxLength={80} />
        <datalist id="cidades-com-vagas">
          {locations.map((l) => <option key={`${l.city_slug}-${l.state}`} value={l.city}>{l.state}</option>)}
        </datalist>
      </Field>
      <Field label="Área profissional" htmlFor="f-cat">
        <Select id="f-cat" name="categoria" defaultValue={filters.categoria ?? ""}>
          <option value="">Todas as áreas</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Faixa salarial" htmlFor="f-sal">
        <Select id="f-sal" name="salario" defaultValue={filters.salario ? String(filters.salario) : ""}>
          <option value="">Qualquer salário</option>
          {Object.entries(SALARY_RANGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-navy-800">Modalidade</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {[["", "Todas"], ...Object.entries(WORK_MODES)].map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-sm has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-800">
              <input type="radio" name="modalidade" value={v} defaultChecked={(filters.modalidade ?? "") === v} className="accent-brand-600" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Tipo de contratação" htmlFor="f-contrato">
        <Select id="f-contrato" name="contrato" defaultValue={filters.contrato ?? ""}>
          <option value="">Todos os tipos</option>
          {Object.entries(CONTRACT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Data de publicação" htmlFor="f-pub">
        <Select id="f-pub" name="publicada" defaultValue={filters.publicada ?? ""}>
          <option value="">Qualquer data</option>
          {Object.entries(PUBLISHED_WITHIN).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      {filters.empresa && <input type="hidden" name="empresa" value={filters.empresa} />}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="h-10 flex-1 rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">Aplicar filtros</button>
        <Link href="/vagas" className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-navy-50">Limpar</Link>
      </div>
    </AutoSubmitForm>
  );

  return (
    <>
      <details className="card group p-4 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden />Filtros</span>
          <span className="text-sm font-normal text-muted group-open:hidden">Mostrar</span>
          <span className="hidden text-sm font-normal text-muted group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-4">{content}</div>
      </details>
      <aside className="card hidden self-start p-5 lg:sticky lg:top-20 lg:block">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" aria-hidden />Filtrar vagas</h2>
        {content}
      </aside>
    </>
  );
}
