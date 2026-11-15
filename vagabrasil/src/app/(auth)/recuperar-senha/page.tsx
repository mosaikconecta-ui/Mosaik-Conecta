import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthCard title="Recuperar senha" subtitle="Informe seu e-mail para receber um link de redefinição.">
      <ForgotForm />
      <p className="mt-6 text-center text-sm"><Link href="/entrar" className="font-semibold text-brand-700">Voltar para o login</Link></p>
    </AuthCard>
  );
}
