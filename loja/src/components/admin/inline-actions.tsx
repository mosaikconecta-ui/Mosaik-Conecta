"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";

/** Botão que executa uma server action sem formulário (ativar, excluir, aprovar…). */
export function InlineAction({ run, label, confirm: confirmText, tone = "default", resultMessage }: { run: () => Promise<unknown>; label: string; confirm?: string; tone?: "default" | "danger"; resultMessage?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          start(async () => {
            const r = await run();
            if (resultMessage && r && typeof r === "object" && "message" in r) setMsg(String((r as { message: string }).message));
          });
        }}
        className={clsx("text-[13px] font-semibold underline-offset-2 hover:underline disabled:opacity-50", tone === "danger" ? "text-danger" : "text-ink")}
      >
        {pending ? "…" : label}
      </button>
      {msg && <span className="text-[12px] text-muted">{msg}</span>}
    </span>
  );
}

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="text-[13px] font-semibold hover:underline" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "Copiado" : label}
    </button>
  );
}
