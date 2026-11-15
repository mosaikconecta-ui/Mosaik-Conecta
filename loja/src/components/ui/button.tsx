import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "clay" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] rounded-[2px] select-none whitespace-nowrap " +
  "transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.985] " +
  "disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 focus-visible:outline-ink",
  secondary: "bg-paper-2 text-ink hover:bg-paper-3",
  outline: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-paper-2",
  clay: "bg-clay text-white hover:bg-clay-2",
  danger: "border border-danger text-danger hover:bg-danger hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-12 px-5 text-sm",
  lg: "h-14 px-7 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; full?: boolean };

export function Button({ variant = "primary", size = "md", loading, full, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, clsx(full && "w-full", className))} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      <span className={clsx(loading && "opacity-80")}>{children}</span>
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children, full, ...rest }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; full?: boolean } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, clsx(full && "w-full", className))} {...rest}>
      {children}
    </Link>
  );
}
