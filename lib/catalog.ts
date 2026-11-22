import type { Product, Roast, Spice } from "@/data/products";
import type { Bi, CatalogItem, StoreCategory } from "@/lib/types";

const ROAST_BY_KEY: Record<string, Roast> = { light: "فاتح", medium: "وسط", dark: "غامق" };
const SPICE_BY_KEY: Record<string, Spice> = { plain: "سادة", spiced: "محوج" };
const ROAST_ORDER: Roast[] = ["فاتح", "وسط", "غامق"];

/** Name of a category in the current language, or a quiet fallback if it was removed. */
export function categoryName(categories: StoreCategory[], id: string, lang: "en" | "ar"): string {
  return categories.find((c) => c.id === id)?.name[lang] ?? id;
}

export function categoryLabel(categories: StoreCategory[], id: string): Bi {
  return categories.find((c) => c.id === id)?.name ?? { ar: id, en: id };
}

/**
 * Roast and style choices come from the variants themselves (keys like "dark-spiced"),
 * so the product page can never offer a combination that does not exist.
 */
export function roastMatrix(item: CatalogItem) {
  const pairs = item.variants.map((v) => v.key.match(/^(light|medium|dark)-(plain|spiced)$/));
  if (item.variants.length < 2 || pairs.some((p) => !p)) return null;
  const roasts = ROAST_ORDER.filter((r) => pairs.some((p) => ROAST_BY_KEY[p![1]] === r));
  const states = (["سادة", "محوج"] as Spice[]).filter((s) => pairs.some((p) => SPICE_BY_KEY[p![2]] === s));
  return { roasts, states };
}

/** Shape a catalog item the way the flip card expects. */
export function productFromItem(item: CatalogItem, categories: StoreCategory[]): Product {
  const d = item.details;
  const m = roastMatrix(item);
  const cat = categoryLabel(categories, item.categoryId);
  const ratio = d.ratio
    ? {
        arabica: d.ratio.arabica,
        robusta: d.ratio.robusta,
        label: d.ratio.robusta === 0 ? `${d.ratio.arabica}% أرابيكا` : `${d.ratio.arabica}% أرابيكا · ${d.ratio.robusta}% روبوستا`,
        labelEn: d.ratio.robusta === 0 ? `${d.ratio.arabica}% Arabica` : `${d.ratio.arabica}% Arabica · ${d.ratio.robusta}% Robusta`,
      }
    : undefined;
  return {
    id: item.id,
    name: item.name.ar,
    nameEn: item.name.en,
    category: cat.ar,
    categoryId: item.categoryId,
    hex: item.hex,
    art: item.art,
    copy: item.description.ar,
    copyEn: item.description.en,
    weight: d.weight?.ar ?? "200 جم",
    weightEn: d.weight?.en ?? "200 g",
    roasts: m?.roasts,
    states: m?.states,
    ratio,
    type: d.type?.ar,
    typeEn: d.type?.en,
    steps: d.steps?.ar ?? [],
    stepsEn: d.steps?.en ?? [],
    note: d.note?.ar,
    noteEn: d.note?.en,
    illustration: d.illustration ?? "clink",
    image: item.image,
    variants: item.variants.map((v) => ({ key: v.key, label: v.label, price: v.price })),
  };
}

export const minPrice = (item: CatalogItem) => Math.min(...item.variants.map((v) => v.price));
