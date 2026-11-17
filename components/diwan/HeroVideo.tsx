"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "@/components/ui/LocLink";
import { useLocalized, translations } from "@/lib/i18n";

const FPS = 24;
/** Frame the video returns to after its last frame; must match LOOP in scripts/prepare-scene-clips.mjs. */
const LOOP_FRAME = 12;

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
});

/** The first screen: the whole coffee ritual plays through as the background, start to end, on its own. */
export default function HeroVideo() {
  const l = useLocalized();
  const t = translations;
  const video = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    v.src = phone ? "/video/hero-m.mp4" : "/video/hero.mp4";

    if (reduced) {
      // no motion wanted: show the finished cup and stay still
      v.addEventListener("loadedmetadata", () => { v.currentTime = Math.max(0, v.duration - 0.2); }, { once: true });
      return;
    }

    v.play().catch(() => {});
    // one full pass from the first frame; afterwards it repeats from the dissolve, so there is no visible cut
    const loop = window.setInterval(() => {
      if (v.duration && v.currentTime >= v.duration - 1.2 / FPS) v.currentTime = LOOP_FRAME / FPS;
    }, 30);

    // save battery: pause while the hero is off screen or the tab is hidden
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !document.hidden) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.05 });
    if (section.current) io.observe(section.current);
    const onVis = () => { if (document.hidden) v.pause(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(loop);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <section ref={section} id="top" className="relative h-svh min-h-[34rem] w-full overflow-hidden bg-n100 md:bg-sandy" aria-label="DIWAN">
      {/* the video: full screen on desktop, the lower half on phones */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52svh] [mask-image:linear-gradient(to_bottom,transparent_14%,#000_34%)] md:inset-0 md:h-auto md:[mask-image:none]">
        <video
          ref={video}
          muted
          loop={false}
          playsInline
          autoPlay
          preload="auto"
          poster="/video/poster.jpg"
          disablePictureInPicture
          aria-hidden="true"
          className="scene-video absolute inset-0 h-full w-full object-cover"
          style={{ maxWidth: "none" }}
        />
      </div>

      <div className="relative z-10 h-full">
        <div className="absolute inset-x-0 top-[max(10%,6rem)] flex flex-col items-start px-5 md:top-[22%] md:flex-row md:items-start md:justify-between md:px-20">
          <motion.h1 {...rise(0.2)}>
            <span className="sr-only">{l({ en: "DIWAN", ar: "ديوان" })}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/diwan/Diwan_Logo_Colour_tight.png"
              alt=""
              aria-hidden="true"
              className="h-24 w-auto md:h-[clamp(9rem,32vh,19rem)] [@media(max-height:560px)]:h-14"
            />
          </motion.h1>
          <motion.p
            {...rise(0.35)}
            className="mt-3 font-arabic text-[clamp(1.35rem,6.4vw,1.9rem)] font-bold leading-tight text-aqeeq md:mt-0 md:w-[26vw] md:text-end md:text-[clamp(1.8rem,3.3vw,3.6rem)] [@media(max-height:560px)]:hidden"
          >
            {l({ en: "The story begins with a cup", ar: "الحكاية تبدأ بفنجان" })}
          </motion.p>
        </div>

        <motion.div
          {...rise(0.5)}
          className="absolute inset-x-5 top-[max(37%,17.5rem)] max-w-sm md:bottom-16 md:end-auto md:start-20 md:top-auto md:max-w-md [@media(max-height:560px)]:top-[11.5rem]"
        >
          <p className="mb-5 text-sm leading-relaxed text-n500 md:text-base">{l(t.hero.tagline)}</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2.5 rounded-full bg-green px-6 py-3 text-xs font-semibold uppercase tracking-widest text-sandy shadow-lg transition hover:bg-green/90 active:scale-[0.97]"
          >
            <span>{l(t.hero.shopNow)}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </Link>
        </motion.div>

        <motion.button
          {...rise(0.9)}
          onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-full bg-n100/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-green backdrop-blur-md"
        >
          <span>{l(t.hero.scroll)}</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </motion.button>
      </div>
    </section>
  );
}
