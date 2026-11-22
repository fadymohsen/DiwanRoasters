import { cacheLife, cacheTag } from "next/cache";
import { query } from "@/lib/server/db";
import type {
  Adjustment, AdminData, CatalogItem, Discount, Message, Order, PublicCatalog, ShippingRate, StoreCategory, StoreSettings,
} from "@/lib/types";

export const CATALOG_TAG = "catalog";

const DEFAULT_SETTINGS: StoreSettings = { storeName: "DIWAN", phone: "", whatsapp: "", supportEmail: "", orderPrefix: "DW" };

/* ---------- row -> app shape ---------- */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const toCategory = (r: Row): StoreCategory => ({
  id: r.id,
  name: { ar: r.name_ar, en: r.name_en },
  blurb: { ar: r.blurb_ar, en: r.blurb_en },
  image: r.image,
  sort: r.sort,
  status: r.status,
});

export const toDiscount = (r: Row): Discount => ({
  id: r.id, code: r.code, type: r.type, value: r.value, minSubtotal: r.min_subtotal, usageLimit: r.usage_limit,
  used: r.used, startsAt: r.starts_at, endsAt: r.ends_at, scope: r.scope, active: r.active, note: r.note,
});

export const toRate = (r: Row): ShippingRate => ({
  id: r.id, name: { ar: r.name_ar, en: r.name_en }, cities: r.cities, price: r.price, freeOver: r.free_over,
  eta: { ar: r.eta_ar, en: r.eta_en }, active: r.active,
});

export const toOrder = (r: Row): Order => ({
  id: r.id, createdAt: r.created_at, source: r.source, customer: r.customer, lines: r.lines, subtotal: r.subtotal,
  discount: r.discount, shipping: r.shipping, total: r.total, refunds: r.refunds, status: r.status,
  payment: { method: r.pay_method, paid: r.paid }, payDiscount: r.pay_discount, gift: r.gift, tracking: r.tracking,
  internalNote: r.internal_note, timeline: r.timeline,
});

const toMessage = (r: Row): Message => ({ id: r.id, createdAt: r.created_at, name: r.name, contact: r.contact, topic: r.topic, body: r.body, read: r.read });

const toAdjustment = (r: Row): Adjustment => ({ id: r.id, at: r.at, itemId: r.product_id, variantKey: r.variant_key, delta: r.delta, reason: r.reason, note: r.note });

/* ---------- reads ---------- */

export async function readCategories(onlyActive = false) {
  const rows = await query(`SELECT * FROM categories ${onlyActive ? "WHERE status = 'active'" : ""} ORDER BY sort, name_en`);
  return rows.map(toCategory);
}

/** Products with their variants. The storefront version drops drafts, archived items, costs and thresholds. */
export async function readItems(forStore: boolean): Promise<CatalogItem[]> {
  const products = await query(
    forStore
      ? `SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id WHERE p.status = 'active' AND c.status = 'active' ORDER BY p.sort, p.created_at`
      : "SELECT * FROM products ORDER BY sort, created_at",
  );
  const variants = await query("SELECT * FROM variants ORDER BY sort, key");
  const byProduct = new Map<string, Row[]>();
  for (const v of variants) (byProduct.get(v.product_id) ?? byProduct.set(v.product_id, []).get(v.product_id)!).push(v);
  return products
    .map((p): CatalogItem => ({
      id: p.id,
      name: { ar: p.name_ar, en: p.name_en },
      description: { ar: p.desc_ar, en: p.desc_en },
      categoryId: p.category_id,
      hex: p.hex,
      art: p.art,
      image: p.image,
      images: p.images,
      status: p.status,
      tags: p.tags,
      details: p.details,
      variants: (byProduct.get(p.id) ?? []).map((v) => ({
        key: v.key,
        label: { ar: v.label_ar, en: v.label_en },
        sku: v.sku,
        price: v.price,
        compareAt: v.compare_at,
        cost: forStore ? null : v.cost,
        stock: v.stock,
        threshold: forStore ? 5 : v.threshold,
      })),
    }))
    .filter((i) => !forStore || i.variants.length > 0);
}

export async function readRates(onlyActive = false) {
  const rows = await query(`SELECT * FROM shipping_rates ${onlyActive ? "WHERE active" : ""} ORDER BY sort, name_en`);
  return rows.map(toRate);
}

export async function readSettings(): Promise<StoreSettings> {
  const rows = await query("SELECT value FROM settings WHERE key = 'store'");
  const s = { ...DEFAULT_SETTINGS, ...(rows[0]?.value ?? {}) };
  // the public contact email comes from .env unless the admin set one in Settings
  if (!s.supportEmail) s.supportEmail = (process.env.EMAIL ?? "").trim();
  return s;
}

export const readDiscounts = async () => (await query("SELECT * FROM discounts ORDER BY code")).map(toDiscount);

/** What visitors see. Cached, and refreshed whenever the back office changes anything. */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const [items, categories, shippingRates, settings] = await Promise.all([readItems(true), readCategories(true), readRates(true), readSettings()]);
  return { items, categories, shippingRates, settings };
}

/** Everything the back office needs. Never cached. */
export async function getAdminData(): Promise<AdminData> {
  const [items, categories, shippingRates, settings, orders, messages, adjustments, discounts] = await Promise.all([
    readItems(false),
    readCategories(false),
    readRates(false),
    readSettings(),
    query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 2000"),
    query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 500"),
    query("SELECT * FROM adjustments ORDER BY at DESC LIMIT 1000"),
    readDiscounts(),
  ]);
  return {
    items, categories, shippingRates, settings, discounts,
    orders: orders.map(toOrder),
    messages: messages.map(toMessage),
    adjustments: adjustments.map(toAdjustment),
  };
}
