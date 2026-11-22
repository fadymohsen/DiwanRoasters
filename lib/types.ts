/** Shapes shared by the storefront, the back office and the API. Plain data only: no runtime code. */

export interface Bi {
  ar: string;
  en: string;
}

/** Category ids are free text now: the owner adds categories in the back office. */
export type CategoryId = string;

export interface StoreCategory {
  id: CategoryId;
  name: Bi;
  blurb: Bi;
  image: string;
  sort: number;
  /** hidden categories (and their products) stay out of the shop */
  status: "active" | "hidden";
}

export interface CatalogVariant {
  key: string;
  label: Bi;
  sku: string;
  /** EGP per pack */
  price: number;
  /** Original price shown struck through, when set */
  compareAt: number | null;
  /** Unit cost, used for margin and stock value. Never sent to the storefront. */
  cost: number | null;
  /** null = not tracked */
  stock: number | null;
  /** Alert when stock falls to this number or below */
  threshold: number;
}

export type ProductStatus = "active" | "draft" | "archived";

/** Optional extras that drive the product page and the flip card. */
export interface ItemDetails {
  steps?: { ar: string[]; en: string[] };
  note?: Bi;
  /** coffee blend, e.g. 60 / 40 */
  ratio?: { arabica: number; robusta: number };
  type?: Bi;
  weight?: Bi;
  /** key of the line-art on the flip card; only used when showCard is on */
  illustration?: string;
  /** show the front and back of the DIWAN card next to the photos */
  showCard?: boolean;
}

export interface CatalogItem {
  id: string;
  name: Bi;
  description: Bi;
  categoryId: CategoryId;
  /** card / placeholder colour */
  hex: string;
  /** colour of the art and text on the card */
  art: string;
  /** main photo */
  image: string;
  /** every photo, the main one first */
  images: string[];
  status: ProductStatus;
  tags: string[];
  details: ItemDetails;
  variants: CatalogVariant[];
}

export type OrderStatus = "new" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";

export interface OrderLine {
  key: string;
  name: Bi;
  variant: Bi;
  qty: number;
  price: number;
}

export interface TimelineEvent {
  status: OrderStatus | "paid" | "note";
  at: number;
  note?: string;
}

export type DiscountType = "percent" | "fixed" | "shipping";

export interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  /** percent (1-100), or EGP off for "fixed"; ignored for free shipping */
  value: number;
  minSubtotal: number;
  /** null = unlimited */
  usageLimit: number | null;
  used: number;
  startsAt: number | null;
  endsAt: number | null;
  /** "all" or a category id */
  scope: "all" | CategoryId;
  active: boolean;
  note: string;
}

export interface ShippingRate {
  id: string;
  name: Bi;
  /** City names this rate covers (lowercase match). "*" covers everywhere else. */
  cities: string[];
  price: number;
  /** Free shipping at or above this subtotal. null = never free. */
  freeOver: number | null;
  eta: Bi;
  active: boolean;
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  whatsapp: string;
  supportEmail: string;
  orderPrefix: string;
}

export interface Refund {
  id: string;
  at: number;
  amount: number;
  reason: string;
  restocked: boolean;
}

export type PayMethod = "cod" | "instapay" | "wallet";

export interface Gift {
  name: string;
  phone: string;
  message: string;
}

export interface Order {
  id: string;
  createdAt: number;
  source: "web" | "draft";
  customer: { name: string; phone: string; email: string; address: string; city: string; notes: string };
  lines: OrderLine[];
  subtotal: number;
  discount: { code: string; amount: number } | null;
  shipping: { label: Bi; price: number } | null;
  total: number;
  refunds: Refund[];
  status: OrderStatus;
  payment: { method: PayMethod; paid: boolean };
  /** EGP taken off for paying by Instapay or wallet */
  payDiscount?: number;
  /** Set when the order is a gift: who receives it */
  gift?: Gift | null;
  tracking: { courier: string; number: string };
  /** Internal, never shown to the customer */
  internalNote: string;
  timeline: TimelineEvent[];
}

export type AdjustReason = "restock" | "correction" | "damaged" | "return" | "order";

export interface Adjustment {
  id: string;
  at: number;
  itemId: string;
  variantKey: string;
  delta: number;
  reason: AdjustReason;
  note: string;
}

export interface Message {
  id: string;
  createdAt: number;
  name: string;
  contact: string;
  topic: string;
  body: string;
  read: boolean;
}

/** What the storefront receives: no costs, no drafts, no promo codes. */
export interface PublicCatalog {
  items: CatalogItem[];
  categories: StoreCategory[];
  shippingRates: ShippingRate[];
  settings: StoreSettings;
}

/** What the back office receives after signing in. */
export interface AdminData extends PublicCatalog {
  orders: Order[];
  messages: Message[];
  adjustments: Adjustment[];
  discounts: Discount[];
}

/** One line of an order request. The server prices it from the database. */
export interface OrderRequestLine {
  key: string;
  qty: number;
}

export interface OrderRequest {
  customer: Order["customer"];
  lines: OrderRequestLine[];
  promo?: string;
  payMethod?: PayMethod;
  gift?: Gift | null;
  /** language of the confirmation email */
  lang?: "en" | "ar";
  /** honeypot: real visitors leave it empty */
  website?: string;
}
