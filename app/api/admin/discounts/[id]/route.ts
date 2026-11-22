import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json } from "@/lib/server/api";
import { query } from "@/lib/server/db";
import type { Discount } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const d = await body<Discount>(req);
  const code = s(d?.code, 40);
  if (!d || !code) return fail("Enter a code.");
  if (!["percent", "fixed", "shipping"].includes(d.type)) return fail("Unknown discount type.");
  try {
    await query(
      `INSERT INTO discounts (id, code, type, value, min_subtotal, usage_limit, used, starts_at, ends_at, scope, active, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET code=$2, type=$3, value=$4, min_subtotal=$5, usage_limit=$6, starts_at=$8, ends_at=$9, scope=$10, active=$11, note=$12`,
      [id, code, d.type, Math.max(0, n(d.value) ?? 0), Math.max(0, n(d.minSubtotal) ?? 0), n(d.usageLimit), Math.max(0, n(d.used) ?? 0), n(d.startsAt), n(d.endsAt), s(d.scope, 40) || "all", !!d.active, s(d.note, 300)],
    );
    return json({ ok: true });
  } catch (e) {
    const dup = e instanceof Error && e.message.includes("discounts_code_idx");
    return fail(dup ? "A code with this name already exists." : "Could not save the discount.", dup ? 409 : 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  await query("DELETE FROM discounts WHERE id = $1", [id]);
  return json({ ok: true });
}
