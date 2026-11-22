import { Suspense } from "react";
import type { Metadata } from "next";
import { PRODUCTS } from "@/data/products";
import { getPublicCatalog } from "@/lib/server/catalog";
import ProductView from "@/components/shop/ProductView";
import { pageMeta } from "@/lib/meta";
import { LOCALES, hasLocale } from "@/lib/site";

export async function generateStaticParams() {
  const ids = await getPublicCatalog().then((c) => c.items.map((i) => i.id)).catch(() => PRODUCTS.map((p) => p.id));
  return LOCALES.flatMap((lang) => ids.map((id) => ({ lang, id })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const item = await getPublicCatalog().then((c) => c.items.find((i) => i.id === id)).catch(() => undefined);
  const entry = item ? { title: item.name, description: { en: item.description.en.slice(0, 150), ar: item.description.ar.slice(0, 150) } } : null;
  return pageMeta(lang, `/shop/${id}`, entry);
}

async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductView id={id} />;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main id="main" className="min-h-screen bg-sandy" aria-busy="true" />}>
      <Product params={params} />
    </Suspense>
  );
}
