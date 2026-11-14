import "@fontsource-variable/fredoka";
import "./clay.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm } from "../kit/hooks";

/**
 * CLAY (after the soft-3D wave: Family, Arc, Airbnb's 2025 icons): a clay
 * toy Mustang sits on the home screen and leans into corners; everything
 * else is soft, chunky, pastel clay that squashes when pressed.
 */
const TINTS = ["#f7d2c4", "#cfe5d3", "#d6daf4", "#f5e5b5", "#efd0e8", "#cde6ee"];

function Clay({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const g = greetings(now);
  const lean = Math.max(-6, Math.min(6, car.gLat * 22));
  const bob = car.speedMph > 1 ? "running" : "paused";

  return (
    <div className="cl3">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="cl3-hello">
            <div className="cl3-time">{hhmm(now)}</div>
            <div className="cl3-greet">{g.en}, Andrey!<span>{g.ru} · {g.zh}</span></div>
          </section>

          <section className="cl3-car" style={{ ["--lean" as string]: `${lean}deg`, animationPlayState: bob }}>
            <img src="/art/clay/mustang.jpg" alt="" />
          </section>

          <section className="cl3-pill cl3-speed">
            <b>{Math.round(car.speedMph)}</b><span>mph</span>
            <i>gear {car.gear}</i>
          </section>

          <section className="cl3-blob cl3-cam"><div><CameraFeed kind="front" label={false} /></div></section>

          <section className="cl3-blob cl3-media">
            <div className="cl3-media-t">{ctx.media?.title ?? "No tunes yet"}</div>
            <div className="cl3-media-a">{ctx.media?.artist ?? "play something!"}</div>
            <div className="cl3-media-b">
              <button className="cl3-btn" style={{ ["--t" as string]: TINTS[2] }} onClick={() => ctx.mediaControl("previous")}>⏮</button>
              <button className="cl3-btn cl3-btn-big" style={{ ["--t" as string]: TINTS[0] }} onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
              <button className="cl3-btn" style={{ ["--t" as string]: TINTS[2] }} onClick={() => ctx.mediaControl("next")}>⏭</button>
            </div>
          </section>

          <nav className="cl3-apps">
            {ctx.apps.slice(0, 8).map((a, i) => (
              <button key={a.key} className="cl3-btn cl3-app" style={{ ["--t" as string]: TINTS[i % TINTS.length] }} disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="cl3-glyph" />
                <span>{a.title}</span>
              </button>
            ))}
            <button className="cl3-btn cl3-app" style={{ ["--t" as string]: "#e9e4df" }} onClick={ctx.openSettings}><span className="cl3-glyph glyph-letter">⚙</span><span>Settings</span></button>
          </nav>
        </>
      )}
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="cl3-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="cl3-btn cl3-strip-home" style={{ ["--t" as string]: TINTS[0] }} onClick={ctx.goHome}>⌂ Home</button>
      <div className="cl3-pill cl3-strip-speed"><b>{Math.round(ctx.car.speedMph)}</b><span>mph</span></div>
      <div className="cl3-blob cl3-strip-cam"><div><CameraFeed kind="front" label={false} /></div></div>
      {ctx.running.slice(0, 4).map((a, i) => (
        <button key={a.key} className="cl3-btn cl3-strip-app" data-active={a.active} style={{ ["--t" as string]: TINTS[(i + 1) % TINTS.length] }} onClick={a.open}><AppGlyph app={a} className="cl3-glyph" /></button>
      ))}
      {ctx.state.keyboard.available && <button className="cl3-btn cl3-strip-home" style={{ ["--t" as string]: TINTS[2] }} onClick={ctx.openKeyboard}>Keys</button>}
      <div className="cl3-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const clay: Design = {
  id: "clay",
  name: "Clay",
  tagline: "Soft 3D clay: a toy Mustang that leans into corners, squishy pastel buttons",
  slot: "top",
  swatch: ["#c5bbb3", "#f7d2c4"],
  Component: Clay,
};
