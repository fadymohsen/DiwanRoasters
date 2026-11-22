"use client";

import Link from "@/components/ui/LocLink";
import HeaderNav from "@/components/layout/HeaderNav";
import CartDrawer from "@/components/layout/CartDrawer";
import Footer from "@/components/layout/Footer";
import { useLocalized } from "@/lib/i18n";

export default function GiftBoxPage() {
  const l = useLocalized();
  return (
    <main id="main" data-header-solid className="page-in relative min-h-screen bg-sandy">
      <HeaderNav />
      <CartDrawer />

      <section className="mx-auto flex max-w-[720px] flex-col items-center px-5 pb-32 pt-44 text-center md:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/diwan/Diwan_Arch_Green_tight.png" alt="" aria-hidden="true" className="mb-8 h-10 w-auto" />
        <h1 className="font-editorial text-5xl font-semibold text-green md:text-7xl">
          {l({ en: "Gift Box", ar: "بوكس الهدايا" })}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-n500">
          {l({ en: "We are preparing something special.", ar: "بنجهّز شيئاً مميزاً." })}
        </p>
        <p className="mt-3 text-sm text-n400">
          {l({
            en: "Gift boxes are coming soon. In the meantime, you can order any blend and we will help you wrap it nicely.",
            ar: "بوكسات الهدايا قريباً. في الانتظار، اطلب أي توليفة وهنساعدك تقدّمها بشكل مميز.",
          })}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            {l({ en: "Browse Blends", ar: "تصفح التوليفات" })}
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            {l({ en: "Contact Us", ar: "تواصل معنا" })}
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
