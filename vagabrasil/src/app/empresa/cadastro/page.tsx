import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { CompanyForm } from "@/components/company/company-form";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cadastro da empresa", robots: { index: false } };

export default async function CompanyOnboarding() {
  const { user, profile } = await requireRole("company", "/empresa/cadastro");
  const supabase = await createClient();
  const { data: member } = await supabase.from("company_members").select("company_id").eq("profile_id", user.id).maybeSingle();
  if (member) redirect("/empresa");
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line bg-white"><div className="container-page flex h-16 items-center"><Logo /></div></header>
      <main id="conteudo" className="container-page max-w-3xl py-10">
        <p className="text-sm font-semibold text-brand-700">Etapa 2 de 2</p>
        <h1 className="mt-1 text-2xl font-bold">Dados da empresa</h1>
        <p className="mt-1 text-sm text-muted">Olá, {profile.full_name.split(" ")[0]}! Informe os dados da empresa. Após o cadastro, nossa equipe verifica o CNPJ para liberar a publicação imediata de vagas.</p>
        <div className="card mt-6 p-6"><CompanyForm mode="create" defaults={{ email: profile.email, phone: profile.phone ?? "" }} /></div>
      </main>
    </div>
  );
}
