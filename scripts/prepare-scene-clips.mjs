// Builds the hero video from public/video/video-v2.mp4 (one locked shot of the Turkish coffee ritual).
// Usage: node scripts/prepare-scene-clips.mjs
//
// The hero plays the whole ritual once, start to end. To repeat without a visible cut, the last X frames
// dissolve into the opening frames and the player jumps back to frame LOOP, so later passes pick up where
// the dissolve left off (the very first pass still starts at frame 0).
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = process.env.FFMPEG_PATH || require("ffmpeg-static");

const INPUT = "public/video/video-v2.mp4";
const OUT = "public/video";
const FRAMES = 240; // 10 s at 24 fps
const X = 12; // dissolve length in frames
const LOOP = 12; // the player jumps here after the last frame; keep in sync with HeroVideo.tsx
const SIZES = [
  ["hero", 1280, 720, 21],
  ["hero-m", 960, 540, 25],
];

const trim = (a, b) => `trim=start_frame=${a}:end_frame=${b + 1},setpts=PTS-STARTPTS`;

mkdirSync(OUT, { recursive: true });
for (const [name, w, h, crf] of SIZES) {
  const graph = [
    "[0:v]split=3[h][ta][tb]",
    `[h]${trim(0, FRAMES - 1 - X)}[head]`,
    `[ta]${trim(FRAMES - X, FRAMES - 1)}[a]`,
    `[tb]${trim(LOOP - X, LOOP - 1)}[b]`,
    `[a][b]blend=all_expr='A*(1-(N+1)/${X})+B*((N+1)/${X})'[mix]`,
    `[head][mix]concat=n=2:v=1:a=0,scale=${w}:${h}:flags=lanczos,format=yuv420p[v]`,
  ].join(";");
  execFileSync(
    ffmpeg,
    ["-y", "-loglevel", "error", "-i", INPUT, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-profile:v", "main", "-crf", String(crf), "-g", "24", "-movflags", "+faststart", "-an", `${OUT}/${name}.mp4`],
    { stdio: "inherit" },
  );
  console.log(`${name}.mp4`);
}

// poster: the first frame, shown while the video loads
for (const [name, w] of [["poster", 1280], ["poster-m", 960]]) {
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", INPUT, "-frames:v", "1", "-vf", `scale=${w}:-2`, "-q:v", "4", `${OUT}/${name}.jpg`], { stdio: "inherit" });
}
