"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, LOCALES } from "@/lib/site";

export type Lang = "en" | "ar";

interface LangValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangValue | null>(null);

const remember = (lang: Lang) => {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
};

/** The same address in another language: /en/shop becomes /ar/shop. */
export function swapLang(pathname: string, lang: Lang) {
  const rest = pathname.replace(new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`), "");
  return `/${lang}${rest === "/" ? "" : rest}`;
}

/** Storefront: the language comes from the address (/en or /ar), so every page has one URL per language. */
export function SiteLangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      remember(next);
      // read the address at click time, so rendering never depends on the path
      router.push(`${swapLang(window.location.pathname, next)}${window.location.search}${window.location.hash}`);
    },
    [lang, router],
  );
  const value = useMemo(() => ({ lang, setLang, toggle: () => setLang(lang === "en" ? "ar" : "en") }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Back office: no language in the address, the choice is remembered in the browser. */
export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("diwan-admin-lang"); } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem("diwan-admin-lang", next); } catch {}
  }, []);
  const value = useMemo(() => ({ lang, setLang, toggle: () => setLang(lang === "en" ? "ar" : "en") }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Selector hook, same shape as before so components read `useLangStore((s) => s.lang)`. */
export function useLangStore<T>(select: (s: LangValue) => T): T {
  const v = useContext(LangContext);
  if (!v) throw new Error("useLangStore needs a language provider above it");
  return select(v);
}
