import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/products";
import { getPublicCatalog } from "@/lib/server/catalog";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ids = await getPublicCatalog().then((c) => c.items.map((i) => i.id)).catch(() => PRODUCTS.map((p) => p.id));
  const paths = ["", "/shop", "/our-story", "/contact", ...ids.map((id) => `/shop/${id}`)];
  return paths.flatMap((p) =>
    (["en", "ar"] as const).map((l) => ({
      url: `${SITE.baseUrl}/${l}${p}`,
      alternates: { languages: { en: `${SITE.baseUrl}/en${p}`, ar: `${SITE.baseUrl}/ar${p}` } },
    })),
  );
}
