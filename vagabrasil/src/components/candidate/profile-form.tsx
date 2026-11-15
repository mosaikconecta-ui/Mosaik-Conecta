"use client";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { updateProfileAction } from "@/actions/candidate";
import { profileSchema, type ProfileInput } from "@/lib/validation/candidate";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { UFS } from "@/lib/constants";

export function ProfileForm({ defaults, email }: { defaults: ProfileInput; email: string }) {
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(profileSchema, updateProfileAction as never, defaults);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="full_name" error={err("full_name")} required>
          <Input id="full_name" aria-invalid={!!err("full_name")} {...form.register("full_name")} />
        </Field>
        <Field label="E-mail" htmlFor="email" hint="O e-mail de login não pode ser alterado aqui.">
          <Input id="email" value={email} disabled readOnly />
        </Field>
        <Field label="Telefone" htmlFor="phone" error={err("phone")}>
          <Input id="phone" type="tel" aria-invalid={!!err("phone")} {...form.register("phone")} />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Cidade" htmlFor="city" error={err("city")} required>
            <Input id="city" aria-invalid={!!err("city")} {...form.register("city")} />
          </Field>
          <Field label="UF" htmlFor="state" error={err("state")} required>
            <Select id="state" {...form.register("state")}>{UFS.map(([uf]) => <option key={uf} value={uf}>{uf}</option>)}</Select>
          </Field>
        </div>
      </div>
      <Field label="Título profissional" htmlFor="headline" error={err("headline")} hint="Ex.: Auxiliar administrativo com experiência em faturamento">
        <Input id="headline" maxLength={120} {...form.register("headline")} />
      </Field>
      <Field label="Resumo profissional" htmlFor="summary" error={err("summary")} hint="Apresente sua trajetória, objetivos e principais conquistas.">
        <Textarea id="summary" rows={5} maxLength={3000} {...form.register("summary")} />
      </Field>
      <Field label="LinkedIn ou portfólio" htmlFor="linkedin_url" error={err("linkedin_url")}>
        <Input id="linkedin_url" type="url" placeholder="https://" {...form.register("linkedin_url")} />
      </Field>
      <FormStatus error={serverError} success={success} />
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar dados</Button>
    </form>
  );
}
