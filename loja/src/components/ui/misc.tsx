import clsx from "clsx";
import type { ReactNode } from "react";
import { formatBRL, installmentPlan } from "@/lib/format";
import { store } from "@/lib/env";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)} aria-label="Mosaik">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
        <rect x="0" y="0" width="10" height="10" fill={inverted ? "#f4f1ea" : "#191816"} />
        <rect x="12" y="0" width="10" height="10" fill="#9a4b2e" />
        <rect x="0" y="12" width="10" height="10" fill="#c8bfae" />
        <rect x="12" y="12" width="10" height="10" rx="5" fill={inverted ? "#f4f1ea" : "#191816"} />
      </svg>
      <span className="font-serif text-[26px] leading-none tracking-[-0.03em]">mosaik</span>
    </span>
  );
}

type Tone = "neutral" | "warn" | "ok" | "bad" | "info" | "clay" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2",
  warn: "bg-[#f3e6c8] text-[#6b4a0c]",
  ok: "bg-[#dfe5d3] text-moss",
  bad: "bg-[#f0d9d3] text-danger",
  info: "bg-[#dde3ea] text-[#2f4258]",
  clay: "bg-clay text-white",
  dark: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]", tones[tone], className)}>{children}</span>;
}

export function Price({ cents, compareAtCents, size = "md", showInstallments }: { cents: number; compareAtCents?: number | null; size?: "sm" | "md" | "lg"; showInstallments?: boolean }) {
  const plan = installmentPlan(cents, store.installments.max, store.installments.minInstallmentCents);
  const off = compareAtCents && compareAtCents > cents ? Math.round((1 - cents / compareAtCents) * 100) : 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <span className={clsx("font-semibold tabular-nums", size === "lg" ? "text-[26px]" : size === "md" ? "text-[15px]" : "text-sm")}>{formatBRL(cents)}</span>
        {off > 0 && (
          <>
            <s className={clsx("text-muted tabular-nums", size === "lg" ? "text-base" : "text-[13px]")}>{formatBRL(compareAtCents!)}</s>
            <span className={clsx("font-semibold text-clay", size === "lg" ? "text-sm" : "text-[12px]")}>−{off}%</span>
          </>
        )}
      </div>
      {showInstallments && plan.count > 1 && (
        <p className={clsx("text-muted", size === "lg" ? "mt-1 text-sm" : "text-[12px]")}>
          ou {plan.count}× de {formatBRL(plan.valueCents)} sem juros
        </p>
      )}
    </div>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">{message}</p>;
}

export function Alert({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warn" | "ok" | "bad"; title?: string; children?: ReactNode; className?: string }) {
  const map = { neutral: "border-line bg-surface", warn: "border-[#d9b871] bg-[#faf1dc]", ok: "border-[#a9b693] bg-[#eef1e6]", bad: "border-[#d7a091] bg-[#f8e9e4]" };
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={clsx("rounded-[2px] border px-4 py-3 text-sm", map[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && "mt-0.5", "text-ink-2")}>{children}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action, className }: { eyebrow?: string; title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-8 flex items-end justify-between gap-6 md:mb-10", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="display text-[34px] md:text-[46px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden>
          <path d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.8l-5.3 2.9 1.2-5.9L1.4 7.7l6-.7z" fill={value >= i - 0.25 ? "#191816" : value >= i - 0.75 ? "#8a857c" : "#d9d2c4"} />
        </svg>
      ))}
    </span>
  );
}
