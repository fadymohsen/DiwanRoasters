"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useLangStore } from "@/lib/lang";

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string };

/** Link that keeps the visitor in their language: /shop becomes /en/shop or /ar/shop. */
export default function Link({ href, ...rest }: Props) {
  const lang = useLangStore((s) => s.lang);
  const local = href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/admin");
  return <NextLink href={local ? `/${lang}${href === "/" ? "" : href}` : href} {...rest} />;
}
