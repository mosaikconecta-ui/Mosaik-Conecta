"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { deleteAccountAction, updatePrivacyAction } from "@/actions/candidate";
import { privacySchema } from "@/lib/validation/candidate";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { FormStatus } from "@/components/ui/form-status";
import type { z } from "zod";

export function PrivacyForm({ defaults }: { defaults: z.input<typeof privacySchema> }) {
  const { form, onSubmit, pending, serverError, success } = useActionForm(privacySchema, updatePrivacyAction as never, defaults);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Checkbox {...form.register("share_contact_with_companies")} label={<><strong>Compartilhar meu telefone</strong> com as empresas para as quais eu me candidatar. (Seu e-mail é sempre compartilhado para contato.)</>} />
      <Checkbox {...form.register("job_alerts_enabled")} label={<><strong>Alertas de vagas</strong> — receber por e-mail novas vagas compatíveis com minhas preferências.</>} />
      <Checkbox {...form.register("email_notifications")} label={<><strong>Notificações por e-mail</strong> sobre minhas candidaturas.</>} />
      <Checkbox {...form.register("marketing_consent")} label={<><strong>Comunicações de marketing</strong> — dicas de carreira e novidades do VagaBrasil.</>} />
      <FormStatus error={serverError} success={success} />
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Salvar configurações</Button>
    </form>
  );
}

export function DeleteAccount() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <Alert tone="danger" title="Esta ação é permanente">
        Seu perfil, currículos, candidaturas, vagas salvas e notificações serão apagados. As empresas deixarão de ter acesso aos seus dados.
      </Alert>
      <Field label='Digite "EXCLUIR" para confirmar' htmlFor="confirm-delete">
        <Input id="confirm-delete" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" className="max-w-xs" />
      </Field>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button variant="danger" disabled={value !== "EXCLUIR" || pending}
        onClick={() => start(async () => { const r = await deleteAccountAction({ confirm: value }); if (r && !r.ok) setError(r.error); })}>
        {pending && <Loader2 className="size-4 animate-spin" />}Excluir minha conta definitivamente
      </Button>
    </div>
  );
}
