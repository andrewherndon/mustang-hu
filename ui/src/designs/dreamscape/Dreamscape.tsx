import { useState } from "react";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/geist";
import "./dreamscape.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm } from "../kit/hooks";

/**
 * DREAMSCAPE (after Mercury / Arc): a painted landscape drifting very slowly
 * fills the screen; the interface is thin white type set straight on the art,
 * with one translucent dock. Mostly empty, calm, cinematic. Tap the title to
 * change scene. (Scenes are stills with a slow pan; swap in video loops later.)
 */
const SCENES = [
  { src: "/art/dream/dawn.jpg", name: "Blue Ridge, dawn", ru: "Голубой хребет", zh: "蓝岭 · 黎明" },
  { src: "/art/dream/coast.jpg", name: "Coast road, dusk", ru: "Прибрежная дорога", zh: "海岸公路 · 黄昏" },
];

function Dreamscape({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const [i, setI] = useState(now.getHours() >= 15 ? 1 : 0);
  const g = greetings(now);
  const s = SCENES[i];

  return (
    <div className="ds">
      {SCENES.map((sc, k) => <div key={sc.src} className="ds-art" data-on={k === i} style={{ backgroundImage: `url(${sc.src})` }} />)}
      <div className="ds-veil" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="ds-top">
            <div className="ds-time">{hhmm(now)}</div>
            <div className="ds-greet"><em>{g.en}</em>, Andrey <span>{g.ru} · {g.zh}</span></div>
          </header>

          <button className="ds-scene" onClick={() => setI((i + 1) % SCENES.length)}>
            <span>{s.name}</span><small>{s.ru} · {s.zh}</small>
          </button>

          <div className="ds-cam"><CameraFeed kind="front" label={false} /></div>

          <div className="ds-speed">
            <b>{Math.round(car.speedMph)}</b>
            <span>miles per hour<br />gear {car.gear} · {Math.round(car.fuelPct)}% fuel</span>
          </div>

          <div className="ds-media">
            <span>{ctx.media ? "Now playing" : "Quiet"}</span>
            <b>{ctx.media?.title ?? "—"}</b>
            <small>{ctx.media?.artist ?? ""}</small>
            <div>
              <button onClick={() => ctx.mediaControl("previous")}>⏮</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>⏭</button>
            </div>
          </div>

          <nav className="ds-dock">
            {ctx.apps.slice(0, 8).map((a) => (
              <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}><AppGlyph app={a} className="ds-glyph" /></button>
            ))}
            <span className="ds-dock-sep" />
            <button onClick={ctx.openSettings}><span className="ds-glyph glyph-letter">⚙</span></button>
          </nav>
        </>
      )}
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="ds-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="ds-strip-home" onClick={ctx.goHome}>Home</button>
      <div className="ds-strip-speed">{Math.round(ctx.car.speedMph)}<span>mph</span></div>
      <div className="ds-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="ds-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="ds-glyph" /></button>)}
      {ctx.state.keyboard.available && <button className="ds-strip-home" onClick={ctx.openKeyboard}>Keys</button>}
      <div className="ds-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const dreamscape: Design = {
  id: "dreamscape",
  name: "Dreamscape",
  tagline: "Mercury-style painted landscapes drifting slowly; thin type set on the art",
  slot: "top",
  swatch: ["#9fb3d9", "#f2b8a0"],
  Component: Dreamscape,
};
