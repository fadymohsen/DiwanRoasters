"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Plus, Search, Trash2, X } from "lucide-react";
import { PageHead, btnDark, btnLight, card, input } from "@/components/admin/AdminShell";
import { categoryName } from "@/lib/catalog";
import { ImageGallery } from "@/components/admin/ImageField";
import { useCatalogStore, type CatalogItem, type CatalogVariant, type ProductStatus } from "@/store/useCatalogStore";
import type { CategoryId } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { useToastStore } from "@/store/useToastStore";
import { useLangStore, useLocalized } from "@/lib/i18n";
import { askConfirm } from "@/lib/confirm";
import { useTrap } from "@/lib/useTrap";
import { money } from "@/lib/format";

const STATUS: { id: ProductStatus; en: string; ar: string; cls: string }[] = [
  { id: "active", en: "Active", ar: "نشط", cls: "bg-[#cdfee1] text-[#0c5132]" },
  { id: "draft", en: "Draft", ar: "مسودة", cls: "bg-[#ffeb78] text-[#5e4200]" },
  { id: "archived", en: "Archived", ar: "مؤرشف", cls: "bg-[#e3e3e3] text-[#4a4a4a]" },
];

const newVariant = (n: number): CatalogVariant => ({ key: `v${n}`, label: { ar: "", en: "" }, sku: "", price: 0, compareAt: null, cost: null, stock: null, threshold: 5 });

const blank = (categoryId: CategoryId): CatalogItem => ({
  id: "",
  name: { ar: "", en: "" },
  description: { ar: "", en: "" },
  categoryId,
  hex: "#0E3A33",
  art: "#F4ECDC",
  image: "",
  images: [],
  details: {},
  status: "draft",
  tags: [],
  variants: [{ ...newVariant(1), key: "default", label: { ar: "200 جم", en: "200 g" } }],
});

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (v: string) => (v === "" ? null : Number(v));

type Tab = "details" | "variants" | "extras" | "organize";

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

function Editor({ initial, isNew, onClose }: { initial: CatalogItem; isNew: boolean; onClose: () => void }) {
  const trap = useTrap(onClose);
  const l = useLocalized();
  const upsert = useCatalogStore((s) => s.upsertItem);
  const existing = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const push = useToastStore((s) => s.push);
  const [it, setIt] = useState<CatalogItem>(initial);
  const [saving, setSaving] = useState(false);
  const det = it.details;
  const setDet = (patch: Partial<CatalogItem["details"]>) => setIt({ ...it, details: { ...det, ...patch } });
  const [tab, setTab] = useState<Tab>("details");
  const [error, setError] = useState("");
  const [pct, setPct] = useState("");

  const setV = (i: number, patch: Partial<CatalogVariant>) => setIt({ ...it, variants: it.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });

  const applyPct = () => {
    const p = Number(pct);
    if (!p) return;
    setIt({ ...it, variants: it.variants.map((v) => ({ ...v, price: Math.max(1, Math.round((v.price * (100 + p)) / 100)) })) });
    setPct("");
  };

  const save = async () => {
    const id = isNew ? slug(it.name.en) : it.id;
    if (!it.name.en || !it.name.ar) return setError(l({ en: "Enter the name in English and Arabic.", ar: "أدخل الاسم بالإنجليزية والعربية." }));
    if (!id) return setError(l({ en: "The English name must contain letters or numbers.", ar: "الاسم الإنجليزي يجب أن يحتوي حروفاً أو أرقاماً." }));
    if (isNew && existing.some((x) => x.id === id)) return setError(l({ en: "A product with this name already exists.", ar: "يوجد منتج بنفس الاسم." }));
    if (it.variants.some((v) => v.price <= 0)) return setError(l({ en: "Every variant needs a price above zero.", ar: "كل خيار يحتاج سعراً أكبر من صفر." }));
    if (it.variants.some((v) => v.compareAt !== null && v.compareAt <= v.price)) return setError(l({ en: "Compare-at price must be higher than the price.", ar: "السعر قبل الخصم يجب أن يكون أعلى من السعر." }));
    if (new Set(it.variants.map((v) => v.key)).size !== it.variants.length) return setError(l({ en: "Variant keys must be unique.", ar: "مفاتيح الخيارات يجب أن تكون فريدة." }));
    if (!it.categoryId) return setError(l({ en: "Choose a category.", ar: "اختر فئة." }));
    setSaving(true);
    setError("");
    const failed = await upsert({
      ...it,
      id,
      image: it.images[0] ?? it.image,
      variants: it.variants.map((v, i) => ({ ...v, key: v.key || `v${i + 1}`, sku: v.sku || `DW-${id.toUpperCase().slice(0, 4)}-${i + 1}` })),
    });
    setSaving(false);
    if (failed) return setError(failed);
    push(l({ en: "Product saved", ar: "تم حفظ المنتج" }));
    onClose();
  };

  const tabs: { id: Tab; en: string; ar: string }[] = [
    { id: "details", en: "Details", ar: "التفاصيل" },
    { id: "variants", en: "Variants and pricing", ar: "الخيارات والتسعير" },
    { id: "extras", en: "Brewing and card", ar: "التحضير والكارت" },
    { id: "organize", en: "Organization", ar: "التنظيم" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-4xl flex-col bg-[#f7f7f7]" ref={trap} role="dialog" aria-modal="true" aria-labelledby="edit-title" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#e1e1e1] bg-white px-5 py-4">
          <h2 id="edit-title" className="text-lg font-semibold">{isNew ? l({ en: "Add product", ar: "إضافة منتج" }) : it.name.en || l({ en: "Edit product", ar: "تعديل المنتج" })}</h2>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-black/5" aria-label={l({ en: "Close", ar: "إغلاق" })}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-1 border-b border-[#e1e1e1] bg-white px-5" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${tab === t.id ? "border-[#1a1a1a] text-[#1a1a1a]" : "border-transparent text-[#616161] hover:text-[#1a1a1a]"}`}>{l(t)}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "details" && (
            <div className={`${card} grid gap-4 p-5 sm:grid-cols-2`}>
              <label className="text-sm font-medium">{l({ en: "Name (English)", ar: "الاسم (إنجليزي)" })}<input className={`${input} mt-1`} value={it.name.en} onChange={(e) => setIt({ ...it, name: { ...it.name, en: e.target.value } })} dir="ltr" /></label>
              <label className="text-sm font-medium">{l({ en: "Name (Arabic)", ar: "الاسم (عربي)" })}<input className={`${input} mt-1`} value={it.name.ar} onChange={(e) => setIt({ ...it, name: { ...it.name, ar: e.target.value } })} dir="rtl" /></label>
              <label className="text-sm font-medium">{l({ en: "Description (English)", ar: "الوصف (إنجليزي)" })}<textarea rows={4} className={`${input} mt-1`} value={it.description.en} onChange={(e) => setIt({ ...it, description: { ...it.description, en: e.target.value } })} dir="ltr" /></label>
              <label className="text-sm font-medium">{l({ en: "Description (Arabic)", ar: "الوصف (عربي)" })}<textarea rows={4} className={`${input} mt-1`} value={it.description.ar} onChange={(e) => setIt({ ...it, description: { ...it.description, ar: e.target.value } })} dir="rtl" /></label>
              <div className="text-sm font-medium sm:col-span-2">{l({ en: "Photos", ar: "الصور" })}
                <div className="mt-2 font-normal">
                  <ImageGallery images={it.images.length ? it.images : it.image ? [it.image] : []} onChange={(images) => setIt({ ...it, images, image: images[0] ?? "" })} />
                </div>
              </div>
            </div>
          )}

          {tab === "variants" && (
            <div className={`${card} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md text-sm text-[#616161]">{l({ en: "Each variant has its own price, SKU and stock. Leave stock empty to skip tracking.", ar: "لكل خيار سعره ورمزه ومخزونه. اترك المخزون فارغاً لعدم التتبع." })}</p>
                <div className="flex items-center gap-2">
                  <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="±%" dir="ltr" className={`${input} !w-20`} aria-label={l({ en: "Percent change", ar: "نسبة التغيير" })} />
                  <button className={btnLight} onClick={applyPct}>{l({ en: "Adjust all prices", ar: "تعديل كل الأسعار" })}</button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="text-xs text-[#616161]">
                      {["EN", "AR", "SKU", l({ en: "Price", ar: "السعر" }), l({ en: "Compare-at", ar: "قبل الخصم" }), l({ en: "Cost", ar: "التكلفة" }), l({ en: "Margin", ar: "الهامش" }), l({ en: "Stock", ar: "المخزون" }), l({ en: "Alert at", ar: "تنبيه عند" }), ""].map((h, i) => (
                        <th key={i} className="px-1 pb-2 text-start font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {it.variants.map((v, i) => {
                      const margin = v.cost !== null && v.price > 0 ? Math.round(((v.price - v.cost) / v.price) * 100) : null;
                      const c = `${input} !px-2`;
                      return (
                        <tr key={v.key + i}>
                          <td className="p-1"><input className={c} value={v.label.en} onChange={(e) => setV(i, { label: { ...v.label, en: e.target.value } })} dir="ltr" aria-label="EN" /></td>
                          <td className="p-1"><input className={c} value={v.label.ar} onChange={(e) => setV(i, { label: { ...v.label, ar: e.target.value } })} dir="rtl" aria-label="AR" /></td>
                          <td className="p-1"><input className={c} value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} dir="ltr" aria-label="SKU" /></td>
                          <td className="p-1"><input type="number" min={0} className={`${c} !w-20`} value={v.price || ""} onChange={(e) => setV(i, { price: Number(e.target.value) })} dir="ltr" aria-label="price" /></td>
                          <td className="p-1"><input type="number" min={0} className={`${c} !w-20`} value={v.compareAt ?? ""} onChange={(e) => setV(i, { compareAt: num(e.target.value) })} dir="ltr" aria-label="compare at" /></td>
                          <td className="p-1"><input type="number" min={0} className={`${c} !w-20`} value={v.cost ?? ""} onChange={(e) => setV(i, { cost: num(e.target.value) })} dir="ltr" aria-label="cost" /></td>
                          <td className="p-1 text-[#616161]"><bdi>{margin === null ? "—" : `${margin}%`}</bdi></td>
                          <td className="p-1"><input type="number" min={0} className={`${c} !w-20`} value={v.stock ?? ""} placeholder="—" onChange={(e) => setV(i, { stock: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))) })} dir="ltr" aria-label="stock" /></td>
                          <td className="p-1"><input type="number" min={0} className={`${c} !w-16`} value={v.threshold} onChange={(e) => setV(i, { threshold: Math.max(0, Number(e.target.value)) })} dir="ltr" aria-label="alert" /></td>
                          <td className="p-1"><button disabled={it.variants.length === 1} onClick={() => setIt({ ...it, variants: it.variants.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-[#A8322F] hover:bg-[#A8322F]/10 disabled:opacity-30" aria-label={l({ en: "Remove variant", ar: "حذف الخيار" })}><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button className={`${btnLight} mt-3`} onClick={() => setIt({ ...it, variants: [...it.variants, newVariant(it.variants.length + 1)] })}><Plus className="me-1 inline h-4 w-4" />{l({ en: "Add variant", ar: "إضافة خيار" })}</button>
            </div>
          )}

          {tab === "extras" && (
            <div className={`${card} grid gap-4 p-5 sm:grid-cols-2`}>
              <p className="text-sm text-[#616161] sm:col-span-2">{l({ en: "Optional. These fill the brewing steps and the facts list on the product page. Leave empty to hide them.", ar: "اختياري. تظهر في خطوات التحضير وقائمة المعلومات في صفحة المنتج. اتركها فارغة لإخفائها." })}</p>
              <label className="text-sm font-medium">{l({ en: "Brewing steps (English), one per line", ar: "خطوات التحضير (إنجليزي)، خطوة في كل سطر" })}<textarea rows={6} className={`${input} mt-1`} dir="ltr" value={(det.steps?.en ?? []).join("\n")} onChange={(e) => setDet({ steps: { ar: det.steps?.ar ?? [], en: lines(e.target.value) } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Brewing steps (Arabic), one per line", ar: "خطوات التحضير (عربي)، خطوة في كل سطر" })}<textarea rows={6} className={`${input} mt-1`} dir="rtl" value={(det.steps?.ar ?? []).join("\n")} onChange={(e) => setDet({ steps: { en: det.steps?.en ?? [], ar: lines(e.target.value) } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Note under the steps (English)", ar: "ملاحظة تحت الخطوات (إنجليزي)" })}<input className={`${input} mt-1`} dir="ltr" value={det.note?.en ?? ""} onChange={(e) => setDet({ note: { ar: det.note?.ar ?? "", en: e.target.value } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Note under the steps (Arabic)", ar: "ملاحظة تحت الخطوات (عربي)" })}<input className={`${input} mt-1`} dir="rtl" value={det.note?.ar ?? ""} onChange={(e) => setDet({ note: { en: det.note?.en ?? "", ar: e.target.value } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Pack size (English)", ar: "حجم العبوة (إنجليزي)" })}<input className={`${input} mt-1`} dir="ltr" placeholder="200 g" value={det.weight?.en ?? ""} onChange={(e) => setDet({ weight: { ar: det.weight?.ar ?? "", en: e.target.value } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Pack size (Arabic)", ar: "حجم العبوة (عربي)" })}<input className={`${input} mt-1`} dir="rtl" placeholder="200 جم" value={det.weight?.ar ?? ""} onChange={(e) => setDet({ weight: { en: det.weight?.en ?? "", ar: e.target.value } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Type (English)", ar: "النوع (إنجليزي)" })}<input className={`${input} mt-1`} dir="ltr" placeholder="Flavored ground coffee" value={det.type?.en ?? ""} onChange={(e) => setDet({ type: { ar: det.type?.ar ?? "", en: e.target.value } })} /></label>
              <label className="text-sm font-medium">{l({ en: "Type (Arabic)", ar: "النوع (عربي)" })}<input className={`${input} mt-1`} dir="rtl" value={det.type?.ar ?? ""} onChange={(e) => setDet({ type: { en: det.type?.en ?? "", ar: e.target.value } })} /></label>
              <div className="text-sm font-medium sm:col-span-2">{l({ en: "Blend ratio (Arabica / Robusta, %)", ar: "نسبة التوليفة (أرابيكا / روبوستا، %)" })}
                <div className="mt-1 flex items-center gap-2">
                  <input type="number" min={0} max={100} dir="ltr" className={`${input} !w-24`} aria-label="Arabica" value={det.ratio?.arabica ?? ""} onChange={(e) => e.target.value === "" && det.ratio?.robusta === undefined ? setDet({ ratio: undefined }) : setDet({ ratio: { arabica: Number(e.target.value), robusta: det.ratio?.robusta ?? 0 } })} />
                  <span>/</span>
                  <input type="number" min={0} max={100} dir="ltr" className={`${input} !w-24`} aria-label="Robusta" value={det.ratio?.robusta ?? ""} onChange={(e) => setDet({ ratio: { arabica: det.ratio?.arabica ?? 0, robusta: Number(e.target.value) } })} />
                  {det.ratio && <button type="button" className={btnLight} onClick={() => setDet({ ratio: undefined })}>{l({ en: "Clear", ar: "مسح" })}</button>}
                </div>
              </div>
              <label className="flex items-start gap-3 text-sm font-medium sm:col-span-2">
                <input type="checkbox" checked={!!det.showCard} onChange={(e) => setDet({ showCard: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#1a1a1a]" />
                <span>{l({ en: "Show the DIWAN card (front and back) next to the photos", ar: "عرض كارت ديوان (الوجه والظهر) بجانب الصور" })}<span className="mt-0.5 block text-xs font-normal text-[#616161]">{l({ en: "Uses the card colour and brewing steps from this product.", ar: "يستخدم لون الكارت وخطوات التحضير من هذا المنتج." })}</span></span>
              </label>
            </div>
          )}

          {tab === "organize" && (
            <div className={`${card} grid gap-4 p-5 sm:grid-cols-2`}>
              <label className="text-sm font-medium">{l({ en: "Status", ar: "الحالة" })}
                <select className={`${input} mt-1`} value={it.status} onChange={(e) => setIt({ ...it, status: e.target.value as ProductStatus })}>
                  {STATUS.map((s) => <option key={s.id} value={s.id}>{l(s)}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-[#616161]">{l({ en: "Only Active products appear in the store.", ar: "المنتجات النشطة فقط تظهر في المتجر." })}</span>
              </label>
              <label className="text-sm font-medium">{l({ en: "Category", ar: "الفئة" })}
                <select className={`${input} mt-1`} value={it.categoryId} onChange={(e) => setIt({ ...it, categoryId: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium sm:col-span-2">{l({ en: "Tags (comma separated)", ar: "الوسوم (مفصولة بفاصلة)" })}
                <input className={`${input} mt-1`} value={it.tags.join(", ")} onChange={(e) => setIt({ ...it, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              </label>
              <label className="text-sm font-medium">{l({ en: "Card colour", ar: "لون الكارت" })}
                <div className="mt-1 flex items-center gap-2"><input type="color" value={it.hex} onChange={(e) => setIt({ ...it, hex: e.target.value })} className="h-10 w-12 rounded-md border border-[#c9c9c9]" /><bdi className="text-sm text-[#616161]">{it.hex}</bdi></div>
              </label>
              <label className="text-sm font-medium">{l({ en: "Card art and text colour", ar: "لون رسمة الكارت والنص" })}
                <div className="mt-1 flex items-center gap-2"><input type="color" value={it.art} onChange={(e) => setIt({ ...it, art: e.target.value })} className="h-10 w-12 rounded-md border border-[#c9c9c9]" /><bdi className="text-sm text-[#616161]">{it.art}</bdi></div>
              </label>
            </div>
          )}
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

export default function ProductsPage() {
  const l = useLocalized();
  const lang = useLangStore((s) => s.lang);
  const items = useCatalogStore((s) => s.items);
  const categories = useCatalogStore((s) => s.categories);
  const del = useCatalogStore((s) => s.deleteItem);
  const upsert = useCatalogStore((s) => s.upsertItem);
  const push = useToastStore((s) => s.push);
  const [edit, setEdit] = useState<{ item: CatalogItem; isNew: boolean } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [sel, setSel] = useState<string[]>([]);

  const needle = q.trim().toLowerCase();
  const list = useMemo(
    () => items.filter((i) => (status === "all" || i.status === status) && (cat === "all" || i.categoryId === cat) && (!needle || i.name.en.toLowerCase().includes(needle) || i.name.ar.includes(needle) || i.variants.some((v) => v.sku.toLowerCase().includes(needle)))),
    [items, status, cat, needle],
  );
  const allSel = list.length > 0 && list.every((i) => sel.includes(i.id));
  const bulk = (fn: (i: CatalogItem) => void) => { items.filter((i) => sel.includes(i.id)).forEach(fn); setSel([]); };

  const duplicate = (i: CatalogItem) => {
    let n = 2;
    while (items.some((x) => x.id === `${i.id}-copy${n === 2 ? "" : n}`)) n++;
    const id = `${i.id}-copy${n === 2 ? "" : n}`;
    void upsert({ ...i, id, name: { ar: `${i.name.ar} (نسخة)`, en: `${i.name.en} (copy)` }, status: "draft", variants: i.variants.map((v) => ({ ...v, sku: `${v.sku}-COPY`, stock: null })) });
  };

  const exportCsv = () =>
    downloadCsv("diwan-products.csv", [
      ["Product", "Variant", "SKU", "Category", "Status", "Price (EGP)", "Compare at", "Cost", "Stock"],
      ...items.flatMap((i) => i.variants.map((v) => [i.name.en, v.label.en, v.sku, i.categoryId, i.status, v.price, v.compareAt, v.cost, v.stock])),
    ]);

  return (
    <>
      <PageHead
        title={l({ en: "Products", ar: "المنتجات" })}
        action={
          <div className="flex flex-wrap gap-2">
            <button className={btnLight} onClick={exportCsv}><Download className="me-1.5 inline h-4 w-4" />CSV</button>
            <button className={btnDark} onClick={() => setEdit({ item: blank(categories[0]?.id ?? ""), isNew: true })} disabled={categories.length === 0}><Plus className="me-1 inline h-4 w-4" />{l({ en: "Add product", ar: "إضافة منتج" })}</button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8a8a]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l({ en: "Search name or SKU", ar: "ابحث بالاسم أو الرمز" })} className={`${input} ps-9`} aria-label={l({ en: "Search products", ar: "بحث في المنتجات" })} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={`${input} !w-auto`} aria-label={l({ en: "Status", ar: "الحالة" })}>
          <option value="all">{l({ en: "All statuses", ar: "كل الحالات" })}</option>
          {STATUS.map((s) => <option key={s.id} value={s.id}>{l(s)}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} className={`${input} !w-auto`} aria-label={l({ en: "Category", ar: "الفئة" })}>
          <option value="all">{l({ en: "All categories", ar: "كل الفئات" })}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{l(c.name)}</option>)}
        </select>
      </div>

      {sel.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm text-white">
          <span><bdi>{sel.length}</bdi> {l({ en: "selected", ar: "محدد" })}</span>
          <button className="rounded-md px-3 py-1 hover:bg-white/10" onClick={() => bulk((i) => void upsert({ ...i, status: "active" }))}>{l({ en: "Set active", ar: "تنشيط" })}</button>
          <button className="rounded-md px-3 py-1 hover:bg-white/10" onClick={() => bulk((i) => void upsert({ ...i, status: "draft" }))}>{l({ en: "Set draft", ar: "مسودة" })}</button>
          <button className="rounded-md px-3 py-1 hover:bg-white/10" onClick={() => bulk((i) => void upsert({ ...i, status: "archived" }))}>{l({ en: "Archive", ar: "أرشفة" })}</button>
          <button className="rounded-md px-3 py-1 text-[#ffb4ab] hover:bg-white/10" onClick={() => askConfirm({ title: l({ en: `Delete ${sel.length} products?`, ar: `حذف ${sel.length} منتجات؟` }), confirmLabel: l({ en: "Confirm", ar: "تأكيد" }), cancelLabel: l({ en: "Cancel", ar: "إلغاء" }), danger: true }).then((ok) => { if (ok) bulk((i) => void del(i.id)); })}>{l({ en: "Delete", ar: "حذف" })}</button>
          <button className="ms-auto rounded-md px-3 py-1 hover:bg-white/10" onClick={() => setSel([])}>{l({ en: "Clear", ar: "مسح" })}</button>
        </div>
      )}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#e1e1e1] text-xs text-[#616161]">
              <th className="w-10 p-3"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : list.map((i) => i.id))} className="h-4 w-4 accent-[#1a1a1a]" aria-label={l({ en: "Select all", ar: "تحديد الكل" })} /></th>
              {[{ en: "Product", ar: "المنتج" }, { en: "Status", ar: "الحالة" }, { en: "Stock", ar: "المخزون" }, { en: "Category", ar: "الفئة" }, { en: "Price", ar: "السعر" }].map((h) => <th key={h.en} className="p-3 text-start font-medium">{l(h)}</th>)}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const prices = i.variants.map((v) => v.price);
              const lo = Math.min(...prices), hi = Math.max(...prices);
              const tracked = i.variants.filter((v) => v.stock !== null);
              const total = tracked.reduce((a, v) => a + (v.stock ?? 0), 0);
              const st = STATUS.find((s) => s.id === i.status)!;
              return (
                <tr key={i.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                  <td className="p-3"><input type="checkbox" checked={sel.includes(i.id)} onChange={() => setSel(sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id])} className="h-4 w-4 accent-[#1a1a1a]" aria-label={i.name.en} /></td>
                  <td className="p-3">
                    <button className="flex items-center gap-3 text-start" onClick={() => setEdit({ item: i, isNew: false })}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {i.image ? <img src={i.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-[#ececec]" />}
                      <span><span className="block font-medium hover:underline">{i.name[lang]}</span><span className="text-xs text-[#8a8a8a]"><bdi>{i.variants.length}</bdi> {i.variants.length === 1 ? l({ en: "variant", ar: "خيار" }) : l({ en: "variants", ar: "خيارات" })}</span></span>
                    </button>
                  </td>
                  <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{l(st)}</span></td>
                  <td className="p-3 text-[#616161]"><bdi>{tracked.length === 0 ? l({ en: "Not tracked", ar: "غير متتبَّع" }) : `${total}`}</bdi></td>
                  <td className="p-3">{categoryName(categories, i.categoryId, lang)}</td>
                  <td className="p-3"><bdi>{lo === hi ? money(lo, lang) : `${money(lo, lang)} – ${hi}`}</bdi></td>
                  <td className="p-3 text-end whitespace-nowrap">
                    <button className="me-1 rounded-md p-2 hover:bg-black/5" onClick={() => duplicate(i)} aria-label={l({ en: `Duplicate ${i.name.en}`, ar: `نسخ ${i.name.ar}` })}><Copy className="h-4 w-4" /></button>
                    <button className="rounded-md p-2 text-[#A8322F] hover:bg-[#A8322F]/10" onClick={() => askConfirm({ title: l({ en: `Delete ${i.name.en}?`, ar: `حذف ${i.name.ar}؟` }), confirmLabel: l({ en: "Confirm", ar: "تأكيد" }), cancelLabel: l({ en: "Cancel", ar: "إلغاء" }), danger: true }).then((ok) => { if (ok) { void del(i.id); push(l({ en: `${i.name.en} deleted`, ar: `تم حذف ${i.name.ar}` }), "ok", { label: l({ en: "Undo", ar: "تراجع" }), run: () => void upsert(i) }); } })} aria-label={l({ en: `Delete ${i.name.en}`, ar: `حذف ${i.name.ar}` })}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-[#616161]">{l({ en: "No products match. Adjust the filters or add one.", ar: "لا منتجات مطابقة. عدّل التصفية أو أضف منتجاً." })}</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <Editor key={edit.item.id || "new"} initial={edit.item} isNew={edit.isNew} onClose={() => setEdit(null)} />}
    </>
  );
}
