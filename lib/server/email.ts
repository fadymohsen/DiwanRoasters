import { Resend } from "resend";
import { SITE, waLink } from "@/lib/site";
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
const egp = (n: number, lang: Lang) => (lang === "ar" ? `${n.toLocaleString("en-US")} ج.م` : `EGP ${n.toLocaleString("en-US")}`);

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

/* ───────────── design tokens (the brand palette, inline because mail clients ignore stylesheets) ───────────── */
const C = { sand: "#F4ECDC", sandDeep: "#E4D9C3", green: "#0E3A33", carnelian: "#A8432C", ink: "#16211E", muted: "#6B6558", line: "#E8DFCC", gold: "#CDA76C" };
const FONT = "'Segoe UI',Tahoma,Arial,sans-serif";
/** Mail clients cannot load localhost, so fall back to the live site for the logo. */
const siteUrl = () => (SITE.baseUrl.includes("localhost") ? "https://www.diwanroasters.com" : SITE.baseUrl).replace(/\/$/, "");

const button = (href: string, label: string, bg = C.green, fg = C.sand) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${bg}"><a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:${fg};text-decoration:none;border-radius:999px">${label}</a></td></tr></table>`;

function shell(lang: Lang, preheader: string, inner: string) {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const url = siteUrl();
  const link = (href: string, t: string) => `<a href="${esc(href)}" style="color:${C.green};text-decoration:none;font-weight:600">${t}</a>`;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.sand};font-family:${FONT};color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.sand}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="${dir}" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td align="center" style="background:${C.green};padding:36px 28px 30px">
  <img src="${url}/assets/diwan/Diwan_Logo_Slogan_Reverse_tight.png" alt="DIWAN" width="150" style="display:block;border:0;height:auto;max-width:150px;margin:0 auto">
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${C.carnelian}">&nbsp;</td></tr>
<tr><td style="padding:36px 36px 32px;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.ink};text-align:${ar ? "right" : "left"}">${inner}</td></tr>
<tr><td style="background:${C.sandDeep};padding:26px 36px;text-align:center;font-family:${FONT};font-size:13px;line-height:1.9;color:${C.ink}">
  <div style="font-size:15px;font-weight:600;color:${C.green};margin-bottom:6px">${ar ? "الحكاية تبدأ بفنجان" : "The story begins with a cup"}</div>
  ${link(waLink(), "WhatsApp")} &nbsp;·&nbsp; ${link(SITE.instagram, "Instagram")} &nbsp;·&nbsp; ${link(SITE.facebook, "Facebook")}<br>
  <span dir="ltr">${esc(SITE.phone)}</span> &nbsp;·&nbsp; ${ar ? "القاهرة، مصر" : "Cairo, Egypt"}
</td></tr>
</table>
<p style="margin:16px 0 0;font-family:${FONT};font-size:11px;color:${C.muted}">© ${new Date().getFullYear()} DIWAN Roastery</p>
</td></tr></table></body></html>`;
}

const eyebrow = (t: string) => `<div style="font-size:12px;font-weight:700;letter-spacing:${/[؀-ۿ]/.test(t) ? "0" : "2px"};color:${C.carnelian};text-transform:uppercase;margin-bottom:10px">${t}</div>`;
const h1 = (t: string) => `<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:${C.green}">${t}</h1>`;

/** A label above a value, used for the little info cells. */
const cell = (label: string, value: string, w: string) =>
  `<td valign="top" width="${w}" style="padding:14px 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:${C.muted};text-transform:uppercase">${label}</div><div style="margin-top:4px;font-size:15px;font-weight:600;color:${C.ink}">${value}</div></td>`;

function fmtDate(ts: number, lang: Lang) {
  return new Date(ts).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" });
}

function items(o: Order, lang: Lang) {
  return o.lines
    .map(
      (l) => `<tr>
<td style="padding:16px 0;border-bottom:1px solid ${C.line}"><div style="font-size:16px;font-weight:700;color:${C.green}">${esc(l.name[lang])}</div><div style="font-size:13px;color:${C.muted};margin-top:2px">${esc(l.variant[lang])} &nbsp;×&nbsp; <span dir="ltr">${l.qty}</span></div></td>
<td align="${lang === "ar" ? "left" : "right"}" valign="top" style="padding:16px 0;border-bottom:1px solid ${C.line};font-size:15px;font-weight:600;white-space:nowrap" dir="ltr">${egp(l.price * l.qty, lang)}</td></tr>`,
    )
    .join("");
}

function totals(o: Order, lang: Lang) {
  const T = lang === "ar"
    ? { sub: "المجموع الفرعي", disc: "الخصم", pay: "خصم الدفع الإلكتروني", ship: "التوصيل", total: "الإجمالي", free: "مجاني" }
    : { sub: "Subtotal", disc: "Discount", pay: "Online payment discount", ship: "Delivery", total: "Total", free: "Free" };
  const side = lang === "ar" ? "left" : "right";
  const row = (a: string, b: string, color = C.ink) => `<tr><td style="padding:5px 0;font-size:14px;color:${C.muted}">${a}</td><td align="${side}" dir="ltr" style="padding:5px 0;font-size:14px;color:${color}">${b}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px">
${row(T.sub, egp(o.subtotal, lang))}
${o.discount ? row(`${T.disc} (${esc(o.discount.code)})`, `− ${egp(o.discount.amount, lang)}`, C.carnelian) : ""}
${o.payDiscount ? row(T.pay, `− ${egp(o.payDiscount, lang)}`, C.carnelian) : ""}
${o.shipping ? row(`${T.ship} · ${esc(o.shipping.label[lang])}`, o.shipping.price ? egp(o.shipping.price, lang) : T.free) : ""}
<tr><td colspan="2" style="padding-top:10px"><div style="border-top:2px solid ${C.green}"></div></td></tr>
<tr><td style="padding:12px 0 0;font-size:17px;font-weight:700;color:${C.green}">${T.total}</td><td align="${side}" dir="ltr" style="padding:12px 0 0;font-size:22px;font-weight:700;color:${C.green}">${egp(o.total, lang)}</td></tr></table>`;
}

/** Customer confirmation (only when they gave an email) plus a heads-up to the store. Never throws. */
export async function sendOrderEmails(o: Order, lang: Lang = "en") {
  const ar = lang === "ar";
  const c = o.customer;
  const pay = PAY[o.payment.method][lang];
  const T = ar
    ? {
        eyebrow: "تم استلام طلبك", hi: `شكراً ${esc(c.name)}`, intro: "وصلنا طلبك وبنجهزه لك. هنتواصل معك قريباً لتأكيد موعد التوصيل.",
        no: "رقم الطلب", date: "التاريخ", pay: "طريقة الدفع", items: "طلبك", to: "التوصيل إلى", gift: "هدية إلى", note: "ملاحظاتك",
        next: "الخطوات القادمة", s1: "نتواصل معك لتأكيد الطلب والعنوان.", s2: "نحمّص ونجهّز طلبك بعناية.", s3: "يصلك الطلب إلى بابك.",
        payNote: "هنبعت لك تفاصيل الدفع على واتساب، وخصم الدفع الإلكتروني اتحسب في الإجمالي.", help: "عندك سؤال؟ راسلنا على واتساب", cta: "تواصل معنا",
      }
    : {
        eyebrow: "Order confirmed", hi: `Thank you, ${esc(c.name)}`, intro: "We have your order and we are getting it ready. We will contact you shortly to confirm delivery.",
        no: "Order number", date: "Date", pay: "Payment", items: "Your order", to: "Delivering to", gift: "Gift for", note: "Your notes",
        next: "What happens next", s1: "We contact you to confirm the order and address.", s2: "We roast and pack your coffee with care.", s3: "It arrives at your door.",
        payNote: "We will send the payment details on WhatsApp. Your online payment discount is already in the total.", help: "Questions about your order? Message us on WhatsApp.", cta: "Chat with us",
      };

  if (c.email) {
    const step = (n: number, t: string) => `<tr><td valign="top" width="34" style="padding:7px 0"><div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${C.green};color:${C.sand};text-align:center;font-size:13px;font-weight:700">${n}</div></td><td style="padding:7px 0;font-size:14px;color:${C.ink}">${t}</td></tr>`;
    const box = (title: string, body: string) => `<div style="margin-top:24px;padding:16px 18px;background:${C.sand};border-radius:12px"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:${C.muted};text-transform:uppercase;margin-bottom:6px">${title}</div><div style="font-size:14px;line-height:1.7">${body}</div></div>`;
    const inner = `${eyebrow(T.eyebrow)}${h1(T.hi)}
<p style="margin:0 0 24px;color:${C.muted}">${T.intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.sand};border-radius:12px"><tr>
${cell(T.no, `<span dir="ltr">${esc(o.id)}</span>`, "34%")}${cell(T.date, fmtDate(o.createdAt, lang), "33%")}${cell(T.pay, esc(pay), "33%")}
</tr></table>
<div style="margin:30px 0 4px;font-size:12px;font-weight:700;letter-spacing:.5px;color:${C.muted};text-transform:uppercase">${T.items}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${C.green}">${items(o, lang)}</table>
${totals(o, lang)}
${o.payment.method !== "cod" ? `<div style="margin-top:20px;padding:14px 18px;border-radius:12px;border:1px solid ${C.gold};background:#FBF6EA;font-size:14px">${T.payNote}</div>` : ""}
${box(T.to, `<b>${esc(c.name)}</b><br>${esc(c.address)}<br>${esc(c.city)}<br><span dir="ltr">${esc(c.phone)}</span>`)}
${o.gift ? box(T.gift, `<b>${esc(o.gift.name)}</b> · <span dir="ltr">${esc(o.gift.phone)}</span>${o.gift.message ? `<br><i>“${esc(o.gift.message)}”</i>` : ""}`) : ""}
${c.notes ? box(T.note, esc(c.notes)) : ""}
<div style="margin:32px 0 6px;font-family:Georgia,serif;font-size:19px;font-weight:700;color:${C.green}">${T.next}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${step(1, T.s1)}${step(2, T.s2)}${step(3, T.s3)}</table>
<div style="margin-top:32px;padding-top:26px;border-top:1px solid ${C.line};text-align:center"><p style="margin:0 0 16px;color:${C.muted};font-size:14px">${T.help}</p><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td>${button(waLink(`${ar ? "طلبي" : "My order"} ${o.id}`), T.cta)}</td></tr></table></div>`;
    await send({
      to: c.email,
      subject: ar ? `تم تأكيد طلبك ${o.id} · ديوان` : `Order confirmed ${o.id} · DIWAN`,
      html: shell(lang, ar ? `طلبك ${o.id} وصلنا، الإجمالي ${egp(o.total, lang)}` : `Your order ${o.id} is in. Total ${egp(o.total, lang)}.`, inner),
      replyTo: storeEmail(),
    });
  }

  const to = storeEmail();
  if (to) {
    const row = (a: string, b: string) => `<tr><td valign="top" width="110" style="padding:7px 0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">${a}</td><td style="padding:7px 0;font-size:15px">${b}</td></tr>`;
    const inner = `${eyebrow("New order")}${h1(`${esc(o.id)} · ${egp(o.total, "en")}`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line}">
${row("Customer", `<b>${esc(c.name)}</b>`)}${row("Phone", `<a href="tel:${esc(c.phone)}" style="color:${C.green};font-weight:600">${esc(c.phone)}</a>`)}${c.email ? row("Email", `<a href="mailto:${esc(c.email)}" style="color:${C.green}">${esc(c.email)}</a>`) : ""}
${row("Address", `${esc(c.address)}, ${esc(c.city)}`)}${row("Payment", esc(PAY[o.payment.method].en))}${c.notes ? row("Notes", esc(c.notes)) : ""}
${o.gift ? row("Gift", `${esc(o.gift.name)} · ${esc(o.gift.phone)}${o.gift.message ? `<br><i>“${esc(o.gift.message)}”</i>` : ""}`) : ""}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-top:2px solid ${C.green}">${items(o, "en")}</table>
${totals(o, "en")}
<div style="margin-top:28px">${button(`${siteUrl()}/admin/orders`, "Open in admin")}</div>`;
    await send({ to, subject: `New order ${o.id} · ${egp(o.total, "en")}`, html: shell("en", `New order from ${c.name}`, inner), replyTo: c.email || undefined });
  }
}

/** Contact form: forward it to the store inbox. Replying goes straight to the visitor when they left an email. */
export async function sendContactEmail(m: { name: string; contact: string; topic: string; body: string }) {
  const to = storeEmail();
  if (!to) return console.warn("email skipped: EMAIL is not set");
  const isEmail = /^\S+@\S+\.\S+$/.test(m.contact);
  const TOPIC: Record<string, string> = { recommend: "Recommend a blend", order: "My order", gift: "Gifts and packaging", business: "Business and wholesale", other: "Something else" };
  const href = isEmail ? `mailto:${m.contact}` : `tel:${m.contact.replace(/[^\d+]/g, "")}`;
  const row = (a: string, b: string) => `<tr><td valign="top" width="100" style="padding:9px 0;border-bottom:1px solid ${C.line};font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px">${a}</td><td style="padding:9px 0;border-bottom:1px solid ${C.line};font-size:15px">${b}</td></tr>`;
  const inner = `${eyebrow("New message")}${h1("Someone wrote to DIWAN")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${C.green}">
${row("From", `<b>${esc(m.name)}</b>`)}${row(isEmail ? "Email" : "Phone", `<a href="${esc(href)}" style="color:${C.green};font-weight:600">${esc(m.contact)}</a>`)}${row("Topic", esc(TOPIC[m.topic] ?? m.topic))}
</table>
<div style="margin-top:24px;padding:20px 22px;background:${C.sand};border-radius:12px;border-${"left"}:4px solid ${C.carnelian};font-size:15px;line-height:1.7;white-space:pre-wrap">${esc(m.body) || "<i>(no message)</i>"}</div>
<div style="margin-top:28px">${button(href, isEmail ? "Reply to " + esc(m.name.split(" ")[0]) : "Call " + esc(m.name.split(" ")[0]))}</div>`;
  await send({ to, subject: `New message from ${m.name}`, html: shell("en", `${m.name}: ${m.body.slice(0, 80)}`, inner), replyTo: isEmail ? m.contact : undefined });
}
