import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Badge, Stars } from "@/components/ui/misc";
import { PageHeader } from "@/components/admin/ui";
import { InlineAction } from "@/components/admin/inline-actions";
import { moderateReviewAction } from "@/actions/admin-misc";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  await requireStaff("reviews");
  const reviews = await db.review.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "desc" }], include: { product: { select: { name: true, slug: true } }, orderItem: { include: { order: { select: { number: true, id: true } } } } }, take: 200 });
  return (
    <div>
      <PageHeader title="Avaliações" description="Somente clientes com pedido entregue podem avaliar (compra verificada). Nada é publicado sem aprovação; “destaque” exibe a avaliação como depoimento na home." />
      {reviews.length === 0 ? <p className="border border-line bg-surface p-8 text-center text-sm text-muted">Nenhuma avaliação recebida ainda.</p> : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-3"><Stars value={r.rating} /> <Link href={`/produto/${r.product.slug}`} className="font-semibold hover:underline">{r.product.name}</Link></p>
                <div className="flex gap-2">{r.approved ? <Badge tone="ok">publicada</Badge> : <Badge tone="warn">aguardando</Badge>}{r.featured && <Badge tone="dark">destaque</Badge>}</div>
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              <p className="mt-1 text-sm text-ink-2">{r.body}</p>
              <p className="mt-2 text-[12px] text-muted">{r.authorName} · pedido <Link href={`/admin/pedidos/${r.orderItem.order.id}`} className="underline">{r.orderItem.order.number}</Link> · {formatDateTime(r.createdAt)}</p>
              <div className="mt-3 flex flex-wrap gap-4">
                {!r.approved ? <InlineAction run={moderateReviewAction.bind(null, r.id, "approve")} label="Aprovar" /> : <InlineAction run={moderateReviewAction.bind(null, r.id, "unapprove")} label="Despublicar" />}
                {!r.featured ? <InlineAction run={moderateReviewAction.bind(null, r.id, "feature")} label="Destacar na home" /> : <InlineAction run={moderateReviewAction.bind(null, r.id, "unfeature")} label="Remover destaque" />}
                <InlineAction run={moderateReviewAction.bind(null, r.id, "delete")} label="Excluir" tone="danger" confirm="Excluir esta avaliação?" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
