import { CATEGORY_IDS, CATEGORY_META, PRODUCTS } from "@/data/products";
import { SITE } from "@/lib/site";
import type { PublicCatalog } from "@/lib/types";

const sku = (id: string, key: string) => `DW-${id.toUpperCase().slice(0, 4)}-${key === "default" ? "200" : key.split("-").map((x) => x.slice(0, 3).toUpperCase()).join("")}`;

/** The launch catalog, built from the files in the repo. Shown only if the database cannot be reached. */
export function fallbackCatalog(): PublicCatalog {
  return {
    categories: CATEGORY_IDS.map((id, i) => ({
      id, name: CATEGORY_META[id].label, blurb: CATEGORY_META[id].blurb, image: PRODUCTS.find((p) => p.categoryId === id)?.image ?? "", sort: i, status: "active" as const,
    })),
    items: PRODUCTS.map((p) => ({
      id: p.id,
      name: { ar: p.name, en: p.nameEn },
      description: { ar: p.copy, en: p.copyEn },
      categoryId: p.categoryId,
      hex: p.hex,
      art: p.art,
      image: p.image,
      images: [p.image],
      status: "active" as const,
      tags: [],
      details: {
        steps: { ar: p.steps, en: p.stepsEn },
        weight: { ar: p.weight, en: p.weightEn },
        illustration: p.illustration,
        showCard: true,
        ...(p.note ? { note: { ar: p.note, en: p.noteEn ?? "" } } : {}),
        ...(p.ratio ? { ratio: { arabica: p.ratio.arabica, robusta: p.ratio.robusta } } : {}),
        ...(p.type ? { type: { ar: p.type, en: p.typeEn ?? "" } } : {}),
      },
      variants: p.variants.map((v) => ({ ...v, sku: sku(p.id, v.key), compareAt: null, cost: null, stock: null, threshold: 5 })),
    })),
    shippingRates: [],
    settings: { storeName: "DIWAN", phone: SITE.phone, whatsapp: SITE.phone, supportEmail: "", orderPrefix: "DW" },
  };
}
