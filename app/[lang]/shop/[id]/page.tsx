import { Suspense } from "react";
import type { Metadata } from "next";
import { PRODUCTS } from "@/data/products";
import ProductView from "@/components/shop/ProductView";
import { pageMeta } from "@/lib/meta";
import { LOCALES, hasLocale } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => PRODUCTS.map((p) => ({ lang, id: p.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params;
  return hasLocale(lang) ? pageMeta(lang, `/shop/${id}`) : {};
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
