import type { ReactNode } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { hasLocale } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? pageMeta(lang, "/our-story") : {};
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
