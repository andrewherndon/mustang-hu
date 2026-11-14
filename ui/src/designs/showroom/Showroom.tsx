import "@fontsource-variable/fraunces";
import "@fontsource-variable/jost";
import "./showroom.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { hhmm, useIdle } from "../kit/hooks";
import { compass } from "../kit/car";

/**
 * SHOWROOM: the car on a spotlit turntable, spec callouts with hairline
 * leaders, a serif/wide-caps type pairing and a text-only "collection" menu.
 * Quiet, expensive, mostly black.
 */
function Showroom({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;

  return (
    <div className="sr" data-idle={idle}>
      <div className="sr-spot" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="sr-head">
            <div>
              <div className="sr-brand">MUSTANG&nbsp;&nbsp;GT</div>
              <div className="sr-sub">Convertible · 5.0 V8 · 1995 · Мустанг · 野马</div>
            </div>
            <div className="sr-time">{hhmm(now)}<span>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span></div>
          </header>

          <section className="sr-stage">
            <div className="sr-floor" />
            <video className="sr-car" src="/art/mustang-drive-green-v1.webm" muted loop playsInline autoPlay disablePictureInPicture />
            <Callout cls="c1" label="Speed" value={Math.round(car.speedMph).toString()} unit="mph" />
            <Callout cls="c2" label="Engine" value={(Math.round(car.rpm / 50) * 50).toLocaleString()} unit="rpm" />
            <Callout cls="c3" label="Gear" value={car.gear} unit={compass(car.headingDeg)} />
            <Callout cls="c4" label="Fuel" value={Math.round(car.fuelPct).toString()} unit="%" />
          </section>

          <aside className="sr-cam">
            <CameraFeed kind="front" label={false} filter="saturate(0.6) contrast(1.05)" />
            <span>Front view</span>
          </aside>

          <section className="sr-np">
            <span className="sr-np-k">Now playing</span>
            {ctx.media ? <span className="sr-np-t"><em>{ctx.media.title}</em> — {ctx.media.artist}</span> : <span className="sr-np-t">Silence</span>}
            <div className="sr-np-btns">
              <button onClick={() => ctx.mediaControl("previous")}>Prev</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "Pause" : "Play"}</button>
              <button onClick={() => ctx.mediaControl("next")}>Next</button>
            </div>
          </section>

          <nav className="sr-menu">
            {ctx.apps.map((a, i) => (
              <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <sup>{String(i + 1).padStart(2, "0")}</sup>{a.title}
              </button>
            ))}
            <button onClick={ctx.openSettings}><sup>∞</sup>Settings</button>
          </nav>
        </>
      )}
      {idle && (
        <div className="sr-saver">
          <video src="/art/mustang-drive-green-v1.webm" muted loop playsInline autoPlay />
          <div>Mustang</div>
        </div>
      )}
    </div>
  );
}

function Callout({ cls, label, value, unit }: { cls: string; label: string; value: string; unit: string }) {
  return (
    <div className={`sr-call sr-${cls}`}>
      <i />
      <span className="sr-call-l">{label}</span>
      <span className="sr-call-v">{value}<small>{unit}</small></span>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="sr-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="sr-strip-home" onClick={ctx.goHome}>← Showroom</button>
      <div className="sr-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="sr-strip-cam"><CameraFeed kind="front" label={false} filter="saturate(0.6)" /></div>
      <div className="sr-strip-apps">
        {ctx.running.slice(0, 4).map((a) => <button key={a.key} data-active={a.active} onClick={a.open}>{a.title}</button>)}
        {ctx.state.keyboard.available && <button onClick={ctx.openKeyboard}>Keyboard</button>}
      </div>
      <div className="sr-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const showroom: Design = {
  id: "showroom",
  name: "Showroom",
  tagline: "Car on a spotlit turntable, spec callouts, serif and wide caps",
  slot: "top",
  swatch: ["#0a0a0a", "#c9a45c"],
  Component: Showroom,
};
