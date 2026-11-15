"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  categories: { slug: string; name: string; count: number }[];
  fixedCategory?: string;
  sorts: { key: string; label: string }[];
  current: { q: string; categoria: string; min: string; max: string; ordem: string; estoque: boolean };
  bounds: { min: number; max: number };
};

export function CatalogFilters({ categories, fixedCategory, sorts, current, bounds }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(current.min);
  const [max, setMax] = useState(current.max);

  useEffect(() => { setMin(current.min); setMax(current.max); }, [current.min, current.max]);

  const push = (patch: Partial<Record<keyof Props["current"], string | boolean | undefined>>) => {
    const next = { ...current, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set("q", String(next.q));
    if (next.categoria && !fixedCategory) p.set("categoria", String(next.categoria));
    if (next.min) p.set("min", String(next.min));
    if (next.max) p.set("max", String(next.max));
    if (next.ordem && next.ordem !== "relevancia") p.set("ordem", String(next.ordem));
    if (next.estoque) p.set("estoque", "1");
    start(() => router.push(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };

  const activeCount = [current.min, current.max, current.estoque ? "1" : "", fixedCategory ? "" : current.categoria].filter(Boolean).length;

  const panel = (
    <div className="space-y-8">
      {!fixedCategory && (
        <fieldset>
          <legend className="eyebrow mb-3">Categoria</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={!current.categoria} onClick={() => push({ categoria: "" })}>Todas</Chip>
            {categories.map((c) => (
              <Chip key={c.slug} active={current.categoria === c.slug} onClick={() => push({ categoria: c.slug })}>{c.name} <span className="opacity-60">{c.count}</span></Chip>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="eyebrow mb-3">Faixa de preço (R$)</legend>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); push({ min, max }); setOpen(false); }}>
          <label className="flex-1"><span className="label">Mínimo</span><input className="field" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(bounds.min)} /></label>
          <label className="flex-1"><span className="label">Máximo</span><input className="field" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(bounds.max)} /></label>
          <Button type="submit" variant="outline">Aplicar</Button>
        </form>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-[#191816]" checked={current.estoque} onChange={(e) => push({ estoque: e.target.checked })} />
        Somente produtos em estoque
      </label>
    </div>
  );

  return (
    <div className={clsx("sticky top-16 z-20 -mx-4 mt-8 border-y border-line bg-paper/95 px-4 backdrop-blur md:top-[72px] md:mx-0 md:px-0", pending && "opacity-70")}>
      <div className="flex h-14 items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 text-sm font-semibold" aria-expanded={open}>
          <SlidersHorizontal size={17} strokeWidth={1.6} /> Filtros {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-ink text-[11px] text-paper">{activeCount}</span>}
        </button>
        <div className="hidden flex-1 gap-2 overflow-x-auto scrollbar-none lg:flex">
          {!fixedCategory && categories.map((c) => (
            <Chip key={c.slug} small active={current.categoria === c.slug} onClick={() => push({ categoria: current.categoria === c.slug ? "" : c.slug })}>{c.name}</Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">Ordenar por</span>
          <select aria-label="Ordenar produtos" value={current.ordem} onChange={(e) => push({ ordem: e.target.value })} className="h-11 cursor-pointer bg-transparent pr-1 font-semibold outline-none">
            {sorts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 animate-fade bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-full max-w-md animate-[rise_.4s_var(--ease-out-soft)] flex-col bg-paper">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <p className="font-semibold">Filtros</p>
              <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-paper-2" aria-label="Fechar filtros"><X size={22} strokeWidth={1.6} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{panel}</div>
            <div className="grid grid-cols-2 gap-2 border-t border-line p-5">
              <Button variant="outline" onClick={() => { push({ categoria: fixedCategory ? current.categoria : "", min: "", max: "", estoque: false }); setOpen(false); }}>Limpar</Button>
              <Button onClick={() => setOpen(false)}>Ver produtos</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={clsx("shrink-0 rounded-full border transition-colors", small ? "h-9 px-3.5 text-[13px]" : "h-10 px-4 text-sm", active ? "border-ink bg-ink text-paper" : "border-line-2 hover:border-ink")}>
      {children}
    </button>
  );
}
