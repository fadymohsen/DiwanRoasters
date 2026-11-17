import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "ar"];
const COOKIE = "diwan-lang";

function pickLang(req: NextRequest) {
  const link = req.nextUrl.searchParams.get("lang");
  if (link && LOCALES.includes(link)) return link;
  const saved = req.cookies.get(COOKIE)?.value;
  if (saved && LOCALES.includes(saved)) return saved;
  const tags = (req.headers.get("accept-language") ?? "").split(",").map((t) => t.trim().toLowerCase().split(";")[0]);
  const first = tags.find((t) => t.startsWith("ar") || t.startsWith("en"));
  return first?.startsWith("ar") ? "ar" : "en";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const url = req.nextUrl.clone();
  url.searchParams.delete("lang");
  url.pathname = `/${pickLang(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // everything except the back office, Next internals and files with an extension (images, icons, video)
  matcher: ["/((?!_next|admin|api|.*\\..*).*)"],
};
