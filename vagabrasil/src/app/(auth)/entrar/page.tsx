import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/forms";
import { Alert } from "@/components/ui/misc";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { safeRedirect } from "@/lib/redirect";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect?: string; erro?: string }> }) {
  const sp = await searchParams;
  const current = await getCurrentUser();
  if (current) redirect(safeRedirect(sp.redirect, homeForRole(current.profile.role)));
  return (
    <AuthCard title="Entrar no VagaBrasil" subtitle="Acesse sua conta de candidato, empresa ou administração.">
      {sp.erro === "link-invalido" && <Alert tone="warning" className="mb-4">O link é inválido ou expirou. Tente novamente.</Alert>}
      <SignInForm redirect={safeRedirect(sp.redirect, "") || undefined} />
      <div className="mt-6 space-y-2 border-t border-line pt-5 text-center text-sm text-navy-600">
        <p>Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brand-700">Cadastre seu currículo</Link></p>
        <p>É empresa? <Link href="/cadastro/empresa" className="font-semibold text-brand-700">Crie a conta empresarial</Link></p>
      </div>
    </AuthCard>
  );
}
