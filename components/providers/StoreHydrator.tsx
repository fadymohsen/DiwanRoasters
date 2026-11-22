"use client";

import { useEffect } from "react";
import { useShopStore } from "@/store/useShopStore";
import { usePromoSync } from "@/lib/cart";

/** Loads the saved bag after mount, so server and first client render match. */
export default function StoreHydrator() {
  // the saved bag is read first; anything that writes to the store has to come after
  useEffect(() => {
    void useShopStore.persist.rehydrate();
  }, []);
  usePromoSync();
  return null;
}
