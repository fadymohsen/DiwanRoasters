"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/LocLink";
import HeaderNav from "@/components/layout/HeaderNav";
import CartDrawer from "@/components/layout/CartDrawer";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/motion";
import { categoryName } from "@/lib/catalog";
import AddToBagButton from "@/components/shop/AddToBagButton";
import { inStock, isLive, isLow, lineKey, useCatalogStore, type CatalogItem } from "@/store/useCatalogStore";
import { useLangStore, useLocalized } from "@/lib/i18n";
import { money } from "@/lib/format";

type Filter = "all" | string;

function ShopCard({ item }: { item: CatalogItem }) {
  const lang = useLangStore((s) => s.lang);
  const l = useLocalized();
  const categories = useCatalogStore((s) => s.categories);
  const [variantKey, setVariantKey] = useState(item.variants[0].key);
  const variant = item.variants.find((v) => v.key === variantKey) ?? item.variants[0];
  const available = inStock(variant);
  const multi = item.variants.length > 1;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-n200 bg-n100 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(14,58,51,0.25)]">
      <Link href={`/shop/${item.id}`} className="relative block aspect-square overflow-hidden bg-n200" aria-label={item.name[lang]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={l({ en: `${item.name.en}, 200 g pack with its card`, ar: `${item.name.ar}، عبوة 200 جم مع كارتها` })}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute start-3 top-3 rounded-[6px] bg-sandy/90 px-2.5 py-1 text-[11px] font-semibold text-green backdrop-blur">
          {categoryName(categories, item.categoryId, lang)}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-editorial text-2xl font-semibold text-green"><Link href={`/shop/${item.id}`} className="hover:underline">{item.name[lang]}</Link></h3>
        <p className="mt-1 text-sm leading-relaxed text-n500">{item.description[lang]}</p>

        {multi && (
          <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label={l({ en: "Roast and style", ar: "التحميص والحالة" })}>
            {item.variants.map((v) => (
              <button
                key={v.key}
                role="radio"
                aria-checked={v.key === variantKey}
                onClick={() => setVariantKey(v.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition active:scale-[0.97] ${v.key === variantKey ? "border-green bg-green text-sandy" : "border-n300 text-n500 hover:border-green hover:text-green"}`}
              >
                {v.label[lang]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-green"><bdi>{money(variant.price, lang)}</bdi></span>
              {variant.compareAt && variant.compareAt > variant.price && <span className="text-xs text-n400 line-through"><bdi>{money(variant.compareAt, lang)}</bdi></span>}
            </div>
            {(() => {
              const brewGrams: Record<string, number> = { turkish: 8, espresso: 18, flavored: 10 };
              const g = brewGrams[item.categoryId];
              if (!g) return null;
              const cost = Math.round((variant.price / 200) * g);
              return (
                <div className="mt-0.5 text-[11px] text-n500">
                  {lang === "ar" ? `≈ ${cost} جنيه · تكلفة البن في الفنجان` : `≈ EGP ${cost} · per cup`}
                </div>
              );
            })()}
            <div className="text-[11px] text-n400">
              {isLow(variant) ? <span className="font-medium text-[#9A6B12]">{l({ en: `${variant.stock} left`, ar: `متبقي ${variant.stock}` })}</span> : item.details.weight ? l({ en: `${item.details.weight.en} pack`, ar: `عبوة ${item.details.weight.ar}` }) : null}
            </div>
          </div>
          <AddToBagButton lineKey={lineKey(item.id, variant.key)} disabled={!available} flyImage={item.image} size="sm" />
        </div>
      </div>
    </article>
  );
}

export default function ShopPage() {
  const lang = useLangStore((s) => s.lang);
  const l = useLocalized();
  const all = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const items = all.filter(isLive);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"featured" | "low" | "high">("featured");

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("category");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c) setFilter(c);
  }, []);

  const base = filter === "all" ? items : items.filter((i) => i.categoryId === filter);
  const minPrice = (i: CatalogItem) => Math.min(...i.variants.map((v) => v.price));
  const filtered = sort === "featured" ? base : [...base].sort((a, b) => (sort === "low" ? minPrice(a) - minPrice(b) : minPrice(b) - minPrice(a)));
  const filters: Filter[] = ["all", ...categories.filter((c) => items.some((i) => i.categoryId === c.id)).map((c) => c.id)];

  return (
    <main id="main" className="page-in relative">
      <HeaderNav />
      <CartDrawer />

      <section className="mx-auto max-w-[1440px] px-5 pb-10 pt-32 md:px-20 md:pt-40">
        <Reveal>
          <SplitText as="h1" text={l({ en: "Shop", ar: "منتجاتنا" })} className="block font-editorial text-5xl font-semibold text-green md:text-7xl" />
          <p className="mt-4 max-w-xl text-base leading-relaxed text-n500">
            {l({
              en: "Our blends, by category. Every price is in Egyptian pounds.",
              ar: "توليفاتنا مرتبة حسب الفئة، وكل الأسعار بالجنيه المصري.",
            })}
          </p>
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2" role="tablist">
          {filters.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[0.97] ${filter === f ? "bg-green text-sandy" : "border border-n300 text-n500 hover:border-green hover:text-green"}`}
            >
              {f === "all" ? l({ en: "All", ar: "الكل" }) : categoryName(categories, f, lang)}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-n200 pt-4 text-sm text-n500">
          <span aria-live="polite" className="whitespace-nowrap"><bdi>{filtered.length}</bdi> {l({ en: "products", ar: "منتجات" })}</span>
          <label className="flex items-center gap-2">
            {l({ en: "Sort", ar: "الترتيب" })}
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-n300 bg-n100 px-3 py-2 text-sm text-ink outline-none focus:border-green">
              <option value="featured">{l({ en: "Featured", ar: "المميّز" })}</option>
              <option value="low">{l({ en: "Price: low to high", ar: "السعر: الأقل أولاً" })}</option>
              <option value="high">{l({ en: "Price: high to low", ar: "السعر: الأعلى أولاً" })}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 0.07}>
              <ShopCard item={item} />
            </Reveal>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-sm text-n500">{l({ en: "No products in this category yet.", ar: "لا توجد منتجات في هذا التصنيف حالياً." })}</p>
            {filter !== "all" && <button onClick={() => setFilter("all")} className="btn btn-ghost mt-4">{l({ en: "Show all", ar: "عرض الكل" })}</button>}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
