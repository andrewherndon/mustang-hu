import { useEffect, useRef } from "react";
import type { Detected } from "./car";

/**
 * "AI road render" (Tesla / TEYES style): a perspective road with lanes, the
 * ego car, and objects from the front camera's object detector (mocked now;
 * later a small model on the dash camera). Drawn on a canvas each frame;
 * designs only pick a style.
 */
export interface RoadStyle {
  kind: "solid" | "wire" | "pixel" | "phosphor" | "flat";
  bg: string;            // "" = transparent
  road: string;
  lane: string;
  object: string;
  objectAccent: string;  // person / bike
  ego: string;
  horizon?: number;      // 0..1 of height (default 0.32)
  glow?: number;         // px of shadow blur on strokes
  path?: string;         // colour of the planned-path ribbon in our lane (Tesla-style)
  cars3d?: boolean;      // draw vehicles as shaded 3D bodies instead of boxes
  focal?: number;        // perspective depth (m); larger = flatter, bigger far objects (default 6)
}

interface Props {
  objects: Detected[];
  speedMph: number;
  style: RoadStyle;
  className?: string;
}

export function RoadScene({ objects, speedMph, style, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ objects, speedMph, style });
  live.current = { objects, speedMph, style };

  useEffect(() => {
    const el = ref.current!;
    const ctx = el.getContext("2d")!;
    let raf = 0, offset = 0, last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const { objects, speedMph, style } = live.current;
      const dt = (now - last) / 1000; last = now;
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (el.width !== Math.round(r.width * dpr)) { el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr); }
      const W = el.width, H = el.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = style.kind !== "pixel";
      ctx.clearRect(0, 0, W, H);
      if (style.bg) { ctx.fillStyle = style.bg; ctx.fillRect(0, 0, W, H); }

      const hy = H * (style.horizon ?? 0.32);           // horizon line
      const cx = W / 2;
      const roadHalf = W * 0.55;                         // road half-width at the bottom
      // Perspective: screen y for a distance d (m), and x for a lane offset.
      const F = style.focal ?? 6;
      const yAt = (d: number) => hy + (H - hy) * (F / (d + F));
      const xAt = (lane: number, d: number) => cx + lane * roadHalf * 0.62 * (F / (d + F)) * 1.6;
      offset = (offset + speedMph * 0.447 * dt) % 6;

      ctx.lineCap = "round";
      ctx.shadowColor = style.lane;
      ctx.shadowBlur = (style.glow ?? 0) * dpr;

      // Road surface
      if (style.kind === "solid" || style.kind === "flat") {
        ctx.fillStyle = style.road;
        ctx.beginPath(); ctx.moveTo(cx - 4, hy); ctx.lineTo(cx + 4, hy); ctx.lineTo(cx + roadHalf, H); ctx.lineTo(cx - roadHalf, H); ctx.fill();
      }
      // Lane edges and dashes
      ctx.strokeStyle = style.lane;
      for (const lane of [-1.5, -0.5, 0.5, 1.5]) {
        const outer = Math.abs(lane) === 1.5;
        ctx.lineWidth = (outer ? 3 : 2.2) * dpr;
        if (outer || style.kind === "wire" || style.kind === "phosphor") {
          ctx.globalAlpha = outer ? 0.9 : 0.35;
          ctx.beginPath(); ctx.moveTo(xAt(lane, 200), yAt(200)); ctx.lineTo(xAt(lane, -3), yAt(-3)); ctx.stroke();
        }
        if (!outer) {
          ctx.globalAlpha = 0.8;
          for (let d = -offset; d < 90; d += 6) {
            ctx.beginPath(); ctx.moveTo(xAt(lane, d), yAt(d)); ctx.lineTo(xAt(lane, d + 2.5), yAt(d + 2.5)); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      // Planned path: a soft ribbon down our lane
      if (style.path) {
        ctx.save(); ctx.shadowBlur = 0;
        const g = ctx.createLinearGradient(0, yAt(60), 0, H);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, style.path);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(xAt(-0.35, 60), yAt(60)); ctx.lineTo(xAt(0.35, 60), yAt(60));
        ctx.lineTo(xAt(0.35, -3), yAt(-3)); ctx.lineTo(xAt(-0.35, -3), yAt(-3)); ctx.fill();
        ctx.restore();
      }
      // Wireframe / phosphor: a perspective grid on the ground
      if (style.kind === "wire" || style.kind === "phosphor" || style.kind === "pixel") {
        ctx.globalAlpha = 0.25; ctx.lineWidth = 1 * dpr;
        for (let d = -offset; d < 120; d += 6) {
          ctx.beginPath(); ctx.moveTo(xAt(-4, d), yAt(d)); ctx.lineTo(xAt(4, d), yAt(d)); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Objects, far to near
      const objs = [...objects].sort((a, b) => b.distM - a.distM);
      for (const o of objs) {
        const s = F / (o.distM + F);
        const x = xAt(o.lane, o.distM), y = yAt(o.distM);
        const w = (o.kind === "truck" ? 150 : o.kind === "car" ? 120 : 34) * s * dpr * (W / (1400 * dpr)) * 2;
        const h = (o.kind === "truck" ? 150 : o.kind === "car" ? 70 : 90) * s * dpr * (W / (1400 * dpr)) * 2;
        const color = o.kind === "person" || o.kind === "bike" ? style.objectAccent : style.object;
        if (style.cars3d && (o.kind === "car" || o.kind === "truck")) drawCar3d(ctx, x - w / 2, y - h, w, h, color, o.kind === "truck", dpr);
        else drawBox(ctx, x - w / 2, y - h, w, h, color, style.kind, dpr);
      }
      // Ego car
      const ew = W * 0.13, eh = ew * 0.55;
      if (style.cars3d) drawCar3d(ctx, cx - ew * 0.6, H - eh * 1.25 - H * 0.05, ew * 1.2, eh * 1.25, style.ego, false, dpr);
      else drawEgo(ctx, cx - ew / 2, H - eh - H * 0.06, ew, eh, style, dpr);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, kind: RoadStyle["kind"], dpr: number) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.shadowColor = color;
  if (kind === "solid" || kind === "flat") {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color); g.addColorStop(1, shade(color));
    ctx.fillStyle = kind === "flat" ? color : g;
    roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.18); ctx.fill();
  } else if (kind === "pixel") {
    const p = Math.max(2, Math.round(w / 10));
    ctx.fillRect(Math.round(x / p) * p, Math.round(y / p) * p, Math.round(w / p) * p, Math.round(h / p) * p);
  } else {
    ctx.lineWidth = 1.6 * dpr;
    roundRect(ctx, x, y, w, h, 3 * dpr); ctx.stroke();
    ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1;
  }
}

/** A rear view of a vehicle with shading: body, cabin, glass, tail lights, shadow. */
function drawCar3d(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, truck: boolean, dpr: number) {
  ctx.save(); ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w * 0.6, h * 0.12, 0, 0, 7); ctx.fill();
  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, color); body.addColorStop(1, shade(color));
  ctx.fillStyle = body;
  if (truck) { roundRect(ctx, x, y, w, h * 0.95, w * 0.06); ctx.fill(); }
  else {
    roundRect(ctx, x, y + h * 0.42, w, h * 0.5, h * 0.14); ctx.fill();               // lower body
    roundRect(ctx, x + w * 0.14, y + h * 0.05, w * 0.72, h * 0.45, h * 0.16); ctx.fill(); // cabin
    ctx.fillStyle = "rgba(20,30,45,0.55)";
    roundRect(ctx, x + w * 0.2, y + h * 0.12, w * 0.6, h * 0.3, h * 0.1); ctx.fill();  // rear glass
  }
  ctx.fillStyle = "#ff3b30";
  ctx.fillRect(x + w * 0.05, y + h * 0.55, w * 0.16, Math.max(1.5 * dpr, h * 0.09));
  ctx.fillRect(x + w * 0.79, y + h * 0.55, w * 0.16, Math.max(1.5 * dpr, h * 0.09));
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x + w * 0.08, y + h * 0.9, w * 0.14, h * 0.1); ctx.fillRect(x + w * 0.78, y + h * 0.9, w * 0.14, h * 0.1);
  ctx.restore();
}

function drawEgo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: RoadStyle, dpr: number) {
  ctx.shadowColor = style.ego; ctx.shadowBlur = 18 * dpr;
  ctx.fillStyle = style.ego; ctx.strokeStyle = style.ego; ctx.lineWidth = 2 * dpr;
  // stylised top-rear view of a convertible: body, rear deck, two tail lights
  roundRect(ctx, x, y, w, h, h * 0.35);
  if (style.kind === "wire" || style.kind === "phosphor") ctx.stroke(); else ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, x + w * 0.18, y + h * 0.12, w * 0.64, h * 0.42, h * 0.15); ctx.fill();
  ctx.fillStyle = "#ff3b30";
  ctx.fillRect(x + w * 0.04, y + h * 0.66, w * 0.18, h * 0.14);
  ctx.fillRect(x + w * 0.78, y + h * 0.66, w * 0.18, h * 0.14);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function shade(hex: string) {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.round(v * 0.55).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
