"use client";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { createCompanyAction, updateCompanyAction } from "@/actions/company";
import { companySchema, type CompanyInput } from "@/lib/validation/company";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { UFS } from "@/lib/constants";

const maskCnpj = (v: string) => v.replace(/\D/g, "").slice(0, 14)
  .replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");

export function CompanyForm({ defaults, mode, disabled }: { defaults?: Partial<CompanyInput>; mode: "create" | "update"; disabled?: boolean }) {
  const action = mode === "create" ? createCompanyAction : updateCompanyAction;
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(companySchema, action as never, {
    legal_name: "", trade_name: "", email: "", phone: "", website: "", address: "", city: "", description: "", ...defaults,
    cnpj: maskCnpj(defaults?.cnpj ?? ""),
  } as CompanyInput);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <fieldset disabled={disabled || pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razão social" htmlFor="legal_name" error={err("legal_name")} required>
            <Input id="legal_name" aria-invalid={!!err("legal_name")} {...form.register("legal_name")} />
          </Field>
          <Field label="Nome fantasia" htmlFor="trade_name" error={err("trade_name")} required hint="Nome exibido nas vagas.">
            <Input id="trade_name" aria-invalid={!!err("trade_name")} {...form.register("trade_name")} />
          </Field>
          <Field label="CNPJ" htmlFor="cnpj" error={err("cnpj")} required>
            <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" aria-invalid={!!err("cnpj")}
              {...form.register("cnpj", { onChange: (e) => form.setValue("cnpj", maskCnpj(e.target.value)) })} />
          </Field>
          <Field label="E-mail corporativo" htmlFor="c-email" error={err("email")} required hint="Usado para contato da plataforma (não é exibido publicamente).">
            <Input id="c-email" type="email" aria-invalid={!!err("email")} {...form.register("email")} />
          </Field>
          <Field label="Telefone" htmlFor="c-phone" error={err("phone")}>
            <Input id="c-phone" type="tel" {...form.register("phone")} />
          </Field>
          <Field label="Site" htmlFor="website" error={err("website")}>
            <Input id="website" type="url" placeholder="https://" {...form.register("website")} />
          </Field>
        </div>
        <Field label="Endereço" htmlFor="address" error={err("address")}>
          <Input id="address" placeholder="Rua, número, bairro" {...form.register("address")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field label="Cidade" htmlFor="c-city" error={err("city")} required>
            <Input id="c-city" aria-invalid={!!err("city")} {...form.register("city")} />
          </Field>
          <Field label="Estado" htmlFor="c-state" error={err("state")} required>
            <Select id="c-state" defaultValue={defaults?.state ?? ""} aria-invalid={!!err("state")} {...form.register("state")}>
              <option value="" disabled>Selecione</option>
              {UFS.map(([uf, name]) => <option key={uf} value={uf}>{name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Descrição da empresa" htmlFor="description" error={err("description")} hint="Conte o que a empresa faz, cultura e diferenciais. Aparece na página pública.">
          <Textarea id="description" rows={5} maxLength={4000} {...form.register("description")} />
        </Field>
      </fieldset>
      <FormStatus error={serverError} success={success} />
      {!disabled && <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}{mode === "create" ? "Cadastrar empresa" : "Salvar alterações"}</Button>}
    </form>
  );
}
