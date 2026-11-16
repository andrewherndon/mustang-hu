#!/usr/bin/env python3
"""
Perspective-correct spinning rims for a still car image.

For each rim: fit the rim's ellipse from its silver pixels (convex hull +
moments), find the hub (centroid of the dark centre cap / lug holes), and build
the homography H that maps a head-on unit disc onto that rim *in perspective*
(ellipse + projected centre fixes the plane). Then:
  * un-project the rim into a frontal disc image (ImageMagick -distort Perspective)
  * print H (in disc-pixel -> image-pixel form) for CSS matrix3d, so the page
    can rotate the disc and re-project it exactly onto the picture.

usage: tools/rim_fit.py car.png out_dir name:cx,cy,rx,ry [...]
  (cx, cy, rx, ry = rough ellipse around the rim, a little larger, bounds the search)
"""
import json, math, os, subprocess, sys

def load_rgba(path):
    w, h = map(int, subprocess.check_output(["magick", "identify", "-format", "%w %h", path]).split())
    raw = subprocess.check_output(["magick", path, "-depth", "8", "rgba:-"])
    return w, h, raw

def px(raw, w, x, y):
    i = (y * w + x) * 4
    return raw[i], raw[i + 1], raw[i + 2], raw[i + 3]

def hull(points):
    pts = sorted(set(points))
    if len(pts) < 3: return pts
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]

def polygon_moments(poly):
    """Area, centroid and central second moments of a filled polygon."""
    A = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        c = x0 * y1 - x1 * y0
        A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    A /= 2; cx /= 6 * A; cy /= 6 * A
    sxx = syy = sxy = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        x0, y0, x1, y1 = x0 - cx, y0 - cy, x1 - cx, y1 - cy
        c = x0 * y1 - x1 * y0
        sxx += (x0*x0 + x0*x1 + x1*x1) * c
        syy += (y0*y0 + y0*y1 + y1*y1) * c
        sxy += (x0*y1 + 2*x0*y0 + 2*x1*y1 + x1*y0) * c
    sxx /= 12 * A; syy /= 12 * A; sxy /= 24 * A
    return abs(A), cx, cy, sxx, syy, sxy

def fit_rim(raw, w, h, cx0, cy0, rx0, ry0):
    silver, dark = [], []
    for y in range(max(0, int(cy0 - ry0)), min(h, int(cy0 + ry0))):
        for x in range(max(0, int(cx0 - rx0)), min(w, int(cx0 + rx0))):
            if ((x - cx0) / rx0) ** 2 + ((y - cy0) / ry0) ** 2 > 1: continue
            r, g, b, a = px(raw, w, x, y)
            if a < 200: continue
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            sat = max(r, g, b) - min(r, g, b)
            if sat < 38 and lum > 120: silver.append((x, y))
    hp = hull(silver)
    A, ex, ey, sxx, syy, sxy = polygon_moments(hp)
    tr, det = sxx + syy, sxx * syy - sxy * sxy
    l1 = tr / 2 + math.sqrt(max(0, tr * tr / 4 - det)); l2 = tr / 2 - math.sqrt(max(0, tr * tr / 4 - det))
    a, b = 2 * math.sqrt(l1), 2 * math.sqrt(l2)          # semi-axes: a filled ellipse has variance (semi-axis)^2 / 4
    phi = 0.5 * math.atan2(2 * sxy, sxx - syy)          # angle of the major axis
    # hub: centroid of dark pixels near the middle (centre cap + lug holes)
    for y in range(int(ey - 0.3 * b), int(ey + 0.3 * b)):
        for x in range(int(ex - 0.3 * b), int(ex + 0.3 * b)):
            r, g, bb, al = px(raw, w, x, y)
            if al > 200 and 0.3 * r + 0.59 * g + 0.11 * bb < 95 and max(r, g, bb) - min(r, g, bb) < 40: dark.append((x, y))
    hx = sum(p[0] for p in dark) / len(dark); hy = sum(p[1] for p in dark) / len(dark)
    return dict(ex=ex, ey=ey, a=a, b=b, phi=phi, hx=hx, hy=hy, n_silver=len(silver), n_dark=len(dark))

def mat_mul(A, B): return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]

def mat_inv(m):
    a, b, c = m[0]; d, e, f = m[1]; g, h, i = m[2]
    det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    return [[(e*i - f*h) / det, (c*h - b*i) / det, (b*f - c*e) / det],
            [(f*g - d*i) / det, (a*i - c*g) / det, (c*d - a*f) / det],
            [(d*h - e*g) / det, (b*g - a*h) / det, (a*e - b*d) / det]]

def apply(H, x, y):
    X = H[0][0]*x + H[0][1]*y + H[0][2]; Y = H[1][0]*x + H[1][1]*y + H[1][2]; W = H[2][0]*x + H[2][1]*y + H[2][2]
    return X / W, Y / W

def homography(f):
    """Unit disc (head-on) -> rim in the image, through the fitted ellipse and hub."""
    c, s = math.cos(f["phi"]), math.sin(f["phi"])
    A = [[c * f["a"], -s * f["b"], f["ex"]], [s * f["a"], c * f["b"], f["ey"]], [0, 0, 1]]   # a, b are semi-axes
    # hub in the ellipse's normalised frame (unit circle)
    Ai = mat_inv(A)
    ux, uy = apply(Ai, f["hx"], f["hy"])
    d = min(0.6, math.hypot(ux, uy)); al = math.atan2(uy, ux)
    # projective map of the unit circle onto itself sending 0 -> (d, 0): a "boost"
    g = math.sqrt(1 - d * d)
    B = [[1, 0, d], [0, g, 0], [d, 0, 1]]
    R = [[math.cos(al), -math.sin(al), 0], [math.sin(al), math.cos(al), 0], [0, 0, 1]]
    Ri = [[math.cos(al), math.sin(al), 0], [-math.sin(al), math.cos(al), 0], [0, 0, 1]]
    return mat_mul(A, mat_mul(R, mat_mul(B, Ri)))

def main():
    car, out = sys.argv[1], sys.argv[2]
    w, h, raw = load_rgba(car)
    result = {}
    for spec in sys.argv[3:]:
        name, nums = spec.split(":"); cx0, cy0, rx0, ry0 = map(float, nums.split(","))
        f = fit_rim(raw, w, h, cx0, cy0, rx0, ry0)
        H = homography(f)
        R = round(max(f["a"], f["b"]))                     # frontal disc radius in px (rim edge)
        S = [[R, 0, R], [0, R, R], [0, 0, 1]]              # unit disc -> disc pixels
        M = mat_mul(H, mat_inv(S))                         # disc pixels -> image pixels
        M = [[v / M[2][2] for v in row] for row in M]
        # un-project: 8 points on the rim circle (and a bit inside) -> frontal disc
        pairs = []
        for k in range(8):
            t = k * math.pi / 4
            for rr in (0.97, 0.5):
                ux, uy = rr * math.cos(t), rr * math.sin(t)
                ix, iy = apply(H, ux, uy)
                pairs += [f"{ix:.3f},{iy:.3f} {R + ux * R:.3f},{R + uy * R:.3f}"]
        disc = f"{out}/{name}.png"
        subprocess.check_call(["magick", car, "-virtual-pixel", "transparent", "-define", f"distort:viewport={2*R}x{2*R}+0+0",
                               "-distort", "Perspective", " ".join(pairs), "+repage", f"PNG32:{disc}"])
        # keep only the disc (rim + a sliver of tyre): circular alpha mask
        mask = f"{out}/{name}-mask.png"
        subprocess.check_call(["magick", "-size", f"{2*R}x{2*R}", "xc:black", "-fill", "white",
                               "-draw", f"circle {R},{R} {R},{R - R * 0.975:.2f}", mask])
        subprocess.check_call(["magick", disc, mask, "-alpha", "off", "-compose", "CopyAlpha", "-composite", f"PNG32:{disc}"])
        os.remove(mask)
        # brake callipers don't turn with the wheel: neutralise saturated reds in the
        # disc to rotor-dark grey so nothing red travels around the rim
        subprocess.check_call(["magick", disc, "-channel", "RGB", "-fx",
                               "(r > 0.25 && r > 1.5*g && r > 1.5*b) ? 0.13 + 0.15*(g+b)/2 : u", "+channel", f"PNG32:{disc}"])
        result[name] = dict(size=2 * R, matrix=M, fit={k: round(v, 2) for k, v in f.items()})
    print(json.dumps(result, indent=1))

if __name__ == "__main__":
    main()
