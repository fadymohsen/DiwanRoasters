import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { SESSION_COOKIE, verifySession } from "@/lib/server/auth";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { query } from "@/lib/server/db";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const fail = (error: string, status = 400) => json({ error }, status);

/** Admin endpoints: signed in, and the request comes from our own site. Returns a response to send back when the check fails. */
export async function guardAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value))) return fail("Not signed in", 401);
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Bad origin", 403);
  }
  return null;
}

/** Public form posts: same-site only. */
export function guardOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Bad origin", 403);
  return null;
}

export async function body<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Storefront pages show the new data on the very next visit. */
export const refreshStore = () => revalidateTag(CATALOG_TAG, { expire: 0 });

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/** Allow `limit` hits per `windowMs` for a key. Counts the hit. */
export async function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM hits WHERE key = $1 AND at > $2", [key, now - windowMs]);
  if ((rows[0]?.n ?? 0) >= limit) return false;
  await query("INSERT INTO hits (key, at) VALUES ($1, $2)", [key, now]);
  if (Math.random() < 0.02) await query("DELETE FROM hits WHERE at < $1", [now - 86_400_000]);
  return true;
}
