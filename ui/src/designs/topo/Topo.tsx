import { memo, useEffect, useRef } from "react";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/inter-tight";
import "./topo.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { noise2 } from "../kit/dither";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * TOPO (after Rivian / outdoor brands): a contour map drawn from terrain
 * (procedural until real elevation data), sand, olive and forest with one
 * blaze orange. Compass and altitude are first-class; the car is a trail
 * marker on a dashed route. Condensed type, rugged notched cards.
 */
const W = 1440, H = 960;

/** Contour lines via marching squares over a noise heightmap; drawn once. */
const Contours = memo(function Contours({ seed }: { seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    const dpr = 2; el.width = W * dpr; el.height = H * dpr; c.scale(dpr, dpr);
    const n = noise2(seed), step = 8, cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
    const hgt = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) hgt[y * cols + x] = n(x * step / 260, y * step / 260);
    const levels = 22;
    for (let L = 1; L < levels; L++) {
      const t = 0.18 + (L / levels) * 0.7, major = L % 5 === 0;
      c.strokeStyle = major ? "rgba(70,78,42,0.55)" : "rgba(110,118,70,0.32)"; c.lineWidth = major ? 1.6 : 1;
      c.beginPath();
      for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
        const a = hgt[y * cols + x], b = hgt[y * cols + x + 1], d = hgt[(y + 1) * cols + x], e = hgt[(y + 1) * cols + x + 1];
        const pts: [number, number][] = [];
        const lerp = (p: number, q: number) => (t - p) / (q - p);
        if ((a < t) !== (b < t)) pts.push([(x + lerp(a, b)) * step, y * step]);
        if ((b < t) !== (e < t)) pts.push([(x + 1) * step, (y + lerp(b, e)) * step]);
        if ((d < t) !== (e < t)) pts.push([(x + lerp(d, e)) * step, (y + 1) * step]);
        if ((a < t) !== (d < t)) pts.push([x * step, (y + lerp(a, d)) * step]);
        for (let k = 0; k + 1 < pts.length; k += 2) { c.moveTo(pts[k][0], pts[k][1]); c.lineTo(pts[k + 1][0], pts[k + 1][1]); }
      }
      c.stroke();
    }
  }, [seed]);
  return <canvas ref={ref} className="tp-map" />;
});

function Topo({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  // the map drifts with distance travelled
  const drift = (car.tripMi * 1609 * 0.25) % 400;
  const alt = Math.round(1050 + 120 * Math.sin(car.tripMi * 3));

  return (
    <div className="tp">
      <div className="tp-mapwrap" style={{ transform: `translate(${-drift * 0.3}px, ${drift * 0.4}px) scale(1.25)` }}><Contours seed={7} /></div>
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <svg className="tp-route" viewBox="0 0 1440 960">
            <path d="M720 1000 C 700 820, 760 700, 690 580 S 560 380, 640 240 S 820 90, 900 -20" />
            <circle cx="690" cy="600" r="16" className="tp-me" />
            <circle cx="690" cy="600" r="34" className="tp-me-ring" />
          </svg>

          <header className="tp-head">
            <div className="tp-time">{hhmm(now)}</div>
            <div className="tp-meta">
              <span>{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase()}</span>
              <span>{car.outsideF}°F · CLEAR</span>
              <span>SUNSET 17:36</span>
            </div>
          </header>

          <section className="tp-compass">
            <div className="tp-rose" style={{ transform: `rotate(${-car.headingDeg}deg)` }}>
              {["N", "E", "S", "W"].map((d, i) => <span key={d} style={{ transform: `rotate(${i * 90}deg) translateY(-118px) rotate(${-i * 90 + car.headingDeg}deg)` }} data-n={d === "N"}>{d}</span>)}
              {Array.from({ length: 72 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 5}deg)` }} data-major={i % 9 === 0} />)}
            </div>
            <div className="tp-heading"><b>{Math.round(car.headingDeg)}°</b><span>{compass(car.headingDeg)}</span></div>
          </section>

          <section className="tp-card tp-stats">
            <Stat k="Speed" v={`${Math.round(car.speedMph)}`} u="mph" big />
            <Stat k="Elevation" v={alt.toLocaleString()} u="ft" />
            <Stat k="Trip" v={car.tripMi.toFixed(1)} u="mi" />
            <Stat k="Range" v={`${Math.round(car.fuelPct * 2.6)}`} u="mi" />
          </section>

          <section className="tp-card tp-cam">
            <CameraFeed kind="front" label={false} filter="saturate(0.8) sepia(0.15)" />
            <span className="tp-tag">TRAIL CAM</span>
          </section>

          <section className="tp-card tp-media">
            <span className="tp-k">{ctx.media ? `NOW PLAYING · ${ctx.media.app.toUpperCase()}` : "AUDIO"}</span>
            <b>{ctx.media?.title ?? "Nothing playing"}</b>
            <span className="tp-sub">{ctx.media?.artist ?? "—"}</span>
            <div className="tp-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>◀◀</button>
              <button className="tp-blaze" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>▶▶</button>
            </div>
          </section>

          <nav className="tp-apps">
            {ctx.apps.slice(0, 8).map((a, i) => (
              <button key={a.key} className="tp-wp" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <span className="tp-wp-n">{String.fromCharCode(65 + i)}</span>
                <AppGlyph app={a} className="tp-glyph" />
                <span className="tp-wp-t">{a.title}</span>
              </button>
            ))}
            <button className="tp-wp tp-wp-set" onClick={ctx.openSettings}><span className="tp-wp-n">⚙</span><span className="tp-wp-t">Settings</span></button>
          </nav>
        </>
      )}
    </div>
  );
}

function Stat({ k, v, u, big }: { k: string; v: string; u: string; big?: boolean }) {
  return <div className="tp-stat" data-big={big}><span className="tp-k">{k}</span><b>{v}<small>{u}</small></b></div>;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="tp-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="tp-blaze tp-strip-home" onClick={ctx.goHome}>◀ MAP</button>
      <div className="tp-stat" data-big="true"><span className="tp-k">Speed</span><b>{Math.round(ctx.car.speedMph)}<small>mph</small></b></div>
      <div className="tp-stat"><span className="tp-k">Heading</span><b>{compass(ctx.car.headingDeg)}<small>{Math.round(ctx.car.headingDeg)}°</small></b></div>
      <div className="tp-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="tp-wp tp-strip-app" data-running={a.active} onClick={a.open}><AppGlyph app={a} className="tp-glyph" /></button>)}
      {ctx.state.keyboard.available && <button className="tp-wp tp-strip-app" onClick={ctx.openKeyboard}>⌨</button>}
      <div className="tp-time tp-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const topo: Design = {
  id: "topo",
  name: "Topo",
  tagline: "Rivian-style contour map, compass and elevation, blaze-orange trail route",
  slot: "top",
  swatch: ["#e9e1cc", "#e4572e"],
  Component: Topo,
};
