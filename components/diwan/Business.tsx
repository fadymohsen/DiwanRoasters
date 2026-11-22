"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { SplitText } from "@/components/ui/motion";
import { useLangStore } from "@/lib/lang";
import { waLink } from "@/lib/site";
import { sendMessage } from "@/lib/client/shop";

const VOLUMES = [
  { id: "small", en: "Under 10 kg a month", ar: "أقل من 10 كجم شهرياً" },
  { id: "mid", en: "10 to 50 kg a month", ar: "من 10 إلى 50 كجم شهرياً" },
  { id: "large", en: "More than 50 kg a month", ar: "أكثر من 50 كجم شهرياً" },
  { id: "unsure", en: "Not sure yet", ar: "لم أحدد بعد" },
];

const field =
  "mt-1.5 w-full rounded-xl border border-sand/30 bg-sand px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/40";

/** B2B: a short brief for cafés, offices, hotels and events. Lands in the admin inbox as a "business" message. */
export function Business() {
  const lang = useLangStore((s) => s.lang);
  const ar = lang === "ar";
  const [f, setF] = useState({ company: "", person: "", phone: "", volume: "mid", note: "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const digits = f.phone.replace(/\D/g, "");
  const bad = {
    company: f.company.trim().length < 2,
    person: f.person.trim().length < 2,
    phone: digits.length < 10 || digits.length > 15,
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const msg = (k: keyof typeof bad) => (touched && bad[k] ? (ar ? "هذا الحقل مطلوب." : "This field is required.") : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (bad.company || bad.person || bad.phone) {
      window.setTimeout(() => document.querySelector<HTMLElement>('#business [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setBusy(true);
    setFailed(false);
    const v = VOLUMES.find((x) => x.id === f.volume);
    sendMessage({
      name: `${f.person.trim()} (${f.company.trim()})`,
      contact: f.phone.trim(),
      topic: "business",
      body: [`Company: ${f.company.trim()}`, `Volume: ${v?.en}`, f.note.trim()].filter(Boolean).join("\n"),
    })
      .then(() => setSent(true))
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  };

  const uses = ar ? ["مقاهٍ ومطاعم", "مكاتب وشركات", "فنادق وفعاليات"] : ["Cafés and restaurants", "Offices and companies", "Hotels and events"];

  return (
    <section id="business" className="on-green bg-green py-20 text-sand md:py-28" aria-labelledby="business-h">
      <div className="wrap grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div>
          <p className="font-latin text-sm tracking-[0.3em] text-gold">{ar ? "للأعمال" : "FOR BUSINESS"}</p>
          <SplitText as="h2" text={ar ? "ديوان للأعمال" : "DIWAN for business"} className="block font-serif text-5xl font-bold leading-[0.95] md:text-7xl" />
          <Reveal delay={0.1}>
            <p className="measure mt-6 text-lg leading-relaxed text-sand/85">
              {ar
                ? "تقدّم قهوة ديوان في مقهاك أو مكتبك أو فندقك أو فعاليتك. اكتب لنا ما تقدّمه وكم تحتاج، وسنرد عليك بعرض مناسب."
                : "Serve DIWAN in your café, office, hotel or event. Tell us what you serve and how much you need, and we reply with an offer that fits."}
            </p>
            <ul className="mt-7 flex flex-wrap gap-2">
              {uses.map((u) => (
                <li key={u} className="rounded-full border border-sand/30 px-4 py-2 text-sm font-medium">{u}</li>
              ))}
            </ul>
            <a
              href={waLink(ar ? "مرحباً ديوان، أريد عرضاً لشركتي." : "Hello DIWAN, I'd like an offer for my business.")}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex rounded-full border border-sand/50 px-6 py-3 text-sm font-semibold transition hover:bg-sand hover:text-green active:scale-[0.97]"
            >
              {ar ? "أو راسلنا على واتساب" : "Or message us on WhatsApp"}
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-[20px] bg-sand/10 p-6 ring-1 ring-sand/20 md:p-9">
            {sent ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 text-center" role="status">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-sand text-green"><Check className="h-7 w-7" /></span>
                <h3 className="font-serif text-3xl font-bold">{ar ? "وصل طلبك" : "We have your request"}</h3>
                <p className="max-w-sm text-sand/85">{ar ? "سنتواصل معك على الرقم الذي كتبته لنرسل لك العرض." : "We will call the number you gave to send you the offer."}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate aria-label={ar ? "طلب عرض للأعمال" : "Business offer request"} className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="b-company" className="text-sm font-semibold">{ar ? "اسم النشاط" : "Business name"}</label>
                  <input id="b-company" value={f.company} onChange={set("company")} className={field} autoComplete="organization" aria-invalid={!!msg("company")} aria-describedby={msg("company") ? "b-company-err" : undefined} />
                  {msg("company") && <span id="b-company-err" role="alert" className="mt-1 block text-xs text-[#ffb4a8]">{msg("company")}</span>}
                </div>
                <div>
                  <label htmlFor="b-person" className="text-sm font-semibold">{ar ? "اسم المسؤول" : "Contact person"}</label>
                  <input id="b-person" value={f.person} onChange={set("person")} className={field} autoComplete="name" aria-invalid={!!msg("person")} aria-describedby={msg("person") ? "b-person-err" : undefined} />
                  {msg("person") && <span id="b-person-err" role="alert" className="mt-1 block text-xs text-[#ffb4a8]">{msg("person")}</span>}
                </div>
                <div>
                  <label htmlFor="b-phone" className="text-sm font-semibold">{ar ? "الهاتف" : "Phone"}</label>
                  <input id="b-phone" value={f.phone} onChange={set("phone")} type="tel" dir="ltr" inputMode="tel" className={field} autoComplete="tel" aria-invalid={!!msg("phone")} aria-describedby={msg("phone") ? "b-phone-err" : undefined} />
                  {msg("phone") && <span id="b-phone-err" role="alert" className="mt-1 block text-xs text-[#ffb4a8]">{ar ? "اكتب رقماً صحيحاً." : "Enter a valid number."}</span>}
                </div>
                <div>
                  <label htmlFor="b-volume" className="text-sm font-semibold">{ar ? "الكمية المتوقعة" : "Expected volume"}</label>
                  <select id="b-volume" value={f.volume} onChange={set("volume")} className={field}>
                    {VOLUMES.map((v) => <option key={v.id} value={v.id}>{ar ? v.ar : v.en}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="b-note" className="text-sm font-semibold">{ar ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
                  <textarea id="b-note" rows={3} value={f.note} onChange={set("note")} className={field} />
                </div>
                <div className="sm:col-span-2">
                  <button type="submit" disabled={busy} className="btn w-full border-sand bg-sand text-green hover:bg-white sm:w-auto">
                    {busy ? (<><Loader2 className="h-4 w-4 animate-spin" />{ar ? "جارٍ الإرسال" : "Sending"}</>) : ar ? "اطلب عرضاً" : "Request an offer"}
                  </button>
                  {failed && <p role="alert" className="mt-3 text-sm text-sand">{ar ? "تعذّر الإرسال. حاول مرة أخرى أو راسلنا على واتساب." : "We could not send it. Please try again or message us on WhatsApp."}</p>}
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
