// Cuts the scroll clips out of public/video/video-v2.mp4 (one locked shot of the Turkish coffee ritual).
// Usage: node scripts/prepare-scene-clips.mjs
//
// Each scene plays its action once, then loops its calm stretch. A loop is seamless because the clip
// ends with X frames that dissolve into the footage just before the loop point, so the jump from the
// last frame back to `loop` lands on a frame that continues the picture.
//
// `slow` stretches the last part of a scene (the loop stretch) so the repeating cycle is longer and calmer;
// the gaps are filled with blended in-between frames. With `slow`, `loop: "tail"` starts the loop where the slow part begins.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = process.env.FFMPEG_PATH || require("ffmpeg-static");

const INPUT = "public/video/video-v2.mp4";
const OUT = "public/video/scenes";

/** source frames at 24 fps, inclusive. */
const SCENES = [
  { name: "powder", from: 0, to: 39, loop: 18 }, // coffee powder streams into the cezve
  { name: "stir", from: 48, to: 95, slow: { from: 80, factor: 2 }, loop: "tail" }, // water goes in, the spoon stirs
  { name: "simmer", from: 100, to: 131, slow: { from: 116, factor: 2 }, loop: "tail" }, // the flame lights, steam rises
  { name: "cup", from: 144, to: 239, slow: { from: 226, factor: 3 }, loop: "tail" }, // the pour, then the cup stands still
];
const X = 8; // dissolve length in frames
const SIZES = [
  ["", 1280, 720, 21],
  ["-m", 960, 540, 25],
];

const trim = (a, b) => `trim=start_frame=${a}:end_frame=${b + 1},setpts=PTS-STARTPTS`;
const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

/** number of video frames in a file */
function countFrames(file) {
  const r = spawnSync(ffmpeg, ["-i", file, "-map", "0:v", "-f", "null", "-"], { encoding: "utf8" });
  const hits = [...r.stderr.matchAll(/frame=\s*(\d+)/g)];
  return Number(hits[hits.length - 1][1]);
}

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "diwan-clips-"));

for (const s of SCENES) {
  // 1. the scene's footage, with the slow part already stretched
  let source = INPUT;
  let first = s.from;
  let last = s.to;
  let loop = typeof s.loop === "number" ? s.loop : null;
  if (s.slow) {
    const mid = join(work, `${s.name}.mp4`);
    run([
      "-i", INPUT,
      "-filter_complex",
      [
        "[0:v]split=2[h][t]",
        `[h]${trim(s.from, s.slow.from - 1)}[head]`,
        `[t]${trim(s.slow.from, s.to)},setpts=${s.slow.factor}*PTS,minterpolate=fps=24:mi_mode=blend[tail]`,
        "[head][tail]concat=n=2:v=1:a=0,format=yuv420p[v]",
      ].join(";"),
      "-map", "[v]", "-c:v", "libx264", "-crf", "12", "-an", mid,
    ]);
    source = mid;
    first = 0;
    last = countFrames(mid) - 1;
    if (s.loop === "tail") loop = s.slow.from - s.from + X; // the dissolve blends the end into the start of the slow part
  }

  // 2. the web clips, with the loop dissolve baked in
  for (const [suffix, w, h, crf] of SIZES) {
    let graph;
    if (loop === null) {
      graph = `[0:v]${trim(first, last)},scale=${w}:${h}:flags=lanczos,format=yuv420p[v]`;
    } else {
      const a = first + loop;
      graph = [
        "[0:v]split=3[h][ta][tb]",
        `[h]${trim(first, last - X)}[head]`,
        `[ta]${trim(last - X + 1, last)}[a]`,
        `[tb]${trim(a - X, a - 1)}[b]`,
        `[a][b]blend=all_expr='A*(1-(N+1)/${X})+B*((N+1)/${X})'[mix]`,
        `[head][mix]concat=n=2:v=1:a=0,scale=${w}:${h}:flags=lanczos,format=yuv420p[v]`,
      ].join(";");
    }
    run([
      "-i", source, "-filter_complex", graph, "-map", "[v]",
      "-c:v", "libx264", "-profile:v", "main", "-crf", String(crf),
      "-g", "6", "-bf", "0", "-movflags", "+faststart", "-an",
      `${OUT}/${s.name}${suffix}.mp4`,
    ]);
    console.log(`${s.name}${suffix}.mp4  (${last - first + 1} frames, loop at ${loop ?? "none"})`);
  }
}
rmSync(work, { recursive: true, force: true });
