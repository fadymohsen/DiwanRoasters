"use client";

import type { ReactNode } from "react";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import StoreHydrator from "@/components/providers/StoreHydrator";
import Toaster from "@/components/ui/Toaster";
import ConfirmHost from "@/components/ui/ConfirmHost";

/** Pieces both the storefront and the back office need. */
export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <StoreHydrator />
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
      <Toaster />
      <ConfirmHost />
    </>
  );
}
