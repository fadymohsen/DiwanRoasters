"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { PageHead, btnDark, btnLight, card, input } from "@/components/admin/AdminShell";
import { ImageGallery } from "@/components/admin/ImageField";
import { useCatalogStore } from "@/store/useCatalogStore";
import { useToastStore } from "@/store/useToastStore";
import { useLangStore, useLocalized } from "@/lib/i18n";
import { askConfirm } from "@/lib/confirm";
import { useTrap } from "@/lib/useTrap";
import type { StoreCategory } from "@/lib/types";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function Editor({ initial, isNew, onClose }: { initial: StoreCategory; isNew: boolean; onClose: () => void }) {
  const trap = useTrap(onClose);
  const l = useLocalized();
  const categories = useCatalogStore((s) => s.categories);
  const upsert = useCatalogStore((s) => s.upsertCategory);
  const push = useToastStore((s) => s.push);
  const [c, setC] = useState<StoreCategory>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const id = isNew ? slug(c.name.en) : c.id;
    if (!c.name.en.trim() || !c.name.ar.trim()) return setError(l({ en: "Enter the name in English and Arabic.", ar: "أدخل الاسم بالإنجليزية والعربية." }));
    if (!id) return setError(l({ en: "The English name must contain letters or numbers.", ar: "الاسم الإنجليزي يجب أن يحتوي حروفاً أو أرقاماً." }));
    if (isNew && categories.some((x) => x.id === id)) return setError(l({ en: "A category with this name already exists.", ar: "يوجد فئة بنفس الاسم." }));
    setSaving(true);
    setError("");
    const failed = await upsert({ ...c, id, name: { ar: c.name.ar.trim(), en: c.name.en.trim() } });
    setSaving(false);
    if (failed) return setError(failed);
    push(l({ en: "Category saved", ar: "تم حفظ الفئة" }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col bg-[#f7f7f7]" ref={trap} role="dialog" aria-modal="true" aria-labelledby="edit-title" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e1e1e1] bg-white px-5 py-4">
          <h2 id="edit-title" className="text-lg font-semibold">{isNew ? l({ en: "Add category", ar: "إضافة فئة" }) : initial.name.en}</h2>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-black/5" aria-label={l({ en: "Close", ar: "إغلاق" })}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className={`${card} grid gap-4 p-5 sm:grid-cols-2`}>
            <label className="text-sm font-medium">{l({ en: "Name (English)", ar: "الاسم (إنجليزي)" })}<input className={`${input} mt-1`} dir="ltr" value={c.name.en} onChange={(e) => setC({ ...c, name: { ...c.name, en: e.target.value } })} /></label>
            <label className="text-sm font-medium">{l({ en: "Name (Arabic)", ar: "الاسم (عربي)" })}<input className={`${input} mt-1`} dir="rtl" value={c.name.ar} onChange={(e) => setC({ ...c, name: { ...c.name, ar: e.target.value } })} /></label>
            <label className="text-sm font-medium">{l({ en: "Short description (English)", ar: "وصف قصير (إنجليزي)" })}<textarea rows={3} className={`${input} mt-1`} dir="ltr" value={c.blurb.en} onChange={(e) => setC({ ...c, blurb: { ...c.blurb, en: e.target.value } })} /></label>
            <label className="text-sm font-medium">{l({ en: "Short description (Arabic)", ar: "وصف قصير (عربي)" })}<textarea rows={3} className={`${input} mt-1`} dir="rtl" value={c.blurb.ar} onChange={(e) => setC({ ...c, blurb: { ...c.blurb, ar: e.target.value } })} /></label>
            <div className="text-sm font-medium sm:col-span-2">{l({ en: "Cover photo", ar: "صورة الغلاف" })}
              <div className="mt-2 font-normal"><ImageGallery max={1} images={c.image ? [c.image] : []} onChange={(imgs) => setC({ ...c, image: imgs[0] ?? "" })} /></div>
              <p className="mt-1 text-xs font-normal text-[#616161]">{l({ en: "Shown on the home page card. If empty, the first product's photo is used.", ar: "تظهر في كارت الصفحة الرئيسية. إن كانت فارغة تُستخدم صورة أول منتج." })}</p>
            </div>
            <label className="text-sm font-medium">{l({ en: "Order", ar: "الترتيب" })}<input type="number" className={`${input} mt-1`} dir="ltr" value={c.sort} onChange={(e) => setC({ ...c, sort: Number(e.target.value) })} /></label>
            <label className="text-sm font-medium">{l({ en: "Visibility", ar: "الظهور" })}
              <select className={`${input} mt-1`} value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as StoreCategory["status"] })}>
                <option value="active">{l({ en: "Shown in the store", ar: "ظاهرة في المتجر" })}</option>
                <option value="hidden">{l({ en: "Hidden (with its products)", ar: "مخفية (مع منتجاتها)" })}</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-[#e1e1e1] bg-white px-5 py-4">
          <button className={btnDark} onClick={save} disabled={saving}>{saving ? l({ en: "Saving", ar: "جارٍ الحفظ" }) : l({ en: "Save", ar: "حفظ" })}</button>
          <button className={btnLight} onClick={onClose}>{l({ en: "Cancel", ar: "إلغاء" })}</button>
          {error && <p role="alert" className="text-sm text-[#A8322F]">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const l = useLocalized();
  const lang = useLangStore((s) => s.lang);
  const categories = useCatalogStore((s) => s.categories);
  const items = useCatalogStore((s) => s.items);
  const del = useCatalogStore((s) => s.deleteCategory);
  const push = useToastStore((s) => s.push);
  const [edit, setEdit] = useState<{ cat: StoreCategory; isNew: boolean } | null>(null);

  const blank = (): StoreCategory => ({ id: "", name: { ar: "", en: "" }, blurb: { ar: "", en: "" }, image: "", sort: categories.length, status: "active" });

  return (
    <>
      <PageHead title={l({ en: "Categories", ar: "الفئات" })} action={<button className={btnDark} onClick={() => setEdit({ cat: blank(), isNew: true })}><Plus className="me-1 inline h-4 w-4" />{l({ en: "Add category", ar: "إضافة فئة" })}</button>} />
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-[#e1e1e1] text-xs text-[#616161]">
              {[{ en: "Category", ar: "الفئة" }, { en: "Products", ar: "المنتجات" }, { en: "Order", ar: "الترتيب" }, { en: "Visibility", ar: "الظهور" }].map((h) => <th key={h.en} className="p-3 text-start font-medium">{l(h)}</th>)}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const n = items.filter((i) => i.categoryId === c.id).length;
              return (
                <tr key={c.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                  <td className="p-3">
                    <button className="flex items-center gap-3 text-start" onClick={() => setEdit({ cat: c, isNew: false })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.image ? <img src={c.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-[#ececec]" />}
                      <span><span className="block font-medium hover:underline">{c.name[lang]}</span><span className="text-xs text-[#8a8a8a]" dir="ltr">{c.id}</span></span>
                    </button>
                  </td>
                  <td className="p-3"><bdi>{n}</bdi></td>
                  <td className="p-3"><bdi>{c.sort}</bdi></td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.status === "active" ? "bg-[#cdfee1] text-[#0c5132]" : "bg-[#e3e3e3] text-[#4a4a4a]"}`}>{c.status === "active" ? l({ en: "Shown", ar: "ظاهرة" }) : l({ en: "Hidden", ar: "مخفية" })}</span></td>
                  <td className="p-3 text-end">
                    <button
                      className="rounded-md p-2 text-[#A8322F] hover:bg-[#A8322F]/10 disabled:opacity-30"
                      disabled={n > 0}
                      title={n > 0 ? l({ en: "Move or delete its products first", ar: "انقل منتجاتها أو احذفها أولاً" }) : undefined}
                      aria-label={l({ en: `Delete ${c.name.en}`, ar: `حذف ${c.name.ar}` })}
                      onClick={() => askConfirm({ title: l({ en: `Delete ${c.name.en}?`, ar: `حذف ${c.name.ar}؟` }), confirmLabel: l({ en: "Confirm", ar: "تأكيد" }), cancelLabel: l({ en: "Cancel", ar: "إلغاء" }), danger: true }).then((ok) => { if (ok) { void del(c.id); push(l({ en: "Category deleted", ar: "تم حذف الفئة" })); } })}
                    ><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {categories.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-[#616161]">{l({ en: "No categories yet. Add one, then add products to it.", ar: "لا فئات بعد. أضف فئة ثم أضف منتجات إليها." })}</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <Editor key={edit.cat.id || "new"} initial={edit.cat} isNew={edit.isNew} onClose={() => setEdit(null)} />}
    </>
  );
}
