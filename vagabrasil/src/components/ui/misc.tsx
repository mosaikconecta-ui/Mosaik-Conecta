import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export type Tone = "neutral" | "info" | "brand" | "success" | "warning" | "danger" | "muted";
const tones: Record<Tone, string> = {
  neutral: "bg-navy-50 text-navy-700 ring-navy-100",
  info: "bg-sky-50 text-sky-800 ring-sky-100",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
  muted: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

const alertStyles = {
  info: ["border-sky-200 bg-sky-50 text-sky-900", Info],
  success: ["border-emerald-200 bg-emerald-50 text-emerald-900", CheckCircle2],
  warning: ["border-amber-200 bg-amber-50 text-amber-900", TriangleAlert],
  danger: ["border-red-200 bg-red-50 text-red-900", AlertCircle],
} as const;

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof alertStyles; title?: ReactNode; children?: ReactNode; className?: string }) {
  const [style, Icon] = alertStyles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border p-3.5 text-sm", style, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "leading-relaxed opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-(--radius-card) border border-dashed border-navy-200 bg-white px-6 py-12 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-navy-50 text-navy-500">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({ className, children, title, action, description }: { className?: string; children: ReactNode; title?: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cn("card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && <Icon className="size-4 text-navy-300" aria-hidden />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-navy-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 40, square }: { name?: string | null; src?: string | null; size?: number; square?: boolean }) {
  const style = { width: size, height: size };
  const shape = square ? "rounded-lg" : "rounded-full";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={cn(shape, "shrink-0 border border-line bg-white object-contain")} />;
  }
  return (
    <span style={style} aria-hidden className={cn(shape, "flex shrink-0 items-center justify-center bg-navy-100 font-semibold text-navy-700")}>
      <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
    </span>
  );
}

export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (p: number) => string }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))).sort((a, b) => a - b);
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium";
  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      {page > 1 && <Link rel="prev" href={href(page - 1)} className={cn(item, "text-navy-700 hover:bg-navy-50")}>Anterior</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - nums[i - 1]! > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined}
            className={cn(item, n === page ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-50")}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link rel="next" href={href(page + 1)} className={cn(item, "text-navy-700 hover:bg-navy-50")}>Próxima</Link>}
    </nav>
  );
}
