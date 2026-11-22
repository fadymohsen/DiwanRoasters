"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "@/components/ui/LocLink";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import HeaderNav from "@/components/layout/HeaderNav";
import CartDrawer from "@/components/layout/CartDrawer";
import OrderSummary from "@/components/shop/OrderSummary";
import { LineSkeleton } from "@/components/shop/CartLines";
import { useBagReady, useCartLines } from "@/lib/cart";
import { useCatalogStore, type Order, type PayMethod } from "@/store/useCatalogStore";
import { useShopStore } from "@/store/useShopStore";
import { useLocalized } from "@/lib/i18n";
import { SplitText } from "@/components/ui/motion";
import { SITE, waLink } from "@/lib/site";
import { money } from "@/lib/format";
import { useLangStore } from "@/lib/i18n";

type Form = { name: string; phone: string; email: string; address: string; city: string; notes: string };
const EMPTY: Form = { name: "", phone: "", email: "", address: "", city: "", notes: "" };

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="block text-sm font-semibold text-green">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span id={`${id}-err`} role="alert" className="mt-1 block text-xs font-normal text-[#A8322F]">{error}</span>}
    </div>
  );
}

const inputCls = (bad: boolean) =>
  `mt-1.5 w-full rounded-xl border bg-n100 px-4 py-3 text-sm font-normal text-ink outline-none transition focus:ring-2 ${bad ? "border-[#A8322F] focus:ring-[#A8322F]/20" : "border-n300 focus:border-green focus:ring-green/20"}`;

export default function CheckoutPage() {
  const l = useLocalized();
  const { lines, subtotal, blocked, promo, discountAmount, shipping, total, payDiscount, payMethod } = useCartLines();
  const lang = useLangStore((s) => s.lang);
  const setPayMethod = useShopStore((s) => s.setPayMethod);
  const gift = useShopStore((s) => s.gift);
  const setGift = useShopStore((s) => s.setGift);
  const [giftTouched, setGiftTouched] = useState(false);
  const promoCode = useShopStore((s) => s.promo);
  const setShipCity = useShopStore((s) => s.setShipCity);
  const hydrated = useBagReady();
  const placeOrder = useCatalogStore((s) => s.placeOrder);
  const clearCart = useShopStore((s) => s.clearCart);

  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Order | null>(null);

  const digits = form.phone.replace(/\D/g, "");
  const errors: Partial<Record<keyof Form, string>> = {
    name: form.name.trim().length < 2 ? l({ en: "Enter your full name.", ar: "اكتب اسمك بالكامل." }) : undefined,
    phone: digits.length < 10 || digits.length > 15 ? l({ en: "Enter a phone number we can reach.", ar: "اكتب رقم هاتف يمكننا الاتصال بك عليه." }) : undefined,
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) ? l({ en: "That email does not look right.", ar: "تأكد من كتابة البريد الإلكتروني بشكل صحيح." }) : undefined,
    city: form.city.trim().length < 2 ? l({ en: "Enter your city.", ar: "اكتب مدينتك." }) : undefined,
    address: form.address.trim().length < 6 ? l({ en: "Enter your street and building.", ar: "اكتب الشارع ورقم العقار." }) : undefined,
  };
  const giftDigits = gift.phone.replace(/\D/g, "");
  const giftErrors = {
    name: gift.on && gift.name.trim().length < 2 ? l({ en: "Enter the receiver's name.", ar: "اكتب اسم المُستلِم." }) : undefined,
    phone: gift.on && (giftDigits.length < 10 || giftDigits.length > 15) ? l({ en: "Enter the receiver's phone so the courier can reach them.", ar: "اكتب رقم هاتف المُستلِم ليتواصل معه المندوب." }) : undefined,
  };
  const valid = !Object.values(errors).some(Boolean) && !Object.values(giftErrors).some(Boolean);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const blur = (k: keyof Form) => () => setTouched({ ...touched, [k]: true });
  const err = (k: keyof Form) => (touched[k] ? errors[k] : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true, city: true, address: true });
    setGiftTouched(true);
    if (!valid || blocked || lines.length === 0) {
      // send the keyboard to the first field that needs attention
      window.setTimeout(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      const order = placeOrder({
        customer: { ...form, name: form.name.trim() },
        lines: lines.map((x) => ({ key: x.key, name: x.item.name, variant: x.variant.label, qty: x.qty, price: x.variant.price })),
        subtotal,
        discount: promo?.ok && promoCode ? { code: promoCode.toUpperCase(), amount: discountAmount } : null,
        shipping: shipping ? { label: shipping.rate.name, price: shipping.price } : null,
        total,
        payMethod,
        payDiscount,
        gift: gift.on ? { name: gift.name.trim(), phone: gift.phone, message: gift.message.trim() } : null,
      });
      clearCart();
      setDone(order);
      setBusy(false);
      window.scrollTo({ top: 0 });
    }, 900);
  };

  return (
    <main id="main" className="page-in relative min-h-screen bg-sandy">
      <HeaderNav />
      <CartDrawer />

      <section className="mx-auto max-w-[1100px] px-5 pb-24 pt-32 md:px-10 md:pt-40">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green text-sandy"><Check className="h-8 w-8" /></span>
              <h1 className="mt-6 font-editorial text-4xl font-semibold text-green md:text-5xl">{l({ en: "Thank you, your order is in", ar: "وصلنا طلبك، شكراً لك" })}</h1>
              <p className="mt-4 text-n500">
                {l({ en: "Order", ar: "رقم الطلب" })} <bdi className="font-semibold text-green">{done.id}</bdi>.{" "}
                {l({ en: "We will call you on", ar: "سنتصل بك على" })} <bdi dir="ltr">{done.customer.phone}</bdi>{" "}
                {done.payment.method === "cod"
                  ? l({ en: "to confirm delivery. You pay in cash when it arrives.", ar: "لتأكيد موعد التوصيل. تدفع نقداً عند الاستلام." })
                  : l({ en: "to confirm delivery. Send the transfer receipt on WhatsApp and we start preparing your order.", ar: "لتأكيد موعد التوصيل. أرسل إيصال التحويل على واتساب لنبدأ تجهيز طلبك." })}
              </p>
              {done.gift && (
                <p className="mx-auto mt-4 max-w-md rounded-xl bg-green/10 px-4 py-3 text-sm text-green">
                  {l({ en: "This is a gift for", ar: "هذه هدية إلى" })} <strong>{done.gift.name}</strong>. {l({ en: "We will call them to arrange the delivery.", ar: "سنتصل بهم لترتيب التوصيل." })}
                </p>
              )}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {done.payment.method !== "cod" && (
                  <a href={waLink(l({ en: `Hello DIWAN, here is the transfer receipt for order ${done.id}.`, ar: `مرحباً ديوان، هذا إيصال التحويل للطلب ${done.id}.` }))} target="_blank" rel="noreferrer" className="btn btn-carnelian">
                    {l({ en: "Send the receipt on WhatsApp", ar: "أرسل الإيصال على واتساب" })}
                  </a>
                )}
                <Link href="/shop" className="btn btn-primary">{l({ en: "Keep shopping", ar: "متابعة التسوق" })}</Link>
                <Link href="/" className="btn btn-ghost">{l({ en: "Back home", ar: "الرئيسية" })}</Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SplitText as="h1" text={l({ en: "Checkout", ar: "إتمام الطلب" })} className="block font-editorial text-4xl font-semibold text-green md:text-6xl" />

              {!hydrated ? (
                <div className="mt-10 space-y-3"><LineSkeleton /><LineSkeleton /></div>
              ) : lines.length === 0 ? (
                <div className="mt-12 rounded-2xl border border-n200 bg-n100 px-6 py-16 text-center">
                  <p className="font-editorial text-2xl font-semibold text-green">{l({ en: "Your bag is empty", ar: "السلة فارغة" })}</p>
                  <Link href="/shop" className="btn btn-primary mt-5">{l({ en: "Browse the shop", ar: "تصفّح المتجر" })}</Link>
                </div>
              ) : (
                <form onSubmit={submit} noValidate aria-label={l({ en: "Checkout", ar: "إتمام الطلب" })} className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
                  <div className="space-y-10">
                    <fieldset>
                      <legend className="mb-4 font-editorial text-2xl font-semibold text-green">{l({ en: "Contact", ar: "بيانات التواصل" })}</legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="f-name" label={l({ en: "Full name", ar: "الاسم بالكامل" })} error={err("name")}>
                          <input value={form.name} onChange={set("name")} id="f-name" aria-invalid={!!err("name")} aria-describedby={err("name") ? "f-name-err" : undefined} onBlur={blur("name")} autoComplete="name" className={inputCls(!!err("name"))} />
                        </Field>
                        <Field id="f-phone" label={l({ en: "Phone", ar: "رقم الهاتف" })} error={err("phone")}>
                          <input value={form.phone} onChange={set("phone")} id="f-phone" aria-invalid={!!err("phone")} aria-describedby={err("phone") ? "f-phone-err" : undefined} onBlur={blur("phone")} type="tel" dir="ltr" autoComplete="tel" inputMode="tel" className={inputCls(!!err("phone"))} />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field id="f-email" label={l({ en: "Email (optional)", ar: "البريد الإلكتروني (اختياري)" })} error={err("email")}>
                            <input value={form.email} onChange={set("email")} id="f-email" aria-invalid={!!err("email")} aria-describedby={err("email") ? "f-email-err" : undefined} onBlur={blur("email")} type="email" dir="ltr" autoComplete="email" className={inputCls(!!err("email"))} />
                          </Field>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-4 font-editorial text-2xl font-semibold text-green">{l({ en: "Delivery", ar: "التوصيل" })}</legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field id="f-city" label={l({ en: "City", ar: "المدينة" })} error={err("city")}>
                          <input value={form.city} onChange={(e) => { set("city")(e); setShipCity(e.target.value); }} id="f-city" aria-invalid={!!err("city")} aria-describedby={err("city") ? "f-city-err" : undefined} onBlur={blur("city")} autoComplete="address-level2" className={inputCls(!!err("city"))} />
                        </Field>
                        <Field id="f-address" label={l({ en: "Street and building", ar: "الشارع والعقار" })} error={err("address")}>
                          <input value={form.address} onChange={set("address")} id="f-address" aria-invalid={!!err("address")} aria-describedby={err("address") ? "f-address-err" : undefined} onBlur={blur("address")} autoComplete="street-address" className={inputCls(!!err("address"))} />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field id="f-notes" label={l({ en: "Delivery notes (optional)", ar: "ملاحظات التوصيل (اختياري)" })}>
                            <textarea id="f-notes" rows={3} value={form.notes} onChange={set("notes")} className={inputCls(false)} />
                          </Field>
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="mb-1 font-editorial text-2xl font-semibold text-green">{l({ en: "Gift", ar: "هدية" })}</legend>
                      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-n300 bg-n100 p-4 transition has-[:checked]:border-green has-[:checked]:bg-green/5">
                        <input type="checkbox" checked={gift.on} onChange={(e) => setGift({ on: e.target.checked })} className="mt-1 h-4 w-4 accent-[#0E3A33]" />
                        <span>
                          <span className="block font-semibold text-green">{l({ en: "This order is a gift", ar: "هذا الطلب هدية" })}</span>
                          <span className="text-sm text-n500">{l({ en: "We deliver it to the person you name, and we call them to arrange it.", ar: "نوصله إلى الشخص الذي تكتب اسمه، ونتصل به لترتيب التوصيل." })}</span>
                        </span>
                      </label>
                      {gift.on && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field id="g-name" label={l({ en: "Receiver's name", ar: "اسم المُستلِم" })} error={giftTouched ? giftErrors.name : undefined}>
                            <input id="g-name" value={gift.name} onChange={(e) => setGift({ name: e.target.value })} aria-invalid={!!(giftTouched && giftErrors.name)} aria-describedby={giftTouched && giftErrors.name ? "g-name-err" : undefined} className={inputCls(!!(giftTouched && giftErrors.name))} />
                          </Field>
                          <Field id="g-phone" label={l({ en: "Receiver's phone", ar: "هاتف المُستلِم" })} error={giftTouched ? giftErrors.phone : undefined}>
                            <input id="g-phone" value={gift.phone} onChange={(e) => setGift({ phone: e.target.value })} type="tel" dir="ltr" inputMode="tel" aria-invalid={!!(giftTouched && giftErrors.phone)} aria-describedby={giftTouched && giftErrors.phone ? "g-phone-err" : undefined} className={inputCls(!!(giftTouched && giftErrors.phone))} />
                          </Field>
                          <div className="sm:col-span-2">
                            <Field id="g-msg" label={l({ en: "Message on the card (optional)", ar: "رسالة على الكارت (اختياري)" })}>
                              <textarea id="g-msg" rows={2} value={gift.message} onChange={(e) => setGift({ message: e.target.value })} className={inputCls(false)} />
                            </Field>
                          </div>
                        </div>
                      )}
                    </fieldset>

                    <fieldset>
                      <legend className="mb-4 font-editorial text-2xl font-semibold text-green">{l({ en: "Payment", ar: "الدفع" })}</legend>
                      <div className="space-y-3">
                        {([
                          { id: "cod", t: { en: "Cash on delivery", ar: "الدفع عند الاستلام" }, d: { en: "Pay the courier when your order arrives.", ar: "تدفع للمندوب عند وصول الطلب." }, off: false },
                          { id: "wallet", t: { en: "Mobile wallet", ar: "محفظة إلكترونية" }, d: { en: "Transfer from a mobile wallet.", ar: "حوّل من محفظة إلكترونية." }, off: true },
                        ] as { id: PayMethod; t: { en: string; ar: string }; d: { en: string; ar: string }; off: boolean }[]).map((m) => (
                          <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-n100 p-4 transition ${payMethod === m.id ? "border-green" : "border-n300 hover:border-green/50"}`}>
                            <input type="radio" name="pay" checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} className="mt-1 h-4 w-4 accent-[#0E3A33]" />
                            <span className="flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-green">{l(m.t)}</span>
                                {m.off && <span className="rounded-full bg-[#2E6B4F] px-2.5 py-0.5 text-[11px] font-semibold text-sandy">{l({ en: `${SITE.payDiscountPct}% extra off`, ar: `خصم إضافي ${SITE.payDiscountPct}%` })}</span>}
                              </span>
                              <span className="text-sm text-n500">{l(m.d)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {payMethod !== "cod" && (
                        <div className="mt-4 rounded-xl bg-green/10 p-4 text-sm leading-relaxed text-green" aria-live="polite">
                          {(payMethod === "instapay" ? SITE.instapay : SITE.wallet) ? (
                            <p>
                              {payMethod === "instapay" ? l({ en: "Instapay address:", ar: "عنوان إنستاباي:" }) : l({ en: "Wallet number:", ar: "رقم المحفظة:" })}{" "}
                              <bdi dir="ltr" className="font-semibold">{payMethod === "instapay" ? SITE.instapay : SITE.wallet}</bdi>
                            </p>
                          ) : (
                            <p>{l({ en: "After you place the order we send you the payment details on WhatsApp.", ar: "بعد تأكيد الطلب نرسل لك بيانات الدفع على واتساب." })}</p>
                          )}
                          <p className="mt-1">{l({ en: `Your ${SITE.payDiscountPct}% discount (${money(payDiscount, lang)}) is already in the total. Send us the transfer receipt on WhatsApp and we start preparing your order.`, ar: `خصم ${SITE.payDiscountPct}% (${money(payDiscount, lang)}) محسوب في الإجمالي. أرسل لنا إيصال التحويل على واتساب لنبدأ تجهيز طلبك.` })}</p>
                        </div>
                      )}
                    </fieldset>
                  </div>

                  <aside className="h-fit rounded-2xl border border-n200 bg-n100 p-6 lg:sticky lg:top-28">
                    <h2 className="mb-4 font-editorial text-2xl font-semibold text-green">{l({ en: "Your order", ar: "طلبك" })}</h2>
                    <OrderSummary showItems />
                    {blocked && <p role="alert" className="mt-3 text-xs text-[#A8322F]">{l({ en: "Some items are unavailable. Review your bag.", ar: "بعض المنتجات لم تعد متوفرة. راجع سلتك." })}</p>}
                    <button type="submit" disabled={busy || blocked} className="btn btn-primary mt-5 w-full disabled:opacity-60">
                      {busy ? (<><Loader2 className="h-4 w-4 animate-spin" />{l({ en: "Placing order", ar: "جارٍ تأكيد الطلب" })}</>) : l({ en: "Place order", ar: "تأكيد الطلب" })}
                    </button>
                    <Link href="/cart" className="mt-3 block text-center text-sm font-medium text-green hover:underline">{l({ en: "Edit bag", ar: "تعديل السلة" })}</Link>
                  </aside>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
