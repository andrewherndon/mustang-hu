import { useEffect, useRef } from "react";

/**
 * Dithered, duotone light-beam background (WebGL).
 *
 * A soft field of slowly drifting diagonal light beams and glows is computed
 * per pixel, then reduced to two tones with an ordered dither whose threshold
 * pattern is a tiny "x" in every 5x5 pixel cell: shadows stay solid dark,
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

// Soft beam: 1 on a line through the screen at 'angle', fading over 'soft'.
float beam(vec2 p, float angle, float offset, float width, float soft) {
  vec2 n = vec2(cos(angle), sin(angle));
  float d = abs(dot(p, n) - offset);
  return 1.0 - smoothstep(width, width + soft, d);
}

// Threshold for this pixel inside its 5x5 cell: lowest at the centre, then
// along the two diagonals (the "x"), highest elsewhere.
float threshold(vec2 frag) {
  vec2 c = mod(floor(frag), 5.0);
  float i = c.x, j = c.y;
  bool diag = (i == j) || (i + j == 4.0);
  float ring = max(abs(i - 2.0), abs(j - 2.0));      // 0 centre, 1, 2 outer
  if (diag) return 0.10 + ring * 0.18;                 // 0.10 / 0.28 / 0.46
  return 0.80 + 0.05 * mod(i + 2.0 * j, 4.0);          // fill only at the peaks, staggered
}

void main() {
  vec2 p = gl_FragCoord.xy / res.y;                    // aspect-correct, y up
  float a = -0.62;                                     // beam direction (diagonal, like the refs)
  float v = 0.0;
  v += 0.72 * beam(p, a + 0.04 * sin(t * 0.05), 0.62 + 0.10 * sin(t * 0.031), 0.05, 0.20);
  v += 0.48 * beam(p, a - 0.03 + 0.03 * sin(t * 0.043 + 1.3), 1.08 + 0.14 * sin(t * 0.027 + 2.0), 0.015, 0.14);
  v += 0.38 * beam(p, a + 0.06, 0.20 + 0.12 * sin(t * 0.037 + 4.0), 0.01, 0.18);
  vec2 g = p - vec2(1.20 + 0.12 * sin(t * 0.02), 0.98 + 0.08 * cos(t * 0.025));
  v += 0.32 * exp(-dot(g, g) * 4.0);                   // soft glow, upper right
  v = clamp(v, 0.0, 1.0);

  float lit = step(threshold(gl_FragCoord.xy), smoothstep(0.04, 1.0, v));
  vec3 smoothCol = mix(cBase, cMid, v * 0.45);         // blurred glow underneath
  vec3 dotCol = mix(cMid, cHi, v * v);
  gl_FragColor = vec4(mix(smoothCol, dotCol, lit * 0.9), 1.0);
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
    set("cBase", oklch(0.12, 0.02, hue));
    set("cMid", oklch(0.34, 0.12, hue));
    set("cHi", oklch(0.70, 0.15, hue + 8));
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
