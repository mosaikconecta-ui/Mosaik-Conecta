"use client";

import { useActionState, useEffect, useRef } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { submitWith } from "@/components/ui/submit";

type State = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

/** Formulário genérico para server actions do painel: mostra o resultado e o estado de envio. */
export function ActionForm({ action, children, submitLabel, className, variant = "primary", confirm: confirmText, resetOnSuccess, size = "md" }: {
  action: (s: State, f: FormData) => Promise<State>;
  children?: React.ReactNode;
  submitLabel: string;
  className?: string;
  variant?: "primary" | "outline" | "danger" | "secondary";
  confirm?: string;
  resetOnSuccess?: boolean;
  size?: "sm" | "md";
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} className={className} onSubmit={submitWith(formAction, () => (confirmText ? window.confirm(confirmText) : true))}>
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} loading={pending} size={size}>{submitLabel}</Button>
        {state?.message && <p role="status" className={clsx("text-sm", state.ok ? "text-moss" : "text-danger")}>{state.message}</p>}
      </div>
      {state?.errors && Object.keys(state.errors).length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-danger">{Object.entries(state.errors).map(([k, v]) => <li key={k}>{v}</li>)}</ul>
      )}
    </form>
  );
}
