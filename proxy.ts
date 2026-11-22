import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/server/auth";

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

/** Back office: nothing opens without a valid session, except the sign-in page and its endpoint. */
async function guardAdmin(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/login" || pathname === "/api/admin/logout" || signedIn) return NextResponse.next();
    return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (pathname === "/admin/login") {
    // already in: go to the dashboard
    return signedIn ? NextResponse.redirect(new URL("/admin", req.url)) : NextResponse.next();
  }
  if (signedIn) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) return guardAdmin(req);

  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const url = req.nextUrl.clone();
  url.searchParams.delete("lang");
  url.pathname = `/${pickLang(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // the storefront (not Next internals, public APIs or files with an extension) plus the back office and its API
  matcher: ["/((?!_next|admin|api|.*\..*).*)", "/admin", "/admin/:path*", "/api/admin/:path*"],
};
