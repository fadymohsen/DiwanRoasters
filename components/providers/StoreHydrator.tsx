"use client";

import { useEffect } from "react";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useShopStore } from "@/store/useShopStore";
import { LANG_KEY, detectLang, useLangStore } from "@/lib/i18n";

/** Loads the saved catalog and orders after mount, so server and first client render match. */
export default function StoreHydrator() {
  useEffect(() => {
    void useCatalogStore.persist.rehydrate();
    void useShopStore.persist.rehydrate();
    const fromLink = new URLSearchParams(window.location.search).get("lang");
    let saved = false;
    try { saved = !!localStorage.getItem(LANG_KEY); } catch {}
    void Promise.resolve(useLangStore.persist.rehydrate()).then(() => {
      // a shared ?lang= link beats the saved choice; with nothing saved, follow the browser
      if (fromLink === "ar" || fromLink === "en") useLangStore.getState().setLang(fromLink);
      else if (!saved) useLangStore.getState().setLang(detectLang());
    });
  }, []);
  return null;
}
