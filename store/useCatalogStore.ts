"use client";

import { create } from "zustand";
import type {
  AdjustReason, Adjustment, AdminData, CatalogItem, CatalogVariant, Discount, Message, Order, OrderRequest, OrderStatus,
  PublicCatalog, ShippingRate, StoreCategory, StoreSettings,
} from "@/lib/types";
import { useToastStore } from "@/store/useToastStore";

// The types live in lib/types.ts so the server can use them too. They are re-exported here for the existing imports.
export type {
  AdjustReason, Adjustment, CatalogItem, CatalogVariant, Discount, DiscountType, Gift, Message, Order, OrderLine, OrderStatus, PayMethod,
  ProductStatus, Refund, ShippingRate, StoreCategory, StoreSettings, TimelineEvent,
} from "@/lib/types";

const EMPTY_SETTINGS: StoreSettings = { storeName: "DIWAN", phone: "", whatsapp: "", supportEmail: "", orderPrefix: "DW" };

/** Talk to the back-office API. A lapsed session sends you back to the sign-in page. */
export async function adminApi<T = unknown>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/admin/login";
    throw new Error("Signed out");
  }
  const out = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(out.error || `Request failed (${res.status})`);
  return out as T;
}

interface CatalogState {
  items: CatalogItem[];
  categories: StoreCategory[];
  orders: Order[];
  messages: Message[];
  adjustments: Adjustment[];
  discounts: Discount[];
  shippingRates: ShippingRate[];
  settings: StoreSettings;
  /** the storefront catalog has arrived (or the built-in fallback is showing) */
  ready: boolean;
  /** the back-office data has arrived */
  adminReady: boolean;

  setPublic: (c: PublicCatalog) => void;
  loadAdmin: () => Promise<void>;

  upsertItem: (item: CatalogItem) => Promise<string | null>;
  deleteItem: (id: string) => Promise<string | null>;
  setVariant: (id: string, key: string, patch: Partial<CatalogVariant>) => void;
  adjustStock: (id: string, key: string, delta: number, reason: AdjustReason, note?: string) => Promise<string | null>;
  setStock: (id: string, key: string, stock: number | null, note?: string) => void;
  upsertCategory: (c: StoreCategory) => Promise<string | null>;
  deleteCategory: (id: string) => Promise<string | null>;
  upsertDiscount: (d: Discount) => Promise<string | null>;
  deleteDiscount: (id: string) => Promise<string | null>;
  upsertRate: (r: ShippingRate) => Promise<string | null>;
  deleteRate: (id: string) => Promise<string | null>;
  updateSettings: (patch: Partial<StoreSettings>) => Promise<string | null>;
  refundOrder: (id: string, amount: number, reason: string, restock: boolean) => Promise<string | null>;
  markMessageRead: (id: string) => void;
  createOrder: (req: OrderRequest & { shippingPrice?: number }) => Promise<Order>;
  updateOrder: (id: string, patch: { tracking?: Order["tracking"]; internalNote?: string }) => Promise<string | null>;
  setOrderStatus: (id: string, status: OrderStatus, note?: string) => Promise<string | null>;
  setOrderPaid: (id: string, paid: boolean) => Promise<string | null>;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Run `fn` once the user stops typing for `ms`, one pending run per key. */
function later(key: string, ms: number, fn: () => void) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, ms));
}

export const useCatalogStore = create<CatalogState>()((set, get) => {
  /** Save to the server. On failure: say why, and reload the truth so the screen never lies. */
  const save = async (run: () => Promise<unknown>): Promise<string | null> => {
    try {
      await run();
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      useToastStore.getState().push(msg, "error");
      void get().loadAdmin();
      return msg;
    }
  };
  const replaceOrder = (o: Order) => set((s) => ({ orders: s.orders.map((x) => (x.id === o.id ? o : x)) }));
  const patchOrder = (id: string, body: unknown) =>
    save(async () => replaceOrder((await adminApi<{ order: Order }>("PATCH", `/api/admin/orders/${encodeURIComponent(id)}`, body)).order));

  return {
    items: [],
    categories: [],
    orders: [],
    messages: [],
    adjustments: [],
    discounts: [],
    shippingRates: [],
    settings: EMPTY_SETTINGS,
    ready: false,
    adminReady: false,

    setPublic: (c) => set({ items: c.items, categories: c.categories, shippingRates: c.shippingRates, settings: c.settings, ready: true }),

    loadAdmin: async () => {
      try {
        const d = await adminApi<AdminData>("GET", "/api/admin/data");
        set({ ...d, ready: true, adminReady: true });
      } catch (e) {
        useToastStore.getState().push(e instanceof Error ? e.message : "Could not load the data", "error");
      }
    },

    upsertItem: (item) => {
      set((s) => ({ items: s.items.some((i) => i.id === item.id) ? s.items.map((i) => (i.id === item.id ? item : i)) : [...s.items, item] }));
      return save(async () => {
        await adminApi("PUT", `/api/admin/products/${encodeURIComponent(item.id)}`, item);
        await get().loadAdmin();
      });
    },
    deleteItem: (id) => {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      return save(() => adminApi("DELETE", `/api/admin/products/${encodeURIComponent(id)}`));
    },

    setVariant: (id, key, patch) => {
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, variants: i.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) } : i)) }));
      if (patch.threshold !== undefined) {
        later(`th:${id}:${key}`, 600, () => void save(() => adminApi("POST", "/api/admin/stock", { op: "threshold", itemId: id, variantKey: key, threshold: patch.threshold })));
      }
    },
    adjustStock: (id, key, delta, reason, note = "") =>
      save(async () => {
        await adminApi("POST", "/api/admin/stock", { op: "adjust", itemId: id, variantKey: key, delta, reason, note });
        await get().loadAdmin();
      }),
    setStock: (id, key, stock, note = "") => {
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, variants: i.variants.map((v) => (v.key === key ? { ...v, stock } : v)) } : i)) }));
      later(`st:${id}:${key}`, 700, () =>
        void save(async () => {
          await adminApi("POST", "/api/admin/stock", { op: "set", itemId: id, variantKey: key, stock, note });
          await get().loadAdmin();
        }),
      );
    },

    upsertCategory: (c) => {
      set((s) => ({ categories: (s.categories.some((x) => x.id === c.id) ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c]).sort((a, b) => a.sort - b.sort) }));
      return save(() => adminApi("PUT", `/api/admin/categories/${encodeURIComponent(c.id)}`, c));
    },
    deleteCategory: (id) => {
      set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
      return save(() => adminApi("DELETE", `/api/admin/categories/${encodeURIComponent(id)}`));
    },

    upsertDiscount: (d) => {
      set((s) => ({ discounts: s.discounts.some((x) => x.id === d.id) ? s.discounts.map((x) => (x.id === d.id ? d : x)) : [d, ...s.discounts] }));
      return save(() => adminApi("PUT", `/api/admin/discounts/${encodeURIComponent(d.id)}`, d));
    },
    deleteDiscount: (id) => {
      set((s) => ({ discounts: s.discounts.filter((x) => x.id !== id) }));
      return save(() => adminApi("DELETE", `/api/admin/discounts/${encodeURIComponent(id)}`));
    },

    upsertRate: (r) => {
      set((s) => ({ shippingRates: s.shippingRates.some((x) => x.id === r.id) ? s.shippingRates.map((x) => (x.id === r.id ? r : x)) : [...s.shippingRates, r] }));
      return save(() => adminApi("PUT", `/api/admin/shipping/${encodeURIComponent(r.id)}`, r));
    },
    deleteRate: (id) => {
      set((s) => ({ shippingRates: s.shippingRates.filter((x) => x.id !== id) }));
      return save(() => adminApi("DELETE", `/api/admin/shipping/${encodeURIComponent(id)}`));
    },

    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }));
      return save(async () => set({ settings: (await adminApi<{ settings: StoreSettings }>("PUT", "/api/admin/settings", patch)).settings }));
    },

    refundOrder: (id, amount, reason, restock) =>
      save(async () => {
        await adminApi("PATCH", `/api/admin/orders/${encodeURIComponent(id)}`, { action: "refund", amount, reason, restock });
        await get().loadAdmin();
      }),

    markMessageRead: (id) => {
      set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) }));
      void save(() => adminApi("PATCH", `/api/admin/messages/${encodeURIComponent(id)}`, { read: true }));
    },

    createOrder: async (req) => {
      const { order } = await adminApi<{ order: Order }>("POST", "/api/admin/orders", req);
      set((s) => ({ orders: [order, ...s.orders] }));
      void get().loadAdmin();
      return order;
    },
    updateOrder: (id, patch) => {
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
      return patchOrder(id, { action: "update", ...patch });
    },
    setOrderStatus: (id, status, note) => {
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status, timeline: [...o.timeline, { status, at: Date.now(), note }] } : o)) }));
      return patchOrder(id, { action: "status", status, note });
    },
    setOrderPaid: (id, paid) => {
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, payment: { ...o.payment, paid } } : o)) }));
      return patchOrder(id, { action: "paid", paid });
    },
  };
});

export const lineKey = (productId: string, variantKey: string) => `${productId}:${variantKey}`;
export const isLive = (i: CatalogItem) => i.status === "active";

/** Resolve a cart line key to its catalog item and variant. */
export function resolveLine(items: CatalogItem[], key: string) {
  const i = key.indexOf(":");
  const [id, vk] = [key.slice(0, i), key.slice(i + 1)];
  const item = items.find((x) => x.id === id);
  const variant = item?.variants.find((v) => v.key === vk);
  return item && variant ? { item, variant } : null;
}

export const inStock = (v: CatalogVariant) => v.stock === null || v.stock > 0;
export const isLow = (v: CatalogVariant) => v.stock !== null && v.stock > 0 && v.stock <= v.threshold;
