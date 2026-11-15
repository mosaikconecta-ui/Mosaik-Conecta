import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-navy-300 " +
  "transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-100 " +
  "disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-100";

export const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <input className={cn(control, "h-10", className)} {...props} />
);

export const Textarea = ({ className, rows = 4, ...props }: ComponentProps<"textarea">) => (
  <textarea rows={rows} className={cn(control, "py-2 leading-relaxed", className)} {...props} />
);

export const Select = ({ className, children, ...props }: ComponentProps<"select">) => (
  <select className={cn(control, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b82%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...props}>
    {children}
  </select>
);

export const Label = ({ className, ...props }: ComponentProps<"label">) => (
  <label className={cn("mb-1.5 block text-[13px] font-semibold text-navy-800", className)} {...props} />
);

export function Field({
  label, htmlFor, error, hint, required, children, className,
}: {
  label?: ReactNode; htmlFor?: string; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-red-600" role="alert" id={htmlFor ? `${htmlFor}-error` : undefined}>{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-navy-700", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-navy-300 accent-brand-600" {...props} />
      <span>{label}</span>
    </label>
  );
}
