/**
 * Palette dithering (Browserbase-style pixel art). A source (image, video,
 * canvas) is drawn small, each pixel is snapped to the nearest palette colour
 * with a Bayer ordered dither, and the result is drawn back up as square or
 * round "pixels". Ordered dither is stable frame to frame, so live video
 * doesn't shimmer the way error diffusion does.
 */
export type RGB = [number, number, number];

export const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => v / 64 - 0.5);

export interface DitherOpts {
  palette: string[];
  /** Pixel size on screen, in canvas px. */
  cell: number;
  /** "square" pixels or "dot"s (halftone look). */
  shape?: "square" | "dot";
  /** How strongly the dither pattern pushes colours (0..1, default 0.6). */
  spread?: number;
  contrast?: number;
  brightness?: number;
  saturation?: number;
  /** Background behind dots. */
  bg?: string;
}

/** Dither `src` (natural size sw×sh) into `dst`, cover-fitted. */
export function ditherDraw(src: CanvasImageSource, sw: number, sh: number, dst: HTMLCanvasElement, o: DitherOpts, work: HTMLCanvasElement) {
  const W = dst.width, H = dst.height;
  const cols = Math.max(1, Math.floor(W / o.cell)), rows = Math.max(1, Math.floor(H / o.cell));
  if (work.width !== cols || work.height !== rows) { work.width = cols; work.height = rows; }
  const w = work.getContext("2d", { willReadFrequently: true })!;
  const s = Math.max(cols / sw, rows / sh), dw = sw * s, dh = sh * s;
  w.imageSmoothingEnabled = true;
  w.drawImage(src, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
  const img = w.getImageData(0, 0, cols, rows), d = img.data;
  const pal = o.palette.map(hexToRgb), spread = (o.spread ?? 0.6) * 110;
  const c = o.contrast ?? 1, b = o.brightness ?? 0, sat = o.saturation ?? 1;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = (y * cols + x) * 4, t = BAYER8[(y & 7) * 8 + (x & 7)] * spread;
    let r = d[i], g = d[i + 1], bl = d[i + 2];
    if (sat !== 1) { const l = r * 0.3 + g * 0.59 + bl * 0.11; r = l + (r - l) * sat; g = l + (g - l) * sat; bl = l + (bl - l) * sat; }
    r = (r - 128) * c + 128 + b + t; g = (g - 128) * c + 128 + b + t; bl = (bl - 128) * c + 128 + b + t;
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const p = pal[k], dr = r - p[0], dg = g - p[1], db = bl - p[2];
      const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dist < bd) { bd = dist; best = k; }
    }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
  }
  const g = dst.getContext("2d")!;
  if (o.shape === "dot") {
    g.fillStyle = o.bg ?? "#fff"; g.fillRect(0, 0, W, H);
    const r = o.cell * 0.44;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      g.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
      g.beginPath(); g.arc(x * o.cell + o.cell / 2, y * o.cell + o.cell / 2, r, 0, 6.3); g.fill();
    }
  } else {
    w.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.drawImage(work, 0, 0, cols * o.cell, rows * o.cell);
  }
}

/** Seeded 2D value noise with octaves (terrain, contours). Returns 0..1. */
export function noise2(seed: number) {
  const r = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); };
  const n = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = r(xi, yi), b = r(xi + 1, yi), c = r(xi, yi + 1), dd = r(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + dd) * u * v;
  };
  return (x: number, y: number) => n(x, y) * 0.55 + n(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.28 + n(x * 4.3 + 9.1, y * 4.3 + 7.7) * 0.17;
}
