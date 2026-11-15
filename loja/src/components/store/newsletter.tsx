"use client";

import { submitWith } from "@/components/ui/submit";
import { useActionState } from "react";
import Link from "next/link";
import { subscribeNewsletter } from "@/actions/site";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/misc";

export function NewsletterForm({ dark }: { dark?: boolean }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  if (state?.ok) return <p role="status" className="text-[15px]">{state.message}</p>;
  return (
    <form onSubmit={submitWith(action)} className="w-full max-w-md" noValidate>
      <div className="flex gap-2">
        <label htmlFor="nl-email" className="sr-only">E-mail</label>
        <input id="nl-email" name="email" type="email" autoComplete="email" required placeholder="seu@email.com"
          aria-invalid={!!state?.errors?.email}
          className={`field flex-1 ${dark ? "border-white/25 bg-transparent text-paper placeholder:text-paper/50 focus:border-paper focus:shadow-[0_0_0_1px_var(--color-paper)]" : ""}`} />
        <Button type="submit" variant={dark ? "secondary" : "primary"} loading={pending}>Assinar</Button>
      </div>
      <FieldError message={state?.errors?.email} />
      <label className={`mt-3 flex items-start gap-2.5 text-[12px] leading-relaxed ${dark ? "text-paper/70" : "text-muted"}`}>
        <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-current" />
        <span>Aceito receber e-mails da Mosaik e li a <Link href="/politica-de-privacidade" className="underline underline-offset-2">Política de Privacidade</Link>.</span>
      </label>
      <FieldError message={state?.errors?.consent} />
    </form>
  );
}
