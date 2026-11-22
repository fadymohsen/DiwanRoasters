"use client";

import { useRef, useState } from "react";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
import { btnLight, input } from "@/components/admin/AdminShell";
import { uploadImage } from "@/lib/client/upload";
import { useLocalized } from "@/lib/i18n";

/** Upload photos (or paste an address). The first photo is the main one. */
export function ImageGallery({ images, onChange, max = 8 }: { images: string[]; onChange: (next: string[]) => void; max?: number }) {
  const l = useLocalized();
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = Math.max(0, max - images.length);
    const chosen = Array.from(files).slice(0, room);
    setBusy(chosen.length);
    const done: string[] = [];
    for (const f of chosen) {
      try {
        done.push(await uploadImage(f));
      } catch (e) {
        setError(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
      setBusy((n) => n - 1);
    }
    if (done.length) onChange([...images, ...done]);
    if (pick.current) pick.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-[#e1e1e1] bg-[#ececec]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute start-1 top-1 rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] font-semibold text-white">{l({ en: "Main", ar: "الرئيسية" })}</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              {i > 0 ? (
                <button type="button" onClick={() => onChange([src, ...images.filter((_, j) => j !== i)])} className="rounded p-1 text-white hover:bg-white/20" aria-label={l({ en: "Make main photo", ar: "اجعلها الصورة الرئيسية" })}><Star className="h-4 w-4" /></button>
              ) : <span />}
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="rounded p-1 text-white hover:bg-white/20" aria-label={l({ en: "Remove photo", ar: "حذف الصورة" })}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {images.length < max && (
          <button type="button" onClick={() => pick.current?.click()} disabled={busy > 0} className="grid h-24 w-24 place-items-center rounded-lg border border-dashed border-[#c9c9c9] bg-white text-xs text-[#616161] transition hover:bg-[#fafafa] disabled:opacity-60">
            <span className="flex flex-col items-center gap-1">
              {busy > 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {busy > 0 ? l({ en: "Uploading", ar: "جارٍ الرفع" }) : l({ en: "Upload", ar: "رفع صورة" })}
            </span>
          </button>
        )}
      </div>
      <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="sr-only" tabIndex={-1} onChange={(e) => void add(e.target.files)} />
      {error && <p role="alert" className="mt-2 text-sm text-[#A8322F]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={l({ en: "Or paste an image address", ar: "أو الصق رابط صورة" })} dir="ltr" className={`${input} max-w-sm`} aria-label={l({ en: "Image address", ar: "رابط الصورة" })} />
        <button type="button" className={btnLight} disabled={!/^(https?:\/\/|\/)/.test(url.trim()) || images.length >= max} onClick={() => { onChange([...images, url.trim()]); setUrl(""); }}>{l({ en: "Add", ar: "إضافة" })}</button>
      </div>
      <p className="mt-2 text-xs text-[#616161]">{l({ en: "JPG, PNG, WebP, AVIF or GIF. Large photos are shrunk before upload. The first photo is the main one.", ar: "JPG أو PNG أو WebP أو AVIF أو GIF. تُصغَّر الصور الكبيرة قبل الرفع. أول صورة هي الرئيسية." })}</p>
    </div>
  );
}
