import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/misc";

export const metadata = { robots: { index: false, follow: false } };

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { profile, company, plan, memberRole } = await requireCompany();
  const supabase = await createClient();
  const [{ count: unread }, { count: newApps }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).is("read_at", null),
    supabase.from("company_applicants").select("application_id", { count: "exact", head: true }).eq("company_id", company.id).eq("status", "received"),
  ]);

  const banner = company.status === "suspended" ? (
    <Alert tone="danger" className="mb-6" title="Empresa suspensa">Suas vagas não estão visíveis. Entre em contato com o suporte.</Alert>
  ) : !plan ? (
    <Alert tone="warning" className="mb-6" title="Nenhum plano ativo">
      Para publicar vagas, escolha um plano. <Link href="/empresa/assinatura" className="font-semibold underline">Ver planos</Link>
    </Alert>
  ) : null;

  return (
    <DashboardShell title="Área da empresa" subtitle={company.trade_name} userName={profile.full_name} home="/empresa"
      notificationsHref="/empresa/notificacoes" unread={unread ?? 0} banner={banner}
      items={[
        { href: "/empresa", label: "Painel", icon: "dashboard", exact: true },
        { href: "/empresa/vagas", label: "Vagas", icon: "jobs" },
        { href: "/empresa/candidatos", label: "Candidatos", icon: "users", badge: newApps ?? 0 },
        { href: "/empresa/relatorios", label: "Relatórios", icon: "reports", locked: !plan?.reports },
        { href: "/empresa/equipe", label: "Equipe", icon: "team", locked: !plan?.team_management },
        { href: "/empresa/perfil", label: "Perfil da empresa", icon: "company" },
        ...(memberRole === "owner" ? [{ href: "/empresa/assinatura", label: "Assinatura", icon: "billing" as const }] : []),
        { href: "/empresa/notificacoes", label: "Notificações", icon: "bell", badge: unread ?? 0 },
      ]}>
      {children}
    </DashboardShell>
  );
}
