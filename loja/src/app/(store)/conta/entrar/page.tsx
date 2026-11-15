import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/auth-forms";

export const metadata = pageMetadata({ title: "Entrar", description: "Acesse sua conta Mosaik.", path: "/conta/entrar", noindex: true });

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : isStaff(user.role) ? "/admin" : "/conta");
  return (
    <AuthShell title="Entrar" subtitle="Acompanhe pedidos, salve endereços e compre mais rápido."
      footer={<p>Ainda não tem conta? <Link href={`/conta/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold underline underline-offset-2">Criar conta</Link></p>}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
