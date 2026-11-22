import type { NextRequest } from "next/server";
import { allow, body, clientIp, fail, guardOrigin, json } from "@/lib/server/api";
import { quotePromo } from "@/lib/server/orders";
import type { OrderRequestLine } from "@/lib/types";

/** Checks a promo code against a bag. Codes themselves are never sent to the browser. */
export async function POST(req: NextRequest) {
  const bad = guardOrigin(req);
  if (bad) return bad;
  const data = await body<{ code: string; lines: OrderRequestLine[] }>(req);
  if (!data || typeof data.code !== "string") return fail("Invalid request");
  try {
    if (!(await allow(`promo:${clientIp(req)}`, 40, 10 * 60_000))) return fail("Too many attempts. Please wait a moment.", 429);
    return json(await quotePromo(data.lines, data.code.slice(0, 40)));
  } catch (e) {
    console.error("promo failed", e);
    return fail("Could not check the code.", 500);
  }
}
