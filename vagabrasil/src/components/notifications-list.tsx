import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markNotificationsReadAction } from "@/actions/candidate";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/types";

export async function NotificationsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as Notification[];
  const unread = list.some((n) => !n.read_at);
  return (
    <>
      <PageHeader title="Notificações" description="Atualizações sobre candidaturas, vagas e sua conta."
        actions={unread ? <form action={markNotificationsReadAction}><SubmitButton variant="outline" size="sm">Marcar todas como lidas</SubmitButton></form> : null} />
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" description="Avisaremos aqui e por e-mail quando houver novidades." />
      ) : (
        <ul className="card divide-y divide-line">
          {list.map((n) => (
            <li key={n.id} className={cn("flex gap-3 p-4", !n.read_at && "bg-brand-50/40")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-600")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", n.read_at ? "text-navy-700" : "font-semibold text-navy-900")}>{n.link ? <Link href={n.link} className="hover:text-brand-700">{n.title}</Link> : n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-navy-600">{n.body}</p>}
                <p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
