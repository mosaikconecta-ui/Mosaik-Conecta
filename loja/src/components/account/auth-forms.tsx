"use client";

import { submitWith } from "@/components/ui/submit";
import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, FieldError } from "@/components/ui/misc";

function Input({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className="field" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      <FieldError message={error} id={`${id}-err`} />
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state?.message && <Alert tone="bad">{state.message}</Alert>}
      <Input id="email" label="E-mail" type="email" autoComplete="email" required error={state?.errors?.email} />
      <Input id="password" label="Senha" type="password" autoComplete="current-password" required error={state?.errors?.password} />
      <div className="flex justify-end"><Link href="/conta/recuperar-senha" className="link-draw text-sm">Esqueci minha senha</Link></div>
      <Button type="submit" full size="lg" loading={pending}>Entrar</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, null);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state?.message && <Alert tone="bad">{state.message}</Alert>}
      <Input id="name" label="Nome completo" autoComplete="name" required error={state?.errors?.name} />
      <Input id="email" label="E-mail" type="email" autoComplete="email" required error={state?.errors?.email} />
      <Input id="password" label="Senha" type="password" autoComplete="new-password" required minLength={8} error={state?.errors?.password} />
      <p className="-mt-2 text-[12px] text-muted">Mínimo de 8 caracteres, com letras e números.</p>
      <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-[#191816]" /> <span>Li e aceito os <Link href="/termos-de-uso" className="underline underline-offset-2">Termos de uso</Link> e a <Link href="/politica-de-privacidade" className="underline underline-offset-2">Política de privacidade</Link>.</span></label>
      <FieldError message={state?.errors?.acceptTerms} />
      <label className="flex items-start gap-2.5 text-sm text-ink-2"><input type="checkbox" name="marketingOptIn" className="mt-0.5 size-4 accent-[#191816]" /> Quero receber novidades e ofertas por e-mail (opcional).</label>
      <Button type="submit" full size="lg" loading={pending}>Criar conta</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <Alert tone="ok">{state.message}</Alert>;
  return (
    <form onSubmit={submitWith(action)} className="space-y-4" noValidate>
      <Input id="email" label="E-mail da conta" type="email" autoComplete="email" required error={state?.errors?.email} />
      <Button type="submit" full size="lg" loading={pending}>Enviar link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state?.message && <Alert tone="bad">{state.message} <Link href="/conta/recuperar-senha" className="underline">Solicitar novo link</Link></Alert>}
      <Input id="password" label="Nova senha" type="password" autoComplete="new-password" required error={state?.errors?.password} />
      <Input id="confirm" label="Confirme a nova senha" type="password" autoComplete="new-password" required error={state?.errors?.confirm} />
      <Button type="submit" full size="lg" loading={pending}>Salvar nova senha</Button>
    </form>
  );
}
