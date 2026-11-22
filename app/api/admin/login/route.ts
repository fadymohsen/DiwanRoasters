import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authConfigured, checkPassword, cookieOptions, createSession } from "@/lib/server/auth";
import { allow, body, clientIp, fail, guardOrigin } from "@/lib/server/api";

export async function POST(req: NextRequest) {
  const bad = guardOrigin(req);
  if (bad) return bad;
  if (!authConfigured()) return fail("Sign-in is not set up. Add ADMIN_PASSWORD and AUTH_SECRET to the environment.", 500);
  const data = await body<{ password: string }>(req);
  const ip = clientIp(req);
  try {
    // five wrong guesses per 15 minutes per address
    const key = `login:${ip}`;
    const ok = typeof data?.password === "string" && (await checkPassword(data.password));
    if (!ok) {
      if (!(await allow(key, 5, 15 * 60_000))) return fail("Too many attempts. Try again in 15 minutes.", 429);
      return fail("Wrong password.", 401);
    }
  } catch (e) {
    console.error("login check failed", e);
    return fail("Could not sign in right now.", 500);
  }
  const { token, maxAge } = await createSession();
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return res;
}
