import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { OrderError, createOrder } from "@/lib/server/orders";
import type { OrderRequest } from "@/lib/types";

/** An order typed in by hand (a phone call, a message). Priced from the catalog like any other. */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const data = await body<OrderRequest & { shippingPrice?: number }>(req);
  if (!data) return fail("Invalid request");
  try {
    const order = await createOrder(data, { source: "draft", manualShipping: Number(data.shippingPrice) || 0 });
    refreshStore();
    return json({ order });
  } catch (e) {
    if (e instanceof OrderError) return fail(e.message, e.status);
    console.error("manual order failed", e);
    return fail("Could not create the order.", 500);
  }
}
