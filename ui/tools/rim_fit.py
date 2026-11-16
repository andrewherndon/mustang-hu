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

usage: [PLATE=spokeless.png] tools/rim_fit.py car.png out_dir name:cx,cy,rx,ry [...]
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

def unproject(car, f, R, path):
    H = homography(f)
    pairs = []
    for k in range(8):
        t = k * math.pi / 4
        for rr in (0.97, 0.5):
            ux, uy = rr * math.cos(t), rr * math.sin(t)
            ix, iy = apply(H, ux, uy)
            pairs += [f"{ix:.3f},{iy:.3f} {R + ux * R:.3f},{R + uy * R:.3f}"]
    subprocess.check_call(["magick", car, "-virtual-pixel", "transparent", "-define", f"distort:viewport={2*R}x{2*R}+0+0",
                           "-distort", "Perspective", " ".join(pairs), "+repage", f"PNG32:{path}"])
    return H

def symmetry(path, R, out):
    """How five-fold symmetric the bright (spoke) pixels are, inside 0.85 R: NCC with the 72-degree copy."""
    m, r = f"{out}/_m.png", f"{out}/_r.png"
    subprocess.check_call(["magick", path, "-fx",
        f"(hypot(i-{R},j-{R}) < {0.85 * R} && (0.3*r+0.59*g+0.11*b) > 0.42 && (max(r,max(g,b)) - min(r,min(g,b))) < 0.2 && u.a > 0.5) ? 1 : 0",
        "-colorspace", "Gray", m])
    subprocess.check_call(["magick", m, "-virtual-pixel", "black", "-distort", "SRT", f"{R},{R} 72", r])
    res = subprocess.run(["magick", "compare", "-metric", "NCC", m, r, "null:"], capture_output=True, text=True)
    os.remove(m); os.remove(r)
    # ImageMagick 7 reports NCC as a distortion: "raw (normalised)", 0 = identical
    return 1 - float(res.stderr.split("(")[1].split(")")[0])

def refine_hub(car, f, R, out):
    """Search the projected hub position (+-12 px) for the most five-fold-symmetric disc."""
    tmp = f"{out}/_d.png"
    best = (symmetry_of(car, f, R, tmp, out), f["hx"], f["hy"])
    for step in (2.0, 1.0, 0.5):
        improved = True
        while improved:
            improved = False
            for dx, dy in ((step, 0), (-step, 0), (0, step), (0, -step)):
                g = dict(f, hx=best[1] + dx, hy=best[2] + dy)
                if abs(g["hx"] - f["hx"]) > 12 or abs(g["hy"] - f["hy"]) > 12: continue
                sc = symmetry_of(car, g, R, tmp, out)
                if sc > best[0] + 1e-4: best = (sc, g["hx"], g["hy"]); improved = True
    os.remove(tmp)
    return dict(f, hx=best[1], hy=best[2], sym=best[0])

def symmetry_of(car, f, R, tmp, out):
    unproject(car, f, R, tmp)
    return symmetry(tmp, R, out)

def main():
    car, out = sys.argv[1], sys.argv[2]
    w, h, raw = load_rgba(car)
    result, plates = {}, []
    plate = os.environ.get("PLATE")   # same image with the spokes removed (aligned)
    for spec in sys.argv[3:]:
        name, nums = spec.split(":"); cx0, cy0, rx0, ry0 = map(float, nums.split(","))
        f = fit_rim(raw, w, h, cx0, cy0, rx0, ry0)
        R = round(max(f["a"], f["b"]))                     # frontal disc radius in px (rim edge)
        f0 = dict(f)
        f = refine_hub(car, f, R, out)
        print(f"{name}: hub {f0['hx']:.1f},{f0['hy']:.1f} -> {f['hx']:.1f},{f['hy']:.1f}  symmetry {f['sym']:.3f}", file=sys.stderr)
        disc = f"{out}/{name}.png"
        H = unproject(car, f, R, disc)
        S = [[R, 0, R], [0, R, R], [0, 0, 1]]              # unit disc -> disc pixels
        M = mat_mul(H, mat_inv(S))                         # disc pixels -> image pixels
        M = [[v / M[2][2] for v in row] for row in M]
        # keep only the disc (rim + a sliver of tyre): circular alpha mask
        mask = f"{out}/{name}-mask.png"
        subprocess.check_call(["magick", "-size", f"{2*R}x{2*R}", "xc:black", "-fill", "white",
                               "-draw", f"circle {R},{R} {R},{R - R * 0.975:.2f}", mask])
        subprocess.check_call(["magick", disc, mask, "-alpha", "off", "-compose", "CopyAlpha", "-composite", f"PNG32:{disc}"])
        os.remove(mask)
        # only the spokes and centre cap turn: everything else in the disc (gaps,
        # barrel, rotor, calliper) becomes transparent so the static plate shows.
        # Spokes are found by brightness, then kept only where the wheel's
        # five-fold symmetry agrees (a pixel and its 72/144/216/288-degree copies
        # are mostly bright): the one-sided barrel crescent and lip glare fail that.
        cap, outer = 0.3 * R, 0.88 * R
        thr = os.environ.get(f"SYM_{name.upper()}", "68")   # % of the 5 rotations that must agree
        m = f"{out}/{name}-m.png"
        subprocess.check_call(["magick", disc, "-fx",
            "((0.3*r+0.59*g+0.11*b) > 0.42 && (max(r,max(g,b)) - min(r,min(g,b))) < 0.2 && u.a > 0.5) ? 1 : 0",
            "-colorspace", "Gray", m])
        rots = []
        for k in range(5):
            rk = f"{out}/{name}-m{k}.png"
            subprocess.check_call(["magick", m, "-virtual-pixel", "black", "-distort", "SRT", f"{R},{R} {72 * k}", rk])
            rots.append(rk)
        sym = f"{out}/{name}-sym.png"
        subprocess.check_call(["magick", *rots, "-evaluate-sequence", "mean", "-threshold", f"{thr}%",
            "-fx", f"(hypot(i-{R},j-{R}) < {cap}) ? 1 : ((hypot(i-{R},j-{R}) < {outer}) ? u : 0)",
            "-morphology", "Close", f"Disk:{1.5 if R > 90 else 2.5}", "-blur", "0x0.7", sym])
        subprocess.check_call(["magick", disc, "-alpha", "off", sym, "-compose", "CopyAlpha", "-composite", f"PNG32:{disc}"])
        for f_ in [m, sym, *rots]: os.remove(f_)
        plates.append((H, 0.92))
        result[name] = dict(size=2 * R, matrix=M, fit={k: round(v, 2) for k, v in f.items()})
    if plate:
        polys = []
        for H, r in plates:
            pts = [apply(H, r * math.cos(k * math.pi / 48), r * math.sin(k * math.pi / 48)) for k in range(96)]
            polys.append("polygon " + " ".join(f"{x:.2f},{y:.2f}" for x, y in pts))
        mask = f"{out}/plate-mask.png"
        subprocess.check_call(["magick", "-size", f"{w}x{h}", "xc:black", "-fill", "white", "-draw", " ".join(polys), "-blur", "0x1", mask])
        subprocess.check_call(["magick", plate, mask, "-alpha", "off", "-compose", "CopyAlpha", "-composite", f"PNG32:{out}/hubs.png"])
        os.remove(mask)
        result["plate"] = "hubs.png"
    print(json.dumps(result, indent=1))

if __name__ == "__main__":
    main()
