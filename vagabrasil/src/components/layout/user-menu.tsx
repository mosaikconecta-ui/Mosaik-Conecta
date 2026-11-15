"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { initials } from "@/lib/format";

export function UserMenu({ name, home }: { name: string; home: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-sm font-medium text-navy-800 hover:bg-navy-50">
        <span className="flex size-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{initials(name)}</span>
        <span className="hidden max-w-[10rem] truncate md:inline">{name.split(" ")[0]}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-line bg-white p-1 shadow-(--shadow-raised)">
          <Link role="menuitem" href={home} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-800 hover:bg-navy-50">
            <LayoutDashboard className="size-4" aria-hidden /> Meu painel
          </Link>
          <form action={signOutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-800 hover:bg-navy-50">
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
