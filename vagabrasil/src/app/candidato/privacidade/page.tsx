import Link from "next/link";
import { Download } from "lucide-react";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui/misc";
import { DeleteAccount, PrivacyForm } from "@/components/candidate/privacy-forms";

export const metadata = { title: "Privacidade e conta" };

export default async function PrivacyPage() {
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const { data: c } = await supabase.from("candidates").select("share_contact_with_companies, job_alerts_enabled, email_notifications").eq("id", profile.id).single();
  return (
    <>
      <PageHeader title="Privacidade e conta" description="Controle como seus dados são usados, conforme a LGPD." />
      <div className="space-y-6">
        <Card title="Configurações de privacidade">
          <PrivacyForm defaults={{ ...c!, marketing_consent: profile.marketing_consent }} />
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
            Consentimento aos termos registrado em {formatDateTime(profile.privacy_consent_at)}. Seu currículo nunca é público: apenas empresas
            para as quais você se candidata podem acessá-lo. <Link href="/privacidade" className="font-medium text-brand-700">Política de privacidade</Link>
          </p>
        </Card>
        <Card title="Exportar meus dados" description="Baixe uma cópia de todos os seus dados em formato JSON (portabilidade).">
          <a href="/api/conta/exportar" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-navy-800 hover:bg-navy-50"><Download className="size-4" />Baixar meus dados</a>
        </Card>
        <Card title="Excluir conta" description="Solicite a exclusão definitiva dos seus dados.">
          <DeleteAccount />
        </Card>
      </div>
    </>
  );
}
