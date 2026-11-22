import { Resend } from "resend";
import { SITE } from "@/lib/site";
import type { Order, PayMethod } from "@/lib/types";

/** Where store mail goes to, and the address customers see it come from. Set `EMAIL` in .env. */
export const storeEmail = () => (process.env.EMAIL ?? "").trim();
const fromAddress = () => (process.env.RESEND_FROM ?? "").trim() || `DIWAN <${storeEmail()}>`;

let client: Resend | null = null;
const resend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return (client ??= new Resend(key));
};

type Lang = "en" | "ar";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const egp = (n: number, lang: Lang) => (lang === "ar" ? `${n} ج.م` : `EGP ${n}`);

async function send(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const r = resend();
  if (!r || !storeEmail()) {
    console.warn("email skipped: RESEND_API_KEY or EMAIL is not set");
    return;
  }
  try {
    const { error } = await r.emails.send({ from: fromAddress(), to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
    if (error) console.error("resend error", error);
  } catch (e) {
    console.error("resend failed", e);
  }
}

const PAY: Record<PayMethod, { en: string; ar: string }> = {
  cod: { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
  instapay: { en: "Instapay", ar: "إنستاباي" },
  wallet: { en: "Mobile wallet", ar: "محفظة إلكترونية" },
};

function shell(lang: Lang, inner: string) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><body style="margin:0;background:#F4ECDC;padding:24px;font-family:Arial,Tahoma,sans-serif;color:#16211E">
<div dir="${dir}" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
<div style="background:#0E3A33;color:#F4ECDC;padding:20px 28px;font-size:22px;font-weight:bold">DIWAN</div>
<div style="padding:28px;line-height:1.6;font-size:15px">${inner}</div>
<div style="padding:16px 28px;background:#E4D9C3;font-size:12px;color:#16211E">DIWAN Roastery · Cairo · ${esc(SITE.phone)}</div>
</div></body></html>`;
}

function orderTable(o: Order, lang: Lang) {
  const row = (a: string, b: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:bold;" : ""}">${a}</td><td style="padding:6px 0;text-align:${lang === "ar" ? "left" : "right"};${bold ? "font-weight:bold;" : ""}" dir="ltr">${b}</td></tr>`;
  const items = o.lines.map((l) => row(`${esc(l.name[lang])} (${esc(l.variant[lang])}) × ${l.qty}`, egp(l.price * l.qty, lang))).join("");
  const T = lang === "ar"
    ? { sub: "المجموع الفرعي", disc: "الخصم", pay: "خصم الدفع الإلكتروني", ship: "الشحن", total: "الإجمالي" }
    : { sub: "Subtotal", disc: "Discount", pay: "Pay-online discount", ship: "Delivery", total: "Total" };
  return `<table style="width:100%;border-collapse:collapse;border-top:1px solid #E4D9C3;margin-top:12px">${items}
${row(T.sub, egp(o.subtotal, lang))}
${o.discount ? row(`${T.disc} (${esc(o.discount.code)})`, `- ${egp(o.discount.amount, lang)}`) : ""}
${o.payDiscount ? row(T.pay, `- ${egp(o.payDiscount, lang)}`) : ""}
${o.shipping ? row(`${T.ship} (${esc(o.shipping.label[lang])})`, egp(o.shipping.price, lang)) : ""}
${row(T.total, egp(o.total, lang), true)}</table>`;
}

/** Customer confirmation (only when they gave an email) plus a heads-up to the store. Never throws. */
export async function sendOrderEmails(o: Order, lang: Lang = "en") {
  const ar = lang === "ar";
  const c = o.customer;
  const pay = PAY[o.payment.method][lang];
  if (c.email) {
    const inner = ar
      ? `<h2 style="margin:0 0 8px">شكراً ${esc(c.name)}، وصل طلبك</h2><p>رقم الطلب: <b dir="ltr">${esc(o.id)}</b><br>سنتواصل معك قريباً لتأكيد التوصيل.</p>${orderTable(o, lang)}<p>طريقة الدفع: ${esc(pay)}<br>العنوان: ${esc(c.address)}، ${esc(c.city)}</p>${o.payment.method !== "cod" ? `<p>سنرسل لك تفاصيل الدفع على واتساب.</p>` : ""}<p>الحكاية تبدأ بفنجان ☕</p>`
      : `<h2 style="margin:0 0 8px">Thank you ${esc(c.name)}, your order is in</h2><p>Order number: <b>${esc(o.id)}</b><br>We will contact you shortly to confirm delivery.</p>${orderTable(o, lang)}<p>Payment: ${esc(pay)}<br>Delivery to: ${esc(c.address)}, ${esc(c.city)}</p>${o.payment.method !== "cod" ? `<p>We will send the payment details on WhatsApp.</p>` : ""}<p>The story begins with a cup ☕</p>`;
    await send({ to: c.email, subject: ar ? `تأكيد طلبك ${o.id} من ديوان` : `Your DIWAN order ${o.id}`, html: shell(lang, inner), replyTo: storeEmail() });
  }
  const to = storeEmail();
  if (to) {
    const inner = `<h2 style="margin:0 0 8px">New order ${esc(o.id)}</h2><p><b>${esc(c.name)}</b><br>${esc(c.phone)}${c.email ? `<br>${esc(c.email)}` : ""}<br>${esc(c.address)}, ${esc(c.city)}${c.notes ? `<br>Notes: ${esc(c.notes)}` : ""}</p>${orderTable(o, "en")}<p>Payment: ${esc(PAY[o.payment.method].en)}</p>${o.gift ? `<p>Gift for ${esc(o.gift.name)} (${esc(o.gift.phone)}): ${esc(o.gift.message)}</p>` : ""}`;
    await send({ to, subject: `New order ${o.id} · ${egp(o.total, "en")}`, html: shell("en", inner), replyTo: c.email || undefined });
  }
}

/** Contact form: forward it to the store inbox. Replying goes straight to the visitor when they left an email. */
export async function sendContactEmail(m: { name: string; contact: string; topic: string; body: string }) {
  const to = storeEmail();
  if (!to) return console.warn("email skipped: EMAIL is not set");
  const isEmail = /^\S+@\S+\.\S+$/.test(m.contact);
  const inner = `<h2 style="margin:0 0 8px">New message from the website</h2><p><b>${esc(m.name)}</b><br>${esc(m.contact)}<br>Topic: ${esc(m.topic)}</p><p style="white-space:pre-wrap;border-left:3px solid #A8432C;padding-left:12px">${esc(m.body) || "(no message)"}</p>`;
  await send({ to, subject: `Website message from ${m.name}`, html: shell("en", inner), replyTo: isEmail ? m.contact : undefined });
}
