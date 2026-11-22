"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PayMethod } from "@/lib/types";
import type { DiscountResult } from "@/lib/pricing";

/** Cart lines are keyed `${productId}:${variantKey}`, see lineKey() in useCatalogStore. */
interface ShopState {
  cart: Record<string, number>;
  wishlist: Record<string, boolean>;
  isCartOpen: boolean;
  promo: string;
  /** the server's verdict on `promo`, for the bag as it is now */
  promoResult: (Pick<DiscountResult, "ok" | "amount" | "freeShipping" | "error"> & { code: string }) | null;
  setPromoResult: (r: ShopState["promoResult"]) => void;
  shipCity: string;
  setPromo: (code: string) => void;
  setShipCity: (city: string) => void;
  addToCart: (key: string, n?: number) => void;
  removeFromCart: (key: string) => void;
  deleteLine: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  setCartOpen: (open: boolean) => void;
  payMethod: PayMethod;
  setPayMethod: (m: PayMethod) => void;
  /** the visitor chose to send this order as a gift */
  gift: { on: boolean; name: string; phone: string; message: string };
  setGift: (patch: Partial<{ on: boolean; name: string; phone: string; message: string }>) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      payMethod: "cod" as PayMethod,
      setPayMethod: (payMethod) => set({ payMethod }),
      gift: { on: false, name: "", phone: "", message: "" },
      setGift: (patch) => set((s) => ({ gift: { ...s.gift, ...patch } })),
  cart: {},
  wishlist: {},
  isCartOpen: false,
  promo: "",
  promoResult: null,
  setPromoResult: (promoResult) => set({ promoResult }),
  shipCity: "",
  setPromo: (promo) => set({ promo, promoResult: null }),
  setShipCity: (shipCity) => set({ shipCity }),
  addToCart: (key, n = 1) => set((s) => ({ cart: { ...s.cart, [key]: (s.cart[key] || 0) + n } })),
  removeFromCart: (key) =>
    set((s) => {
      const next = { ...s.cart };
      if ((next[key] || 0) <= 1) delete next[key];
      else next[key] -= 1;
      return { cart: next };
    }),
  deleteLine: (key) =>
    set((s) => {
      const next = { ...s.cart };
      delete next[key];
      return { cart: next };
    }),
  clearCart: () => set({ cart: {}, promo: "", promoResult: null, payMethod: "cod", gift: { on: false, name: "", phone: "", message: "" } }),
  toggleWishlist: (id) => set((s) => ({ wishlist: { ...s.wishlist, [id]: !s.wishlist[id] } })),
  setCartOpen: (open) => set({ isCartOpen: open }),
}),
    { name: "diwan-bag-v1", skipHydration: true, partialize: (s) => ({ cart: s.cart, wishlist: s.wishlist, promo: s.promo }) },
  ),
);
