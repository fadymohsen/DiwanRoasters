"use client";

import type { MouseEvent } from "react";
import Link from "@/components/ui/LocLink";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { CATEGORY_META, PRODUCTS, type CategoryId } from "@/data/products";
import { useLangStore } from "@/lib/i18n";

interface CategoryCardProps {
  category: CategoryId;
  defaultRotation: number;
  className?: string;
}

/** One of the three coffee categories, floating over the final scene. */
export default function CategoryCard({ category, defaultRotation, className = "" }: CategoryCardProps) {
  const lang = useLangStore((s) => s.lang);
  const meta = CATEGORY_META[category];
  const blends = PRODUCTS.filter((p) => p.categoryId === category);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 220, damping: 22 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 22 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [9, -9]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-9, 9]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ rotateZ: defaultRotation }}
      whileHover={{ scale: 1.03, rotateZ: 0 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`select-none rounded-2xl border border-n200 bg-n100/90 shadow-[0_24px_48px_-12px_rgba(14,58,51,0.12)] backdrop-blur-md max-md:!transform-none md:w-72 md:shrink-0 md:rounded-[14px] md:p-4 ${className}`}
    >
      {/* phones: the whole card is the link */}
      <Link href={`/shop?category=${category}`} className="flex flex-col items-center gap-1.5 px-1.5 py-3 text-center md:hidden" aria-label={meta.label[lang]}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blends[0].image} alt="" className="h-14 w-14 rounded-full border-2 border-n100 object-cover shadow-md" style={{ background: blends[0].hex }} />
        <span className="font-editorial text-[15px] font-semibold leading-tight text-green">{meta.label[lang]}</span>
      </Link>

      {/* desktop: whole card is a link */}
      <Link href={`/shop?category=${category}`} className="hidden md:block" aria-label={meta.label[lang]}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-green/60">
            {lang === "ar" ? `${blends.length} توليفات` : `${blends.length} blends`}
          </span>
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {blends.map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.id} src={b.image} alt="" className="h-7 w-7 rounded-full border-2 border-n100 object-cover" style={{ background: b.hex }} title={lang === "ar" ? b.name : b.nameEn} />
            ))}
          </div>
        </div>
        <h3 className="font-editorial text-2xl font-semibold leading-tight text-green">{meta.label[lang]}</h3>
        <p className="mt-1 text-[11px] leading-snug text-n500 [@media(max-height:760px)]:hidden">{meta.blurb[lang]}</p>
      </Link>
    </motion.div>
  );
}
