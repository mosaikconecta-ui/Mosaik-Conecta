import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { signOutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Conta suspensa", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <div className="container-page max-w-xl py-16">
      <EmptyState icon={ShieldAlert} title="Sua conta está suspensa"
        description="O acesso foi suspenso pela moderação do VagaBrasil. Se você acredita que houve um engano, escreva para suporte@vagabrasil.com.br."
        action={<form action={signOutAction}><SubmitButton variant="outline">Sair</SubmitButton></form>} />
    </div>
  );
}
