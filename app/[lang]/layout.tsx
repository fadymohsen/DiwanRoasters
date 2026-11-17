import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { LOCALES, hasLocale } from "@/lib/site";
import { siteBase } from "@/lib/meta";
import { SiteLangProvider } from "@/lib/lang";
import AppProviders from "@/components/providers/AppProviders";
import SkipLink from "@/components/ui/SkipLink";
import ProgressGate from "@/components/ui/ProgressGate";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    metadataBase: siteBase,
    title: { default: "DIWAN ديوان", template: "%s | DIWAN ديوان" },
    applicationName: "DIWAN",
    openGraph: { siteName: "DIWAN ديوان", type: "website", images: ["/assets/diwan/Diwan_OpenGraph_Green_1200x630.png"], locale: lang === "ar" ? "ar_EG" : "en_US" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport = { themeColor: "#0E3A33" };

export default async function LangLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} suppressHydrationWarning className={fontVars}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <SiteLangProvider lang={lang}>
          <SkipLink />
          <ProgressGate />
          <AppProviders>{children}</AppProviders>
          <WhatsAppButton />
        </SiteLangProvider>
      </body>
    </html>
  );
}
