import { DashboardShell } from "@/components/dashboard/shell";
import { requireCandidate } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false, follow: false } };

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireCandidate();
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", profile.id).is("read_at", null);
  return (
    <DashboardShell title="Área do candidato" subtitle={profile.full_name} userName={profile.full_name} home="/candidato"
      notificationsHref="/candidato/notificacoes" unread={count ?? 0}
      items={[
        { href: "/candidato", label: "Visão geral", icon: "dashboard", exact: true },
        { href: "/candidato/curriculo", label: "Meu currículo", icon: "resume" },
        { href: "/candidato/preferencias", label: "Preferências", icon: "prefs" },
        { href: "/candidato/candidaturas", label: "Candidaturas", icon: "apps" },
        { href: "/candidato/vagas-salvas", label: "Vagas salvas", icon: "saved" },
        { href: "/candidato/notificacoes", label: "Notificações", icon: "bell", badge: count ?? 0 },
        { href: "/candidato/privacidade", label: "Privacidade e conta", icon: "lock" },
      ]}>
      {children}
    </DashboardShell>
  );
}
