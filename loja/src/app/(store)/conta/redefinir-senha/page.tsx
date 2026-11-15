import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { AuthShell } from "@/components/account/auth-shell";
import { ResetForm } from "@/components/account/auth-forms";
import { Alert } from "@/components/ui/misc";

export const metadata = pageMetadata({ title: "Nova senha", description: "Crie uma nova senha.", path: "/conta/redefinir-senha", noindex: true });

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Nova senha">
      {token ? <ResetForm token={token} /> : <Alert tone="bad">Link incompleto. <Link href="/conta/recuperar-senha" className="underline">Solicite um novo link</Link>.</Alert>}
    </AuthShell>
  );
}
