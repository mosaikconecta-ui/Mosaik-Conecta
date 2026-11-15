import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/order-status";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { Alert, Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = pageMetadata({ title: "Meus pedidos", description: "Histórico de pedidos.", path: "/conta", noindex: true });

export default async function AccountOrdersPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { review: { select: { id: true } } } }, fulfillments: { select: { trackingCode: true } } },
    take: 50,
  });
  return (
    <div>
      {sp.senha === "alterada" && <Alert tone="ok" className="mb-6">Senha alterada com sucesso.</Alert>}
      <h2 className="text-xl font-semibold">Pedidos</h2>
      {orders.length === 0 ? (
        <div className="mt-6 border border-line p-8 text-center">
          <p className="text-ink-2">Você ainda não fez pedidos com esta conta.</p>
          <ButtonLink href="/produtos" className="mt-5">Explorar produtos</ButtonLink>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/pedido/${o.number}`} className="link-draw font-semibold">{o.number}</Link>
                  <p className="text-sm text-muted">{formatDate(o.createdAt)} · {formatBRL(o.totalCents)}</p>
                </div>
                <Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge>
              </div>
              <ul className="mt-4 flex flex-wrap gap-3">
                {o.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3">
                    <div className="relative aspect-[4/5] w-12 bg-paper-2">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}</div>
                    <div className="text-sm">
                      <p>{i.quantity}× {i.productName}</p>
                      {o.status === "DELIVERED" && (i.review ? <p className="text-[12px] text-muted">Avaliado</p> : <Link href={`/conta/avaliar/${i.id}`} className="text-[12px] font-semibold underline underline-offset-2">Avaliar produto</Link>)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-4 text-sm">
                <Link href={`/pedido/${o.number}`} className="link-draw font-semibold">Acompanhar pedido</Link>
                {o.fulfillments.some((f) => f.trackingCode) && <span className="text-muted">Rastreio: {o.fulfillments.map((f) => f.trackingCode).filter(Boolean).join(", ")}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
