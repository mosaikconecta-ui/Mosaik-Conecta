import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/auth-forms";

export const metadata = pageMetadata({ title: "Criar conta", description: "Crie sua conta Mosaik.", path: "/conta/cadastro", noindex: true });

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/conta");
  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto."
      footer={<p>Já tem conta? <Link href="/conta/entrar" className="font-semibold underline underline-offset-2">Entrar</Link></p>}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
