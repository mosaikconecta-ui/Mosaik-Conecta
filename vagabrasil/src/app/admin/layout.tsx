import { DashboardShell } from "@/components/dashboard/shell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [{ count: pendingCompanies }, { count: pendingJobs }, { count: openReports }] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
  ]);
  return (
    <DashboardShell title="Administração" subtitle="Painel administrativo" userName={profile.full_name} home="/admin"
      items={[
        { href: "/admin", label: "Visão geral", icon: "gauge", exact: true },
        { href: "/admin/usuarios", label: "Usuários", icon: "users" },
        { href: "/admin/empresas", label: "Empresas", icon: "company", badge: pendingCompanies ?? 0 },
        { href: "/admin/vagas", label: "Moderação de vagas", icon: "jobs", badge: pendingJobs ?? 0 },
        { href: "/admin/denuncias", label: "Denúncias", icon: "flag", badge: openReports ?? 0 },
        { href: "/admin/pagamentos", label: "Assinaturas e pagamentos", icon: "billing" },
        { href: "/admin/logs", label: "Logs administrativos", icon: "logs" },
        { href: "/admin/configuracoes", label: "Configurações", icon: "settings" },
      ]}>
      {children}
    </DashboardShell>
  );
}
