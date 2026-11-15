import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { acceptInviteAction } from "@/actions/company";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Convite de equipe", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const current = await getCurrentUser();
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line bg-white"><div className="container-page flex h-16 items-center"><Logo /></div></header>
      <main className="container-page max-w-lg py-16">
        <div className="card p-8 text-center">
          <UserPlus className="mx-auto size-10 text-brand-600" aria-hidden />
          <h1 className="mt-4 text-xl font-bold">Convite para equipe de recrutamento</h1>
          {current ? (
            <>
              <p className="mt-2 text-sm text-navy-600">Você está conectado como <strong>{current.profile.email}</strong>.</p>
              <div className="mt-6 flex justify-center"><ActionButton action={acceptInviteAction.bind(null, token)} variant="primary" size="lg">Aceitar convite</ActionButton></div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-navy-600">Crie uma conta empresarial com o e-mail que recebeu o convite, ou entre se já tiver uma.</p>
              <div className="mt-6 flex flex-col gap-2">
                <ButtonLink href={`/cadastro/empresa?convite=${token}`} size="lg">Criar conta</ButtonLink>
                <Link href={`/entrar?redirect=/convite/${token}`} className="text-sm font-semibold text-brand-700">Já tenho conta</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
