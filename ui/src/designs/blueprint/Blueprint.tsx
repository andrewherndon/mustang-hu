import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource-variable/archivo";
import "./blueprint.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, pad2 } from "../kit/hooks";

/**
 * BLUEPRINT: the car as an engineering drawing on blueprint paper. Live data
 * sits on dimension lines and leader callouts attached to the part it
 * belongs to (speed on the wheel, rpm on the engine, fuel at the filler);
 * a title block holds the clock; apps are stamped drawing sheets.
 */
// Positions on the line drawing (fractions of its box), measured from the art.
const ART = { fw: [0.225, 0.76], rw: [0.786, 0.76], engine: [0.2, 0.36], fuel: [0.68, 0.55], radiator: [0.03, 0.6], cabin: [0.6, 0.27], r: 0.071 };

function Blueprint({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const wheelTurn = (performance.now() / 1000) * car.speedMph * 8;

  return (
    <div className="bp">
      <div className="bp-grid" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="bp-drawing">
            <img className="bp-car" src="/art/blueprint/side.png" alt="" />
            <svg className="bp-anno" viewBox="0 0 1000 310" preserveAspectRatio="none">
              {/* wheel rotation marks */}
              {[ART.fw, ART.rw].map(([x, y], k) => (
                <g key={k} transform={`rotate(${wheelTurn % 360} ${x * 1000} ${y * 310})`}>
                  <line x1={x * 1000} y1={y * 310 - 50} x2={x * 1000} y2={y * 310 + 50} className="bp-hair" />
                  <line x1={x * 1000 - 50} y1={y * 310} x2={x * 1000 + 50} y2={y * 310} className="bp-hair" />
                </g>
              ))}
              {/* wheelbase dimension */}
              <line x1={ART.fw[0] * 1000} y1="300" x2={ART.rw[0] * 1000} y2="300" className="bp-dim" markerStart="url(#bp-a)" markerEnd="url(#bp-a)" />
              <defs><marker id="bp-a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#fff" /></marker></defs>
            </svg>
            <div className="bp-wb">WHEELBASE 101.3 IN · ODO {Math.floor(car.odometerMi).toLocaleString()} MI</div>
            <Callout at={ART.fw} dx={-40} dy={-62} label="ROAD SPEED" value={`${Math.round(car.speedMph)}`} unit="MPH" big />
            <Callout at={ART.engine} dx={100} dy={-95} label="5.0L V8 · ENGINE" value={`${Math.round(car.rpm)}`} unit="RPM" />
            <Callout at={ART.cabin} dx={-60} dy={-190} label="TRANSMISSION" value={car.gear} unit="GEAR · T-5" />
            <Callout at={ART.fuel} dx={-190} dy={-30} label="FUEL · 15.4 GAL" value={`${Math.round(car.fuelPct)}`} unit="%" />
            <Callout at={ART.radiator} dx={0} dy={-115} label="RADIATOR · COOLANT" value={`${Math.round(car.coolantF)}`} unit="°F" />
          </section>

          <section className="bp-cam">
            <i className="bp-crop tl" /><i className="bp-crop tr" /><i className="bp-crop bl" /><i className="bp-crop br" />
            <CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(180deg) saturate(1.6) brightness(1.1)" />
            <span>DETAIL A · FRONT CAMERA</span>
          </section>

          <section className="bp-media">
            <span className="bp-k">AUDIO</span>
            <b>{ctx.media ? ctx.media.title.toUpperCase() : "NO SOURCE"}</b>
            <span className="bp-v">{ctx.media ? `${ctx.media.artist} · ${ctx.media.app}`.toUpperCase() : "—"}</span>
            <div>
              <button onClick={() => ctx.mediaControl("previous")}>◂◂</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>▸▸</button>
            </div>
          </section>

          <nav className="bp-sheets">
            {ctx.apps.slice(0, 8).map((a, i) => (
              <button key={a.key} className="bp-sheet" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <span className="bp-sheet-n">SHT {pad2(i + 1)}</span>
                <AppGlyph app={a} className="bp-glyph" filter="grayscale(1) brightness(2.2) contrast(0.9)" />
                <span className="bp-sheet-t">{a.title.toUpperCase()}</span>
              </button>
            ))}
          </nav>

          <section className="bp-title">
            <div className="bp-tb-main">FORD MUSTANG GT · CONVERTIBLE<small>SN95 · 1995 · МУСТАНГ · 野马</small></div>
            <div><span>DATE</span>{now.toLocaleDateString("en-CA")}</div>
            <div><span>TIME</span><b>{hhmm(now, true)}</b></div>
            <div><span>HDG</span>{compass(car.headingDeg)} {Math.round(car.headingDeg)}°</div>
            <div><span>DRAWN</span>ANDREY</div>
            <button onClick={ctx.openSettings}><span>REV</span>SETTINGS ›</button>
          </section>
        </>
      )}
    </div>
  );
}

function Callout({ at, dx, dy, label, value, unit, big }: { at: number[]; dx: number; dy: number; label: string; value: string; unit: string; big?: boolean }) {
  // the drawing box is 1300x402 (see css); place relative to it
  const x = at[0] * 1300, y = at[1] * 402;
  return (
    <div className="bp-call" style={{ left: x + dx, top: y + dy }} data-big={big}>
      <svg className="bp-leader" style={{ left: -dx, top: `calc(100% + ${-dy}px)` }} width="1" height="1"><line x1="0" y1="0" x2={dx} y2={dy} /></svg>
      <span className="bp-k">{label}</span>
      <b>{value}<small>{unit}</small></b>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="bp-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="bp-strip-home" onClick={ctx.goHome}>◂ SHT 00</button>
      <div className="bp-strip-v"><span className="bp-k">SPEED</span><b>{Math.round(ctx.car.speedMph)}<small>MPH</small></b></div>
      <div className="bp-strip-v"><span className="bp-k">RPM</span><b>{Math.round(ctx.car.rpm)}</b></div>
      <div className="bp-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(180deg) saturate(1.6)" /></div>
      {ctx.running.slice(0, 3).map((a) => <button key={a.key} className="bp-sheet bp-strip-app" data-running={a.active} onClick={a.open}><span className="bp-sheet-t">{a.title.toUpperCase()}</span></button>)}
      {ctx.state.keyboard.available && <button className="bp-sheet bp-strip-app" onClick={ctx.openKeyboard}><span className="bp-sheet-t">KEYS</span></button>}
      <div className="bp-strip-v bp-strip-time"><span className="bp-k">TIME</span><b>{hhmm(new Date(), true)}</b></div>
    </div>
  );
}

export const blueprint: Design = {
  id: "blueprint",
  name: "Blueprint",
  tagline: "The SN95 as an engineering drawing; live data on dimension lines and callouts",
  slot: "top",
  swatch: ["#17377a", "#ffffff"],
  Component: Blueprint,
};
