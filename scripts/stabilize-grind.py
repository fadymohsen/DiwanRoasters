"""
Builds assets-src/grind-open-stabilized.mp4, the source of the "grind" scene clip.

Why: in the source video the camera keeps pushing in while the grinder opens, so no stretch of that shot
repeats cleanly. This script pins the last frames of the scene to one pose (so the machine stays put),
slows them to a third of the speed, and leaves the normal-speed opening untouched before them.
`node scripts/prepare-scene-clips.mjs` then cuts the web clips from the result and bakes the loop.

Usage (from the repo root): python scripts/stabilize-grind.py     needs: opencv-python, numpy, ffmpeg-static (npm i)
"""
import glob
import os
import subprocess
import tempfile

import cv2
import numpy as np

FF = os.path.join("node_modules", "ffmpeg-static", "ffmpeg.exe" if os.name == "nt" else "ffmpeg")
SRC = os.path.join("public", "video", "gemini_generated_video_93485268.mp4")
OUT = os.path.join("assets-src", "grind-open-stabilized.mp4")

FIRST, LAST = 53, 108  # the scene's source frames
START = 40  # scene frame where stabilising and slow motion begin (the machine is open and the stream is steady)
RAMP = 4  # frames over which the pose eases from the real camera to the pinned one
ZOOM = 1.08  # small extra zoom so the warp never needs pixels outside the frame
SLOW = 3  # slow-motion factor

work = tempfile.mkdtemp()
subprocess.run([FF, "-y", "-loglevel", "error", "-i", SRC, "-vf", f"select='between(n,{FIRST},{LAST})'", "-vsync", "0", os.path.join(work, "r_%03d.png")], check=True)
files = sorted(glob.glob(os.path.join(work, "r_*.png")))
imgs = [cv2.imread(f) for f in files]
N = len(imgs)
H, W = imgs[0].shape[:2]


def gray(i):
    g = cv2.cvtColor(cv2.resize(imgs[i], (W // 2, H // 2)), cv2.COLOR_BGR2GRAY)
    return cv2.GaussianBlur(g, (0, 0), 2).astype(np.float32)


# align on the machine's side arms only, not on the falling grounds
mask = np.zeros((H // 2, W // 2), np.uint8)
mask[:, : int(W // 2 * 0.30)] = 255
mask[:, int(W // 2 * 0.70) :] = 255

ref = gray(N - 1)
warps = {}
for i in range(N - 2, START - 1, -1):
    warp = warps[i + 1].copy() if (i + 1) in warps else np.eye(2, 3, dtype=np.float32)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6)
    _, warp = cv2.findTransformECC(ref, gray(i), warp, cv2.MOTION_AFFINE, crit, mask, 5)
    warps[i] = warp


def smooth(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def full(w):
    f = w.copy()
    f[:, 2] *= 2  # estimated at half resolution
    return np.vstack([f, [0, 0, 1]]).astype(np.float64)


cx, cy = W / 2, H / 2
zinv = np.array([[1 / ZOOM, 0, cx - cx / ZOOM], [0, 1 / ZOOM, cy - cy / ZOOM], [0, 0, 1]])
flags = cv2.INTER_LANCZOS4 + cv2.WARP_INVERSE_MAP
out = list(imgs)
for i in range(START, N - 1):
    al = smooth((i - START) / RAMP)
    target = (full(warps[i]) @ zinv)[:2]
    m = ((1 - al) * np.eye(3)[:2] + al * target).astype(np.float32)
    out[i] = cv2.warpAffine(imgs[i], m, (W, H), flags=flags, borderMode=cv2.BORDER_REFLECT_101)
out[N - 1] = cv2.warpAffine(imgs[N - 1], zinv[:2].astype(np.float32), (W, H), flags=flags, borderMode=cv2.BORDER_REFLECT_101)

for i, o in enumerate(out):
    cv2.imwrite(os.path.join(work, f"o_{i:03d}.png"), o)

os.makedirs("assets-src", exist_ok=True)
pat = os.path.join(work, "o_%03d.png")
graph = (
    f"[0:v]trim=end_frame={START},setpts=PTS-STARTPTS[h];"
    f"[1:v]trim=end_frame={N - START},setpts={SLOW}*(PTS-STARTPTS),minterpolate=fps=24:mi_mode=blend[t];"
    "[h][t]concat=n=2:v=1:a=0,format=yuv420p[v]"
)
subprocess.run(
    [FF, "-y", "-loglevel", "error", "-framerate", "24", "-i", pat, "-framerate", "24", "-start_number", str(START), "-i", pat,
     "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-crf", "10", "-preset", "medium", "-g", "6", OUT],
    check=True,
)
print("wrote", OUT)
