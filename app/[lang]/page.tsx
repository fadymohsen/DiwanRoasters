import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { hasLocale } from "@/lib/site";
import HeaderNav from "@/components/layout/HeaderNav";
import CartDrawer from "@/components/layout/CartDrawer";
import Footer from "@/components/layout/Footer";
import DiwanSections from "@/components/diwan/DiwanSections";
import HeroVideo from "@/components/diwan/HeroVideo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? pageMeta(lang, "") : {};
}

export default function HomePage() {
  return (
    <main id="main" className="relative">
      <HeaderNav />
      <HeroVideo />
      <DiwanSections />
      <Footer />
      <CartDrawer />
    </main>
  );
}
