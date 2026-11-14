import "@fontsource-variable/jost";
import "./bauhaus.css";
import type { Design, DesignContext, UApp } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { hhmm, pad2, useIdle } from "../kit/hooks";
import { CAR_REDLINE } from "../kit/car";

/**
 * BAUHAUS KINETIC: primaries and pure geometry on paper. The tach is a
 * yellow disc swept by a red wedge, the camera looks out of a circle, the
 * heading is a red triangle, and apps are shapes. Things move with speed.
 * Lowercase universal type, as Bayer would have it.
 */
const SHAPES = ["circle", "square", "half", "tri", "quarter"] as const;
const COLORS = ["red", "blue", "yellow", "black"] as const;

function Bauhaus({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const sweep = Math.min(1, car.rpm / 7000) * 360;
  const spin = 40 - Math.min(35, car.speedMph / 2.5);   // faster car, faster shapes

  return (
    <div className="bh" style={{ ["--spin" as string]: `${spin}s` }}>
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <div className="bh-bar bh-bar-red" />
          <div className="bh-bar bh-bar-black" />

          <section className="bh-tach">
            <div className="bh-disc" style={{ background: `conic-gradient(var(--red) 0 ${sweep}deg, var(--yellow) ${sweep}deg 360deg)` }} />
            <div className="bh-redline" style={{ transform: `rotate(${(CAR_REDLINE / 7000) * 360}deg)` }} />
            <div className="bh-speed"><b>{Math.round(car.speedMph)}</b><span>mph · {car.gear}</span></div>
          </section>

          <section className="bh-cam">
            <CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.4)" />
          </section>
          <div className="bh-cam-ring" />

          <section className="bh-heading">
            <div className="bh-tri" style={{ transform: `rotate(${car.headingDeg}deg)` }} />
            <span>{Math.round(car.headingDeg)}°</span>
          </section>

          <section className="bh-clock">
            <div>{pad2(now.getHours())}</div>
            <div>{pad2(now.getMinutes())}</div>
          </section>
          <div className="bh-word">mustang<br /><span>мустанг · 野马</span></div>

          <section className="bh-media">
            <div className="bh-media-t">{ctx.media ? ctx.media.title.toLowerCase() : "no music"}</div>
            <div className="bh-media-a">{ctx.media ? ctx.media.artist.toLowerCase() : "—"}</div>
            <div className="bh-media-b">
              <button className="bh-b-tri-l" onClick={() => ctx.mediaControl("previous")} aria-label="previous" />
              <button className="bh-b-circle" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : ""}</button>
              <button className="bh-b-tri-r" onClick={() => ctx.mediaControl("next")} aria-label="next" />
            </div>
          </section>

          <section className="bh-gauges">
            <Bar k="fuel" v={car.fuelPct / 100} c="blue" />
            <Bar k="temp" v={(car.coolantF - 120) / 140} c="red" />
            <Bar k="oil" v={car.oilPsi / 80} c="black" />
            <Bar k="volt" v={(car.voltage - 10) / 6} c="yellow" />
          </section>

          <section className="bh-trip">
            <div><b>{car.tripMi.toFixed(1)}</b>trip mi</div>
            <div><b>{Math.round(car.rpm)}</b>rpm</div>
            <div className="bh-trip-odo">{Math.floor(car.odometerMi).toLocaleString()} mi · {car.outsideF}°f</div>
          </section>

          <nav className="bh-apps">
            {ctx.apps.slice(0, 9).map((a, i) => <Shape key={a.key} app={a} i={i} />)}
            <button className="bh-app" data-shape="square" data-color="black" onClick={ctx.openSettings}><i /><span>settings</span></button>
          </nav>
        </>
      )}
      {idle && <Saver />}
    </div>
  );
}

function Bar({ k, v, c }: { k: string; v: number; c: string }) {
  return (
    <div className="bh-g">
      <span>{k}</span>
      <div><i data-color={c} style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }} /></div>
    </div>
  );
}

function Shape({ app, i }: { app: UApp; i: number }) {
  return (
    <button className="bh-app" data-shape={SHAPES[i % SHAPES.length]} data-color={COLORS[(i * 3) % COLORS.length]} data-running={app.running} disabled={app.disabled} onClick={app.open}>
      <i />
      <span>{app.title.toLowerCase()}</span>
    </button>
  );
}

/** Screensaver: a slow Bauhaus composition that keeps re-arranging. */
function Saver() {
  return (
    <div className="bh-saver">
      {Array.from({ length: 9 }, (_, i) => <i key={i} data-shape={SHAPES[i % 5]} data-color={COLORS[i % 4]} style={{ animationDelay: `${-i * 2.3}s` }} />)}
      <div className="bh-saver-t">mustang · 1995</div>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  return (
    <div className="bh-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="bh-strip-home" onClick={ctx.goHome}><i />home</button>
      <div className="bh-strip-disc" style={{ background: `conic-gradient(var(--red) 0 ${Math.min(1, car.rpm / 7000) * 360}deg, var(--yellow) 0)` }}><b>{Math.round(car.speedMph)}</b></div>
      <div className="bh-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.4)" /></div>
      {ctx.running.slice(0, 4).map((a, i) => (
        <button key={a.key} className="bh-strip-app" data-color={COLORS[i % 4]} data-active={a.active} onClick={a.open}>{a.title.toLowerCase()}</button>
      ))}
      {ctx.state.keyboard.available && <button className="bh-strip-app" data-color="black" onClick={ctx.openKeyboard}>keys</button>}
      <div className="bh-strip-time">{hhmm(new Date(), true)}</div>
    </div>
  );
}

export const bauhaus: Design = {
  id: "bauhaus",
  name: "Bauhaus Kinetic",
  tagline: "Primaries and geometry: disc tach, camera in a circle, shape apps",
  slot: "top",
  swatch: ["#e63322", "#f7c815"],
  Component: Bauhaus,
};
