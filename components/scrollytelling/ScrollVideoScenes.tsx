"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

const FPS = 24;
const FADE_MS = 520;

/**
 * One clip per scene (cut from video-v2.mp4 by scripts/prepare-scene-clips.mjs).
 * Looping clips end on frames that dissolve into the footage before `loop`, so jumping back is seamless.
 * Without `loop` a clip plays once and holds its last frame.
 */
const CLIPS = [
  { name: "powder", loop: 18, still: 30 }, // coffee powder streams into the cezve
  { name: "stir", loop: 40, still: 34 }, // water goes in, the spoon stirs
  { name: "simmer", loop: 24, still: 30 }, // the flame lights, steam rises
  { name: "cup", loop: 90, still: 112 }, // the pour, then the cup stands still
] as const;

export const SCENE_COUNT = CLIPS.length;

export interface ScrollVideoScenesHandle {
  /** Bring scene `index` in. Scrolling down plays it from the start, scrolling up joins it at its loop. */
  show: (index: number, dir?: 1 | -1) => void;
}

interface ScrollVideoScenesProps {
  ref?: Ref<ScrollVideoScenesHandle>;
  className?: string;
  /** Show one still per scene instead of playing. */
  still?: boolean;
  /** Fires once the first clip can play. */
  onReady?: () => void;
  /** Fires when the first clip reaches its loop point for the first time (the bean pour is done). */
  onIntroEnd?: () => void;
}

type Deck = HTMLVideoElement | null;

const frameCount = (v: HTMLVideoElement) => Math.round(v.duration * FPS);

/** Resolves once the video has a frame to show at its current position. */
const whenSeeked = (v: HTMLVideoElement) =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      v.removeEventListener("seeked", finish);
      resolve();
    };
    v.addEventListener("seeked", finish);
    window.setTimeout(finish, 400);
  });

type FrameSource = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };

/** Resolves on the first frame actually painted after play() starts, so the fade never shows a stale picture. */
const whenPainted = (v: HTMLVideoElement) =>
  new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const src = v as FrameSource;
    if (typeof src.requestVideoFrameCallback === "function") src.requestVideoFrameCallback(finish);
    else v.addEventListener("playing", finish, { once: true });
    window.setTimeout(finish, 300);
  });

export default function ScrollVideoScenes({ ref, className = "", still = false, onReady, onIntroEnd }: ScrollVideoScenesProps) {
  const videos = useRef<Deck[]>([]);
  const active = useRef(-1);
  const token = useRef(0);
  const introEnded = useRef(false);
  const speed = useRef(1);
  const callbacks = useRef({ onReady, onIntroEnd });

  useEffect(() => {
    callbacks.current = { onReady, onIntroEnd };
  });

  const ensureLoaded = (v: HTMLVideoElement) =>
    v.readyState >= 2
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          v.addEventListener("loadeddata", () => resolve(), { once: true });
          window.setTimeout(resolve, 700);
        });

  const show = async (index: number, dir: 1 | -1 = 1) => {
    if (index === active.current) return;
    const me = ++token.current;
    const prev = active.current;
    const next = videos.current[index];
    const clip = CLIPS[index];
    if (!next) return;

    await ensureLoaded(next);
    if (me !== token.current) return;

    // work out where to join the clip
    const frames = frameCount(next) || 1;
    let startFrame = 0;
    if (still) startFrame = clip.still;
    else if (dir === -1) startFrame = clip.loop ?? frames - 1;
    next.pause();
    next.currentTime = Math.min(startFrame, frames - 1) / FPS;
    await whenSeeked(next);
    if (me !== token.current) return;

    if (!still && !(dir === -1 && clip.loop === null)) {
      next.playbackRate = 1;
      next.play().catch(() => {});
      await whenPainted(next);
      if (me !== token.current) return;
    }

    active.current = index;
    videos.current.forEach((v, i) => {
      if (!v) return;
      v.style.transition = `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      v.style.opacity = i === index ? "1" : "0";
      v.style.zIndex = i === index ? "2" : i === prev ? "1" : "0";
    });

    // stop the outgoing clip once it has faded out
    const old = videos.current[prev];
    if (old) window.setTimeout(() => active.current !== prev && old.pause(), FADE_MS + 80);
  };

  useImperativeHandle(ref, () => ({ show }));

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    let readyFired = false;
    const cleanups: (() => void)[] = [];

    videos.current.forEach((v, i) => {
      if (!v) return;
      v.src = `/video/scenes/${CLIPS[i].name}${mobile ? "-m" : ""}.mp4`;
      v.load();
      if (i === 0) {
        const ready = () => {
          if (readyFired) return;
          readyFired = true;
          callbacks.current.onReady?.();
        };
        v.addEventListener("canplaythrough", ready, { once: true });
        cleanups.push(() => v.removeEventListener("canplaythrough", ready));
      }
    });

    // scrolling pushes the footage along: faster scroll, faster picture, never slower than real time
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.max(1, now - lastT);
      const y = window.scrollY;
      const v = (Math.abs(y - lastY) / dt) * 1000; // px per second
      lastY = y;
      lastT = now;
      const target = 1 + Math.min(1.3, v / 2200);
      speed.current += (target - speed.current) * (target > speed.current ? 0.18 : 0.06);

      const i = active.current;
      const el = videos.current[i];
      if (el && !still && el.duration && !el.paused) {
        const rate = Math.max(1, Math.min(2.4, speed.current));
        if (Math.abs(el.playbackRate - rate) > 0.02) el.playbackRate = rate;
        const loop = CLIPS[i].loop;
        const lead = (1.1 * rate) / FPS; // leave early enough for the seek to land on the next frame
        if (el.currentTime >= el.duration - lead) {
          if (i === 0 && !introEnded.current) {
            introEnded.current = true;
            callbacks.current.onIntroEnd?.();
          }
          if (loop !== null) el.currentTime = loop / FPS;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // never keep the page locked if the first clip cannot play
    const fallback = window.setTimeout(() => {
      if (!readyFired) {
        readyFired = true;
        callbacks.current.onReady?.();
      }
    }, 3500);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      cleanups.forEach((fn) => fn());
    };
  }, [still]);

  return (
    <div className={`absolute inset-0 will-change-transform ${className}`}>
      {CLIPS.map((clip, i) => (
        <video
          key={clip.name}
          ref={(el) => {
            videos.current[i] = el;
          }}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          className="scene-video absolute inset-0 h-full w-full object-cover"
          style={{ opacity: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 0, maxWidth: "none" }}
        />
      ))}
    </div>
  );
}
