import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.enum(["page_view", "view_item", "add_to_cart", "begin_checkout", "add_shipping_info", "purchase"]),
  sessionId: z.string().min(4).max(64),
  productId: z.string().max(40).nullable().optional(),
  valueCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
});

/** Funil interno anônimo (sem dados pessoais) — alimenta a taxa de conversão do painel. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 2000) return new NextResponse(null, { status: 413 });
  const parsed = schema.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  // "purchase" é registrado apenas pelo servidor após confirmação do gateway
  if (parsed.data.name === "purchase") return new NextResponse(null, { status: 204 });
  await db.analyticsEvent.create({ data: { name: parsed.data.name, sessionId: parsed.data.sessionId, productId: parsed.data.productId ?? null, valueCents: parsed.data.valueCents ?? null } });
  return new NextResponse(null, { status: 204 });
}
