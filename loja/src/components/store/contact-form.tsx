"use client";

import { submitWith } from "@/components/ui/submit";
import { useActionState } from "react";
import { sendContact } from "@/actions/site";
import { Button } from "@/components/ui/button";
import { Alert, FieldError } from "@/components/ui/misc";

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null);
  if (state?.ok) return <Alert tone="ok" title="Mensagem enviada">{state.message}</Alert>;
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2" noValidate>
      {state?.message && <Alert tone="bad" className="sm:col-span-2">{state.message}</Alert>}
      <div><label htmlFor="ct-name" className="label">Nome</label><input id="ct-name" name="name" className="field" autoComplete="name" aria-invalid={!!state?.errors?.name} /><FieldError message={state?.errors?.name} /></div>
      <div><label htmlFor="ct-email" className="label">E-mail</label><input id="ct-email" name="email" type="email" className="field" autoComplete="email" aria-invalid={!!state?.errors?.email} /><FieldError message={state?.errors?.email} /></div>
      <div>
        <label htmlFor="ct-subject" className="label">Assunto</label>
        <select id="ct-subject" name="subject" className="field" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option>Dúvida sobre produto</option><option>Meu pedido</option><option>Troca ou devolução</option><option>Pagamento</option><option>Privacidade e dados (LGPD)</option><option>Outro assunto</option>
        </select>
        <FieldError message={state?.errors?.subject} />
      </div>
      <div><label htmlFor="ct-order" className="label">Nº do pedido <span className="font-normal text-muted">(opcional)</span></label><input id="ct-order" name="orderNumber" className="field uppercase" placeholder="MK-123456" /></div>
      <div className="sm:col-span-2"><label htmlFor="ct-message" className="label">Mensagem</label><textarea id="ct-message" name="message" className="field min-h-[160px]" aria-invalid={!!state?.errors?.message} /><FieldError message={state?.errors?.message} /></div>
      <div className="sm:col-span-2"><Button type="submit" loading={pending}>Enviar mensagem</Button></div>
    </form>
  );
}
