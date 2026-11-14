import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/geist-mono";
import "./dither.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { DitherCamera, DitherLive } from "../kit/Dithered";
import type { DitherOpts } from "../kit/dither";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm } from "../kit/hooks";

/**
 * DITHER FIELD (after Browserbase): posterised, dithered landscapes in a
 * six-colour palette, set against a crisp white interface with hairline
 * blueprint rules, highlighter-marker headings, mono chips and black pills.
 * The camera and the road render are dithered live into the same palette.
 */
const PALETTE = ["#c7cfec", "#4aa3f0", "#141414", "#ef5a24", "#d6e04e", "#4fc26b", "#fbf3cf", "#ffffff"];
const CAM: DitherOpts = { palette: PALETTE, cell: 6, contrast: 1.5, brightness: 70, saturation: 1.8, spread: 0.8 };
const ROAD_DITHER: DitherOpts = { palette: ["#c7cfec", "#141414", "#ef5a24", "#d6e04e", "#4fc26b", "#ffffff"], cell: 5, spread: 0.5 };
const ROAD: RoadStyle = { kind: "solid", bg: "#c7cfec", road: "#9aa6d6", lane: "#ffffff", object: "#ef5a24", objectAccent: "#d6e04e", ego: "#141414", horizon: 0.08, focal: 14, cars3d: true };

/** Scene by time of day. */
function scene(h: number) {
  if (h >= 6 && h < 11) return "mountains";
  if (h >= 11 && h < 17) return "road";
  if (h >= 17 && h < 20) return "mesa";
  return "city";
}

function DitherField({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const g = greetings(now);
  const sc = new URLSearchParams(location.search).get("scene") ?? scene(now.getHours());

  return (
    <div className="df">
      <div className="df-grid" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="df-hero" style={{ backgroundImage: `url(/art/dither/${sc}.png)` }}>
            <div className="df-hello">
              <h1><span>{g.en}, Andrey.</span></h1>
              <p><mark>{g.ru}</mark> <mark>{g.zh}</mark></p>
            </div>
            <div className="df-time">
              <span className="df-chip">LOCAL TIME</span>
              <b>{hhmm(now)}</b>
              <small>{now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · {car.outsideF}°F</small>
            </div>
            <div className="df-cam">
              <DitherCamera opts={CAM} className="df-cam-feed" />
              <span className="df-pill df-pill-orange">● Front camera</span>
            </div>
          </section>

          <section className="df-row">
            <div className="df-card df-drive">
              <span className="df-chip">SPEED</span>
              <div className="df-speed">{Math.round(car.speedMph)}<small>mph</small></div>
              <ul className="df-list">
                <li><i />Gear <b>{car.gear}</b></li>
                <li><i />Engine <b>{Math.round(car.rpm / 10) * 10} rpm</b></li>
                <li><i />Heading <b>{compass(car.headingDeg)}</b></li>
                <li><i />Fuel <b>{Math.round(car.fuelPct)}%</b></li>
              </ul>
            </div>

            <div className="df-card df-road">
              <DitherLive opts={ROAD_DITHER} className="df-road-feed">
                <RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} />
              </DitherLive>
              <div className="df-road-tags">
                <span className="df-pill">Detector</span>
                <span className="df-pill df-pill-light">{car.objects.length} objects · 30 fps</span>
              </div>
            </div>

            <div className="df-card df-media">
              <span className="df-chip">NOW PLAYING</span>
              <div className="df-media-t"><span>{ctx.media?.title ?? "Nothing playing"}</span></div>
              <div className="df-media-a">{ctx.media ? `${ctx.media.artist} — ${ctx.media.app}` : "Start music on Android"}</div>
              <div className="df-media-b">
                <button className="df-btn df-btn-light" onClick={() => ctx.mediaControl("previous")}>‹ Prev</button>
                <button className="df-btn" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "Pause" : "Play"} ›</button>
                <button className="df-btn df-btn-light" onClick={() => ctx.mediaControl("next")}>Next ›</button>
              </div>
            </div>
          </section>

          <nav className="df-apps">
            {ctx.apps.slice(0, 7).map((a) => (
              <button key={a.key} className="df-app" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="df-glyph" />
                <span>{a.title}</span>
              </button>
            ))}
            <button className="df-btn df-apps-set" onClick={ctx.openSettings}>Settings ›</button>
          </nav>
        </>
      )}
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="df-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="df-btn df-strip-home" onClick={ctx.goHome}>‹ Home</button>
      <div className="df-strip-speed"><span>{Math.round(ctx.car.speedMph)}</span><small>mph</small></div>
      <DitherCamera opts={{ ...CAM, cell: 5 }} className="df-strip-cam" />
      <div className="df-strip-apps">
        {ctx.running.slice(0, 4).map((a) => (
          <button key={a.key} className="df-app df-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="df-glyph" /></button>
        ))}
        {ctx.state.keyboard.available && <button className="df-btn df-btn-light" onClick={ctx.openKeyboard}>Keyboard</button>}
      </div>
      <div className="df-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const ditherField: Design = {
  id: "dither",
  name: "Dither Field",
  tagline: "Browserbase-style dithered landscapes, highlighter type, live dithered camera",
  slot: "top",
  swatch: ["#c7cfec", "#ef5a24"],
  Component: DitherField,
};
