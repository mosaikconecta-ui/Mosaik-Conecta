import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS, TIMELINE, trackingUrlFor, FULFILLMENT_STATUS } from "@/lib/order-status";
import { formatDateTime } from "@/lib/format";

export type PublicTracking = {
  number: string;
  status: OrderStatus;
  createdAt: string;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  shippingName: string;
  events: { message: string; createdAt: string }[];
  shipments: { status: keyof typeof FULFILLMENT_STATUS; carrier: string | null; trackingCode: string | null; trackingUrl: string | null }[];
};

export function OrderTimeline({ data }: { data: PublicTracking }) {
  const cancelled = data.status === "CANCELLED" || data.status === "REFUNDED";
  const idx = TIMELINE.indexOf(data.status);
  return (
    <div>
      {cancelled ? (
        <p className="border border-line bg-surface p-4 font-semibold text-danger">{ORDER_STATUS[data.status].label}</p>
      ) : (
        <ol className="grid grid-cols-5 gap-1" aria-label="Etapas do pedido">
          {TIMELINE.map((s, i) => (
            <li key={s} className="min-w-0">
              <div className={clsx("h-1", i <= idx ? "bg-ink" : "bg-paper-3")} />
              <p className={clsx("mt-2 text-[11px] leading-tight sm:text-[13px]", i <= idx ? "font-semibold" : "text-muted")} aria-current={i === idx ? "step" : undefined}>{ORDER_STATUS[s].label}</p>
            </li>
          ))}
        </ol>
      )}

      {data.shipments.some((s) => s.trackingCode) && (
        <div className="mt-8 space-y-2">
          {data.shipments.filter((s) => s.trackingCode).map((s) => (
            <a key={s.trackingCode} href={trackingUrlFor(s.trackingCode!, s.carrier, s.trackingUrl)} target="_blank" rel="noopener noreferrer"
              className="lift flex items-center justify-between gap-4 border border-line bg-surface p-4">
              <span><span className="text-sm text-muted">{s.carrier ?? "Transportadora"} · {FULFILLMENT_STATUS[s.status]}</span><br /><span className="font-semibold tabular-nums">{s.trackingCode}</span></span>
              <span className="flex items-center gap-1 text-sm font-semibold">Rastrear <ExternalLink size={14} /></span>
            </a>
          ))}
        </div>
      )}

      <ol className="mt-8 space-y-4 border-l border-line pl-5">
        {[...data.events].reverse().map((e, i) => (
          <li key={i} className="relative">
            <span className={clsx("absolute -left-[25px] top-1.5 size-2.5 rounded-full", i === 0 ? "bg-ink" : "bg-line-2")} />
            <p className="text-sm">{e.message}</p>
            <p className="text-[12px] text-muted">{formatDateTime(e.createdAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
