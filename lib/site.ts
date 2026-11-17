/** One place for contact details and offers. Edit here and the whole site follows. */
export const SITE = {
  /** shown as written; also the number the WhatsApp button opens */
  phone: "01002745122",
  /** international format without + or 0, as wa.me expects */
  whatsapp: "201002745122",
  facebook: "https://www.facebook.com/share/1CTepQxyv2/",
  instagram: "https://instagram.com/diwan_eg",
  tiktok: "https://tiktok.com/@diwan_eg",
  /** Instapay address and wallet number to show at checkout. While empty, customers are told the details arrive on WhatsApp. */
  instapay: "",
  wallet: "01002745122",
  /** extra discount for paying by Instapay or wallet, in percent */
  payDiscountPct: 5,
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const waLink = (text?: string) => `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const hasLocale = (l: string): l is Locale => (LOCALES as readonly string[]).includes(l);
export const LANG_COOKIE = "diwan-lang";
