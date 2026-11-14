import { useEffect, useRef } from "react";
import "@fontsource-variable/orbitron";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "./holo.css";
import type { Design, DesignContext } from "../kit/types";
import type { Detected } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * HOLOGRAPHIC SCI-FI: a cyan hologram. A wireframe car turns slowly inside
 * gyroscope rings, the camera sits in a hexagon with targeting reticles on
 * every detection, apps are a honeycomb, readouts live in brackets.
 */
function Holo({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const f = Math.min(1, car.speedMph / 140);

  return (
    <div className="ho">
      <div className="ho-hex" />
      <div className="ho-scan" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="ho-top">
            <span className="ho-brand">MUSTANG//OS <em>v5.0</em></span>
            <span>SYS.TIME [{hhmm(now, true)}:{String(now.getSeconds()).padStart(2, "0")}]</span>
            <span>EXT.TEMP [{car.outsideF}°F]</span>
            <span>LINK [{ctx.state.aa.connected ? "PHONE" : "----"}]</span>
            <span className="ho-fill" />
            <span className="ho-ru">СИСТЕМА В НОРМЕ · 系统正常</span>
          </header>

          <section className="ho-core">
            <div className="ho-ring ho-ring1" /><div className="ho-ring ho-ring2" /><div className="ho-ring ho-ring3" />
            <Wireframe />
            <svg className="ho-gauge" viewBox="0 0 400 400">
              {Array.from({ length: 61 }, (_, i) => {
                const a = (-225 + i * 4.5) * Math.PI / 180, r1 = 188, r2 = i % 5 ? 180 : 170;
                return <line key={i} x1={200 + r1 * Math.cos(a)} y1={200 + r1 * Math.sin(a)} x2={200 + r2 * Math.cos(a)} y2={200 + r2 * Math.sin(a)} data-on={i / 60 <= f} />;
              })}
            </svg>
            <div className="ho-speed">{Math.round(car.speedMph).toString().padStart(3, "0")}<span>MPH · GEAR {car.gear}</span></div>
          </section>

          <section className="ho-cam">
            <div className="ho-cam-in">
              <CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(150deg) saturate(2.5) brightness(1.1)" />
              <Reticles objects={car.objects} />
            </div>
            <span className="ho-label">OPTIC.FRONT // ОБЪЕКТЫ: {car.objects.length}</span>
          </section>

          <section className="ho-data">
            <Readout k="RPM" v={Math.round(car.rpm).toString()} f={car.rpm / 7000} />
            <Readout k="COOLANT" v={`${Math.round(car.coolantF)}°F`} f={(car.coolantF - 120) / 140} />
            <Readout k="OIL.PRESS" v={`${Math.round(car.oilPsi)} PSI`} f={car.oilPsi / 80} />
            <Readout k="CELL.V" v={`${car.voltage.toFixed(2)}`} f={(car.voltage - 10) / 6} />
            <Readout k="FUEL" v={`${Math.round(car.fuelPct)}%`} f={car.fuelPct / 100} />
            <Readout k="G.LAT" v={car.gLat.toFixed(2)} f={0.5 + car.gLat} />
          </section>

          <section className="ho-media">
            <span className="ho-label">AUDIO.STREAM</span>
            <div className="ho-media-t">{ctx.media ? ctx.media.title.toUpperCase() : "NO CARRIER"}</div>
            <div className="ho-media-a">{ctx.media ? `${ctx.media.artist} :: ${ctx.media.app}`.toUpperCase() : "—"}</div>
            <div className="ho-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>⟨⟨</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "▮▮" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>⟩⟩</button>
            </div>
          </section>

          <nav className="ho-comb">
            {ctx.apps.slice(0, 11).map((a) => (
              <button key={a.key} className="ho-cell" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="ho-glyph" filter="grayscale(1) brightness(1.6) sepia(1) hue-rotate(150deg) saturate(3)" />
                <span>{a.title.toUpperCase().slice(0, 12)}</span>
              </button>
            ))}
            <button className="ho-cell" onClick={ctx.openSettings}><span className="ho-glyph glyph-letter">⚙</span><span>CONFIG</span></button>
          </nav>
        </>
      )}
      {idle && (
        <div className="ho-saver">
          <div className="ho-ring ho-ring1" /><div className="ho-ring ho-ring2" />
          <Wireframe big />
          <div className="ho-saver-t">МУСТАНГ · MUSTANG · 野马</div>
        </div>
      )}
    </div>
  );
}

function Readout({ k, v, f }: { k: string; v: string; f: number }) {
  return (
    <div className="ho-ro">
      <span className="ho-ro-k">{k}</span>
      <span className="ho-ro-v">[ {v} ]</span>
      <div className="ho-ro-bar"><i style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></div>
    </div>
  );
}

/** Targeting boxes over the camera, placed by the detection's lane/distance. */
function Reticles({ objects }: { objects: Detected[] }) {
  return (
    <svg className="ho-ret" viewBox="0 0 100 100" preserveAspectRatio="none">
      {objects.filter((o) => o.distM < 70).map((o) => {
        const s = 8 / (o.distM + 8);
        const cx = 50 + o.lane * 34 * s, by = 45 + 55 * s, w = (o.kind === "truck" ? 44 : o.kind === "car" ? 36 : 12) * s, h = (o.kind === "person" ? 40 : 26) * s;
        return (
          <g key={o.id} className={o.distM < 15 ? "ho-ret-near" : ""}>
            <path d={`M${cx - w / 2} ${by - h + 3} v-3 h3 M${cx + w / 2 - 3} ${by - h} h3 v3 M${cx + w / 2} ${by - 3} v3 h-3 M${cx - w / 2 + 3} ${by} h-3 v-3`} />
            <text x={cx - w / 2} y={by - h - 1.5}>{o.kind.toUpperCase()} {Math.round(o.distM)}M</text>
          </g>
        );
      })}
    </svg>
  );
}

/** A rotating wireframe coupe, drawn with a tiny 3D projection. */
const V: [number, number, number][] = [
  // lower body (x: length, y: up, z: width)
  [-2.3, 0.3, -0.9], [2.3, 0.3, -0.9], [2.3, 0.3, 0.9], [-2.3, 0.3, 0.9],
  [-2.3, 0.85, -0.9], [2.1, 0.8, -0.9], [2.1, 0.8, 0.9], [-2.3, 0.85, 0.9],
  // cabin
  [-1.2, 0.85, -0.75], [0.6, 0.85, -0.75], [0.6, 0.85, 0.75], [-1.2, 0.85, 0.75],
  [-0.9, 1.3, -0.65], [0.1, 1.3, -0.65], [0.1, 1.3, 0.65], [-0.9, 1.3, 0.65],
];
const E: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
  [8, 9], [9, 10], [10, 11], [11, 8], [12, 13], [13, 14], [14, 15], [15, 12], [8, 12], [9, 13], [10, 14], [11, 15],
];
const WHEELS: [number, number][] = [[-1.5, -0.95], [1.4, -0.95], [-1.5, 0.95], [1.4, 0.95]];

function Wireframe({ big }: { big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    const S = big ? 900 : 440;
    el.width = S * 2; el.height = S * 2;
    let raf = 0, a = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw); a += 0.004;
      c.clearRect(0, 0, el.width, el.height);
      const sc = el.width / 7, ca = Math.cos(a), sa = Math.sin(a), tilt = 0.35;
      const P = ([x, y, z]: [number, number, number]) => {
        const rx = x * ca - z * sa, rz = x * sa + z * ca;
        const yy = y * Math.cos(tilt) - rz * Math.sin(tilt), zz = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const p = 6 / (6 + zz);
        return [el.width / 2 + rx * sc * p, el.height * 0.58 - yy * sc * p] as const;
      };
      c.strokeStyle = "#5ff8ff"; c.lineWidth = 2.5; c.shadowColor = "#5ff8ff"; c.shadowBlur = 14;
      c.beginPath();
      for (const [i, j] of E) { const [x1, y1] = P(V[i]), [x2, y2] = P(V[j]); c.moveTo(x1, y1); c.lineTo(x2, y2); }
      for (const [wx, wz] of WHEELS) for (let k = 0; k <= 16; k++) {
        const t = (k / 16) * Math.PI * 2, [x, y] = P([wx + Math.cos(t) * 0.35, 0.35 + Math.sin(t) * 0.35, wz]);
        k ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
      // floor grid
      c.shadowBlur = 0; c.globalAlpha = 0.25; c.beginPath();
      for (let g = -3; g <= 3; g++) {
        const [x1, y1] = P([g, 0, -3]), [x2, y2] = P([g, 0, 3]); c.moveTo(x1, y1); c.lineTo(x2, y2);
        const [x3, y3] = P([-3, 0, g]), [x4, y4] = P([3, 0, g]); c.moveTo(x3, y3); c.lineTo(x4, y4);
      }
      c.stroke(); c.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [big]);
  return <canvas ref={ref} className={big ? "ho-wire ho-wire-big" : "ho-wire"} />;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="ho-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="ho-strip-home" onClick={ctx.goHome}>⟨ CORE</button>
      <div className="ho-strip-speed">{Math.round(ctx.car.speedMph).toString().padStart(3, "0")}<small>MPH</small></div>
      <div className="ho-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(150deg) saturate(2.5)" /><Reticles objects={ctx.car.objects} /></div>
      {ctx.running.slice(0, 4).map((a) => (
        <button key={a.key} className="ho-cell ho-strip-cell" data-active={a.active} onClick={a.open}>
          <AppGlyph app={a} className="ho-glyph" filter="grayscale(1) brightness(1.6) sepia(1) hue-rotate(150deg) saturate(3)" />
        </button>
      ))}
      {ctx.state.keyboard.available && <button className="ho-strip-home" onClick={ctx.openKeyboard}>INPUT</button>}
      <div className="ho-strip-time">{hhmm(new Date(), true)}</div>
    </div>
  );
}

export const holo: Design = {
  id: "holo",
  name: "Holographic",
  tagline: "Cyan hologram: rotating wireframe car, reticles on the camera, hex apps",
  slot: "top",
  swatch: ["#021a22", "#5ff8ff"],
  Component: Holo,
};
