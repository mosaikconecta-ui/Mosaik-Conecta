import Image from "next/image";
import Link from "next/link";
import type { Prisma, ProductStatus } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { store } from "@/lib/env";
import { formatBRL, marginPct } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, Table, Td } from "@/components/admin/ui";
import { StockInput } from "@/components/admin/stock-input";

export const dynamic = "force-dynamic";
const STATUS: Record<ProductStatus, { label: string; tone: "ok" | "neutral" | "bad" }> = { ACTIVE: { label: "Publicado", tone: "ok" }, DRAFT: { label: "Rascunho", tone: "neutral" }, ARCHIVED: { label: "Arquivado", tone: "bad" } };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; estoque?: string; categoria?: string }> }) {
  await requireStaff("products");
  const sp = await searchParams;
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { OR: [{ sku: { contains: sp.q, mode: "insensitive" } }, { supplierSku: { contains: sp.q, mode: "insensitive" } }] } } }];
  if (sp.status && sp.status in STATUS) where.status = sp.status as ProductStatus;
  if (sp.categoria) where.categoryId = sp.categoria;
  if (sp.estoque === "baixo") where.variants = { some: { active: true, stock: { lte: store.lowStockThreshold } } };
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where, orderBy: { updatedAt: "desc" }, take: 200,
      include: { images: { take: 1, orderBy: { position: "asc" } }, variants: { orderBy: { position: "asc" } }, category: true, supplier: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Produtos" description={`${products.length} produto(s)`} actions={<ButtonLink href="/admin/produtos/novo" size="sm">Novo produto</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/produtos">
        <input name="q" defaultValue={sp.q} placeholder="Nome, SKU ou SKU do fornecedor" className="field h-10 min-h-0 max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="field h-10 min-h-0 max-w-[160px]"><option value="">Todos</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select name="categoria" defaultValue={sp.categoria ?? ""} className="field h-10 min-h-0 max-w-[180px]"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="estoque" defaultValue={sp.estoque ?? ""} className="field h-10 min-h-0 max-w-[160px]"><option value="">Qualquer estoque</option><option value="baixo">Estoque baixo</option></select>
        <button className="h-10 bg-ink px-4 text-sm font-semibold text-paper">Filtrar</button>
      </form>
      <Table head={["", "Produto", "Status", "Preço", "Custo", "Margem", "Estoque por variação", "Fornecedor"]} empty={products.length ? undefined : "Nenhum produto."}>
        {products.map((p) => (
          <tr key={p.id} className="align-top hover:bg-paper">
            <Td><div className="relative aspect-[4/5] w-11 bg-paper-2">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}</div></Td>
            <Td>
              <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
              <p className="text-[12px] text-muted">{p.category?.name ?? "Sem categoria"}{p.isDemo ? " · demonstração" : ""}{p.featured ? " · destaque" : ""}</p>
            </Td>
            <Td><Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge></Td>
            <Td className="tabular-nums">{formatBRL(p.priceCents)}</Td>
            <Td className="tabular-nums text-muted">{formatBRL(p.costCents)}</Td>
            <Td className={marginPct(p.priceCents, p.costCents) < 30 ? "font-semibold text-danger" : ""}>{marginPct(p.priceCents, p.costCents)}%</Td>
            <Td>
              <ul className="space-y-1">
                {p.variants.filter((v) => v.active).map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-[12px]">
                    <StockInput variantId={v.id} initial={v.stock} />
                    <span className="text-muted">{[v.color, v.size].filter(Boolean).join(" · ") || v.sku}</span>
                  </li>
                ))}
              </ul>
            </Td>
            <Td className="text-[13px] text-muted">{p.supplier?.name ?? "—"}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
