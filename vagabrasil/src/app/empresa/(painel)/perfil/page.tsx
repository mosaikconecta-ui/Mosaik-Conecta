import Link from "next/link";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { submitVerificationAction, uploadLogoAction } from "@/actions/company";
import { publicStorageUrl } from "@/lib/env";
import { VERIFICATION_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Alert, Avatar, Badge, Card, PageHeader } from "@/components/ui/misc";
import { CompanyForm } from "@/components/company/company-form";
import { FileUploadForm } from "@/components/company/file-upload-form";

export const metadata = { title: "Perfil da empresa" };

export default async function CompanyProfilePage() {
  const { company, memberRole } = await requireCompany();
  const supabase = await createClient();
  const { data: verifications } = await supabase.from("company_verifications").select("status, notes, created_at, reviewed_at, document_path")
    .eq("company_id", company.id).order("created_at", { ascending: false }).limit(5);
  const owner = memberRole === "owner";
  const vs = VERIFICATION_STATUS[company.verification_status];
  const lastNote = verifications?.find((v) => v.notes)?.notes;
  return (
    <>
      <PageHeader title="Perfil da empresa" description="Informações exibidas na página pública e nas vagas."
        actions={<Link href={`/empresas/${company.slug}`} target="_blank" className="text-sm font-semibold text-brand-700">Ver página pública</Link>} />
      {!owner && <Alert tone="info" className="mb-6">Somente o responsável pela empresa pode editar estes dados.</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card title="Dados cadastrais">
          <CompanyForm mode="update" disabled={!owner} defaults={{
            legal_name: company.legal_name, trade_name: company.trade_name, cnpj: company.cnpj, email: company.email,
            phone: company.phone ?? "", website: company.website ?? "", address: company.address ?? "", city: company.city,
            state: company.state as never, description: company.description ?? "",
          }} />
        </Card>
        <div className="space-y-6">
          <Card title="Logotipo">
            <div className="mb-4 flex items-center gap-3"><Avatar name={company.trade_name} src={publicStorageUrl("company-logos", company.logo_path)} size={64} square /><p className="text-xs text-muted">Recomendado: quadrado, 400×400 px.</p></div>
            {owner && <FileUploadForm action={uploadLogoAction} accept="image/png,image/jpeg,image/webp" label="Selecionar imagem" hint="PNG, JPG ou WEBP até 2 MB" maxBytes={2 * 1048576} button="Enviar logotipo" />}
          </Card>
          <div id="verificacao">
            <Card title="Verificação empresarial">
              <Badge tone={vs.tone}>{vs.label}</Badge>
              <p className="mt-3 text-sm text-navy-600">
                {company.verification_status === "verified"
                  ? "Sua empresa exibe o selo de verificação e publica vagas sem moderação prévia."
                  : "Envie o cartão CNPJ (comprovante de inscrição na Receita Federal) ou o contrato social. Verificamos se os dados conferem com o cadastro."}
              </p>
              {company.verification_status === "rejected" && lastNote && <Alert tone="danger" className="mt-3" title="Motivo">{lastNote}</Alert>}
              {owner && company.verification_status !== "verified" && (
                <div className="mt-4"><FileUploadForm action={submitVerificationAction} accept="application/pdf,image/png,image/jpeg" label="Selecionar documento" hint="PDF, PNG ou JPG até 10 MB" maxBytes={10 * 1048576} button="Enviar para verificação" /></div>
              )}
              {(verifications?.length ?? 0) > 0 && (
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
                  {verifications!.map((v, i) => <li key={i}>{VERIFICATION_STATUS[v.status as keyof typeof VERIFICATION_STATUS].label} · {formatDateTime(v.reviewed_at ?? v.created_at)}{v.document_path ? " · documento enviado" : ""}</li>)}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
