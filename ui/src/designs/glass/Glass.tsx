import { useState } from "react";
import "@fontsource-variable/inter";
import "./glass.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm, useIdle } from "../kit/hooks";
import { compass } from "../kit/car";

/**
 * CUPERTINO GLASS: frosted panes over a slowly drifting colour field. Big
 * light clock, widget stack, a floating dock and an App Library sheet.
 */
const ROAD: RoadStyle = { kind: "solid", bg: "", road: "rgba(255,255,255,0.10)", lane: "rgba(255,255,255,0.85)", object: "#e9eef7", objectAccent: "#ffd60a", ego: "#ffffff", horizon: 0.18 };

function Glass({ ctx }: { ctx: DesignContext }) {
  const [library, setLibrary] = useState(false);
  const idle = useIdle(120_000) && ctx.car.parked && !ctx.appOpen;
  const now = new Date();
  const g = greetings(now);
  const dock = ctx.apps.filter((a) => !a.disabled).slice(0, 7);

  return (
    <div className="gl" data-idle={idle}>
      <div className="gl-wall"><i /><i /><i /><i /></div>
      {ctx.appOpen ? <GlassStrip ctx={ctx} /> : (
        <>
          <section className="gl-hero">
            <div className="gl-time">{hhmm(now)}</div>
            <div className="gl-date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
            <div className="gl-greet">{g.en}, Andrey<span>{g.ru} · {g.zh}</span></div>
            <div className="gl-chips">
              <span>{ctx.car.outsideF}°F outside</span>
              <span>{compass(ctx.car.headingDeg)} heading</span>
              <span>{Math.round(ctx.car.fuelPct)}% fuel</span>
            </div>
          </section>
          <section className="gl-card gl-trip">
            <div><small>Trip</small>{ctx.car.tripMi.toFixed(1)}<em>mi</em></div>
            <div><small>Coolant</small>{Math.round(ctx.car.coolantF)}<em>°F</em></div>
            <div><small>Battery</small>{ctx.car.voltage.toFixed(1)}<em>V</em></div>
            <div className="gl-trip-car">1995 Mustang GT · 5.0 V8</div>
          </section>

          <section className="gl-widgets">
            <div className="gl-card gl-cam">
              <CameraFeed kind="front" label={false} />
              <span className="gl-tag">Front camera</span>
            </div>
            <div className="gl-card gl-drive">
              <Ring value={ctx.car.speedMph / 120} />
              <div className="gl-drive-n">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
              <div className="gl-drive-g">{ctx.car.gear === "N" ? "Neutral" : `Gear ${ctx.car.gear}`} · {Math.round(ctx.car.rpm)} rpm</div>
            </div>
            <div className="gl-card gl-road">
              <RoadScene objects={ctx.car.objects} speedMph={ctx.car.speedMph} style={ROAD} />
              <span className="gl-tag">{ctx.car.objects.length} objects nearby</span>
            </div>
            <NowPlaying ctx={ctx} />
          </section>

          <nav className="gl-dock">
            {dock.map((a) => (
              <button key={a.key} className="gl-dock-app" onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="gl-icon" />
              </button>
            ))}
            <span className="gl-dock-sep" />
            <button className="gl-dock-app" onClick={() => setLibrary(true)}><span className="gl-icon gl-lib">{Array.from({ length: 4 }, (_, i) => <i key={i} />)}</span></button>
            <button className="gl-dock-app" onClick={ctx.openSettings}><span className="gl-icon gl-gear">⚙︎</span></button>
          </nav>
        </>
      )}
      {library && !ctx.appOpen && <Library ctx={ctx} onClose={() => setLibrary(false)} />}
      {idle && <div className="gl-idle"><div>{hhmm(now)}</div><span>Mustang · Мустанг · 野马</span></div>}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 70, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg className="gl-ring" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} className="gl-ring-bg" />
      <circle cx="90" cy="90" r={r} className="gl-ring-fg" strokeDasharray={`${c * 0.75 * v} ${c}`} />
    </svg>
  );
}

function NowPlaying({ ctx }: { ctx: DesignContext }) {
  const m = ctx.media;
  return (
    <div className="gl-card gl-np">
      <div className="gl-np-art" data-on={!!m}>{m ? m.title.slice(0, 1) : "♪"}</div>
      <div className="gl-np-text">
        <div className="gl-np-t">{m?.title ?? "Not Playing"}</div>
        <div className="gl-np-a">{m ? `${m.artist} · ${m.app}` : "Open a music app"}</div>
      </div>
      <div className="gl-np-btns">
        <button onClick={() => ctx.mediaControl("previous")}>⏮</button>
        <button className="gl-np-play" onClick={() => ctx.mediaControl("play-pause")}>{m?.playing ? "⏸" : "▶"}</button>
        <button onClick={() => ctx.mediaControl("next")}>⏭</button>
      </div>
    </div>
  );
}

function Library({ ctx, onClose }: { ctx: DesignContext; onClose: () => void }) {
  const groups: [string, typeof ctx.apps][] = [
    ["Car & Linux", ctx.apps.filter((a) => a.kind !== "android")],
    ["Android", ctx.apps.filter((a) => a.kind === "android")],
  ];
  return (
    <div className="gl-libsheet" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gl-libpanel">
        <div className="gl-libhead">App Library <button onClick={onClose}>Done</button></div>
        {groups.map(([name, apps]) => apps.length > 0 && (
          <div key={name} className="gl-libgroup">
            <h4>{name}</h4>
            <div className="gl-libgrid">
              {apps.map((a) => (
                <button key={a.key} disabled={a.disabled} onClick={() => { onClose(); a.open(); }}>
                  <AppGlyph app={a} className="gl-icon" />
                  <span>{a.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** App mode: the bottom strip becomes one long glass bar. */
function GlassStrip({ ctx }: { ctx: DesignContext }) {
  const top = ctx.slot.y + ctx.slot.height;
  return (
    <div className="gl-strip" style={{ top }}>
      <button className="gl-home" onClick={ctx.goHome}><span /></button>
      <div className="gl-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="gl-strip-cam"><CameraFeed kind="front" label={false} /></div>
      <div className="gl-strip-apps">
        {ctx.running.slice(0, 5).map((a) => (
          <button key={a.key} onClick={a.open} data-active={a.active}><AppGlyph app={a} className="gl-icon" /></button>
        ))}
      </div>
      {ctx.state.keyboard.available && <button className="gl-pill" onClick={ctx.openKeyboard}>Keyboard</button>}
      <div className="gl-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const glass: Design = {
  id: "glass",
  name: "Cupertino Glass",
  tagline: "Frosted widgets on a drifting colour field, floating dock, App Library",
  slot: "top",
  swatch: ["#5b6cff", "#ff7eb3"],
  Component: Glass,
};
