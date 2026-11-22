import type { NextRequest } from "next/server";
import { body, fail, guardAdmin, json, refreshStore } from "@/lib/server/api";
import { tx } from "@/lib/server/db";
import type { CatalogItem, ItemDetails } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

function cleanDetails(d: ItemDetails | undefined): ItemDetails {
  const out: ItemDetails = {};
  const list = (a: unknown) => (Array.isArray(a) ? a.map((x) => s(x, 200)).filter(Boolean).slice(0, 20) : []);
  if (d?.steps && (list(d.steps.ar).length || list(d.steps.en).length)) out.steps = { ar: list(d.steps.ar), en: list(d.steps.en) };
  if (d?.note && (s(d.note.ar, 200) || s(d.note.en, 200))) out.note = { ar: s(d.note.ar, 200), en: s(d.note.en, 200) };
  if (d?.type && (s(d.type.ar, 120) || s(d.type.en, 120))) out.type = { ar: s(d.type.ar, 120), en: s(d.type.en, 120) };
  if (d?.weight && (s(d.weight.ar, 60) || s(d.weight.en, 60))) out.weight = { ar: s(d.weight.ar, 60), en: s(d.weight.en, 60) };
  if (d?.ratio) {
    const a = Number(d.ratio.arabica), r = Number(d.ratio.robusta);
    if (a >= 0 && r >= 0 && a + r > 0) out.ratio = { arabica: Math.round(a), robusta: Math.round(r) };
  }
  if (d?.illustration) out.illustration = s(d.illustration, 30);
  if (d?.showCard) out.showCard = true;
  return out;
}

/** Create or replace one product with all of its variants. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const it = await body<CatalogItem>(req);
  if (!it || !ID.test(id)) return fail("Invalid product");
  const name = { ar: s(it.name?.ar, 120), en: s(it.name?.en, 120) };
  if (!name.ar || !name.en) return fail("Enter the name in English and Arabic.");
  if (!Array.isArray(it.variants) || it.variants.length === 0 || it.variants.length > 60) return fail("A product needs at least one variant.");
  const variants = it.variants.map((v, i) => ({
    key: s(v.key, 60) || `v${i + 1}`,
    label: { ar: s(v.label?.ar, 80), en: s(v.label?.en, 80) },
    sku: s(v.sku, 60) || `DW-${id.toUpperCase().slice(0, 4)}-${i + 1}`,
    price: n(v.price) ?? 0,
    compareAt: n(v.compareAt),
    cost: n(v.cost),
    stock: n(v.stock) === null ? null : Math.max(0, n(v.stock)!),
    threshold: Math.max(0, n(v.threshold) ?? 5),
  }));
  if (variants.some((v) => v.price <= 0)) return fail("Every variant needs a price above zero.");
  if (variants.some((v) => v.compareAt !== null && v.compareAt <= v.price)) return fail("Compare-at price must be higher than the price.");
  if (new Set(variants.map((v) => v.key)).size !== variants.length) return fail("Variant keys must be unique.");
  const images = (Array.isArray(it.images) ? it.images : []).map((x) => s(x, 600)).filter(Boolean).slice(0, 12);
  const image = s(it.image, 600) || images[0] || "";
  if (image && !images.includes(image)) images.unshift(image);
  const status = ["active", "draft", "archived"].includes(it.status) ? it.status : "draft";
  const tags = (Array.isArray(it.tags) ? it.tags : []).map((t) => s(t, 40)).filter(Boolean).slice(0, 20);

  try {
    const result = await tx(async (c) => {
      const cat = await c.query("SELECT 1 FROM categories WHERE id = $1", [it.categoryId]);
      if (cat.rowCount === 0) throw new Error("Choose a category.");
      const now = Date.now();
      const exists = (await c.query("SELECT 1 FROM products WHERE id = $1", [id])).rowCount! > 0;
      const vals = [id, name.ar, name.en, s(it.description?.ar, 4000), s(it.description?.en, 4000), it.categoryId, HEX.test(it.hex) ? it.hex : "#0E3A33", HEX.test(it.art) ? it.art : "#F4ECDC", image, JSON.stringify(images), status, JSON.stringify(tags), JSON.stringify(cleanDetails(it.details)), now];
      if (exists) {
        await c.query(
          `UPDATE products SET name_ar=$2, name_en=$3, desc_ar=$4, desc_en=$5, category_id=$6, hex=$7, art=$8, image=$9, images=$10, status=$11, tags=$12, details=$13, updated_at=$14 WHERE id=$1`,
          vals,
        );
      } else {
        const sort = (await c.query("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM products")).rows[0].n;
        await c.query(
          `INSERT INTO products (id, name_ar, name_en, desc_ar, desc_en, category_id, hex, art, image, images, status, tags, details, created_at, updated_at, sort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15)`,
          [...vals, sort],
        );
      }
      const old = new Map((await c.query("SELECT key, stock FROM variants WHERE product_id = $1 FOR UPDATE", [id])).rows.map((r) => [r.key as string, r.stock as number | null]));
      const keep = variants.map((v) => v.key);
      await c.query("DELETE FROM variants WHERE product_id = $1 AND NOT (key = ANY($2::text[]))", [id, keep]);
      for (const [i, v] of variants.entries()) {
        await c.query(
          `INSERT INTO variants (product_id, key, label_ar, label_en, sku, price, compare_at, cost, stock, threshold, sort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (product_id, key) DO UPDATE SET label_ar=$3, label_en=$4, sku=$5, price=$6, compare_at=$7, cost=$8, stock=$9, threshold=$10, sort=$11`,
          [id, v.key, v.label.ar, v.label.en, v.sku, v.price, v.compareAt, v.cost, v.stock, v.threshold, i],
        );
        const before = old.get(v.key);
        if (v.stock !== null && before !== undefined && before !== null && before !== v.stock) {
          await c.query("INSERT INTO adjustments (id, at, product_id, variant_key, delta, reason, note) VALUES ($1,$2,$3,$4,$5,'correction','Edited on the product page')", [uid("ADJ"), now, id, v.key, v.stock - before]);
        }
      }
      return true;
    });
    refreshStore();
    return json({ ok: result });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not save the product.", 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await tx(async (c) => {
      await c.query("DELETE FROM products WHERE id = $1", [id]);
    });
    refreshStore();
    return json({ ok: true });
  } catch (e) {
    console.error("delete product failed", e);
    return fail("Could not delete the product.", 500);
  }
}
