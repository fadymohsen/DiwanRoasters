// Creates the tables and, on an empty database, loads the nine launch products.
// Run:  node --env-file=.env scripts/db-setup.mjs
import pg from "pg";
import { SCHEMA_SQL } from "../lib/server/schema.ts";
import { PRODUCTS, CATEGORY_META, CATEGORY_IDS } from "../data/products.ts";
import { SITE } from "../lib/site.ts";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run with: node --env-file=.env scripts/db-setup.mjs");

const db = new pg.Client({ connectionString: url });
await db.connect();

const sku = (id, key) => `DW-${id.toUpperCase().slice(0, 4)}-${key === "default" ? "200" : key.split("-").map((x) => x.slice(0, 3).toUpperCase()).join("")}`;

try {
  await db.query(SCHEMA_SQL);
  console.log("schema ready");

  const have = (await db.query("SELECT count(*)::int AS n FROM products")).rows[0].n;
  if (have > 0) {
    console.log(`products table already has ${have} rows, seed skipped`);
  } else {
    const now = Date.now();
    await db.query("BEGIN");
    for (const [i, id] of CATEGORY_IDS.entries()) {
      const m = CATEGORY_META[id];
      const cover = PRODUCTS.find((p) => p.categoryId === id)?.image ?? "";
      await db.query(
        "INSERT INTO categories (id, name_ar, name_en, blurb_ar, blurb_en, image, sort, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'active') ON CONFLICT (id) DO NOTHING",
        [id, m.label.ar, m.label.en, m.blurb.ar, m.blurb.en, cover, i],
      );
    }
    for (const [i, p] of PRODUCTS.entries()) {
      const details = {
        steps: { ar: p.steps, en: p.stepsEn },
        weight: { ar: p.weight, en: p.weightEn },
        illustration: p.illustration,
        showCard: true,
        ...(p.note ? { note: { ar: p.note, en: p.noteEn } } : {}),
        ...(p.ratio ? { ratio: { arabica: p.ratio.arabica, robusta: p.ratio.robusta } } : {}),
        ...(p.type ? { type: { ar: p.type, en: p.typeEn } } : {}),
      };
      await db.query(
        `INSERT INTO products (id, name_ar, name_en, desc_ar, desc_en, category_id, hex, art, image, images, status, tags, details, sort, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active','[]',$11,$12,$13,$13)`,
        [p.id, p.name, p.nameEn, p.copy, p.copyEn, p.categoryId, p.hex, p.art, p.image, JSON.stringify([p.image]), JSON.stringify(details), i, now],
      );
      for (const [j, v] of p.variants.entries()) {
        await db.query(
          "INSERT INTO variants (product_id, key, label_ar, label_en, sku, price, threshold, sort) VALUES ($1,$2,$3,$4,$5,$6,5,$7)",
          [p.id, v.key, v.label.ar, v.label.en, sku(p.id, v.key), v.price, j],
        );
      }
    }
    await db.query("COMMIT");
    console.log(`seeded ${CATEGORY_IDS.length} categories and ${PRODUCTS.length} products`);
  }

  await db.query(
    "INSERT INTO settings (key, value) VALUES ('store', $1) ON CONFLICT (key) DO NOTHING",
    [JSON.stringify({ storeName: "DIWAN", phone: SITE.phone, whatsapp: SITE.phone, supportEmail: "", orderPrefix: "DW" })],
  );
  console.log("done");
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error(e);
  process.exitCode = 1;
} finally {
  await db.end();
}
