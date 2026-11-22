import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { query } from "@/lib/server/db";
import type { ShippingRate } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const r = await body<ShippingRate>(req);
  if (!r || !s(r.name?.en, 80) && !s(r.name?.ar, 80)) return fail("Enter a name.");
  const cities = (Array.isArray(r.cities) ? r.cities : []).map((c) => s(c, 60)).filter(Boolean).slice(0, 100);
  try {
    const sort = (await query<{ n: number }>("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM shipping_rates"))[0].n;
    await query(
      `INSERT INTO shipping_rates (id, name_ar, name_en, cities, price, free_over, eta_ar, eta_en, active, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET name_ar=$2, name_en=$3, cities=$4, price=$5, free_over=$6, eta_ar=$7, eta_en=$8, active=$9`,
      [id, s(r.name.ar, 80), s(r.name.en, 80), JSON.stringify(cities), Math.max(0, n(r.price) ?? 0), n(r.freeOver), s(r.eta?.ar, 80), s(r.eta?.en, 80), !!r.active, sort],
    );
    refreshStore();
    return json({ ok: true });
  } catch (e) {
    console.error("save rate failed", e);
    return fail("Could not save the rate.", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  await query("DELETE FROM shipping_rates WHERE id = $1", [id]);
  refreshStore();
  return json({ ok: true });
}
