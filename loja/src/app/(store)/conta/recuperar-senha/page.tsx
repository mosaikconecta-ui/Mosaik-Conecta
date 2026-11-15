import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotForm } from "@/components/account/auth-forms";

export const metadata = pageMetadata({ title: "Recuperar senha", description: "Redefina sua senha.", path: "/conta/recuperar-senha", noindex: true });

export default function ForgotPage() {
  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail da conta. Enviaremos um link válido por 1 hora."
      footer={<Link href="/conta/entrar" className="underline underline-offset-2">Voltar para o login</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}
