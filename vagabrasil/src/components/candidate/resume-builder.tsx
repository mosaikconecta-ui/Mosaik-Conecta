"use client";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { updateResumeAction } from "@/actions/candidate";
import { resumeSchema, type ResumeInput } from "@/lib/validation/candidate";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { EDUCATION_LEVELS } from "@/lib/constants";

function TagInput({ value, onChange, placeholder, max, id }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max: number; id: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().slice(0, 40);
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase()) && value.length < max) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
        <Button variant="outline" onClick={add}>Adicionar</Button>
      </div>
      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {value.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-navy-50 py-1 pr-1 pl-3 text-sm text-navy-800">
              {t}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remover ${t}`} className="flex size-5 items-center justify-center rounded-full hover:bg-navy-100"><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ResumeBuilder({ defaults }: { defaults: ResumeInput }) {
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(resumeSchema, updateResumeAction as never, defaults);
  const exp = useFieldArray({ control: form.control, name: "experiences" });
  const edu = useFieldArray({ control: form.control, name: "education" });
  const skills = form.watch("skills") ?? [];
  const languages = form.watch("languages") ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <section id="experiencias" aria-labelledby="exp-t">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="exp-t" className="text-[15px] font-semibold">Experiências profissionais</h3>
          <Button variant="secondary" size="sm" onClick={() => exp.append({ company: "", role: "", start: "", end: "", current: false, description: "" })}><Plus className="size-4" />Adicionar</Button>
        </div>
        {exp.fields.length === 0 && <p className="rounded-lg border border-dashed border-navy-200 p-4 text-sm text-muted">Nenhuma experiência adicionada. Se é seu primeiro emprego, destaque cursos e habilidades.</p>}
        <div className="space-y-4">
          {exp.fields.map((f, i) => {
            const current = form.watch(`experiences.${i}.current`);
            return (
              <fieldset key={f.id} className="rounded-lg border border-line p-4">
                <legend className="sr-only">Experiência {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cargo" htmlFor={`e${i}r`} error={err(`experiences.${i}.role`)} required><Input id={`e${i}r`} {...form.register(`experiences.${i}.role`)} /></Field>
                  <Field label="Empresa" htmlFor={`e${i}c`} error={err(`experiences.${i}.company`)} required><Input id={`e${i}c`} {...form.register(`experiences.${i}.company`)} /></Field>
                  <Field label="Início" htmlFor={`e${i}s`} error={err(`experiences.${i}.start`)} required><Input id={`e${i}s`} type="month" {...form.register(`experiences.${i}.start`)} /></Field>
                  <Field label="Saída" htmlFor={`e${i}e`} error={err(`experiences.${i}.end`)}><Input id={`e${i}e`} type="month" disabled={current} {...form.register(`experiences.${i}.end`)} /></Field>
                </div>
                <Checkbox className="mt-3" label="Trabalho aqui atualmente" {...form.register(`experiences.${i}.current`)} />
                <Field className="mt-3" label="Principais atividades" htmlFor={`e${i}d`} error={err(`experiences.${i}.description`)}>
                  <Textarea id={`e${i}d`} rows={3} maxLength={1500} {...form.register(`experiences.${i}.description`)} />
                </Field>
                <Button variant="ghost" size="sm" className="mt-2 text-red-700" onClick={() => exp.remove(i)}><Trash2 className="size-4" />Remover</Button>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section id="formacao" aria-labelledby="edu-t">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="edu-t" className="text-[15px] font-semibold">Formação acadêmica</h3>
          <Button variant="secondary" size="sm" onClick={() => edu.append({ institution: "", course: "", level: "medio", start: "", end: "", status: "completo" })}><Plus className="size-4" />Adicionar</Button>
        </div>
        {edu.fields.length === 0 && <p className="rounded-lg border border-dashed border-navy-200 p-4 text-sm text-muted">Nenhuma formação adicionada.</p>}
        <div className="space-y-4">
          {edu.fields.map((f, i) => (
            <fieldset key={f.id} className="rounded-lg border border-line p-4">
              <legend className="sr-only">Formação {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Curso" htmlFor={`d${i}c`} error={err(`education.${i}.course`)} required><Input id={`d${i}c`} {...form.register(`education.${i}.course`)} /></Field>
                <Field label="Instituição" htmlFor={`d${i}i`} error={err(`education.${i}.institution`)} required><Input id={`d${i}i`} {...form.register(`education.${i}.institution`)} /></Field>
                <Field label="Nível" htmlFor={`d${i}l`}>
                  <Select id={`d${i}l`} {...form.register(`education.${i}.level`)}>{Object.entries(EDUCATION_LEVELS).filter(([k]) => k !== "nenhuma").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                </Field>
                <Field label="Situação" htmlFor={`d${i}st`}>
                  <Select id={`d${i}st`} {...form.register(`education.${i}.status`)}>
                    <option value="completo">Completo</option><option value="cursando">Cursando</option><option value="trancado">Trancado</option>
                  </Select>
                </Field>
                <Field label="Início" htmlFor={`d${i}s`} error={err(`education.${i}.start`)}><Input id={`d${i}s`} type="month" {...form.register(`education.${i}.start`)} /></Field>
                <Field label="Conclusão (ou previsão)" htmlFor={`d${i}e`} error={err(`education.${i}.end`)}><Input id={`d${i}e`} type="month" {...form.register(`education.${i}.end`)} /></Field>
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-red-700" onClick={() => edu.remove(i)}><Trash2 className="size-4" />Remover</Button>
            </fieldset>
          ))}
        </div>
      </section>

      <section id="habilidades" className="grid gap-6 sm:grid-cols-2">
        <Field label="Habilidades" htmlFor="skill-input" hint="Pressione Enter para adicionar (máx. 40)." error={err("skills")}>
          <TagInput id="skill-input" value={skills} max={40} placeholder="Ex.: Excel, atendimento, empilhadeira" onChange={(v) => form.setValue("skills", v, { shouldDirty: true })} />
        </Field>
        <Field label="Idiomas" htmlFor="lang-input" hint="Ex.: Inglês intermediário" error={err("languages")}>
          <TagInput id="lang-input" value={languages} max={10} placeholder="Idioma e nível" onChange={(v) => form.setValue("languages", v, { shouldDirty: true })} />
        </Field>
      </section>

      <FormStatus error={serverError} success={success} />
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar currículo</Button>
    </form>
  );
}
