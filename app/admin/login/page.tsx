"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { btnDark, card, input } from "@/components/admin/AdminShell";
import { useLangStore, useLocalized } from "@/lib/i18n";

export default function LoginPage() {
  const l = useLocalized();
  const lang = useLangStore((s) => s.lang);
  const toggle = useLangStore((s) => s.toggle);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (res.ok) {
        // only ever return to a back-office page
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next && /^\/admin(\/|$)/.test(next) ? next : "/admin";
        return;
      }
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      setError(res.status === 401 ? l({ en: "Wrong password.", ar: "كلمة المرور غير صحيحة." }) : res.status === 429 ? l({ en: "Too many attempts. Try again in 15 minutes.", ar: "محاولات كثيرة. حاول بعد 15 دقيقة." }) : out.error || l({ en: "Could not sign in.", ar: "تعذّر تسجيل الدخول." }));
    } catch {
      setError(l({ en: "Could not reach the server.", ar: "تعذّر الاتصال بالخادم." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#f1f1f1] p-4 text-[#303030]">
      <div className="w-full max-w-sm">
        <form onSubmit={submit} className={`${card} p-6`} aria-label={l({ en: "Admin sign in", ar: "تسجيل دخول لوحة التحكم" })}>
          <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-[#1a1a1a] text-white"><Lock className="h-5 w-5" /></span>
          <h1 className="text-lg font-semibold text-[#1a1a1a]">{l({ en: "Sign in to the admin", ar: "الدخول إلى لوحة التحكم" })}</h1>
          <p className="mt-1 text-sm text-[#616161]">{l({ en: "Enter the admin password to continue.", ar: "أدخل كلمة مرور لوحة التحكم للمتابعة." })}</p>
          <label className="mt-5 block text-sm font-medium" htmlFor="admin-pw">{l({ en: "Password", ar: "كلمة المرور" })}</label>
          <input id="admin-pw" type="password" autoFocus autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "admin-pw-err" : undefined} className={`${input} mt-1`} />
          {error && <p id="admin-pw-err" role="alert" className="mt-2 text-sm text-[#A8322F]">{error}</p>}
          <button type="submit" disabled={!password || busy} className={`${btnDark} mt-5 flex w-full items-center justify-center gap-2`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {l({ en: "Sign in", ar: "دخول" })}
          </button>
        </form>
        <button onClick={toggle} className="mx-auto mt-4 block rounded-md px-3 py-1.5 text-xs font-semibold text-[#616161] hover:bg-black/5">{lang === "en" ? "عربي" : "English"}</button>
      </div>
    </div>
  );
}
