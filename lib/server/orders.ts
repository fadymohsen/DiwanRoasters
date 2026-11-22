import { query, tx } from "@/lib/server/db";
import { toDiscount, toOrder, toRate } from "@/lib/server/catalog";
import { applyCode, findRate, shippingFor, type DiscountResult, type PriceLine } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import type { Discount, Order, OrderRequest, OrderRequestLine, PayMethod } from "@/lib/types";

export class OrderError extends Error {
  /** `message` is English; `ar` is what Arabic visitors see */
  constructor(message: string, readonly status = 400, readonly ar?: string) {
    super(message);
  }
}

type Q = <T = Record<string, any>>(text: string, params?: unknown[]) => Promise<T[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface PricedLine extends PriceLine {
  key: string;
  productId: string;
  variantKey: string;
  stock: number | null;
  name: { ar: string; en: string };
  variantLabel: { ar: string; en: string };
}

/** Merge repeated keys and drop nonsense quantities. */
function cleanLines(lines: OrderRequestLine[]) {
  const map = new Map<string, number>();
  for (const l of Array.isArray(lines) ? lines : []) {
    const qty = Math.floor(Number(l?.qty));
    if (typeof l?.key !== "string" || !l.key.includes(":") || !(qty >= 1)) continue;
    map.set(l.key, Math.min(99, (map.get(l.key) ?? 0) + qty));
  }
  return [...map].map(([key, qty]) => ({ key, qty }));
}

async function priceLines(q: Q, raw: OrderRequestLine[], opts: { lock: boolean; allowDraftProducts: boolean }) {
  const lines = cleanLines(raw);
  if (lines.length === 0) throw new OrderError("Your bag is empty.", 400, "السلة فارغة.");
  const out: PricedLine[] = [];
  for (const { key, qty } of lines) {
    const i = key.indexOf(":");
    const [productId, variantKey] = [key.slice(0, i), key.slice(i + 1)];
    const rows = await q(
      `SELECT p.name_ar, p.name_en, p.category_id, p.status, c.status AS category_status, v.label_ar, v.label_en, v.price, v.stock
       FROM variants v JOIN products p ON p.id = v.product_id JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND v.key = $2 ${opts.lock ? "FOR UPDATE OF v" : ""}`,
      [productId, variantKey],
    );
    const r = rows[0];
    const live = r && (opts.allowDraftProducts ? r.status !== "archived" : r.status === "active" && r.category_status === "active");
    if (!live) throw new OrderError("One of the items in your bag is no longer available.", 409, "أحد المنتجات في سلتك لم يعد متوفراً.");
    const name = { ar: r.name_ar as string, en: r.name_en as string };
    if (r.stock !== null && qty > r.stock) {
      throw new OrderError(r.stock === 0 ? `${name.en} is out of stock.` : `Only ${r.stock} of ${name.en} left.`, 409, r.stock === 0 ? `${name.ar} غير متوفر حالياً.` : `المتبقي من ${name.ar} ${r.stock} فقط.`);
    }
    out.push({
      key, qty, productId, variantKey, stock: r.stock, name,
      variantLabel: { ar: r.label_ar, en: r.label_en },
      item: { categoryId: r.category_id },
      variant: { price: r.price },
    });
  }
  return out;
}

/** What a promo code does to this bag. Read-only: nothing is reserved or counted. */
export async function quotePromo(raw: OrderRequestLine[], code: string): Promise<DiscountResult> {
  const q: Q = (t, p) => query(t, p) as Promise<any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
  let lines: PricedLine[];
  try {
    lines = await priceLines(q, raw, { lock: false, allowDraftProducts: false });
  } catch {
    return { ok: false, amount: 0, freeShipping: false, error: { en: "Some items in your bag are not available.", ar: "بعض المنتجات في سلتك غير متوفرة." } };
  }
  const subtotal = lines.reduce((a, l) => a + l.qty * l.variant.price, 0);
  const found = (await q("SELECT * FROM discounts WHERE lower(code) = lower($1)", [code.trim()])).map(toDiscount);
  const r = applyCode(code, lines, subtotal, found, Date.now());
  // the client only needs the numbers, not the rule set
  return { ok: r.ok, amount: r.amount, freeShipping: r.freeShipping, error: r.error };
}

interface CreateOpts {
  source: "web" | "draft";
  /** back office only: a hand-typed delivery fee instead of the rate table */
  manualShipping?: number;
}

const digits = (s: string) => s.replace(/\D/g, "");

export function validateCustomer(c: OrderRequest["customer"]) {
  const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const customer = { name: t(c?.name, 120), phone: t(c?.phone, 30), email: t(c?.email, 160), address: t(c?.address, 300), city: t(c?.city, 80), notes: t(c?.notes, 600) };
  const d = digits(customer.phone).length;
  if (customer.name.length < 2) throw new OrderError("Enter your name.", 400, "اكتب اسمك.");
  if (d < 10 || d > 15) throw new OrderError("Enter a phone number we can reach.", 400, "اكتب رقم هاتف نستطيع الاتصال بك عليه.");
  if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) throw new OrderError("That email does not look right.", 400, "تأكد من كتابة البريد الإلكتروني بشكل صحيح.");
  return customer;
}

/** Price the bag from the database, take stock, count the promo code and save the order, all or nothing. */
export async function createOrder(req: OrderRequest, opts: CreateOpts): Promise<Order> {
  const customer = validateCustomer(req.customer);
  if (opts.source === "web") {
    if (customer.city.length < 2) throw new OrderError("Enter your city.", 400, "اكتب مدينتك.");
    if (customer.address.length < 6) throw new OrderError("Enter your street and building.", 400, "اكتب الشارع ورقم العقار.");
  }
  const payMethod: PayMethod = req.payMethod === "wallet" || req.payMethod === "instapay" ? req.payMethod : "cod";
  const gift = req.gift && req.gift.name?.trim()
    ? { name: String(req.gift.name).trim().slice(0, 120), phone: String(req.gift.phone ?? "").trim().slice(0, 30), message: String(req.gift.message ?? "").trim().slice(0, 400) }
    : null;
  if (gift && (digits(gift.phone).length < 10 || digits(gift.phone).length > 15)) throw new OrderError("Enter the receiver's phone.", 400, "اكتب رقم هاتف المُستلِم.");

  return tx(async (c) => {
    const q: Q = async (t, p) => (await c.query(t, p)).rows;
    const lines = await priceLines(q, req.lines, { lock: true, allowDraftProducts: opts.source === "draft" });
    const subtotal = lines.reduce((a, l) => a + l.qty * l.variant.price, 0);

    let discount: Order["discount"] = null;
    let freeShipping = false;
    let used: Discount | undefined;
    const code = (req.promo ?? "").trim();
    if (code && opts.source === "web") {
      const found = (await q("SELECT * FROM discounts WHERE lower(code) = lower($1) FOR UPDATE", [code])).map(toDiscount);
      const r = applyCode(code, lines, subtotal, found, Date.now());
      if (!r.ok) throw new OrderError(r.error?.en ?? "This code is not valid.", 409, r.error?.ar);
      used = r.discount;
      freeShipping = r.freeShipping;
      discount = { code: code.toUpperCase(), amount: r.amount };
    }
    const after = subtotal - (discount?.amount ?? 0);

    let shipping: Order["shipping"] = null;
    if (opts.manualShipping && opts.manualShipping > 0) {
      shipping = { label: { en: "Manual", ar: "يدوي" }, price: Math.round(opts.manualShipping) };
    } else if (opts.source === "web") {
      const rates = (await q("SELECT * FROM shipping_rates WHERE active ORDER BY sort")).map(toRate);
      const s = shippingFor(findRate(rates, customer.city), after, freeShipping);
      if (s) shipping = { label: s.rate.name, price: s.price };
    }
    const payDiscount = payMethod === "cod" ? 0 : Math.round((after * SITE.payDiscountPct) / 100);
    const total = after - payDiscount + (shipping?.price ?? 0);

    const now = Date.now();
    const log: Order["timeline"] = [{ status: "new", at: now }];
    const prefix = ((await q("SELECT value FROM settings WHERE key = 'store'"))[0]?.value?.orderPrefix as string | undefined) || "DW";
    const seq = (await q<{ n: number }>("SELECT nextval('order_seq')::int AS n"))[0].n;
    const id = `${prefix}-${seq}`;

    for (const l of lines) {
      if (l.stock === null) continue;
      await q("UPDATE variants SET stock = stock - $3 WHERE product_id = $1 AND key = $2", [l.productId, l.variantKey, l.qty]);
      await q("INSERT INTO adjustments (id, at, product_id, variant_key, delta, reason, note) VALUES ($1,$2,$3,$4,$5,'order',$6)", [uid("ADJ"), now, l.productId, l.variantKey, -l.qty, id]);
    }
    if (used) await q("UPDATE discounts SET used = used + 1 WHERE id = $1", [used.id]);

    const rows = await q(
      `INSERT INTO orders (id, created_at, source, status, customer, customer_phone, lines, subtotal, discount, shipping, total, pay_method, pay_discount, gift, timeline)
       VALUES ($1,$2,$3,'new',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        id, now, opts.source, JSON.stringify(customer), digits(customer.phone),
        JSON.stringify(lines.map((l) => ({ key: l.key, name: l.name, variant: l.variantLabel, qty: l.qty, price: l.variant.price }))),
        subtotal, discount && JSON.stringify(discount), shipping && JSON.stringify(shipping), total, payMethod, payDiscount, gift && JSON.stringify(gift), JSON.stringify(log),
      ],
    );
    return toOrder(rows[0]);
  });
}
