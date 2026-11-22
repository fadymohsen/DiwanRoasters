"use client";

import { useEffect, useMemo, useState } from "react";
import { inStock, isLive, resolveLine, useCatalogStore, type CatalogItem, type CatalogVariant } from "@/store/useCatalogStore";
import { useShopStore } from "@/store/useShopStore";
import { findRate, shippingFor, type DiscountResult } from "@/lib/pricing";
import { checkPromo } from "@/lib/client/shop";
import { SITE } from "@/lib/site";

/** True once the saved bag has been read from the browser. */
export function useBagReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = useShopStore.persist.onFinishHydration(() => setReady(true));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (useShopStore.persist.hasHydrated()) setReady(true);
    return unsub;
  }, []);
  return ready;
}

export interface CartLine {
  key: string;
  qty: number;
  item: CatalogItem;
  variant: CatalogVariant;
  /** Quantity asked for is more than the tracked stock */
  overStock: boolean;
  unavailable: boolean;
}

/** The bag, joined with the live catalog so prices and stock are never stale. */
export function useCartLines() {
  const cart = useShopStore((s) => s.cart);
  const items = useCatalogStore((s) => s.items);
  const rates = useCatalogStore((s) => s.shippingRates);
  const promo = useShopStore((s) => s.promo);
  const city = useShopStore((s) => s.shipCity);
  const payMethod = useShopStore((s) => s.payMethod);
  const verdict = useShopStore((s) => s.promoResult);

  return useMemo(() => {
    const lines: CartLine[] = Object.entries(cart)
      .map(([key, qty]) => {
        const r = resolveLine(items, key);
        if (!r) return null;
        const unavailable = !isLive(r.item) || !inStock(r.variant);
        const overStock = r.variant.stock !== null && qty > r.variant.stock;
        return { key, qty, ...r, unavailable, overStock };
      })
      .filter((x): x is CartLine => !!x);
    const count = lines.reduce((a, b) => a + b.qty, 0);
    const subtotal = lines.reduce((a, b) => a + b.qty * b.variant.price, 0);
    const savings = lines.reduce((a, b) => a + (b.variant.compareAt && b.variant.compareAt > b.variant.price ? (b.variant.compareAt - b.variant.price) * b.qty : 0), 0);
    const blocked = lines.some((l) => l.unavailable || l.overStock);
    // the server decides what a code is worth; a verdict for an older code or bag is ignored
    const code: Pick<DiscountResult, "ok" | "amount" | "freeShipping" | "error"> | null = promo && verdict && verdict.code === promo ? verdict : null;
    const discountAmount = code?.ok ? code.amount : 0;
    const after = subtotal - discountAmount;
    const ship = shippingFor(findRate(rates, city), after, !!code?.ok && code.freeShipping);
    // paying by Instapay or wallet takes a further percentage off the goods, after any promo code
    const payDiscount = payMethod === "cod" ? 0 : Math.round((after * SITE.payDiscountPct) / 100);
    const total = after - payDiscount + (ship?.price ?? 0);
    return { lines, count, subtotal, savings, blocked, promo: code, discountAmount, shipping: ship, total, payDiscount, payMethod };
  }, [cart, items, rates, promo, verdict, city, payMethod]);
}

/** Asks the server what the promo code is worth whenever the code or the bag changes. Mounted once for the whole storefront. */
export function usePromoSync() {
  const promo = useShopStore((s) => s.promo);
  const cart = useShopStore((s) => s.cart);
  const setResult = useShopStore((s) => s.setPromoResult);
  const sig = JSON.stringify(Object.entries(cart).sort());
  useEffect(() => {
    if (!promo || sig === "[]") {
      // not a store write unless something is there to clear: a write before the saved bag is read would save an empty bag over it
      if (useShopStore.getState().promoResult) setResult(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(() => {
      const lines = (JSON.parse(sig) as [string, number][]).map(([key, qty]) => ({ key, qty }));
      checkPromo(promo, lines)
        .then((r) => live && setResult({ ...r, code: promo }))
        .catch(() => live && setResult({ code: promo, ok: false, amount: 0, freeShipping: false, error: { en: "Could not check the code. Try again.", ar: "تعذّر التحقق من الكود. حاول مرة أخرى." } }));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [promo, sig, setResult]);
}
