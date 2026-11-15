import Link from "next/link";
import { Bell } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ConfigNotice } from "@/components/config-notice";
import { MobileDashboardNav, SidebarNav, type NavItem } from "./nav";

export function DashboardShell({ title, subtitle, items, userName, home, notificationsHref, unread = 0, banner, children }: {
  title: string; subtitle?: string; items: NavItem[]; userName: string; home: string;
  notificationsHref?: string; unread?: number; banner?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface">
      <ConfigNotice />
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MobileDashboardNav items={items} title={title} />
            <Logo />
            <span className="ml-2 hidden rounded-md bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700 sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/vagas" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 md:block">Ver vagas</Link>
            {notificationsHref && (
              <Link href={notificationsHref} className="relative flex size-10 items-center justify-center rounded-lg text-navy-700 hover:bg-navy-50" aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}>
                <Bell className="size-5" />
                {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-600 ring-2 ring-white" />}
              </Link>
            )}
            <UserMenu name={userName} home={home} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[90rem]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-white p-4 lg:block">
          {subtitle && <p className="mb-3 truncate px-3 text-xs font-semibold tracking-wide text-muted uppercase">{subtitle}</p>}
          <SidebarNav items={items} />
        </aside>
        <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {banner}
          {children}
        </main>
      </div>
    </div>
  );
}
