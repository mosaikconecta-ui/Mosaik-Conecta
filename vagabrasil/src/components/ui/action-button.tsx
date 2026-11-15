"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, type ButtonVariant } from "./button";
import type { ActionResult } from "@/lib/actions";

/** Botão que executa uma Server Action (opcionalmente com confirmação) e exibe o resultado. */
export function ActionButton({ action, children, confirm, variant = "outline", size = "sm", className, successText }: {
  action: () => Promise<ActionResult<unknown> | void>;
  children: React.ReactNode; confirm?: string; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; successText?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} size={size} className={className} disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const r = await action();
            if (r && !r.ok) setMsg({ ok: false, text: r.error });
            else { setMsg(successText || (r && r.message) ? { ok: true, text: successText ?? (r as { message?: string }).message ?? "" } : null); router.refresh(); }
          });
        }}>
        {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {children}
      </Button>
      {msg && <span role="status" className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
    </span>
  );
}
