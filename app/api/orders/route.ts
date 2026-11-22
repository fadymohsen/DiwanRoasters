import { after, type NextRequest } from "next/server";
import { sendOrderEmails } from "@/lib/server/email";
import { allow, body, clientIp, fail, guardOrigin, json, refreshStore } from "@/lib/server/api";
import { OrderError, createOrder } from "@/lib/server/orders";
import type { OrderRequest } from "@/lib/types";

/** The checkout. Prices, stock, promo code and delivery are all worked out here, never trusted from the browser. */
export async function POST(req: NextRequest) {
  const bad = guardOrigin(req);
  if (bad) return bad;
  const data = await body<OrderRequest>(req);
  if (!data) return fail("Invalid request");
  // a hidden field real visitors never fill
  if (data.website) return json({ ok: true });
  try {
    if (!(await allow(`order:${clientIp(req)}`, 8, 10 * 60_000))) return json({ error: "Too many orders from this connection. Please try again later.", errorAr: "طلبات كثيرة من هذا الاتصال. حاول لاحقاً." }, 429);
    const order = await createOrder(data, { source: "web" });
    refreshStore();
    // email after the response is sent, so a slow mail server never delays the checkout
    after(() => sendOrderEmails(order, data.lang === "ar" ? "ar" : "en"));
    return json({ order });
  } catch (e) {
    if (e instanceof OrderError) return json({ error: e.message, errorAr: e.ar }, e.status);
    console.error("order failed", e);
    return json({ error: "We could not place the order. Please try again or message us on WhatsApp.", errorAr: "تعذّر تأكيد الطلب. حاول مرة أخرى أو راسلنا على واتساب." }, 500);
  }
}
