import "@fontsource-variable/space-grotesk";
import "./cluster.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * INSTRUMENT CLUSTER SPLIT: TEYES/Tesla style. The left half is the "AI road
 * render" from the dash camera's detector (3D cars, planned path, lead-car
 * distance); the right half is a card stack: camera, media, apps, controls.
 */
const ROAD: RoadStyle = {
  kind: "solid", bg: "", road: "rgba(120,150,190,0.16)", lane: "#cfe0ff", object: "#c9d3e3", objectAccent: "#ffb020",
  ego: "#d8222a", horizon: 0.08, focal: 16, path: "rgba(40,140,255,0.55)", cars3d: true,
};

function Cluster({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const lead = car.objects.filter((o) => Math.abs(o.lane) < 0.5).sort((a, b) => a.distM - b.distM)[0];
  const close = lead && lead.distM < 15 && car.speedMph > 10;

  return (
    <div className="cl">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="cl-left">
            <div className="cl-road"><RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} /></div>
            <div className="cl-speed">
              <div className="cl-speed-n">{Math.round(car.speedMph)}</div>
              <div className="cl-speed-u">MPH</div>
            </div>
            <div className="cl-prnd">
              {(["P", "R", "N", "D"] as const).map((g) => (
                <span key={g} data-on={g === "N" ? car.gear === "N" : g === "D" ? !["N", "R", "P"].includes(car.gear) : car.gear === g}>{g}</span>
              ))}
              <small>{car.gear !== "N" ? car.gear : ""}</small>
            </div>
            <div className="cl-lead" data-close={close}>
              {lead ? <><b>{Math.round(lead.distM)} m</b> {lead.kind} ahead</> : <b>Lane clear</b>}
            </div>
            <div className="cl-stats">
              <span><b>{Math.round(car.rpm)}</b> rpm</span>
              <span><b>{Math.round(car.coolantF)}°</b> coolant</span>
              <span><b>{Math.round(car.fuelPct)}%</b> fuel</span>
              <span><b>{car.objects.length}</b> tracked</span>
            </div>
            <div className="cl-ai">AI · {car.objects.length} OBJ · 30 FPS</div>
          </section>

          <section className="cl-right">
            <header className="cl-status">
              <span className="cl-time">{hhmm(now)}</span>
              <span>{car.outsideF}°F</span>
              <span>{compass(car.headingDeg)}</span>
              <span className="cl-dot" data-on={ctx.online} />
              <span className="cl-fill" />
              <button onClick={ctx.openSettings}>⚙</button>
            </header>
            <div className="cl-card cl-cam">
              <CameraFeed kind="front" label={false} />
              <span className="cl-tag">FRONT · ПЕРЕДНЯЯ</span>
            </div>
            <div className="cl-card cl-media">
              <div className="cl-media-art">{ctx.media ? "♫" : "—"}</div>
              <div className="cl-media-text">
                <div className="cl-media-t">{ctx.media?.title ?? "No media"}</div>
                <div className="cl-media-a">{ctx.media ? `${ctx.media.artist} · ${ctx.media.app}` : "Play something on Android"}</div>
              </div>
              <button onClick={() => ctx.mediaControl("previous")}>⏮</button>
              <button className="cl-play" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>⏭</button>
            </div>
            <div className="cl-apps">
              {ctx.apps.slice(0, 8).map((a) => (
                <button key={a.key} className="cl-app" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                  <AppGlyph app={a} className="cl-glyph" />
                  <span>{a.title}</span>
                </button>
              ))}
            </div>
            <div className="cl-controls">
              <button onClick={() => ctx.setVolume(Math.max(0, ctx.state.volume.level - 0.1))}>−</button>
              <div className="cl-vol"><span style={{ width: `${ctx.state.volume.level * 100}%` }} /><i>VOL {Math.round(ctx.state.volume.level * 100)}</i></div>
              <button onClick={() => ctx.setVolume(Math.min(1, ctx.state.volume.level + 0.1))}>+</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** App mode: a slim cluster under the app with a small live road render. */
function Strip({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  return (
    <div className="cl-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="cl-strip-home" onClick={ctx.goHome}>⌂</button>
      <div className="cl-strip-road"><RoadScene objects={car.objects} speedMph={car.speedMph} style={{ ...ROAD, horizon: 0.05 }} /></div>
      <div className="cl-strip-speed">{Math.round(car.speedMph)}<small>MPH · {car.gear}</small></div>
      <div className="cl-strip-cam"><CameraFeed kind="front" label={false} /></div>
      <div className="cl-strip-apps">
        {ctx.running.slice(0, 4).map((a) => <button key={a.key} data-active={a.active} onClick={a.open}><AppGlyph app={a} className="cl-glyph" /></button>)}
        {ctx.state.keyboard.available && <button onClick={ctx.openKeyboard}>⌨</button>}
      </div>
      <div className="cl-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const cluster: Design = {
  id: "cluster",
  name: "Cluster Split",
  tagline: "TEYES/Tesla road render with 3D traffic on the left, cards on the right",
  slot: "top",
  swatch: ["#0b1220", "#2b8cff"],
  Component: Cluster,
};
