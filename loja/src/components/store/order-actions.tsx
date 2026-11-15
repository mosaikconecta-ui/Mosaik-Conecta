"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { retryPaymentAction } from "@/actions/checkout";
import { track } from "@/lib/analytics";

export function PayButton({ number, token }: { number: string; token: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button onClick={async () => {
        setLoading(true); setError(null);
        const r = await retryPaymentAction(number, token);
        if (r.ok) window.location.href = r.url;
        else { setError(r.error); setLoading(false); }
      }} loading={loading}>Pagar agora</Button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Dispara o evento "purchase" uma única vez por pedido (após confirmação do pagamento). */
export function PurchaseTracker({ orderNumber, valueCents, items }: { orderNumber: string; valueCents: number; items: { id: string; name: string; priceCents: number; quantity: number }[] }) {
  useEffect(() => {
    const key = `mk_purchase_${orderNumber}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch { /* */ }
    track("purchase", { transaction_id: orderNumber, value: valueCents / 100, items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.priceCents / 100, quantity: i.quantity })) });
  }, [orderNumber, valueCents, items]);
  return null;
}
