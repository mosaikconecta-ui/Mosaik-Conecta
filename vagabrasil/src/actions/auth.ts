"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, isSupabaseConfigured } from "@/lib/env";
import { invalid, type ActionResult } from "@/lib/actions";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { safeRedirect } from "@/lib/redirect";
import { homeForRole } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/constants";
import {
  candidateSignUpSchema, companySignUpSchema, forgotSchema, resetSchema, signInSchema,
} from "@/lib/validation/auth";

const NOT_CONFIGURED: ActionResult<never> = {
  ok: false,
  error: "O Supabase ainda não foi configurado neste ambiente. Consulte o README para definir as variáveis.",
};

export async function signInAction(input: unknown): Promise<ActionResult<never>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("login", 10, 600)) || !(await rateLimit("login-email", 8, 600, parsed.data.email))) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { ok: false, error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada." };
    }
    return { ok: false, error: "E-mail ou senha incorretos." };
  }
  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return { ok: false, error: "Sua conta está suspensa. Entre em contato com o suporte." };
  }
  const fallback = homeForRole(profile?.role ?? "candidate");
  redirect(safeRedirect(parsed.data.redirect, fallback));
}

export async function signUpCandidateAction(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = candidateSignUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("signup", 5, 3600))) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/candidato`,
      data: {
        role: "candidate",
        full_name: d.full_name,
        phone: d.phone ?? "",
        city: d.city,
        state: d.state,
        privacy_consent: true,
        terms_version: TERMS_VERSION,
        marketing_consent: Boolean(d.marketing_consent),
      },
    },
  });
  if (error) return { ok: false, error: signUpError(error.message) };
  if (data.session) redirect("/candidato?bem-vindo=1");
  return { ok: true, data: { needsConfirmation: true } };
}

export async function signUpCompanyAction(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = companySignUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("signup", 5, 3600))) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const d = parsed.data;
  const next = d.invite && /^[a-f0-9]{48}$/.test(d.invite) ? `/convite/${d.invite}` : "/empresa/cadastro";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        role: "company",
        full_name: d.full_name,
        phone: d.phone ?? "",
        privacy_consent: true,
        terms_version: TERMS_VERSION,
      },
    },
  });
  if (error) return { ok: false, error: signUpError(error.message) };
  if (data.session) redirect(next);
  return { ok: true, data: { needsConfirmation: true } };
}

function signUpError(message: string) {
  if (/registered|already/i.test(message)) return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  if (/password/i.test(message)) return "Senha não aceita. Use ao menos 8 caracteres com letras e números.";
  return "Não foi possível concluir o cadastro. Tente novamente.";
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<never>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit("forgot", 5, 3600))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/redefinir-senha`,
  });
  // Resposta idêntica exista ou não o e-mail (evita enumeração de contas)
  return { ok: true, message: "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha." };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<never>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "O link expirou. Solicite uma nova recuperação de senha." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "Não foi possível alterar a senha. Escolha uma senha diferente da anterior." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  redirect(`${homeForRole(profile?.role ?? "candidate")}?senha=alterada`);
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
