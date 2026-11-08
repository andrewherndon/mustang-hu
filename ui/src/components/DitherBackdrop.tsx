import { useEffect, useRef } from "react";

/**
 * Dithered, duotone light-beam background (WebGL).
 *
 * A soft field of slowly drifting shapes (a tapering slash, a sweeping arc, a
 * wavy ribbon, a short steep slash and a glow) is computed
 * per pixel, then reduced to two tones with an ordered dither whose threshold
 * pattern is a tiny "x" in every 5x5-block cell (blocks of DOT pixels): shadows stay solid dark,
 * mid-tones become a fine grid of crosses that thickens as it brightens, and
 * highlights fill in. Rendered at the panel's native resolution so the
 * pattern is crisp, throttled to 30 fps (the motion is slow), and stopped
 * entirely while hidden behind an app or when motion is turned off.
 */

interface Props {
  hue: number;
  running: boolean;    // animate (home visible and motion on)
}

const VERT = `
attribute vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;
uniform vec3 cBase, cMid, cHi;

// Soft profile: 1 within 'width' of a shape, fading to 0 over 'soft'.
float soft(float d, float width, float soft) {
  return 1.0 - smoothstep(width, width + soft, d);
}

// Size of one pattern "pixel" in screen pixels: the x is drawn with 2x2
// blocks, so each 5x5 cell is 10 px wide on the panel.
const float DOT = 2.0;

// 4x4 Bayer matrix value in [0, 1) without a lookup table.
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

// Threshold for this pattern pixel inside its 5x5 cell. The "x" (centre, then
// the two diagonals) switches on first, so mid-tones show crosses; the other
// 16 pixels follow, spread evenly by Bayer order so shading stays continuous.
float threshold(vec2 frag) {
  vec2 c = mod(floor(frag / DOT), 5.0);
  float i = c.x, j = c.y;
  bool diag = (i == j) || (i + j == 4.0);
  float ring = max(abs(i - 2.0), abs(j - 2.0));      // 0 centre, 1, 2 outer
  if (diag) return 0.05 + ring * 0.16;                 // 0.05 / 0.21 / 0.37
  return 0.50 + 0.48 * bayer4(c) * (16.0 / 15.0);
}

// Distance from p to a straight line at 'angle' through 'offset' (along its
// normal), and the position along it.
vec2 line(vec2 p, float angle, float offset) {
  vec2 n = vec2(cos(angle), sin(angle));
  vec2 tg = vec2(-n.y, n.x);
  return vec2(dot(p, n) - offset, dot(p, tg));
}

void main() {
  vec2 p = gl_FragCoord.xy / res.y;                    // aspect-correct, y up; x 0..1.5
  float v = 0.0;

  // 1. Tapering diagonal slash: thin at one end, broad at the other.
  vec2 l1 = line(p, -0.62 + 0.04 * sin(t * 0.05), 0.66 + 0.08 * sin(t * 0.031));
  float w1 = 0.004 + 0.03 * smoothstep(-0.6, 0.9, l1.y);
  v += 0.55 * soft(abs(l1.x), w1, 0.26);

  // 2. Long arc curving up to the top right (edge of a huge circle).
  vec2 c2 = vec2(0.2 + 0.06 * sin(t * 0.023), 2.6 + 0.05 * cos(t * 0.029));
  float r2 = 2.2 + 0.04 * sin(t * 0.035);
  v += 0.42 * soft(abs(length(p - c2) - r2), 0.01, 0.22);

  // 3. Wavy ribbon low across the screen.
  vec2 l3 = line(p, -0.18, 0.62 + 0.05 * sin(t * 0.04 + 1.0));
  float wave = 0.07 * sin(l3.y * 3.5 + t * 0.12) + 0.03 * sin(l3.y * 8.0 - t * 0.07);
  v += 0.38 * soft(abs(l3.x - wave), 0.012, 0.2);

  // 4. Short steep slash, upper left, fading out at both ends.
  vec2 g4 = p - vec2(0.30 + 0.04 * sin(t * 0.03), 0.80 + 0.04 * cos(t * 0.027));
  vec2 l4 = line(g4, -1.05 + 0.03 * sin(t * 0.06 + 2.0), 0.0);
  v += 0.50 * exp(-dot(g4, g4) * 7.0) * soft(abs(l4.x), 0.02, 0.16);

  // 5. Faint glow, upper right.
  vec2 g = p - vec2(1.30 + 0.10 * sin(t * 0.02), 0.90 + 0.08 * cos(t * 0.025));
  v += 0.22 * exp(-dot(g, g) * 3.0);
  v = clamp(v, 0.0, 1.0);

  // Multi-level ordered dither: brightness steps through LEVELS tones and the
  // pattern above dithers between neighbouring tones (no flat blocks).
  const float LEVELS = 9.0;
  float q = min(floor(v * LEVELS + (1.0 - threshold(gl_FragCoord.xy))), LEVELS) / LEVELS;
  vec3 col = mix(cBase, cMid, clamp(q / 0.55, 0.0, 1.0));
  col = mix(col, cHi, clamp((q - 0.55) / 0.45, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

/** OKLCH -> linear sRGB -> gamma sRGB (0..1), clamped. */
function oklch(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h), b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  const lin = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return lin.map((x) => {
    const v = Math.max(0, Math.min(1, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  }) as [number, number, number];
}

export function DitherBackdrop({ hue, running }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const gl = useRef<{ ctx: WebGLRenderingContext; prog: WebGLProgram } | null>(null);
  const draw = useRef<(() => void) | null>(null);
  const start = useRef(performance.now() - Math.random() * 600_000);   // random phase per load

  // Set up WebGL once.
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!ctx) return;
    const shader = (type: number, src: string) => {
      const s = ctx.createShader(type)!;
      ctx.shaderSource(s, src);
      ctx.compileShader(s);
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) console.error(ctx.getShaderInfoLog(s));
      return s;
    };
    const prog = ctx.createProgram()!;
    ctx.attachShader(prog, shader(ctx.VERTEX_SHADER, VERT));
    ctx.attachShader(prog, shader(ctx.FRAGMENT_SHADER, FRAG));
    ctx.linkProgram(prog);
    ctx.useProgram(prog);
    const buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(prog, "pos");
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    gl.current = { ctx, prog };

    const resize = () => {
      const r = el.getBoundingClientRect();
      // Native panel pixels (getBoundingClientRect includes the stage's fit scale).
      el.width = Math.round(r.width * devicePixelRatio);
      el.height = Math.round(r.height * devicePixelRatio);
      ctx.viewport(0, 0, el.width, el.height);
      draw.current?.();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Colours from the chosen hue.
  useEffect(() => {
    const g = gl.current;
    if (!g) return;
    const { ctx, prog } = g;
    const set = (name: string, c: [number, number, number]) => ctx.uniform3f(ctx.getUniformLocation(prog, name), ...c);
    set("cBase", oklch(0.11, 0.02, hue));
    set("cMid", oklch(0.36, 0.13, hue));
    set("cHi", oklch(0.72, 0.15, hue + 8));
    draw.current = () => {
      ctx.uniform2f(ctx.getUniformLocation(prog, "res"), canvas.current!.width, canvas.current!.height);
      ctx.uniform1f(ctx.getUniformLocation(prog, "t"), (performance.now() - start.current) / 1000);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    };
    draw.current();
  }, [hue]);

  // Animate at ~30 fps while running; otherwise keep the last frame.
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      draw.current?.();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return <canvas ref={canvas} className="dither" aria-hidden />;
}
