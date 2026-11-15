"use client";

import { submitWith } from "@/components/ui/submit";
import { useActionState, useState } from "react";
import clsx from "clsx";
import { lookupOrderAction } from "@/actions/tracking";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { OrderTimeline } from "./order-timeline";

export function TrackingForm({ initialNumber }: { initialNumber: string }) {
  const [mode, setMode] = useState<"order" | "code">("order");
  const [number, setNumber] = useState(initialNumber);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, action, pending] = useActionState(lookupOrderAction, null);

  return (
    <div className="mt-10">
      <div className="flex gap-6 border-b border-line" role="tablist">
        {([["order", "Número do pedido"], ["code", "Código de rastreamento"]] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={clsx("-mb-px h-11 border-b-2 text-sm font-semibold", mode === k ? "border-ink" : "border-transparent text-muted")}>{label}</button>
        ))}
      </div>
      <form onSubmit={submitWith(action)} className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="mode" value={mode} />
        {mode === "order" ? (
          <>
            <label><span className="label">Número do pedido</span><input name="number" className="field uppercase" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="MK-123456" required /></label>
            <label><span className="label">E-mail da compra</span><input name="email" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          </>
        ) : (
          <label className="sm:col-span-2"><span className="label">Código de rastreamento</span><input name="code" className="field uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AA123456789BR" required /></label>
        )}
        <Button type="submit" loading={pending}>Consultar</Button>
      </form>
      {state && !state.ok && <Alert tone="bad" className="mt-6">{state.error}</Alert>}
      {state?.ok && (
        <section className="mt-10 border border-line bg-surface p-6 md:p-8">
          <h2 className="mb-6 font-semibold">Pedido {state.data.number} · {state.data.shippingName}</h2>
          <OrderTimeline data={state.data} />
        </section>
      )}
    </div>
  );
}
