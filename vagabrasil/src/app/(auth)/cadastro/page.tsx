import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { CandidateSignUpForm } from "@/components/auth/forms";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cadastrar currículo grátis",
  description: "Crie sua conta gratuita no VagaBrasil, cadastre seu currículo e candidate-se a vagas em todo o Brasil.",
  alternates: { canonical: "/cadastro" },
};

export default async function CandidateSignUpPage() {
  const current = await getCurrentUser();
  if (current) redirect(homeForRole(current.profile.role));
  return (
    <AuthCard wide title="Cadastre seu currículo" subtitle="Grátis para sempre. Candidate-se a vagas e acompanhe cada etapa.">
      <CandidateSignUpForm />
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-navy-600">
        Já tem conta? <Link href="/entrar" className="font-semibold text-brand-700">Entrar</Link> · É empresa?{" "}
        <Link href="/cadastro/empresa" className="font-semibold text-brand-700">Cadastro empresarial</Link>
      </p>
    </AuthCard>
  );
}
