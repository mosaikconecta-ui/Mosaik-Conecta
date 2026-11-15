import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { Alert } from "@/components/ui/misc";
import { ReviewForm } from "@/components/account/account-forms";

export const metadata = pageMetadata({ title: "Avaliar produto", description: "Avalie sua compra.", path: "/conta", noindex: true });

export default async function ReviewPage({ params }: { params: Promise<{ itemId: string }> }) {
  const user = await requireUser();
  const { itemId } = await params;
  const item = await db.orderItem.findUnique({ where: { id: itemId }, include: { order: true, review: true } });
  if (!item || item.order.userId !== user.id) notFound();
  return (
    <div>
      <h2 className="text-xl font-semibold">Avaliar {item.productName}</h2>
      <p className="mb-6 mt-2 text-sm text-muted">Pedido {item.order.number}. Avaliações são publicadas como “compra verificada” após moderação.</p>
      {item.order.status !== "DELIVERED" ? <Alert tone="warn">Você poderá avaliar assim que o pedido for entregue.</Alert>
        : item.review ? <Alert tone="ok">Você já avaliou este item. Obrigado!</Alert>
        : <ReviewForm orderItemId={item.id} />}
    </div>
  );
}
