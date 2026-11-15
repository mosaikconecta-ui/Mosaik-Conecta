import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  subtitle: true,
  priceCents: true,
  compareAtCents: true,
  isDemo: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { orderBy: { position: "asc" }, take: 2, select: { url: true, alt: true } },
  variants: {
    where: { active: true },
    orderBy: { position: "asc" },
    select: { id: true, color: true, colorHex: true, size: true, stock: true, priceCents: true, compareAtCents: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type SortKey = "relevancia" | "menor-preco" | "maior-preco" | "novidades";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevancia", label: "Relevância" },
  { key: "novidades", label: "Novidades" },
  { key: "menor-preco", label: "Menor preço" },
  { key: "maior-preco", label: "Maior preço" },
];

export type CatalogQuery = {
  q?: string;
  category?: string;
  minCents?: number;
  maxCents?: number;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  inStock?: boolean;
};

export async function listProducts(query: CatalogQuery) {
  const pageSize = query.pageSize ?? 12;
  const page = Math.max(1, query.page ?? 1);
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  const q = query.q?.trim();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean).slice(0, 5);
    where.AND = terms.map((t) => ({
      OR: [
        { name: { contains: t, mode: "insensitive" } },
        { subtitle: { contains: t, mode: "insensitive" } },
        { description: { contains: t, mode: "insensitive" } },
        { tags: { has: t.toLowerCase() } },
        { category: { name: { contains: t, mode: "insensitive" } } },
      ],
    }));
  }
  if (query.category) where.category = { slug: query.category };
  if (query.minCents || query.maxCents) {
    where.priceCents = {
      ...(query.minCents ? { gte: query.minCents } : {}),
      ...(query.maxCents ? { lte: query.maxCents } : {}),
    };
  }
  if (query.inStock) where.variants = { some: { active: true, stock: { gt: 0 } } };

  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [{ featured: "desc" }, { createdAt: "desc" }];
  if (query.sort === "menor-preco") orderBy = [{ priceCents: "asc" }];
  if (query.sort === "maior-preco") orderBy = [{ priceCents: "desc" }];
  if (query.sort === "novidades") orderBy = [{ createdAt: "desc" }];

  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy, select: cardSelect, skip: (page - 1) * pageSize, take: pageSize }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPriceBounds() {
  const agg = await db.product.aggregate({ where: { status: "ACTIVE" }, _min: { priceCents: true }, _max: { priceCents: true } });
  return { min: agg._min.priceCents ?? 0, max: agg._max.priceCents ?? 0 };
}

export async function getCategories() {
  return db.category.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      supplier: { select: { processingDays: true, shippingDaysMin: true, shippingDaysMax: true } },
      images: { orderBy: { position: "asc" } },
      variants: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });
}

/** Mais vendidos com base em pedidos pagos. Retorna isRealData=false quando ainda não há vendas. */
export async function getBestsellers(limit = 8): Promise<{ items: ProductCardData[]; isRealData: boolean }> {
  const grouped = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { in: [...PAID_STATUSES] } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  if (grouped.length >= 4) {
    const ids = grouped.map((g) => g.productId);
    const products = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: cardSelect });
    const sorted = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as ProductCardData[];
    return { items: sorted, isRealData: true };
  }
  const featured = await db.product.findMany({ where: { status: "ACTIVE", featured: true }, select: cardSelect, take: limit, orderBy: { createdAt: "asc" } });
  return { items: featured, isRealData: false };
}

export async function getNewArrivals(limit = 8) {
  return db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: cardSelect, take: limit });
}

/** Relacionados: comprados juntos (dados reais de pedidos) + mesma categoria como complemento. */
export async function getRelated(productId: string, categoryId: string | null, limit = 4) {
  const coRows = await db.$queryRaw<{ productId: string; n: bigint }[]>`
    SELECT oi2."productId", COUNT(*) AS n
    FROM "OrderItem" oi1
    JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi2."productId" <> oi1."productId"
    JOIN "Order" o ON o.id = oi1."orderId"
    WHERE oi1."productId" = ${productId} AND o.status IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
    GROUP BY oi2."productId" ORDER BY n DESC LIMIT ${limit}`;
  const ids = coRows.map((r) => r.productId);
  const co = ids.length
    ? await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: cardSelect })
    : [];
  const rest = await db.product.findMany({
    where: { status: "ACTIVE", id: { notIn: [productId, ...ids] }, ...(categoryId ? { categoryId } : {}) },
    select: cardSelect,
    take: limit,
  });
  let items = [...co, ...rest].slice(0, limit);
  if (items.length < limit) {
    const fill = await db.product.findMany({
      where: { status: "ACTIVE", id: { notIn: [productId, ...items.map((i) => i.id)] } },
      select: cardSelect,
      take: limit - items.length,
      orderBy: { featured: "desc" },
    });
    items = [...items, ...fill];
  }
  return items;
}

export async function getBundlesForProduct(productId: string) {
  return db.bundle.findMany({
    where: { active: true, items: { some: { productId } } },
    include: { items: { include: { product: { select: cardSelect } } } },
  });
}

export async function getApprovedReviews(productId: string) {
  const reviews = await db.review.findMany({ where: { productId, approved: true }, orderBy: { createdAt: "desc" }, take: 30 });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { reviews, avg, count: reviews.length };
}

export async function getTestimonials() {
  return db.review.findMany({
    where: { approved: true, featured: true },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.product.findMany({ where: { id: { in: ids.slice(0, 60) }, status: "ACTIVE" }, select: cardSelect });
}

/** Sugestões para o carrinho: complementos de outras categorias, nunca itens já adicionados. */
export async function getCartSuggestions(productIdsInCart: string[], limit = 4) {
  if (!productIdsInCart.length) return getNewArrivals(limit);
  const inCart = await db.product.findMany({ where: { id: { in: productIdsInCart } }, select: { categoryId: true } });
  const cats = [...new Set(inCart.map((p) => p.categoryId).filter(Boolean))] as string[];
  const items = await db.product.findMany({
    where: { status: "ACTIVE", id: { notIn: productIdsInCart }, categoryId: { notIn: cats } },
    select: cardSelect,
    orderBy: [{ featured: "desc" }, { priceCents: "asc" }],
    take: limit,
  });
  if (items.length >= limit) return items;
  const fill = await db.product.findMany({
    where: { status: "ACTIVE", id: { notIn: [...productIdsInCart, ...items.map((i) => i.id)] } },
    select: cardSelect,
    take: limit - items.length,
  });
  return [...items, ...fill];
}
