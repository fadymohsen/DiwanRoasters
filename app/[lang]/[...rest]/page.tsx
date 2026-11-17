import { notFound } from "next/navigation";
import { LOCALES } from "@/lib/site";

// one known path per language lets the 404 shell prerender; every other unknown address renders on request
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang, rest: ["not-found"] }));
}

export default function CatchAll() {
  notFound();
}
