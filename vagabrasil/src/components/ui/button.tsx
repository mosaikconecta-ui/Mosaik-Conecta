import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  navy: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline: "border border-line bg-white text-navy-800 hover:border-navy-200 hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  "danger-outline": "border border-red-200 bg-white text-red-700 hover:bg-red-50",
} as const;
const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
} as const;

export type ButtonVariant = keyof typeof variants;
type Common = { variant?: ButtonVariant; size?: keyof typeof sizes; className?: string };

export const buttonClass = ({ variant = "primary", size = "md", className }: Common = {}) =>
  cn(
    "inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

export function Button({ variant, size, className, type = "button", ...props }: ComponentProps<"button"> & Common) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
