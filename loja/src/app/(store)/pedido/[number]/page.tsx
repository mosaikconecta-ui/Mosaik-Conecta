import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrderForCustomer } from "@/lib/orders";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/order-status";
import { formatBRL, formatDateTime } from "@/lib/format";
import { formatCEP } from "@/lib/br";
import { integrations } from "@/lib/env";
import { pageMetadata } from "@/lib/seo";
import { Alert, Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { OrderTimeline } from "@/components/store/order-timeline";
import { PayButton, PurchaseTracker } from "@/components/store/order-actions";

export const metadata = pageMetadata({ title: "Pedido", description: "Acompanhe seu pedido.", path: "/pedido", noindex: true });

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; aviso?: string; status?: string; collection_status?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const order = await getOrderForCustomer(number, { token: sp.t ?? null, userId: user?.id });
  if (!order) notFound();

  const pending = order.status === "PENDING_PAYMENT";
  const returnedFromGateway = Boolean(sp.status || sp.collection_status);
  const payment = order.payments[0];

  return (
    <div className="container-x max-w-5xl pt-10 md:pt-14">
      <p className="eyebrow">Pedido {order.number}</p>
      <h1 className="display mt-3 text-[40px] md:text-[56px]">
        {pending ? "Pedido recebido" : order.status === "CANCELLED" ? "Pedido cancelado" : `Obrigado, ${order.customerName.split(" ")[0]}`}
      </h1>
      <p className="mt-3 text-ink-2">Feito em {formatDateTime(order.createdAt)} · <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge></p>

      {pending && (
        <div className="mt-8 space-y-4">
          {returnedFromGateway && (
            <Alert tone="neutral" title="Aguardando confirmação do Mercado Pago">
              Assim que o Mercado Pago confirmar o pagamento, o status muda automaticamente aqui e você recebe um e-mail. Pagamentos via Pix costumam ser confirmados em instantes; boleto em até 3 dias úteis.
            </Alert>
          )}
          {order.paymentStatus === "REJECTED" && <Alert tone="bad" title="Pagamento recusado">Tente novamente com outro cartão ou escolha Pix/boleto.</Alert>}
          {!integrations.mercadoPago() ? (
            <Alert tone="warn" title="Pagamento online ainda não configurado">
              Este pedido foi registrado como aguardando pagamento e nenhuma cobrança foi realizada. Assim que a loja ativar o Mercado Pago, você poderá pagar por esta página.
            </Alert>
          ) : (
            <div className="flex flex-wrap items-center gap-4 border border-line bg-surface p-5">
              <p className="flex-1 text-sm text-ink-2">Total a pagar: <strong className="text-ink">{formatBRL(order.totalCents)}</strong>. Pix, cartão em até 6× sem juros ou boleto.</p>
              <PayButton number={order.number} token={sp.t ?? null} />
            </div>
          )}
          {payment?.sandbox && <p className="text-[12px] text-muted">Ambiente de testes (sandbox) do Mercado Pago — pagamentos não são reais.</p>}
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <section aria-label="Acompanhamento">
          <h2 className="mb-6 text-lg font-semibold">Acompanhamento</h2>
          <OrderTimeline data={{
            number: order.number, status: order.status, createdAt: order.createdAt.toISOString(), deliveryDaysMin: order.deliveryDaysMin, deliveryDaysMax: order.deliveryDaysMax,
            shippingName: order.shippingName, events: order.events.map((e) => ({ message: e.message, createdAt: e.createdAt.toISOString() })),
            shipments: order.fulfillments.map((f) => ({ status: f.status, carrier: f.carrier, trackingCode: f.trackingCode, trackingUrl: f.trackingUrl })),
          }} />
        </section>

        <aside className="space-y-8">
          <section className="border border-line bg-surface p-6">
            <h2 className="font-semibold">Itens</h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3 text-sm">
                  <div className="relative aspect-[4/5] w-14 shrink-0 bg-paper-2">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="flex-1"><p className="font-semibold">{i.productName}</p><p className="text-muted">{i.variantName ? `${i.variantName} · ` : ""}{i.quantity}×</p></div>
                  <p className="tabular-nums">{formatBRL(i.totalCents)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && <div className="flex justify-between text-moss"><dt>Descontos</dt><dd>−{formatBRL(order.discountCents)}</dd></div>}
              <div className="flex justify-between"><dt>Frete ({order.shippingName})</dt><dd>{order.shippingCents ? formatBRL(order.shippingCents) : "Grátis"}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatBRL(order.totalCents)}</dd></div>
              <div className="flex justify-between text-muted"><dt>Pagamento</dt><dd>{PAYMENT_STATUS[order.paymentStatus]}{payment?.method ? ` · ${payment.method}` : ""}</dd></div>
            </dl>
          </section>
          <section className="text-sm leading-relaxed">
            <h2 className="mb-2 font-semibold">Entrega</h2>
            <p>{order.customerName}<br />{order.shipStreet}, {order.shipNumber}{order.shipComplement ? ` — ${order.shipComplement}` : ""}<br />{order.shipDistrict} — {order.shipCity}/{order.shipState}<br />CEP {formatCEP(order.shipCep)}</p>
            <p className="mt-2 text-muted">Prazo estimado: {order.deliveryDaysMin} a {order.deliveryDaysMax} dias úteis após a aprovação do pagamento.</p>
          </section>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/produtos" variant="outline">Continuar comprando</ButtonLink>
            <Link href="/contato" className="link-draw self-center text-sm">Precisa de ajuda?</Link>
          </div>
        </aside>
      </div>
      {order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" && (
        <PurchaseTracker orderNumber={order.number} valueCents={order.totalCents} items={order.items.map((i) => ({ id: i.sku, name: i.productName, priceCents: i.unitCents, quantity: i.quantity }))} />
      )}
    </div>
  );
}
