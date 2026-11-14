import { useEffect, useRef } from "react";
import "@fontsource-variable/outfit";
import "./livingmap.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * LIVING MAP: the whole screen is a moving map (procedural city until real
 * tiles and GPS are wired), everything else floats on it as cards: next turn,
 * camera, media, an app rail. The map is the wallpaper and the dashboard.
 */
const BLOCK = 110;           // metres between streets
const MAJOR = 5;             // every 5th street is an avenue
const PX_PER_M = 1.0;

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function MapCanvas({ speedMph }: { speedMph: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speed = useRef(speedMph);
  speed.current = speedMph;

  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    let raf = 0, last = performance.now(), posY = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      posY += speed.current * 0.447 * dt;                     // drive north along avenue x=0
      const r = el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (el.width !== Math.round(r.width * dpr)) { el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr); }
      const W = el.width, H = el.height, s = PX_PER_M * dpr;
      const carX = W * 0.5, carY = H * 0.68;
      const toX = (mx: number) => carX + mx * s, toY = (my: number) => carY - (my - posY) * s;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#0f1626"; c.fillRect(0, 0, W, H);

      const mx0 = Math.floor((-carX / s) / BLOCK) - 1, mx1 = Math.ceil(((W - carX) / s) / BLOCK) + 1;
      const my0 = Math.floor((posY - (H - carY) / s) / BLOCK) - 1, my1 = Math.ceil((posY + carY / s) / BLOCK) + 1;

      // blocks: buildings or parks
      for (let i = mx0; i <= mx1; i++) for (let j = my0; j <= my1; j++) {
        const h = hash(i, j), x = toX(i * BLOCK + 9), y = toY((j + 1) * BLOCK - 9), w = (BLOCK - 18) * s;
        if (h < 0.12) { c.fillStyle = "#13301f"; c.fillRect(x, y, w, w); continue; }
        if (h > 0.93) { c.fillStyle = "#12263f"; c.fillRect(x, y, w, w); continue; }   // water / reservoir
        c.fillStyle = "#18202f";
        const n = 2 + Math.floor(h * 4);
        for (let k = 0; k < n; k++) {
          const hk = hash(i * 7 + k, j * 13 - k);
          const bx = x + (k % 2) * w * 0.5 + 4 * dpr, by = y + Math.floor(k / 2) * w * 0.5 + 4 * dpr;
          c.fillRect(bx, by, w * (0.3 + hk * 0.17), w * (0.3 + (1 - hk) * 0.17));
        }
      }
      // streets
      for (const major of [false, true]) {
        c.strokeStyle = major ? "#3a4a66" : "#252f42"; c.lineWidth = (major ? 14 : 7) * dpr;
        for (let i = mx0; i <= mx1; i++) if ((i % MAJOR === 0) === major) { c.beginPath(); c.moveTo(toX(i * BLOCK), 0); c.lineTo(toX(i * BLOCK), H); c.stroke(); }
        for (let j = my0; j <= my1; j++) if ((j % MAJOR === 0) === major) { c.beginPath(); c.moveTo(0, toY(j * BLOCK)); c.lineTo(W, toY(j * BLOCK)); c.stroke(); }
      }
      // route: ahead to the next avenue, then right
      const turnAt = Math.ceil((posY + 60) / (BLOCK * MAJOR)) * BLOCK * MAJOR;
      c.strokeStyle = "#4da3ff"; c.lineWidth = 10 * dpr; c.lineJoin = "round"; c.lineCap = "round";
      c.shadowColor = "#4da3ff"; c.shadowBlur = 16 * dpr;
      c.beginPath(); c.moveTo(toX(0), toY(posY)); c.lineTo(toX(0), toY(turnAt)); c.lineTo(toX(BLOCK * 6), toY(turnAt)); c.stroke();
      c.shadowBlur = 0;
      // car puck
      c.fillStyle = "rgba(77,163,255,0.18)"; c.beginPath(); c.arc(carX, carY, 46 * dpr, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath();
      c.moveTo(carX, carY - 22 * dpr); c.lineTo(carX + 15 * dpr, carY + 16 * dpr); c.lineTo(carX, carY + 8 * dpr); c.lineTo(carX - 15 * dpr, carY + 16 * dpr); c.closePath(); c.fill();
      (el as HTMLCanvasElement & { turnIn?: number }).turnIn = turnAt - posY;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="lm-canvas" />;
}

const STREETS = ["Peachtree St", "Ponce de Leon Ave", "North Ave", "10th St", "Spring St", "Техвуд-драйв", "Marietta St"];

function LivingMap({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  // Mock guidance: distance counts down through each block cycle.
  const cycle = (car.odometerMi * 1609) % 550;
  const dist = Math.max(0, 550 - cycle);
  const street = STREETS[Math.floor(car.odometerMi * 1609 / 550) % STREETS.length];
  const eta = new Date(now.getTime() + 14 * 60_000);

  return (
    <div className="lm">
      <MapCanvas speedMph={car.speedMph} />
      <div className="lm-vignette" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <div className="lm-turn">
            <div className="lm-turn-arrow">↱</div>
            <div>
              <div className="lm-turn-d">{dist > 320 ? `${(dist / 1609).toFixed(1)} mi` : `${Math.round(dist * 3.28 / 10) * 10} ft`}</div>
              <div className="lm-turn-s">{street}</div>
            </div>
          </div>
          <div className="lm-eta">
            <div><b>{hhmm(eta)}</b>arrival</div>
            <div><b>14</b>min</div>
            <div><b>6.2</b>mi</div>
            <span>Дом · 家</span>
          </div>
          <div className="lm-speed">
            <div className="lm-speed-n">{Math.round(car.speedMph)}</div>
            <div className="lm-speed-u">mph</div>
            <div className="lm-limit">45</div>
          </div>
          <div className="lm-card lm-cam"><CameraFeed kind="front" label={false} /><span>Front</span></div>
          <div className="lm-card lm-media">
            <div className="lm-media-t">{ctx.media?.title ?? "No music"}</div>
            <div className="lm-media-a">{ctx.media ? ctx.media.artist : "—"}</div>
            <div className="lm-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>⏮</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>⏭</button>
            </div>
          </div>
          <nav className="lm-rail">
            {ctx.apps.slice(0, 7).map((a) => (
              <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}><AppGlyph app={a} className="lm-glyph" /></button>
            ))}
            <button onClick={ctx.openSettings}><span className="lm-glyph glyph-letter">⚙</span></button>
          </nav>
          <div className="lm-clock">{hhmm(now)} · {compass(car.headingDeg)} · {car.outsideF}°</div>
        </>
      )}
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="lm-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="lm-strip-home" onClick={ctx.goHome}>Map</button>
      <div className="lm-strip-turn">↱ <b>{STREETS[0]}</b></div>
      <div className="lm-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="lm-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="lm-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="lm-glyph" /></button>)}
      {ctx.state.keyboard.available && <button className="lm-strip-app" onClick={ctx.openKeyboard}>⌨</button>}
      <div className="lm-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const livingmap: Design = {
  id: "livingmap",
  name: "Living Map",
  tagline: "The whole screen is a moving map; turn, camera, media float on it",
  slot: "top",
  swatch: ["#0f1626", "#4da3ff"],
  Component: LivingMap,
};
