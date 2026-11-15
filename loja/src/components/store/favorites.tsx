"use client";

import { Heart } from "lucide-react";
import clsx from "clsx";
import { useCallback, useSyncExternalStore } from "react";

/** Favoritos ficam no navegador do cliente (sem login e sem dados pessoais). */
const KEY = "mk_favorites";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(cache)) cache = [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* modo privado */
  }
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
};

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((id: string) => {
    const cur = read();
    write(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 60));
  }, []);
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

export function FavoriteButton({ productId, name, className, size = 18 }: { productId: string; name: string; className?: string; size?: number }) {
  const { has, toggle } = useFavorites();
  const active = has(productId);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Salvar ${name} nos favoritos`}
      className={clsx("grid size-11 place-items-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95", className)}
    >
      <Heart size={size} strokeWidth={1.6} className={clsx("transition-colors", active ? "fill-clay stroke-clay" : "stroke-ink")} />
    </button>
  );
}
