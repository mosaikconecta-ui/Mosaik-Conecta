"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import {
  forgotPasswordAction, resetPasswordAction, signInAction, signUpCandidateAction, signUpCompanyAction,
} from "@/actions/auth";
import { candidateSignUpSchema, companySignUpSchema, forgotSchema, resetSchema, signInSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { UFS } from "@/lib/constants";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-navy-400 hover:text-navy-700">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const Spinner = ({ on }: { on: boolean }) => (on ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null);

export function SignInForm({ redirect }: { redirect?: string }) {
  const { form, onSubmit, pending, serverError, err } = useActionForm(signInSchema, signInAction as never, { email: "", password: "", redirect });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="E-mail" htmlFor="email" error={err("email")}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!err("email")} {...form.register("email")} />
      </Field>
      <Field label={<span className="flex justify-between">Senha <Link href="/recuperar-senha" className="font-medium text-brand-700">Esqueci a senha</Link></span>} htmlFor="password" error={err("password")}>
        <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!err("password")} {...form.register("password")} />
      </Field>
      <input type="hidden" {...form.register("redirect")} />
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}><Spinner on={pending} />Entrar</Button>
    </form>
  );
}

function ConfirmEmail({ email }: { email: string }) {
  return (
    <div className="text-center">
      <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold">Confirme seu e-mail</h2>
      <p className="mt-2 text-sm text-navy-600">Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.</p>
      <p className="mt-4 text-xs text-muted">Não recebeu? Verifique a caixa de spam ou aguarde alguns minutos.</p>
    </div>
  );
}

export function CandidateSignUpForm() {
  const [done, setDone] = useState(false);
  const { form, onSubmit, pending, serverError, err } = useActionForm(candidateSignUpSchema, signUpCandidateAction as never,
    { full_name: "", email: "", password: "", password_confirm: "", phone: "", city: "", state: undefined, marketing_consent: false },
    { onSuccess: () => setDone(true) });
  if (done) return <ConfirmEmail email={form.getValues("email")} />;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Nome completo" htmlFor="full_name" error={err("full_name")} required>
        <Input id="full_name" autoComplete="name" aria-invalid={!!err("full_name")} {...form.register("full_name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email" error={err("email")} required>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!err("email")} {...form.register("email")} />
        </Field>
        <Field label="Telefone" htmlFor="phone" error={err("phone")} hint="Opcional">
          <Input id="phone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" aria-invalid={!!err("phone")} {...form.register("phone")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Cidade" htmlFor="city" error={err("city")} required>
          <Input id="city" autoComplete="address-level2" aria-invalid={!!err("city")} {...form.register("city")} />
        </Field>
        <Field label="Estado" htmlFor="state" error={err("state")} required>
          <Select id="state" aria-invalid={!!err("state")} defaultValue="" {...form.register("state")}>
            <option value="" disabled>UF</option>
            {UFS.map(([uf, name]) => <option key={uf} value={uf}>{uf} — {name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha" htmlFor="password" error={err("password")} hint="Mínimo 8 caracteres, com letras e números" required>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!err("password")} {...form.register("password")} />
        </Field>
        <Field label="Confirmar senha" htmlFor="password_confirm" error={err("password_confirm")} required>
          <PasswordInput id="password_confirm" autoComplete="new-password" aria-invalid={!!err("password_confirm")} {...form.register("password_confirm")} />
        </Field>
      </div>
      <div className="space-y-2.5 rounded-lg bg-surface p-3.5">
        <Checkbox {...form.register("privacy_consent")} label={<>Li e aceito os <Link href="/termos" target="_blank" className="font-medium text-brand-700 underline">Termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-medium text-brand-700 underline">Política de privacidade</Link>.</>} />
        {err("privacy_consent") && <p className="text-[13px] text-red-600" role="alert">{err("privacy_consent")}</p>}
        <Checkbox {...form.register("marketing_consent")} label="Quero receber dicas de carreira e novidades por e-mail (opcional)." />
      </div>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}><Spinner on={pending} />Criar conta grátis</Button>
    </form>
  );
}

export function CompanySignUpForm({ invite }: { invite?: string }) {
  const [done, setDone] = useState(false);
  const { form, onSubmit, pending, serverError, err } = useActionForm(companySignUpSchema, signUpCompanyAction as never,
    { full_name: "", email: "", password: "", password_confirm: "", phone: "", invite },
    { onSuccess: () => setDone(true) });
  if (done) return <ConfirmEmail email={form.getValues("email")} />;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Seu nome" htmlFor="full_name" error={err("full_name")} required>
        <Input id="full_name" autoComplete="name" aria-invalid={!!err("full_name")} {...form.register("full_name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail corporativo" htmlFor="email" error={err("email")} required>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!err("email")} {...form.register("email")} />
        </Field>
        <Field label="Telefone" htmlFor="phone" error={err("phone")}>
          <Input id="phone" type="tel" autoComplete="tel" aria-invalid={!!err("phone")} {...form.register("phone")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha" htmlFor="password" error={err("password")} hint="Mínimo 8 caracteres, com letras e números" required>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!err("password")} {...form.register("password")} />
        </Field>
        <Field label="Confirmar senha" htmlFor="password_confirm" error={err("password_confirm")} required>
          <PasswordInput id="password_confirm" autoComplete="new-password" aria-invalid={!!err("password_confirm")} {...form.register("password_confirm")} />
        </Field>
      </div>
      <div className="rounded-lg bg-surface p-3.5">
        <Checkbox {...form.register("privacy_consent")} label={<>Li e aceito os <Link href="/termos" target="_blank" className="font-medium text-brand-700 underline">Termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-medium text-brand-700 underline">Política de privacidade</Link>, inclusive o compromisso de não discriminação.</>} />
        {err("privacy_consent") && <p className="mt-2 text-[13px] text-red-600" role="alert">{err("privacy_consent")}</p>}
      </div>
      <input type="hidden" {...form.register("invite")} />
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}><Spinner on={pending} />Criar conta empresarial</Button>
      <p className="text-center text-xs text-muted">Na próxima etapa você informará CNPJ e dados da empresa.</p>
    </form>
  );
}

export function ForgotForm() {
  const { form, onSubmit, pending, serverError, success, err } = useActionForm(forgotSchema, forgotPasswordAction as never, { email: "" });
  if (success) return <Alert tone="success">{success}</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="E-mail da conta" htmlFor="email" error={err("email")}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!err("email")} {...form.register("email")} />
      </Field>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}><Spinner on={pending} />Enviar link de recuperação</Button>
    </form>
  );
}

export function ResetForm() {
  const { form, onSubmit, pending, serverError, err } = useActionForm(resetSchema, resetPasswordAction as never, { password: "", password_confirm: "" });
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Nova senha" htmlFor="password" error={err("password")} hint="Mínimo 8 caracteres, com letras e números">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!err("password")} {...form.register("password")} />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="password_confirm" error={err("password_confirm")}>
        <PasswordInput id="password_confirm" autoComplete="new-password" aria-invalid={!!err("password_confirm")} {...form.register("password_confirm")} />
      </Field>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}><Spinner on={pending} />Salvar nova senha</Button>
    </form>
  );
}
