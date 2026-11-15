import { formatBRL } from "@/lib/format";

/** Gráfico de barras simples (SVG/CSS), sem dependências. */
export function RevenueChart({ data }: { data: { day: string; totalCents: number; orders: number }[] }) {
  const max = Math.max(...data.map((d) => d.totalCents), 1);
  const total = data.reduce((s, d) => s + d.totalCents, 0);
  if (total === 0) return <p className="flex h-40 items-center justify-center text-sm text-muted">Sem vendas aprovadas no período.</p>;
  return (
    <div>
      <div className="flex h-44 items-end gap-[3px]" role="img" aria-label={`Faturamento de ${formatBRL(total)} nos últimos ${data.length} dias`}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="w-full rounded-t-[1px] bg-ink transition-colors group-hover:bg-clay" style={{ height: `${Math.max(2, (d.totalCents / max) * 176)}px`, opacity: d.totalCents ? 1 : 0.12 }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-[11px] text-paper group-hover:block">
              {d.day.split("-").reverse().slice(0, 2).join("/")}: {formatBRL(d.totalCents)} · {d.orders} ped.
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{data[0].day.split("-").reverse().slice(0, 2).join("/")}</span>
        <span>{data[data.length - 1].day.split("-").reverse().slice(0, 2).join("/")}</span>
      </div>
    </div>
  );
}
