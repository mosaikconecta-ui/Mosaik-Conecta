"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { quickStockAction } from "@/actions/admin-products";

/** Edição rápida de estoque na listagem (salva ao sair do campo). */
export function StockInput({ variantId, initial }: { variantId: string; initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const n = Number(value);
  const dirty = value !== "" && n !== saved;
  return (
    <input
      aria-label="Estoque"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 7))}
      onBlur={() => dirty && start(async () => setSaved(await quickStockAction(variantId, n)))}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={clsx("h-7 w-14 border px-1.5 text-center tabular-nums", saved === 0 ? "border-danger text-danger" : "border-line-2", pending && "opacity-50", dirty && "border-ink")}
    />
  );
}
