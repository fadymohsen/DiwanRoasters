import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { tx } from "@/lib/server/db";
import { toOrder } from "@/lib/server/catalog";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["new", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

type Patch =
  | { action: "status"; status: OrderStatus; note?: string }
  | { action: "paid"; paid: boolean }
  | { action: "update"; tracking?: { courier: string; number: string }; internalNote?: string }
  | { action: "refund"; amount: number; reason?: string; restock?: boolean };

/** One change to one order. Each runs on the saved order, so two people editing never overwrite each other's work. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const p = await body<Patch>(req);
  if (!p) return fail("Invalid request");
  try {
    const order = await tx(async (c) => {
      const found = (await c.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!found) throw new Error("Order not found.");
      const now = Date.now();
      const timeline = found.timeline as unknown[];

      if (p.action === "status") {
        if (!STATUSES.includes(p.status)) throw new Error("Unknown status.");
        timeline.push({ status: p.status, at: now, ...(p.note ? { note: s(p.note, 300) } : {}) });
        await c.query("UPDATE orders SET status = $2, timeline = $3 WHERE id = $1", [id, p.status, JSON.stringify(timeline)]);
      } else if (p.action === "paid") {
        if (p.paid) timeline.push({ status: "paid", at: now });
        await c.query("UPDATE orders SET paid = $2, timeline = $3 WHERE id = $1", [id, !!p.paid, JSON.stringify(timeline)]);
      } else if (p.action === "update") {
        const tracking = p.tracking ? { courier: s(p.tracking.courier, 80), number: s(p.tracking.number, 80) } : found.tracking;
        const note = p.internalNote !== undefined ? s(p.internalNote, 2000) : found.internal_note;
        await c.query("UPDATE orders SET tracking = $2, internal_note = $3 WHERE id = $1", [id, JSON.stringify(tracking), note]);
      } else if (p.action === "refund") {
        const amount = Math.round(Number(p.amount));
        const paidSoFar = (found.refunds as { amount: number }[]).reduce((a, r) => a + r.amount, 0);
        if (!(amount > 0) || amount + paidSoFar > found.total) throw new Error("That refund is more than the order total.");
        const reason = s(p.reason, 300);
        const refunds = [...found.refunds, { id: uid("RF"), at: now, amount, reason, restocked: !!p.restock }];
        timeline.push({ status: "note", at: now, note: `Refund ${amount} EGP${reason ? ": " + reason : ""}` });
        if (p.restock) {
          for (const l of found.lines as { key: string; qty: number }[]) {
            const i = l.key.indexOf(":");
            const [pid, vk] = [l.key.slice(0, i), l.key.slice(i + 1)];
            const r = await c.query("UPDATE variants SET stock = stock + $3 WHERE product_id = $1 AND key = $2 AND stock IS NOT NULL", [pid, vk, l.qty]);
            if (r.rowCount) await c.query("INSERT INTO adjustments (id, at, product_id, variant_key, delta, reason, note) VALUES ($1,$2,$3,$4,$5,'return',$6)", [uid("ADJ"), now, pid, vk, l.qty, id]);
          }
        }
        await c.query("UPDATE orders SET refunds = $2, timeline = $3 WHERE id = $1", [id, JSON.stringify(refunds), JSON.stringify(timeline)]);
      } else {
        throw new Error("Unknown action.");
      }
      return toOrder((await c.query("SELECT * FROM orders WHERE id = $1", [id])).rows[0]);
    });
    refreshStore();
    return json({ order });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not update the order.", 400);
  }
}
