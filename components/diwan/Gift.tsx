"use client";

import Link from "@/components/ui/LocLink";
import Reveal from "@/components/ui/Reveal";
import { ImageReveal, Magnetic, SplitText } from "@/components/ui/motion";
import { useLangStore } from "@/lib/lang";
import { useShopStore } from "@/store/useShopStore";

/** Tells visitors a gift can be sent from checkout; the button pre-ticks the gift option there. */
export function Gift() {
  const ar = useLangStore((s) => s.lang) === "ar";
  const setGift = useShopStore((s) => s.setGift);

  const steps = ar
    ? ["اختر توليفاتك", "فعّل «هذا الطلب هدية» عند إتمام الطلب", "اكتب اسم المُستلِم وهاتفه، ونحن نوصل"]
    : ["Choose your blends", "Tick “This order is a gift” at checkout", "Add the receiver's name and phone, and we deliver"];

  return (
    <section id="gift" className="bg-sand-deep/50 py-20 md:py-28" aria-labelledby="gift-h">
      <div className="wrap grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
        <div>
          <SplitText as="h2" text={ar ? "أهدِ فنجاناً" : "Send a cup as a gift"} className="block font-serif text-4xl font-bold leading-tight text-green md:text-6xl" />
          <Reveal delay={0.1}>
            <p className="measure mt-5 text-lg leading-relaxed text-ink/80">
              {ar
                ? "يصل البوكس إلى من تحب باسمه، مع كارت التوليفة. نتصل به لنرتب موعد التوصيل، ويمكنك كتابة رسالة قصيرة على الكارت."
                : "The box reaches the person you choose, with the card for their blend. We call them to arrange the delivery, and you can write a short message on the card."}
            </p>
            <ol className="mt-7 space-y-3">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green text-sm font-semibold text-sand"><bdi>{i + 1}</bdi></span>
                  <span className="text-base text-ink">{s}</span>
                </li>
              ))}
            </ol>
            <Magnetic className="mt-9 inline-block">
              <Link href="/shop" onClick={() => setGift({ on: true })} className="btn btn-primary">
                {ar ? "أرسل هدية" : "Send a gift"}
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        <ImageReveal className="aspect-[4/3] rounded-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/diwan/photo/unboxing-flatlay.webp"
            alt={ar ? "بوكس ديوان مفتوح: كارت وكيس قهوة وورق زبدة بختم شمعي" : "An open DIWAN box: a card, a coffee pouch and tissue paper with a wax seal"}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </ImageReveal>
      </div>
    </section>
  );
}
