import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/** LGPD — portabilidade: exporta os dados pessoais do titular em JSON. */
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true, email: true, phone: true, cpf: true, marketingOptIn: true, createdAt: true,
      addresses: { select: { label: true, recipient: true, cep: true, street: true, number: true, complement: true, district: true, city: true, state: true } },
      orders: { select: { number: true, createdAt: true, status: true, totalCents: true, shipCep: true, shipStreet: true, shipNumber: true, shipCity: true, shipState: true, items: { select: { productName: true, variantName: true, quantity: true, totalCents: true } } } },
      reviews: { select: { rating: true, title: true, body: true, createdAt: true } },
    },
  });
  await audit("lgpd.export", { userId: session.id });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), ...user }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="meus-dados-mosaik.json"', "Cache-Control": "no-store" },
  });
}
