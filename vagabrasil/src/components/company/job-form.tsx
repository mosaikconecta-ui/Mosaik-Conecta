"use client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { saveJobAction } from "@/actions/company";
import { jobSchema, type JobInput } from "@/lib/validation/job";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { FormStatus } from "@/components/ui/form-status";
import { CONTRACT_TYPES, EDUCATION_LEVELS, EXPERIENCE_LEVELS, UFS, WORK_MODES } from "@/lib/constants";

export function JobForm({ jobId, defaults, categories, status, canPublish }: {
  jobId?: string; defaults: Partial<JobInput>; categories: { id: number; name: string }[]; status?: string; canPublish: boolean;
}) {
  const router = useRouter();
  const action = (v: JobInput) => saveJobAction(jobId ?? null, v);
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(jobSchema, action as never, {
    title: "", openings: 1, description: "", responsibilities: "", requirements: "", benefits: "", schedule: "",
    city: "", work_mode: "presencial", contract_type: "clt", education_level: "medio", experience_level: "sem_experiencia",
    application_deadline: "", ...defaults,
  } as JobInput, { onSuccess: () => { router.push("/empresa/vagas"); router.refresh(); } });

  const submit = (publish: boolean) => { form.setValue("publish", publish); void onSubmit(); };
  const isDraft = !jobId || status === "draft";

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-8" noValidate>
      <section className="card space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Informações principais</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem_8rem]">
          <Field label="Cargo" htmlFor="title" error={err("title")} required>
            <Input id="title" placeholder="Ex.: Auxiliar de logística" aria-invalid={!!err("title")} {...form.register("title")} />
          </Field>
          <Field label="Categoria" htmlFor="category_id" error={err("category_id")} required>
            <Select id="category_id" defaultValue={defaults.category_id ? String(defaults.category_id) : ""} aria-invalid={!!err("category_id")} {...form.register("category_id")}>
              <option value="" disabled>Selecione</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Nº de vagas" htmlFor="openings" error={err("openings")} required>
            <Input id="openings" type="number" min={1} max={999} {...form.register("openings")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Modalidade" htmlFor="work_mode" required>
            <Select id="work_mode" {...form.register("work_mode")}>{Object.entries(WORK_MODES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
          <Field label="Tipo de contratação" htmlFor="contract_type" required>
            <Select id="contract_type" {...form.register("contract_type")}>{Object.entries(CONTRACT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
          <Field label="Escolaridade" htmlFor="education_level" required>
            <Select id="education_level" {...form.register("education_level")}>{Object.entries(EDUCATION_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
          <Field label="Experiência necessária" htmlFor="experience_level" required>
            <Select id="experience_level" {...form.register("experience_level")}>{Object.entries(EXPERIENCE_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem_12rem]">
          <Field label="Cidade" htmlFor="j-city" error={err("city")} required hint="Para vagas remotas, informe a cidade da sede.">
            <Input id="j-city" aria-invalid={!!err("city")} {...form.register("city")} />
          </Field>
          <Field label="Estado" htmlFor="j-state" error={err("state")} required>
            <Select id="j-state" defaultValue={defaults.state ?? ""} aria-invalid={!!err("state")} {...form.register("state")}>
              <option value="" disabled>Selecione</option>
              {UFS.map(([uf, name]) => <option key={uf} value={uf}>{name}</option>)}
            </Select>
          </Field>
          <Field label="Prazo de inscrição" htmlFor="deadline" error={err("application_deadline")} hint="Opcional">
            <Input id="deadline" type="date" {...form.register("application_deadline")} />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Remuneração e jornada</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Salário mínimo (R$)" htmlFor="salary_min" error={err("salary_min")} hint="Vagas com salário recebem mais candidaturas.">
            <Input id="salary_min" inputMode="numeric" placeholder="2000" {...form.register("salary_min")} />
          </Field>
          <Field label="Salário máximo (R$)" htmlFor="salary_max" error={err("salary_max")}>
            <Input id="salary_max" inputMode="numeric" placeholder="2500" {...form.register("salary_max")} />
          </Field>
          <Field label="Horário" htmlFor="schedule" error={err("schedule")}>
            <Input id="schedule" placeholder="Seg. a sex., 8h às 17h" {...form.register("schedule")} />
          </Field>
        </div>
        <Field label="Benefícios" htmlFor="benefits" error={err("benefits")}>
          <Textarea id="benefits" rows={3} placeholder="Vale-transporte, vale-refeição, plano de saúde…" {...form.register("benefits")} />
        </Field>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">Descrição</h2>
        <Field label="Descrição da vaga" htmlFor="description" error={err("description")} required hint="Mínimo de 30 caracteres. Separe parágrafos com uma linha em branco.">
          <Textarea id="description" rows={6} aria-invalid={!!err("description")} {...form.register("description")} />
        </Field>
        <Field label="Responsabilidades" htmlFor="responsibilities" error={err("responsibilities")}>
          <Textarea id="responsibilities" rows={4} {...form.register("responsibilities")} />
        </Field>
        <Field label="Requisitos" htmlFor="requirements" error={err("requirements")} hint="Descreva somente requisitos relacionados à função. Critérios como idade, gênero, aparência ou estado civil são proibidos.">
          <Textarea id="requirements" rows={4} aria-invalid={!!err("requirements")} {...form.register("requirements")} />
        </Field>
      </section>

      {!canPublish && isDraft && <Alert tone="warning">Sua empresa não possui plano ativo ou atingiu o limite de vagas. Você pode salvar como rascunho e publicar depois.</Alert>}
      <FormStatus error={serverError} success={success} />
      <div className="flex flex-wrap gap-3">
        {isDraft ? (
          <>
            <Button size="lg" disabled={pending || !canPublish} onClick={() => submit(true)}>{pending && <Loader2 className="size-4 animate-spin" />}Publicar vaga</Button>
            <Button type="submit" size="lg" variant="outline" disabled={pending}>Salvar rascunho</Button>
          </>
        ) : (
          <Button type="submit" size="lg" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar alterações</Button>
        )}
      </div>
    </form>
  );
}
