import type { DiscountResult } from "@/lib/pricing";
import type { Order, OrderRequest, OrderRequestLine } from "@/lib/types";

/** A refusal from the server, with the message in both languages when it has one. */
export class ApiError extends Error {
  constructor(message: string, readonly ar?: string) {
    super(message);
  }
}

async function post<T>(url: string, data: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch {
    throw new Error("network");
  }
  const out = (await res.json().catch(() => ({}))) as { error?: string; errorAr?: string };
  if (!res.ok) throw new ApiError(out.error || "failed", out.errorAr);
  return out as T;
}

/** Place the order. The server prices it again from the database, so the totals shown here are a preview. */
export async function submitOrder(req: OrderRequest): Promise<Order> {
  return (await post<{ order: Order }>("/api/orders", req)).order;
}

export async function sendMessage(m: { name: string; contact: string; topic: string; body: string }) {
  await post("/api/messages", m);
}

export function checkPromo(code: string, lines: OrderRequestLine[]) {
  return post<Pick<DiscountResult, "ok" | "amount" | "freeShipping" | "error">>("/api/promo", { code, lines });
}
