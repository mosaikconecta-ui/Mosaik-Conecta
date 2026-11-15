"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Permission } from "@/lib/auth";

export type NavItem = { href: string; label: string; perm: Permission };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Painel" className="overflow-x-auto px-3 pb-3 scrollbar-none lg:flex-1 lg:overflow-y-auto">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined}
                className={clsx("block whitespace-nowrap rounded-[2px] px-3 py-2 text-[14px] transition-colors", active ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2")}>{i.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
