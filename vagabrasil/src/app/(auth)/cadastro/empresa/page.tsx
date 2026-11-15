import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { CompanySignUpForm } from "@/components/auth/forms";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cadastro de empresa",
  description: "Cadastre sua empresa no VagaBrasil para publicar vagas e receber candidaturas.",
  alternates: { canonical: "/cadastro/empresa" },
};

export default async function CompanySignUpPage({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  const current = await getCurrentUser();
  if (current) redirect(convite ? `/convite/${convite}` : homeForRole(current.profile.role));
  return (
    <AuthCard wide title={convite ? "Aceitar convite de recrutador" : "Cadastro de empresa"}
      subtitle="Etapa 1 de 2 — crie o acesso do responsável pelas contratações.">
      <CompanySignUpForm invite={convite} />
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-navy-600">
        Já tem conta? <Link href="/entrar" className="font-semibold text-brand-700">Entrar</Link>
      </p>
    </AuthCard>
  );
}
