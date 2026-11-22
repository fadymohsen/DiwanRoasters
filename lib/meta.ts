import type { Metadata } from "next";
import { PRODUCTS } from "@/data/products";
import { SITE, type Locale } from "@/lib/site";

type Bi = { en: string; ar: string };
interface Entry { title: Bi; description: Bi }

const HOME: Entry = {
  title: { en: "DIWAN ديوان | Coffee for every culture", ar: "ديوان | قهوة لكل ثقافة" },
  description: { en: "Cairo coffee roastery. Nine blends: Turkish, espresso and flavored.", ar: "محمصة قهوة في القاهرة. تسع توليفات: تركي وإسبريسو ومنكهة." },
};

export const PAGES: Record<string, Entry> = {
  "": HOME,
  "/shop": {
    title: { en: "Our products", ar: "منتجاتنا" },
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
  "/checkout": { title: { en: "Checkout", ar: "إتمام الطلب" }, description: { en: "Place your order.", ar: "أكمل طلبك." } },
};

const PRIVATE = new Set(["/cart", "/checkout"]);

/** Title, description, canonical and per-language alternates for one page. */
export function pageMeta(lang: Locale, path: string): Metadata {
  const e = path.startsWith("/shop/")
    ? (() => {
        const p = PRODUCTS.find((x) => x.id === path.slice(6));
        return p ? { title: { en: p.nameEn, ar: p.name }, description: { en: p.copyEn.slice(0, 150), ar: p.copy.slice(0, 150) } } : null;
      })()
    : PAGES[path];
  if (!e) return {};
  const home = path === "";
  const product = path.startsWith("/shop/");
  return {
    title: home ? { absolute: e.title[lang] } : product ? { absolute: `${e.title[lang]} | DIWAN ديوان` } : e.title[lang],
    description: e.description[lang],
    alternates: {
      canonical: `/${lang}${path}`,
      languages: { en: `/en${path}`, ar: `/ar${path}`, "x-default": `/en${path}` },
    },
    openGraph: { title: e.title[lang], description: e.description[lang], locale: lang === "ar" ? "ar_EG" : "en_US", url: `/${lang}${path}`, images: ["/assets/diwan/Diwan_OpenGraph_Green_1200x630.png"] },
    robots: PRIVATE.has(path) ? { index: false, follow: false } : undefined,
  };
}

export const siteBase = new URL(SITE.baseUrl);
