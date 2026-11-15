"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { addBundleAction, addToCartAction, applyCouponAction, fetchCartAction, removeCouponAction, setCepAction, updateCartItemAction } from "@/actions/cart";
import { EMPTY_CART, type CartView } from "@/lib/cart-types";

type CartCtx = {
  cart: CartView;
  loaded: boolean;
  pending: boolean;
  drawerOpen: boolean;
  lastMessage: { tone: "ok" | "bad"; text: string } | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (variantId: string, qty?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  addBundle: (bundleId: string, chosen?: Record<string, string>) => Promise<boolean>;
  update: (itemId: string, qty: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  setCep: (cep: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [loaded, setLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState<CartCtx["lastMessage"]>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const c = await fetchCartAction();
    setCart(c);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoaded(true));
  }, [refresh]);

  const apply = useCallback(
    async (p: Promise<{ ok: boolean; cart: CartView; error?: string; message?: string }>) => {
      return new Promise<boolean>((resolve) => {
        startTransition(async () => {
          try {
            const r = await p;
            setCart(r.cart);
            setLastMessage(r.ok ? (r.message ? { tone: "ok", text: r.message } : null) : { tone: "bad", text: r.error ?? "Erro." });
            resolve(r.ok);
          } catch {
            setLastMessage({ tone: "bad", text: "Falha de conexão. Tente novamente." });
            resolve(false);
          }
        });
      });
    },
    [],
  );

  const value = useMemo<CartCtx>(
    () => ({
      cart, loaded, pending, drawerOpen, lastMessage,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add: async (variantId, qty = 1, opts) => {
        const ok = await apply(addToCartAction(variantId, qty));
        if (ok && opts?.openDrawer !== false) setDrawerOpen(true);
        return ok;
      },
      addBundle: async (bundleId, chosen) => {
        const ok = await apply(addBundleAction(bundleId, chosen));
        if (ok) setDrawerOpen(true);
        return ok;
      },
      update: async (itemId, qty) => { await apply(updateCartItemAction(itemId, qty)); },
      applyCoupon: (code) => apply(applyCouponAction(code)),
      removeCoupon: async () => { await apply(removeCouponAction()); },
      setCep: (cep) => apply(setCepAction(cep)),
      refresh,
    }),
    [cart, loaded, pending, drawerOpen, lastMessage, apply, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}
