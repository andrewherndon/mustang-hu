"""Turn the white-background car loop into a transparent WebM for the dark UI.

    python3 tools/car_video_alpha.py <in.mp4> <out.webm> [preview.png]

Per pixel, white is un-mixed into transparency: alpha = (255 - min(R,G,B))/255,
colour = (c - (1 - alpha) * 255) / alpha. White becomes clear, the grey road
and soft fades become translucent, the yellow headlight beams a glow.

Outside the car, colours are kept and "how far from white" is mapped to
opacity with a curve (white clears, the grey road is nearly opaque, fades and
the headlight beams are partly transparent).

The car itself must stay solid (its cream interior and light glass would
otherwise turn see-through). It holds position in the clip, so one mask from
the first frame (red paint + dark trim/tyres, holes filled, largest blob)
keeps it opaque in every frame.

Output: VP9 with alpha (yuva420p), cropped around the car and its headlight
beams, scaled to OUT_W wide, no audio. Needs ffmpeg, numpy, scipy, Pillow.
"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.spatial import ConvexHull

src, dst = sys.argv[1], sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
OUT_W = 1280
# Opacity curve outside the car, on (255 - min(RGB)) / 255: below LO clear,
# above HI opaque. The road is ~0.55, the background white ~0.
ROAD_ALPHA_LO, ROAD_ALPHA_HI = 0.07, 0.5

probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate", "-of", "csv=p=0", src],
                       capture_output=True, text=True, check=True).stdout.strip().split(",")
W, H, fps = int(probe[0]), int(probe[1]), probe[2]


def frames():
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    p.wait()


S = 2   # masks are computed at half resolution (fast enough per frame), then upscaled


def car_mask(frame):
    """Soft (0..1) mask of the car in one frame, full resolution.

    Computed per frame so it follows the car's bounce."""
    f = frame[::S, ::S].astype(np.int16)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    red = (r > 110) & (r - np.maximum(g, b) > 45)
    dark = f.max(axis=2) < 58
    car = ndimage.binary_closing(red | dark, iterations=9)
    car = ndimage.binary_fill_holes(car)
    labels, _ = ndimage.label(car)
    car = labels == (np.bincount(labels.ravel())[1:].argmax() + 1)
    ys, xs = np.nonzero(car)
    x0_, cw_ = xs.min(), xs.max() - xs.min()
    # The headlight glare over the front bumper is pale, not red, so it is not
    # in the mask. The front of the car is convex in this view: add the convex
    # hull of its red/dark pixels, which encloses the glare.
    front = car.copy()
    front[:, int(x0_ + 0.45 * cw_):] = False
    fy, fx = np.nonzero(front)
    pts = np.column_stack([fx, fy])
    hull = ConvexHull(pts)
    poly = Image.new("1", (car.shape[1], car.shape[0]), 0)
    ImageDraw.Draw(poly).polygon([tuple(map(int, pts[v])) for v in hull.vertices], fill=1)
    car |= np.asarray(poly, bool)
    # Light background caught inside (the wedge between hood and windshield
    # pillar, specks by the tyres): light pixels connected to the outside.
    light = f.min(axis=2) > 232
    lab, _ = ndimage.label(light)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    car &= ~ndimage.binary_dilation(np.isin(lab, border[border > 0]), iterations=1)
    car = ndimage.binary_opening(car, iterations=1)
    # Just inside the outline, so the antialiased rim is un-mixed from white.
    car = ndimage.binary_erosion(car, iterations=1)
    soft = ndimage.gaussian_filter(car.astype(np.float32), 0.8)
    return np.asarray(Image.fromarray((soft * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR),
                      np.float32) / 255.0


first = next(frames())
m0 = car_mask(first) > 0.5
ys, xs = np.nonzero(m0)
cx0, cx1, cy0, cy1 = xs.min(), xs.max(), ys.min(), ys.max()
cw, ch = cx1 - cx0, cy1 - cy0
x0 = max(0, int(cx0 - 0.45 * cw)); x1 = min(W, int(cx1 + 0.12 * cw))   # beams reach left
y0 = max(0, int(cy0 - 0.20 * ch)); y1 = min(H, int(cy1 + 0.30 * ch))
cw_out = OUT_W
ch_out = int(round((y1 - y0) * OUT_W / (x1 - x0) / 2)) * 2
print(f"car box {cx0},{cy0}-{cx1},{cy1}; crop {x0},{y0}-{x1},{y1} -> {cw_out}x{ch_out}")

# Fade the crop's edges to transparent so the road dissolves instead of
# ending in a hard line where the crop cuts it (the car is never faded).
cw_in, ch_in = x1 - x0, y1 - y0
fx = np.minimum(np.arange(cw_in) / (0.16 * cw_in), (cw_in - 1 - np.arange(cw_in)) / (0.22 * cw_in))
fy = np.minimum(np.arange(ch_in) / (0.18 * ch_in), (ch_in - 1 - np.arange(ch_in)) / (0.25 * ch_in))
edge_fade = np.clip(np.outer(np.clip(fy, 0, 1), np.clip(fx, 0, 1)), 0, 1)
edge_fade = edge_fade * edge_fade * (3 - 2 * edge_fade)                 # smoothstep

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba",
                        "-s", f"{cw_out}x{ch_out}", "-r", fps, "-i", "-",
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
                        "-row-mt", "1", "-deadline", "good", "-an", dst], stdin=subprocess.PIPE)

for i, f in enumerate(frames()):
    c = f[y0:y1, x0:x1].astype(np.float32)
    keep = car_mask(f)[y0:y1, x0:x1]
    # Outside the car: keep the original colours and map "how far from white"
    # to opacity with a curve: near-white clears (no haze), the grey road is
    # almost opaque, its fades and the headlight beams are in between.
    a_mix = np.clip((255.0 - c.min(axis=2)) / 255.0, 0, 1)
    t = np.clip((a_mix - ROAD_ALPHA_LO) / (ROAD_ALPHA_HI - ROAD_ALPHA_LO), 0, 1)
    a_bg = t * t * (3 - 2 * t) * edge_fade
    a = np.maximum(a_bg, keep)                                # the car is always solid
    fg = c
    rgba = np.dstack([fg, a * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA").resize((cw_out, ch_out), Image.LANCZOS)
    enc.stdin.write(img.tobytes())
    if i == 0 and preview:
        bg = Image.new("RGBA", img.size, (40, 28, 8, 255))
        Image.alpha_composite(bg, img).save(preview)

enc.stdin.close()
enc.wait()
print("wrote", dst)
