import Link from "next/link";
import { getCategories, getPriceBounds, listProducts, SORTS, type SortKey } from "@/lib/catalog";
import { ProductGrid } from "./product-card";
import { CatalogFilters } from "./catalog-filters";
import { ButtonLink } from "@/components/ui/button";

export type CatalogSearch = { q?: string; categoria?: string; min?: string; max?: string; ordem?: string; pagina?: string; estoque?: string };

function toCents(v?: string) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

export async function CatalogView({ search, fixedCategory, title, description, basePath }: { search: CatalogSearch; fixedCategory?: string; title: string; description?: string | null; basePath: string }) {
  const sort = (SORTS.some((s) => s.key === search.ordem) ? search.ordem : "relevancia") as SortKey;
  const category = fixedCategory ?? search.categoria;
  const page = Math.max(1, Number(search.pagina) || 1);
  const [result, categories, bounds] = await Promise.all([
    listProducts({ q: search.q, category, minCents: toCents(search.min), maxCents: toCents(search.max), sort, page, inStock: search.estoque === "1" }),
    getCategories(),
    getPriceBounds(),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...search, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(fixedCategory && k === "categoria")) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="container-x pb-10 pt-10 md:pt-14">
      <nav aria-label="Trilha" className="text-[13px] text-muted">
        <Link href="/" className="link-draw">Início</Link> <span aria-hidden>/</span>{" "}
        {fixedCategory ? <><Link href="/produtos" className="link-draw">Produtos</Link> <span aria-hidden>/</span> <span className="text-ink">{title}</span></> : <span className="text-ink">Produtos</span>}
      </nav>
      <header className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-[44px] md:text-[64px]">{search.q ? <>Resultados para <em>“{search.q}”</em></> : title}</h1>
          {description && !search.q && <p className="mt-3 max-w-xl text-ink-2">{description}</p>}
        </div>
        <p className="text-sm text-muted" aria-live="polite">{result.total} {result.total === 1 ? "produto" : "produtos"}</p>
      </header>

      <CatalogFilters
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }))}
        fixedCategory={fixedCategory}
        sorts={SORTS}
        current={{ q: search.q ?? "", categoria: category ?? "", min: search.min ?? "", max: search.max ?? "", ordem: sort, estoque: search.estoque === "1" }}
        bounds={{ min: Math.floor(bounds.min / 100), max: Math.ceil(bounds.max / 100) }}
      />

      {result.items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-[32px]">Nada encontrado com esses filtros</p>
          <p className="mt-3 text-muted">Tente remover algum filtro ou buscar por outro termo.</p>
          <ButtonLink href={basePath} variant="outline" className="mt-7">Limpar filtros</ButtonLink>
        </div>
      ) : (
        <div className="mt-8"><ProductGrid products={result.items} priorityCount={4} /></div>
      )}

      {result.pages > 1 && (
        <nav aria-label="Paginação" className="mt-16 flex items-center justify-center gap-1.5">
          {page > 1 && <Link href={qs({ pagina: String(page - 1) })} rel="prev" className="grid h-11 place-items-center px-4 text-sm font-semibold hover:bg-paper-2">Anterior</Link>}
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={qs({ pagina: n === 1 ? undefined : String(n) })} aria-current={n === page ? "page" : undefined}
              className={`grid size-11 place-items-center text-sm tabular-nums ${n === page ? "bg-ink text-paper" : "hover:bg-paper-2"}`}>{n}</Link>
          ))}
          {page < result.pages && <Link href={qs({ pagina: String(page + 1) })} rel="next" className="grid h-11 place-items-center px-4 text-sm font-semibold hover:bg-paper-2">Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
