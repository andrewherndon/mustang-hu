"""Cut the Mustang illustration out of its white background into two layers.

    python tools/cutout_car.py <source.png> <out_dir>

Writes <out_dir>/mustang-car.png (the car, transparent background) and
<out_dir>/mustang-shadow.png (its ground shadow as translucent black), both
cropped to the same box so they line up when stacked.

- Background: flood-filled from the image edges through near-white pixels;
  anti-aliased fringe pixels get partial alpha with the white removed.
- Shadow: the flat grey (~47) region under the car, flood-filled from a seed
  below the front wheel; tyres are much darker (~20) so they stay in the car.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.int32)
H, W, _ = rgb.shape
mn, mx = rgb.min(axis=2), rgb.max(axis=2)
neutral = (mx - mn) < 14


def flood(seeds, allowed):
    seen = np.zeros((H, W), bool)
    q = deque(p for p in seeds if allowed[p])
    for p in q:
        seen[p] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not seen[ny, nx] and allowed[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


# --- background (white) ---
white = neutral & (mn > 228)
edges = [(0, x) for x in range(W)] + [(H - 1, x) for x in range(W)] + \
        [(y, 0) for y in range(H)] + [(y, W - 1) for y in range(H)]
bg = flood(edges, white)

# Fringe: neutral light pixels touching the background get partial alpha.
alpha = np.ones((H, W), np.float32)
alpha[bg] = 0
grown = bg.copy()
for _ in range(2):
    g = grown.copy()
    g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
    grown = g
fringe = grown & ~bg & (mn > 150)
alpha[fringe] = np.clip((255 - mn[fringe]) / (255 - 150), 0, 1)

# --- shadow (flat grey under the car) ---
shadow_px = neutral & (mn >= 36) & (mx <= 60)
seed_candidates = [(y, x) for y in range(780, 900, 4) for x in range(500, 1100, 8)]
shadow = flood(seed_candidates, shadow_px)

# Un-premultiply white from fringe colours: c = (c - (1 - a) * 255) / a
col = rgb.astype(np.float32)
a3 = alpha[..., None]
col = np.where(a3 > 0.02, (col - (1 - a3) * 255) / np.maximum(a3, 0.02), col)
col = np.clip(col, 0, 255)

car = np.dstack([col, alpha * 255 * ~shadow]).astype(np.uint8)
shadow_layer = np.zeros((H, W, 4), np.uint8)
shadow_layer[..., 3] = (shadow * 150).astype(np.uint8)       # translucent black

# Crop both layers to the union box.
ys, xs = np.nonzero((car[..., 3] > 0) | shadow)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
Image.fromarray(car).crop(box).save(f"{out}/mustang-car.png", optimize=True)
Image.fromarray(shadow_layer).crop(box).save(f"{out}/mustang-shadow.png", optimize=True)
print("box", box, "shadow px", int(shadow.sum()), "bg px", int(bg.sum()))
