"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/ui/misc";
import { formatBRL } from "@/lib/format";
import { useCart } from "./cart-provider";
import { useFavorites } from "./favorites";

type Cat = { name: string; slug: string };
type Suggestion = { slug: string; name: string; priceCents: number; image: string | null };

export function Header({ categories }: { categories: Cat[] }) {
  const { cart, openDrawer, loaded } = useCart();
  const { ids: favs } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, searchOpen]);

  const iconBtn = "relative grid size-11 place-items-center rounded-full transition-colors hover:bg-paper-2";

  return (
    <>
      <div className="bg-ink text-paper">
        <p className="container-x py-2 text-center text-[12px] tracking-[0.04em]">
          Frete grátis acima de R$ 299 · Troca em até 7 dias · Pix, cartão em até 6× sem juros ou boleto
        </p>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="container-x flex h-16 items-center gap-2 md:h-[72px]">
          <button className={clsx(iconBtn, "-ml-2.5 lg:hidden")} aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu size={21} strokeWidth={1.6} />
          </button>
          <Link href="/" className="mr-6 shrink-0" aria-label="Mosaik — página inicial"><Logo /></Link>
          <nav aria-label="Principal" className="hidden flex-1 lg:block">
            <ul className="flex items-center gap-7 text-[14px] font-medium">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categoria/${c.slug}`} className={clsx("link-draw py-1", pathname === `/categoria/${c.slug}` && "bg-[length:100%_1px]")}>{c.name}</Link>
                </li>
              ))}
              <li><Link href="/produtos" className="link-draw py-1">Todos</Link></li>
              <li><Link href="/produtos?ordem=novidades" className="link-draw py-1 text-clay">Novidades</Link></li>
            </ul>
          </nav>
          <div className="ml-auto flex items-center">
            <button className={iconBtn} aria-label="Buscar produtos" onClick={() => setSearchOpen(true)}><Search size={20} strokeWidth={1.6} /></button>
            <Link href="/conta" className={clsx(iconBtn, "hidden sm:grid")} aria-label="Minha conta"><User size={20} strokeWidth={1.6} /></Link>
            <Link href="/favoritos" className={iconBtn} aria-label={`Favoritos (${favs.length})`}>
              <Heart size={20} strokeWidth={1.6} />
              {favs.length > 0 && <Count n={favs.length} />}
            </Link>
            <button className={clsx(iconBtn, "-mr-2.5")} aria-label={`Carrinho (${cart.itemCount} itens)`} onClick={openDrawer} data-testid="cart-button">
              <ShoppingBag size={20} strokeWidth={1.6} />
              {loaded && cart.itemCount > 0 && <Count n={cart.itemCount} dark />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade bg-ink/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-[rise_.4s_var(--ease-out-soft)] flex-col bg-paper">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button className={iconBtn} aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={22} strokeWidth={1.6} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Menu mobile">
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.slug}><Link href={`/categoria/${c.slug}`} className="block py-3 font-serif text-[28px] leading-tight">{c.name}</Link></li>
                ))}
                <li><Link href="/produtos" className="block py-3 font-serif text-[28px] leading-tight">Todos os produtos</Link></li>
              </ul>
              <ul className="mt-8 space-y-3 border-t border-line pt-6 text-[15px]">
                <li><Link href="/conta">Minha conta</Link></li>
                <li><Link href="/rastreamento">Rastrear pedido</Link></li>
                <li><Link href="/favoritos">Favoritos</Link></li>
                <li><Link href="/ajuda">Perguntas frequentes</Link></li>
                <li><Link href="/contato">Fale conosco</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function Count({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <span className={clsx("absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold tabular-nums", dark ? "bg-ink text-paper" : "bg-clay text-white")}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setResults(d.items ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="absolute inset-0 animate-fade bg-ink/40" onClick={onClose} />
      <div className="relative animate-[rise_.45s_var(--ease-out-soft)] bg-paper pb-8 shadow-xl">
        <form
          className="container-x flex h-20 items-center gap-3 border-b border-line md:h-24"
          role="search"
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/produtos?q=${encodeURIComponent(q.trim())}`); }}
        >
          <Search size={22} strokeWidth={1.6} className="shrink-0 text-muted" />
          <label htmlFor="site-search" className="sr-only">Buscar produtos</label>
          <input id="site-search" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off"
            placeholder="Buscar vasos, canecas, luminárias…" className="h-full flex-1 bg-transparent font-serif text-[24px] outline-none placeholder:text-muted/60 md:text-[34px]" />
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-paper-2" aria-label="Fechar busca"><X size={22} strokeWidth={1.6} /></button>
        </form>
        <div className="container-x pt-6">
          {q.trim().length >= 2 && !loading && results.length === 0 && <p className="text-muted">Nenhum produto para “{q}”. Tente outro termo.</p>}
          {results.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link href={`/produto/${r.slug}`} onClick={onClose} className="lift flex items-center gap-3 sm:block">
                    <div className="relative aspect-[4/5] w-20 shrink-0 bg-paper-2 sm:w-full">
                      {r.image && <Image src={r.image} alt="" fill sizes="(min-width:1024px) 18vw, 80px" className="object-cover" />}
                    </div>
                    <div className="sm:mt-2">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-sm text-muted">{formatBRL(r.priceCents)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length < 2 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="mr-1 text-muted">Buscas sugeridas:</span>
              {["vaso", "caneca", "luminária", "vela", "bandeja"].map((s) => (
                <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border border-line px-3 py-1.5 transition-colors hover:border-ink">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
