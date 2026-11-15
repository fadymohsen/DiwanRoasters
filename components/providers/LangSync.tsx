"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { PRODUCTS } from "@/data/products";
import { useLangStore } from "@/lib/i18n";

type Meta = { title: { en: string; ar: string }; description: { en: string; ar: string } };

const SITE = "DIWAN ديوان";
const PAGES: Record<string, Meta> = {
  "/": {
    title: { en: "DIWAN ديوان | Coffee for every culture", ar: "ديوان | قهوة لكل ثقافة" },
    description: { en: "Cairo coffee roastery. Nine blends: Turkish, espresso and flavored.", ar: "محمصة قهوة في القاهرة. تسع توليفات: تركي وإسبريسو ومنكهة." },
  },
  "/shop": {
    title: { en: "Shop", ar: "المتجر" },
    description: { en: "Nine coffee blends, 200 g each, in Egyptian pounds.", ar: "تسع توليفات قهوة، كل عبوة 200 جم، بالجنيه المصري." },
  },
  "/our-story": {
    title: { en: "Our story", ar: "حكايتنا" },
    description: { en: "A Cairo roastery built on one idea: coffee tastes better together.", ar: "محمصة في القاهرة قامت على فكرة واحدة: القهوة أجمل حين نجتمع حولها." },
  },
  "/contact": {
    title: { en: "Contact", ar: "تواصل معنا" },
    description: { en: "Ask for a blend recommendation or help with an order.", ar: "اسألنا عن توليفة تناسبك أو عن طلبك." },
  },
  "/cart": { title: { en: "Your bag", ar: "سلتك" }, description: { en: "Review the blends in your bag.", ar: "راجع التوليفات في سلتك." } },
  "/checkout": { title: { en: "Checkout", ar: "إتمام الطلب" }, description: { en: "Place your order. Cash on delivery.", ar: "أكمل طلبك. الدفع عند الاستلام." } },
};

function metaFor(path: string): Meta | null {
  if (PAGES[path]) return PAGES[path];
  const m = path.match(/^\/shop\/([^/]+)\/?$/);
  const p = m && PRODUCTS.find((x) => x.id === m[1]);
  if (p) {
    return {
      title: { en: p.nameEn, ar: p.name },
      description: { en: p.copyEn.slice(0, 150), ar: p.copy.slice(0, 150) },
    };
  }
  return null;
}

/** Keeps <html lang dir>, the page title and the description in step with the chosen language. */
export default function LangSync() {
  const lang = useLangStore((s) => s.lang);
  const path = usePathname();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (path.startsWith("/admin")) return;
    const meta = metaFor(path);
    if (!meta) return;
    const title = path === "/" ? meta.title[lang] : `${meta.title[lang]} | ${SITE}`;
    // Next writes its own (English) title and description after a navigation, so keep ours in place
    const apply = () => {
      if (document.title !== title) document.title = title;
      const d = document.querySelector('meta[name="description"]');
      if (d && d.getAttribute("content") !== meta.description[lang]) d.setAttribute("content", meta.description[lang]);
    };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    return () => watch.disconnect();
  }, [lang, path]);

  return null;
}
