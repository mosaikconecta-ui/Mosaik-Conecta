import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchBar({ q, local, className, size = "lg" }: { q?: string; local?: string; className?: string; size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-13" : "h-11";
  return (
    <form action="/vagas" method="get" role="search" className={cn("flex flex-col gap-2 rounded-xl border border-line bg-white p-2 shadow-(--shadow-raised) md:flex-row md:items-center md:gap-0", className)}>
      <label className="flex flex-1 items-center gap-2.5 px-3">
        <Search className="size-5 shrink-0 text-navy-400" aria-hidden />
        <span className="sr-only">Cargo, empresa ou palavra-chave</span>
        <input name="q" defaultValue={q} placeholder="Cargo, empresa ou palavra-chave" maxLength={100}
          className={cn(h, "w-full bg-transparent text-[15px] text-ink placeholder:text-navy-400 focus:outline-none")} />
      </label>
      <div className="hidden h-8 w-px bg-line md:block" aria-hidden />
      <label className="flex flex-1 items-center gap-2.5 border-t border-line px-3 md:border-0">
        <MapPin className="size-5 shrink-0 text-navy-400" aria-hidden />
        <span className="sr-only">Cidade ou estado</span>
        <input name="local" defaultValue={local} placeholder="Cidade ou estado" maxLength={80}
          className={cn(h, "w-full bg-transparent text-[15px] text-ink placeholder:text-navy-400 focus:outline-none")} />
      </label>
      <button type="submit" className={cn(h, "rounded-lg bg-brand-600 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700")}>
        Buscar vagas
      </button>
    </form>
  );
}
