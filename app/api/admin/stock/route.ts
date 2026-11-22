import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { tx } from "@/lib/server/db";
import type { AdjustReason } from "@/lib/types";

const REASONS: AdjustReason[] = ["restock", "correction", "damaged", "return", "order"];
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

type Op =
  | { op: "adjust"; itemId: string; variantKey: string; delta: number; reason: AdjustReason; note?: string }
  | { op: "set"; itemId: string; variantKey: string; stock: number | null; note?: string }
  | { op: "threshold"; itemId: string; variantKey: string; threshold: number };

/** Stock changes, always against the number in the database and always logged. */
export async function POST(req: NextRequest) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const d = await body<Op>(req);
  if (!d || typeof d.itemId !== "string" || typeof d.variantKey !== "string") return fail("Invalid request");
  const note = "note" in d && typeof d.note === "string" ? d.note.slice(0, 300) : "";
  try {
    const stock = await tx(async (c) => {
      const row = (await c.query("SELECT stock FROM variants WHERE product_id = $1 AND key = $2 FOR UPDATE", [d.itemId, d.variantKey])).rows[0];
      if (!row) throw new Error("Variant not found.");
      const now = Date.now();
      if (d.op === "threshold") {
        await c.query("UPDATE variants SET threshold = $3 WHERE product_id = $1 AND key = $2", [d.itemId, d.variantKey, Math.max(0, Math.round(Number(d.threshold) || 0))]);
        return row.stock as number | null;
      }
      if (d.op === "adjust") {
        if (row.stock === null) throw new Error("Stock is not tracked for this variant.");
        const delta = Math.round(Number(d.delta));
        if (!delta || !REASONS.includes(d.reason)) throw new Error("Invalid adjustment.");
        const next = Math.max(0, row.stock + delta);
        await c.query("UPDATE variants SET stock = $3 WHERE product_id = $1 AND key = $2", [d.itemId, d.variantKey, next]);
        await c.query("INSERT INTO adjustments (id, at, product_id, variant_key, delta, reason, note) VALUES ($1,$2,$3,$4,$5,$6,$7)", [uid("ADJ"), now, d.itemId, d.variantKey, next - row.stock, d.reason, note]);
        return next;
      }
      if (d.op === "set") {
        const next = d.stock === null ? null : Math.max(0, Math.round(Number(d.stock)));
        await c.query("UPDATE variants SET stock = $3 WHERE product_id = $1 AND key = $2", [d.itemId, d.variantKey, next]);
        if (next !== null && row.stock !== null && next !== row.stock) {
          await c.query("INSERT INTO adjustments (id, at, product_id, variant_key, delta, reason, note) VALUES ($1,$2,$3,$4,$5,'correction',$6)", [uid("ADJ"), now, d.itemId, d.variantKey, next - row.stock, note]);
        }
        return next;
      }
      throw new Error("Unknown operation.");
    });
    refreshStore();
    return json({ stock });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not change the stock.", 400);
  }
}
