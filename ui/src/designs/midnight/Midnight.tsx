import { useMemo, useState } from "react";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./midnight.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * MIDNIGHT PRECISION (after Linear / Vercel / Raycast): near-black, hairline
 * borders with a lit top edge, one indigo accent, a light that travels the
 * card edges faster as you drive, and a command palette for apps with
 * big letter keys to filter.
 */
const ROAD: RoadStyle = { kind: "wire", bg: "", road: "", lane: "#3a3d4a", object: "#9aa3ff", objectAccent: "#f5c26b", ego: "#e6e8ff", horizon: 0.06, glow: 0, focal: 14, path: "rgba(94,106,210,0.55)" };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function Midnight({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const [q, setQ] = useState("");
  const apps = useMemo(() => ctx.apps.filter((a) => !q || a.title.toUpperCase().startsWith(q) || a.title.toUpperCase().includes(" " + q)), [ctx.apps, q]);
  const used = useMemo(() => new Set(ctx.apps.map((a) => a.title[0].toUpperCase())), [ctx.apps]);
  const beam = Math.max(2.5, 12 - car.speedMph / 8);

  return (
    <div className="mn" style={{ ["--beam" as string]: `${beam}s` }}>
      <div className="mn-glow" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="mn-head">
            <span className="mn-crumb">Mustang <i>/</i> <b>Home</b></span>
            <span className="mn-kbd">{car.outsideF}°F</span>
            <span className="mn-kbd">{compass(car.headingDeg)}</span>
            <span className="mn-dot" data-on={ctx.online} />
            <span className="mn-fill" />
            <span className="mn-time">{hhmm(new Date())}</span>
          </header>

          <section className="mn-card mn-drive">
            <div className="mn-road"><RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} /></div>
            <div className="mn-speed">
              <span className="mn-label">Speed</span>
              <b>{Math.round(car.speedMph)}</b>
              <span className="mn-unit">mph · gear {car.gear}</span>
            </div>
            <div className="mn-metrics">
              <Metric k="Engine" v={`${Math.round(car.rpm)}`} u="rpm" f={car.rpm / 7000} />
              <Metric k="Coolant" v={`${Math.round(car.coolantF)}`} u="°F" f={(car.coolantF - 120) / 140} />
              <Metric k="Fuel" v={`${Math.round(car.fuelPct)}`} u="%" f={car.fuelPct / 100} />
            </div>
          </section>

          <section className="mn-card mn-cam">
            <CameraFeed kind="front" label={false} filter="saturate(0.7)" />
            <span className="mn-badge"><i />Front camera</span>
          </section>

          <section className="mn-card mn-media">
            <div className="mn-media-art" />
            <div className="mn-media-text">
              <span className="mn-label">{ctx.media ? ctx.media.app : "Media"}</span>
              <b>{ctx.media?.title ?? "Nothing playing"}</b>
              <span>{ctx.media?.artist ?? "—"}</span>
            </div>
            <button className="mn-btn" onClick={() => ctx.mediaControl("previous")}>⏮</button>
            <button className="mn-btn mn-btn-primary" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
            <button className="mn-btn" onClick={() => ctx.mediaControl("next")}>⏭</button>
          </section>

          <section className="mn-card mn-palette">
            <div className="mn-search">
              <span className="mn-search-i">⌕</span>
              <span className="mn-search-q">{q ? <b>{q}</b> : "Open an app…"}</span>
              {q && <button className="mn-kbd mn-clear" onClick={() => setQ("")}>esc</button>}
              <button className="mn-kbd" onClick={ctx.openSettings}>⚙ Settings</button>
            </div>
            <div className="mn-list">
              {apps.slice(0, 6).map((a) => (
                <button key={a.key} className="mn-item" disabled={a.disabled} onClick={a.open}>
                  <AppGlyph app={a} className="mn-glyph" />
                  <span className="mn-item-t">{a.title}</span>
                  <span className="mn-tag">{a.kind === "android" ? "Android" : a.kind === "aa" ? "Phone" : "Linux"}</span>
                  {a.running && <span className="mn-tag mn-tag-on">Running</span>}
                  <span className="mn-enter">↵</span>
                </button>
              ))}
            </div>
            <div className="mn-letters">
              {LETTERS.filter((l) => used.has(l)).map((l) => <button key={l} data-on={q === l} onClick={() => setQ(q === l ? "" : l)}>{l}</button>)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ k, v, u, f }: { k: string; v: string; u: string; f: number }) {
  return (
    <div className="mn-metric">
      <span className="mn-label">{k}</span>
      <b>{v}<small>{u}</small></b>
      <div className="mn-track"><i style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></div>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="mn-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="mn-btn mn-strip-home" onClick={ctx.goHome}>← Home</button>
      <div className="mn-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="mn-strip-road"><RoadScene objects={ctx.car.objects} speedMph={ctx.car.speedMph} style={ROAD} /></div>
      <div className="mn-strip-cam"><CameraFeed kind="front" label={false} filter="saturate(0.7)" /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="mn-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="mn-glyph" /></button>)}
      {ctx.state.keyboard.available && <button className="mn-btn" onClick={ctx.openKeyboard}>⌨</button>}
      <div className="mn-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const midnight: Design = {
  id: "midnight",
  name: "Midnight Precision",
  tagline: "Linear/Raycast: near-black, hairlines, edge light, command palette",
  slot: "top",
  swatch: ["#08090a", "#5e6ad2"],
  Component: Midnight,
};
