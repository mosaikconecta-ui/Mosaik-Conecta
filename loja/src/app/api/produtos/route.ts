import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/catalog";

/** Cards de produtos por id (usado pela página de favoritos). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]{10,40}$/i.test(s)).slice(0, 60);
  const items = await getProductsByIds(ids);
  return NextResponse.json({ items: ids.map((id) => items.find((p) => p.id === id)).filter(Boolean) });
}
