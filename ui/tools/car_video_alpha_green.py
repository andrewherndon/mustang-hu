"""Key the green-screen car loop into a transparent WebM for the dark UI.

    python3 tools/car_video_alpha_green.py <in.mp4> <out.webm> [preview.png]

Classic green-difference keyer, per pixel:
  - greenness = G - max(R, B). The flat background (~(33,244,25)) is ~210, the
    car and road ~0 or negative. alpha = 1 - smoothstep(LO, HI, greenness).
  - Un-mix the background from partly transparent pixels (edges, headlight
    beams over green): fg = (c - (1 - a) * bg) / a.
  - Despill: G = min(G, max(R, B)) so no green tint survives on rims, glass
    edges or the beams.
The windshield shows green through the glass, so it keys to transparent too,
which looks natural over the UI background.
Then the same as the white-background version: crop around the car and its
headlight beams, fade the crop edges so the road dissolves, scale to OUT_W,
VP9 with alpha (yuva420p), no audio. Needs ffmpeg, numpy, scipy, Pillow.
"""
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
OUT_W = 1280
LO, HI = 28.0, 150.0          # greenness range from solid to fully keyed
BEAM_FADE = 90.0              # light on the green fades out by this greenness

probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate", "-of", "csv=p=0", src],
                       capture_output=True, text=True, check=True).stdout.strip().split(",")
W, H, fps = int(probe[0]), int(probe[1]), probe[2]


def frames():
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    size = W * H * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.stdout.close()
    p.wait()


first = next(frames())

# Background colour: median of clearly green pixels in the first frame.
f0 = first.astype(np.int16)
green0 = (f0[..., 1] - np.maximum(f0[..., 0], f0[..., 2])) > 150
BG = np.median(f0[green0], axis=0).astype(np.float32)

# Crop around the car (red paint) and the beams to its left, like the white version.
red = (f0[..., 0] > 110) & (f0[..., 0] - np.maximum(f0[..., 1], f0[..., 2]) > 45)
red = ndimage.binary_opening(red, iterations=2)
ys, xs = np.nonzero(red)
cx0, cx1, cy0, cy1 = np.percentile(xs, 0.5), np.percentile(xs, 99.5), np.percentile(ys, 0.5), np.percentile(ys, 99.5)
cw, ch = cx1 - cx0, cy1 - cy0
x0 = max(0, int(cx0 - 0.45 * cw)); x1 = min(W, int(cx1 + 0.15 * cw))
y0 = max(0, int(cy0 - 0.25 * ch)); y1 = min(H, int(cy1 + 0.40 * ch))
ch_out = int(round((y1 - y0) * OUT_W / (x1 - x0) / 2)) * 2
print(f"bg {BG}; car box {cx0:.0f},{cy0:.0f}-{cx1:.0f},{cy1:.0f}; crop {x0},{y0}-{x1},{y1} -> {OUT_W}x{ch_out}")

# Fade the crop's edges so the road dissolves instead of ending at the crop line.
cw_in, ch_in = x1 - x0, y1 - y0
fx = np.minimum(np.arange(cw_in) / (0.16 * cw_in), (cw_in - 1 - np.arange(cw_in)) / (0.22 * cw_in))
fy = np.minimum(np.arange(ch_in) / (0.18 * ch_in), (ch_in - 1 - np.arange(ch_in)) / (0.25 * ch_in))
edge_fade = np.clip(np.outer(np.clip(fy, 0, 1), np.clip(fx, 0, 1)), 0, 1)
edge_fade = edge_fade * edge_fade * (3 - 2 * edge_fade)

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                        "-s", f"{OUT_W}x{ch_out}", "-r", fps, "-i", "-",
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
                        "-row-mt", "1", "-deadline", "good", "-an", dst], stdin=subprocess.PIPE)

for i, f in enumerate(frames()):
    c = f[y0:y1, x0:x1].astype(np.float32)
    greenness = c[..., 1] - np.maximum(c[..., 0], c[..., 2])
    t = np.clip((greenness - LO) / (HI - LO), 0, 1)
    a = 1 - t * t * (3 - 2 * t)
    # Headlight beams that fall on the green screen "light up" the green:
    # those pixels are still a little green-dominant, so fade them further
    # into a soft glow (the car and road are never green-dominant).
    a *= np.clip(1 - np.maximum(greenness, 0) / BEAM_FADE, 0, 1)
    # Choke the matte a touch and soften it: removes compression fringe.
    a = ndimage.grey_erosion(a, size=(2, 2))
    a = ndimage.gaussian_filter(a, 0.6)
    a3 = a[..., None]
    fg = np.where(a3 > 0.02, (c - (1 - a3) * BG) / np.maximum(a3, 0.02), c)
    fg = np.clip(fg, 0, 255)
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]))      # despill
    # Glass: green seen through the windshield leaves an odd tint after keying;
    # make strongly keyed pixels a neutral smoky grey instead.
    glass = np.clip((greenness - 70) / 60, 0, 1)[..., None]
    fg = fg * (1 - glass) + fg.mean(axis=2, keepdims=True) * glass
    rgba = np.dstack([fg, a * edge_fade * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA").resize((OUT_W, ch_out), Image.LANCZOS)
    enc.stdin.write(img.tobytes())
    if i == 0 and preview:
        bg = Image.new("RGBA", img.size, (40, 28, 8, 255))
        Image.alpha_composite(bg, img).save(preview)

enc.stdin.close()
enc.wait()
print("wrote", dst)
