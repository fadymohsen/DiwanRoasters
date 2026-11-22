import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { query } from "@/lib/server/db";
import type { StoreCategory } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const c = await body<StoreCategory>(req);
  if (!c || !ID.test(id)) return fail("Invalid category");
  const name = { ar: s(c.name?.ar, 80), en: s(c.name?.en, 80) };
  if (!name.ar || !name.en) return fail("Enter the name in English and Arabic.");
  try {
    await query(
      `INSERT INTO categories (id, name_ar, name_en, blurb_ar, blurb_en, image, sort, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name_ar=$2, name_en=$3, blurb_ar=$4, blurb_en=$5, image=$6, sort=$7, status=$8`,
      [id, name.ar, name.en, s(c.blurb?.ar, 400), s(c.blurb?.en, 400), s(c.image, 600), Math.round(Number(c.sort) || 0), c.status === "hidden" ? "hidden" : "active"],
    );
    refreshStore();
    return json({ ok: true });
  } catch (e) {
    console.error("save category failed", e);
    return fail("Could not save the category.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const used = await query<{ n: number }>("SELECT count(*)::int AS n FROM products WHERE category_id = $1", [id]);
  if ((used[0]?.n ?? 0) > 0) return fail(`This category still has ${used[0].n} product(s). Move or delete them first.`, 409);
  await query("DELETE FROM categories WHERE id = $1", [id]);
  refreshStore();
  return json({ ok: true });
}
