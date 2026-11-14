import { useEffect, useState } from "react";
import "@fontsource-variable/outfit";
import "./console.css";
import type { Design, DesignContext, UApp } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * GAME CONSOLE: a 2008-era console dashboard. Channels you swipe between,
 * glossy tiles, a profile card with a "score" (the odometer), a guide
 * button for running apps, milestone toasts and an attract-mode orb.
 */
const CHANNELS = ["home", "apps", "media", "car"] as const;
type Channel = typeof CHANNELS[number];
const ROAD: RoadStyle = { kind: "solid", bg: "", road: "rgba(255,255,255,0.18)", lane: "#ffffff", object: "#d9f5c2", objectAccent: "#ffd23f", ego: "#7ac142", horizon: 0.1, cars3d: true, focal: 12 };

function Console({ ctx }: { ctx: DesignContext }) {
  const [ch, setCh] = useState<Channel>("home");
  const [guide, setGuide] = useState(false);
  const idle = useIdle(120_000) && ctx.car.parked && !ctx.appOpen;
  const toast = useMilestones(ctx.car.tripMi);

  return (
    <div className="cx">
      <div className="cx-bg"><i /><i /><i /></div>
      {ctx.appOpen ? <Strip ctx={ctx} onGuide={() => setGuide(true)} /> : (
        <>
          <header className="cx-top">
            <button className="cx-orb" onClick={() => setGuide(true)}><span>5.0</span></button>
            <nav className="cx-channels">
              {CHANNELS.map((c) => <button key={c} data-on={c === ch} onClick={() => setCh(c)}>{c}</button>)}
            </nav>
            <div className="cx-profile">
              <div className="cx-avatar">A</div>
              <div><b>Andrey</b><span>{Math.floor(ctx.car.odometerMi).toLocaleString()} <em>mi</em></span></div>
            </div>
          </header>
          <div className="cx-stage" data-ch={ch}>
            {ch === "home" && <Home ctx={ctx} go={setCh} />}
            {ch === "apps" && <Apps apps={ctx.apps} onSettings={ctx.openSettings} />}
            {ch === "media" && <MediaCh ctx={ctx} />}
            {ch === "car" && <CarCh ctx={ctx} />}
          </div>
          <footer className="cx-hints">
            <span><i className="cx-btn-a">A</i>select</span>
            <button onClick={() => setCh(CHANNELS[(CHANNELS.indexOf(ch) + 3) % 4])}><i className="cx-btn-b">B</i>back</button>
            <button onClick={() => setGuide(true)}><i className="cx-btn-x">X</i>guide</button>
            <button onClick={ctx.openSettings}><i className="cx-btn-y">Y</i>settings</button>
            <span className="cx-fill" />
            <span className="cx-time">{hhmm(new Date())}</span>
          </footer>
        </>
      )}
      {toast && <div className="cx-toast"><div className="cx-toast-icon">★</div><div><small>Milestone unlocked · Достижение · 成就</small><b>{toast}</b></div></div>}
      {guide && <Guide ctx={ctx} onClose={() => setGuide(false)} />}
      {idle && <div className="cx-attract"><div className="cx-attract-orb"><span>5.0</span></div><div className="cx-attract-t">touch to start · коснитесь · 触摸开始</div></div>}
    </div>
  );
}

function Tile({ cls, title, sub, onClick, children, disabled }: { cls?: string; title: string; sub?: string; onClick?: () => void; children?: React.ReactNode; disabled?: boolean }) {
  return (
    <button className={`cx-tile ${cls ?? ""}`} onClick={onClick} disabled={disabled}>
      <div className="cx-tile-body">{children}</div>
      <div className="cx-tile-cap"><b>{title}</b>{sub && <span>{sub}</span>}</div>
    </button>
  );
}

function Home({ ctx, go }: { ctx: DesignContext; go: (c: Channel) => void }) {
  const aa = ctx.apps.find((a) => a.kind === "aa");
  return (
    <div className="cx-grid cx-home">
      <Tile cls="cx-hero" title="Front camera" sub="Live · always on">
        <CameraFeed kind="front" label={false} />
      </Tile>
      <Tile cls="cx-np" title={ctx.media?.title ?? "Nothing playing"} sub={ctx.media ? ctx.media.artist : "Open media"} onClick={() => go("media")}>
        <div className="cx-np-art">♪</div>
      </Tile>
      <Tile cls="cx-aa" title="Android Auto" sub={ctx.state.aa.connected ? "Phone connected" : "Plug in your phone"} onClick={aa?.open} disabled={aa?.disabled}>
        {aa && <AppGlyph app={aa} className="cx-glyph-big" />}
      </Tile>
      <Tile cls="cx-road" title={`${Math.round(ctx.car.speedMph)} mph`} sub={`Gear ${ctx.car.gear} · ${ctx.car.objects.length} around you`} onClick={() => go("car")}>
        <RoadScene objects={ctx.car.objects} speedMph={ctx.car.speedMph} style={ROAD} />
      </Tile>
      {ctx.running.slice(0, 2).map((a) => (
        <Tile key={a.key} cls="cx-small" title={a.title} sub="Resume" onClick={a.open}><AppGlyph app={a} className="cx-glyph" /></Tile>
      ))}
      <Tile cls="cx-small" title="All apps" sub={`${ctx.apps.length} installed`} onClick={() => go("apps")}><div className="cx-glyph glyph-letter">⊞</div></Tile>
    </div>
  );
}

function Apps({ apps, onSettings }: { apps: UApp[]; onSettings: () => void }) {
  return (
    <div className="cx-grid cx-apps">
      {apps.map((a) => (
        <Tile key={a.key} cls="cx-app" title={a.title} sub={a.kind === "android" ? "Android" : a.kind === "aa" ? "Phone" : "Linux"} onClick={a.open} disabled={a.disabled}>
          <AppGlyph app={a} className="cx-glyph" />
        </Tile>
      ))}
      <Tile cls="cx-app" title="System settings" sub="Design & more" onClick={onSettings}><div className="cx-glyph glyph-letter">⚙</div></Tile>
    </div>
  );
}

function MediaCh({ ctx }: { ctx: DesignContext }) {
  const m = ctx.media;
  return (
    <div className="cx-media">
      <div className="cx-media-art">{m ? m.title.slice(0, 1) : "♪"}</div>
      <div className="cx-media-info">
        <small>{m ? `Now playing on ${m.app}` : "Music"}</small>
        <b>{m?.title ?? "Nothing playing"}</b>
        <span>{m ? `${m.artist} — ${m.album}` : "Start something on Android or YouTube"}</span>
        <div className="cx-media-b">
          <button onClick={() => ctx.mediaControl("previous")}>⏮</button>
          <button className="cx-media-play" onClick={() => ctx.mediaControl("play-pause")}>{m?.playing ? "⏸" : "▶"}</button>
          <button onClick={() => ctx.mediaControl("next")}>⏭</button>
        </div>
        <div className="cx-vol">
          <button onClick={() => ctx.setVolume(Math.max(0, ctx.state.volume.level - 0.1))}>−</button>
          <div><i style={{ width: `${ctx.state.volume.level * 100}%` }} /></div>
          <button onClick={() => ctx.setVolume(Math.min(1, ctx.state.volume.level + 0.1))}>+</button>
        </div>
      </div>
    </div>
  );
}

function CarCh({ ctx }: { ctx: DesignContext }) {
  const c = ctx.car;
  const stats: [string, string, number][] = [
    ["Speed", `${Math.round(c.speedMph)} mph`, c.speedMph / 120], ["Engine", `${Math.round(c.rpm)} rpm`, c.rpm / 7000],
    ["Coolant", `${Math.round(c.coolantF)}°F`, (c.coolantF - 120) / 140], ["Oil", `${Math.round(c.oilPsi)} psi`, c.oilPsi / 80],
    ["Battery", `${c.voltage.toFixed(1)} V`, (c.voltage - 10) / 6], ["Fuel", `${Math.round(c.fuelPct)}%`, c.fuelPct / 100],
  ];
  return (
    <div className="cx-car">
      <div className="cx-car-road"><RoadScene objects={c.objects} speedMph={c.speedMph} style={ROAD} /></div>
      <div className="cx-car-stats">
        <h3>1995 Mustang GT · Convertible</h3>
        {stats.map(([k, v, f]) => (
          <div key={k} className="cx-stat"><span>{k}</span><b>{v}</b><div><i style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></div></div>
        ))}
        <div className="cx-car-trip">Trip {c.tripMi.toFixed(1)} mi · {Math.floor(c.odometerMi).toLocaleString()} mi total</div>
      </div>
    </div>
  );
}

/** The guide: a side panel with running apps, home and volume. */
function Guide({ ctx, onClose }: { ctx: DesignContext; onClose: () => void }) {
  return (
    <div className="cx-guide-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cx-guide">
        <div className="cx-guide-head"><div className="cx-avatar">A</div><div><b>Andrey</b><span>{hhmm(new Date())} · {ctx.car.outsideF}°F</span></div></div>
        <button className="cx-guide-row cx-guide-home" onClick={() => { onClose(); ctx.goHome(); }}>Dashboard home</button>
        <div className="cx-guide-k">Running</div>
        {ctx.running.length === 0 && <div className="cx-guide-empty">Nothing running</div>}
        {ctx.running.map((a) => (
          <button key={a.key} className="cx-guide-row" data-active={a.active} onClick={() => { onClose(); a.open(); }}><AppGlyph app={a} className="cx-guide-glyph" />{a.title}</button>
        ))}
        {ctx.state.keyboard.available && <button className="cx-guide-row" onClick={() => { onClose(); ctx.openKeyboard(); }}>Keyboard</button>}
        <button className="cx-guide-row" onClick={() => { onClose(); ctx.openSettings(); }}>Settings</button>
      </div>
    </div>
  );
}

function Strip({ ctx, onGuide }: { ctx: DesignContext; onGuide: () => void }) {
  return (
    <div className="cx-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="cx-orb cx-orb-s" onClick={onGuide}><span>5.0</span></button>
      <button className="cx-strip-home" onClick={ctx.goHome}>Home</button>
      <div className="cx-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="cx-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="cx-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="cx-glyph" /></button>)}
      <div className="cx-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

/** Show a toast each time the trip passes a whole number of 5 miles. */
function useMilestones(tripMi: number) {
  const [toast, setToast] = useState<string | null>(null);
  const [last, setLast] = useState(Math.floor(tripMi / 5));
  useEffect(() => {
    const n = Math.floor(tripMi / 5);
    if (n > last) {
      setLast(n);
      setToast(`${n * 5} miles this trip — 10 pts`);
      const t = window.setTimeout(() => setToast(null), 5000);
      return () => window.clearTimeout(t);
    }
  }, [tripMi, last]);
  return toast;
}

export const consoleDesign: Design = {
  id: "console",
  name: "Game Console",
  tagline: "2008 console dashboard: channels, glossy tiles, guide, milestones",
  slot: "top",
  swatch: ["#e9eef0", "#7ac142"],
  Component: Console,
};
