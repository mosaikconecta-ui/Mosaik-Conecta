import { NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const { items } = await listProducts({ q, pageSize: 5 });
  return NextResponse.json(
    { items: items.map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents, image: p.images[0]?.url ?? null })) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
