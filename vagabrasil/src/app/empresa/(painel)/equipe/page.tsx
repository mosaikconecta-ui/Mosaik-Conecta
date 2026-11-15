import { requireCompany } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { removeMemberAction, revokeInviteAction } from "@/actions/company";
import { planAllows } from "@/lib/plan";
import { formatDate } from "@/lib/format";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { Upsell } from "@/components/company/upsell";
import { InviteForm } from "@/components/company/invite-form";

export const metadata = { title: "Equipe" };

export default async function TeamPage() {
  const { company, plan, memberRole, userId } = await requireCompany();
  if (!planAllows(plan, "team_management")) {
    return (<><PageHeader title="Equipe" /><Upsell feature="team_management" description="Convide até 10 recrutadores para publicar vagas e avaliar candidatos em conjunto." /></>);
  }
  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("company_members").select("profile_id, role, created_at, profiles(full_name, email)").eq("company_id", company.id).order("created_at"),
    memberRole === "owner"
      ? supabase.from("company_invites").select("id, email, expires_at, created_at").eq("company_id", company.id).is("accepted_at", null).gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader title="Equipe" description={`${members?.length ?? 0} de ${plan!.max_recruiters} recrutadores`} />
      <div className="space-y-6">
        {memberRole === "owner" && <Card title="Convidar recrutador"><InviteForm /></Card>}
        <Card title="Membros">
          <ul className="-my-2 divide-y divide-line">
            {(members ?? []).map((m) => {
              const p = m.profiles as unknown as { full_name: string; email: string };
              return (
                <li key={m.profile_id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar name={p?.full_name} size={36} />
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p?.full_name}{m.profile_id === userId && " (você)"}</p><p className="text-[13px] text-muted">{p?.email} · desde {formatDate(m.created_at)}</p></div>
                  <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role === "owner" ? "Responsável" : "Recrutador"}</Badge>
                  {memberRole === "owner" && m.role !== "owner" && <ActionButton action={removeMemberAction.bind(null, m.profile_id)} variant="danger-outline" confirm="Remover este recrutador da equipe?">Remover</ActionButton>}
                </li>
              );
            })}
          </ul>
        </Card>
        {(invites?.length ?? 0) > 0 && (
          <Card title="Convites pendentes">
            <ul className="-my-2 divide-y divide-line">
              {invites!.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{i.email} <span className="text-muted">· expira em {formatDate(i.expires_at)}</span></span>
                  <ActionButton action={revokeInviteAction.bind(null, i.id)} variant="ghost">Cancelar</ActionButton>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
