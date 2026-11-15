"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({ value, max, min = 1, onChange, disabled, label }: { value: number; max: number; min?: number; onChange: (v: number) => void; disabled?: boolean; label: string }) {
  const btn = "grid size-10 place-items-center transition-colors hover:bg-paper-2 disabled:opacity-35";
  return (
    <div className="inline-flex h-10 items-center border border-line-2" role="group" aria-label={`Quantidade de ${label}`}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min} aria-label="Diminuir quantidade"><Minus size={14} /></button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label="Aumentar quantidade"><Plus size={14} /></button>
    </div>
  );
}
