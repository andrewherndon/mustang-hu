import "@fontsource-variable/inter-tight";
import "./showroom.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { hhmm, useIdle } from "../kit/hooks";
import { compass } from "../kit/car";

/**
 * SHOWROOM (after Porsche / Polestar configurator pages): a full-bleed studio
 * photograph of the car with a slow push-in, minimal tabs, and a spec bar
 * whose figures are live (speed, engine, fuel, range) instead of brochure
 * numbers. The front camera is a small "exterior view" thumbnail.
 */
function Showroom({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;

  return (
    <div className="sr">
      <div className="sr-photo" />
      <div className="sr-shade" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="sr-nav">
            <span className="sr-logo">MUSTANG</span>
            <nav>
              <span data-on="true">Overview</span>
              <button onClick={ctx.openSettings}>Settings</button>
            </nav>
            <span className="sr-time">{hhmm(now)}</span>
          </header>

          <section className="sr-title">
            <h1>GT Convertible</h1>
            <p>1995 · 5.0 V8 · {car.outsideF}°F · heading {compass(car.headingDeg)}</p>
          </section>

          <section className="sr-view">
            <CameraFeed kind="front" label={false} filter="saturate(0.85)" />
            <span>Exterior view · live</span>
          </section>

          <section className="sr-specs">
            <Spec v={`${Math.round(car.speedMph)}`} u="mph" k="Current speed" />
            <Spec v={(car.rpm / 1000).toFixed(1)} u="k rpm" k={`Engine · gear ${car.gear}`} />
            <Spec v={`${Math.round(car.fuelPct)}`} u="%" k={`Fuel · ~${Math.round(car.fuelPct * 2.6)} mi range`} />
            <div className="sr-spec sr-np">
              <b>{ctx.media?.title ?? "—"}</b>
              <span>{ctx.media ? ctx.media.artist : "Nothing playing"}</span>
              <div>
                <button onClick={() => ctx.mediaControl("previous")}>‹</button>
                <button className="sr-np-play" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "Pause" : "Play"}</button>
                <button onClick={() => ctx.mediaControl("next")}>›</button>
              </div>
            </div>
          </section>

          <nav className="sr-menu">
            {ctx.apps.map((a) => (
              <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}>{a.title}</button>
            ))}
          </nav>
        </>
      )}
      {idle && <div className="sr-saver"><div className="sr-photo sr-photo-saver" /><div className="sr-saver-t">Mustang</div></div>}
    </div>
  );
}

function Spec({ v, u, k }: { v: string; u: string; k: string }) {
  return <div className="sr-spec"><b>{v}<small>{u}</small></b><span>{k}</span></div>;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="sr-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="sr-strip-home" onClick={ctx.goHome}>Overview</button>
      <div className="sr-spec sr-strip-spec"><b>{Math.round(ctx.car.speedMph)}<small>mph</small></b></div>
      <div className="sr-strip-cam"><CameraFeed kind="front" label={false} filter="saturate(0.85)" /></div>
      <div className="sr-strip-apps">
        {ctx.running.slice(0, 4).map((a) => <button key={a.key} data-active={a.active} onClick={a.open}>{a.title}</button>)}
        {ctx.state.keyboard.available && <button onClick={ctx.openKeyboard}>Keyboard</button>}
      </div>
      <div className="sr-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const showroom: Design = {
  id: "showroom",
  name: "Showroom",
  tagline: "Porsche-style configurator: full-bleed studio photo, live spec bar",
  slot: "top",
  swatch: ["#0a0a0a", "#c8102e"],
  Component: Showroom,
};
