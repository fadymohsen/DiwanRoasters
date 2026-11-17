"use client";

import Link from "@/components/ui/LocLink";
import CategoryCard from "@/components/ui/CategoryCard";
import Reveal from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/motion";
import { useLangStore } from "@/lib/lang";

/** The three coffee families, right under the hero: Turkish, espresso and flavored. */
export function Categories() {
  const ar = useLangStore((s) => s.lang) === "ar";
  return (
    <section id="categories" className="bg-sand py-16 md:py-24" aria-labelledby="categories-h">
      <div className="wrap text-center">
        <SplitText as="h2" text={ar ? "اختر فنجانك" : "Choose your cup"} className="block font-serif text-4xl font-bold leading-tight text-green md:text-6xl" />
        <Reveal delay={0.1}>
          <p className="mx-auto mt-3 max-w-md text-ink/75">{ar ? "ثلاث عائلات من القهوة، ولكل واحدة ثلاث توليفات." : "Three families of coffee, three blends in each."}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-3 gap-2 md:flex md:items-start md:justify-center md:gap-8">
          <CategoryCard category="turkish" defaultRotation={-2} />
          <CategoryCard category="espresso" defaultRotation={1.5} />
          <CategoryCard category="flavored" defaultRotation={-1.5} />
        </div>

        <Reveal delay={0.15}>
          <Link href="/shop" className="btn btn-primary mt-10">{ar ? "تصفّح كل المنتجات" : "Browse all products"}</Link>
        </Reveal>
      </div>
    </section>
  );
}
