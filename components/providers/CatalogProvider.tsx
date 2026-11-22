"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useCatalogStore } from "@/store/useCatalogStore";
import type { PublicCatalog } from "@/lib/types";

/**
 * Puts the catalog the server loaded into the store before the first render, so server and browser draw the same page.
 * Later changes (the owner edits a price) arrive through new props and replace it.
 */
export default function CatalogProvider({ data, children }: { data: PublicCatalog; children: ReactNode }) {
  const seen = useRef<string | null>(null);
  const json = JSON.stringify(data);
  if (seen.current === null) {
    seen.current = json;
    useCatalogStore.getState().setPublic(data);
  }
  useEffect(() => {
    if (seen.current !== json) {
      seen.current = json;
      useCatalogStore.getState().setPublic(data);
    }
  }, [json, data]);
  return <>{children}</>;
}
