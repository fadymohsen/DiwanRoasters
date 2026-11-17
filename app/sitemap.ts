import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/products";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/shop", "/our-story", "/contact", ...PRODUCTS.map((p) => `/shop/${p.id}`)];
  return paths.flatMap((p) =>
    (["en", "ar"] as const).map((l) => ({
      url: `${SITE.baseUrl}/${l}${p}`,
      alternates: { languages: { en: `${SITE.baseUrl}/en${p}`, ar: `${SITE.baseUrl}/ar${p}` } },
    })),
  );
}
