"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const items = [
  ["/conta", "Pedidos"],
  ["/conta/dados", "Dados pessoais"],
  ["/conta/enderecos", "Endereços"],
  ["/conta/privacidade", "Privacidade e dados"],
] as const;

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Minha conta">
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col">
        {items.map(([href, label]) => (
          <li key={href}>
            <Link href={href} aria-current={path === href ? "page" : undefined}
              className={clsx("block whitespace-nowrap px-3 py-2.5 text-sm transition-colors", path === href ? "bg-ink text-paper" : "hover:bg-paper-2")}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
