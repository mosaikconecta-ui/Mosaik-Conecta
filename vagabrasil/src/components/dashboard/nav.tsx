"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, BookmarkCheck, Briefcase, Building2, CreditCard, FileText, Flag, Gauge, LayoutDashboard, ListChecks,
  Lock, Menu, ScrollText, Settings, SlidersHorizontal, Users, BarChart3, UserCog, X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = {
  dashboard: LayoutDashboard, resume: FileText, prefs: SlidersHorizontal, saved: BookmarkCheck, apps: ListChecks,
  bell: Bell, lock: Lock, jobs: Briefcase, users: Users, company: Building2, billing: CreditCard, reports: BarChart3,
  team: UserCog, gauge: Gauge, flag: Flag, logs: ScrollText, settings: Settings,
} as const;
export type NavIcon = keyof typeof ICONS;
export interface NavItem { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean; locked?: boolean }

function Items({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <li key={item.href}>
            <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-50 hover:text-navy-900")}>
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {item.locked && <Lock className="size-3.5 opacity-60" aria-label="Disponível em planos superiores" />}
              {!!item.badge && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", active ? "bg-white/20 text-white" : "bg-brand-600 text-white")}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return <nav aria-label="Menu do painel"><Items items={items} /></nav>;
}

export function MobileDashboardNav({ items, title }: { items: NavItem[]; title: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu do painel" aria-expanded={open}
        className="flex size-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-navy-900">{title}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="flex size-9 items-center justify-center rounded-lg hover:bg-navy-50"><X className="size-5" /></button>
            </div>
            <nav aria-label="Menu do painel" className="overflow-y-auto"><Items items={items} onNavigate={() => setOpen(false)} /></nav>
          </div>
        </div>
      )}
    </div>
  );
}
