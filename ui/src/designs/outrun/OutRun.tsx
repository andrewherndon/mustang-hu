import { useState } from "react";
import "@fontsource/press-start-2p";
import "./outrun.css";
import type { Design, DesignContext } from "../kit/types";
import { CAR_REDLINE } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, pad2, useIdle } from "../kit/hooks";

/**
 * ARCADE OUTRUN: a sunset arcade racer. Score is the odometer, stage is the
 * gear, the road render is the race track, apps are cartridges and music is
 * picked from the radio, like a coin-op's music select.
 */
const ROAD: RoadStyle = { kind: "wire", bg: "", road: "", lane: "#ff4fd8", object: "#29f3ff", objectAccent: "#ffe66b", ego: "#ff2e63", horizon: 0.02, glow: 10 };

function OutRun({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(90_000) && car.parked && !ctx.appOpen;
  const [select, setSelect] = useState(false);
  const pts = Math.floor(car.odometerMi * 10).toString().padStart(8, "0");

  return (
    <div className="or">
      <div className="or-sky"><div className="or-sun" /><div className="or-mtn" /></div>
      {ctx.appOpen ? <Hud ctx={ctx} /> : (
        <>
          <div className="or-ground"><RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} /></div>
          <header className="or-hud">
            <div><span className="or-k">SCORE</span><span className="or-v">{pts}</span></div>
            <div className="or-mid"><span className="or-k or-blink">TIME</span><span className="or-time">{hhmm(now, true)}</span></div>
            <div className="or-r"><span className="or-k">STAGE</span><span className="or-v">{car.gear === "N" ? "PIT" : `0${car.gear}`}</span></div>
          </header>
          <div className="or-speed">
            <div className="or-speed-n">{pad2(car.speedMph).padStart(3, "0")}<small>MPH</small></div>
            <Tach rpm={car.rpm} />
          </div>
          <div className="or-cam">
            <CameraFeed kind="front" label={false} filter="saturate(1.6) hue-rotate(-30deg) contrast(1.2)" />
            <span>CAM-1 LIVE</span>
          </div>
          <div className="or-radio" onClick={() => ctx.mediaControl("next")}>
            <span className="or-k">RADIO</span>
            <span className="or-radio-t">{ctx.media ? `♪ ${ctx.media.title.toUpperCase()}` : "♪ MAGICAL SOUND SHOWER"}</span>
          </div>
          <nav className="or-carts">
            <button className="or-start" onClick={() => setSelect(true)}>▶ PRESS START</button>
            {ctx.running.slice(0, 3).map((a) => (
              <button key={a.key} className="or-cart" onClick={a.open}><AppGlyph app={a} className="or-glyph" /></button>
            ))}
            <button className="or-cart or-aa" disabled={!ctx.state.aa.connected} onClick={() => ctx.openLayout("aa")}>AA</button>
            <button className="or-cart" onClick={ctx.openSettings}>⚙</button>
          </nav>
        </>
      )}
      {select && !ctx.appOpen && <Select ctx={ctx} onClose={() => setSelect(false)} />}
      {idle && (
        <div className="or-attract">
          <div className="or-attract-title">MUSTANG<br /><span>5.0 RUN</span></div>
          <div className="or-attract-sub or-blink">INSERT COIN</div>
          <div className="or-attract-hi">HI-SCORE {pts} · ANDREY<br />ВСТАВЬТЕ МОНЕТУ · 请投币</div>
        </div>
      )}
    </div>
  );
}

function Tach({ rpm }: { rpm: number }) {
  const n = 24, lit = Math.round((rpm / 7000) * n);
  return (
    <div className="or-tach">
      {Array.from({ length: n }, (_, i) => <i key={i} data-on={i < lit} data-red={(i + 1) * (7000 / n) > CAR_REDLINE} style={{ height: 10 + i * 2.2 }} />)}
    </div>
  );
}

function Select({ ctx, onClose }: { ctx: DesignContext; onClose: () => void }) {
  return (
    <div className="or-select">
      <div className="or-select-title">SELECT APP<span>ВЫБОР · 选择</span></div>
      <div className="or-select-grid">
        {ctx.apps.map((a, i) => (
          <button key={a.key} disabled={a.disabled} onClick={() => { onClose(); a.open(); }}>
            <span className="or-select-n">{i + 1}P</span>
            <AppGlyph app={a} className="or-glyph" />
            <span className="or-select-t">{a.title.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="or-select-radio">
        <button onClick={() => ctx.mediaControl("previous")}>◀</button>
        <span>{ctx.media ? `${ctx.media.title} / ${ctx.media.artist}`.toUpperCase() : "NO TAPE"}</span>
        <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
        <button onClick={() => ctx.mediaControl("next")}>▶</button>
      </div>
      <button className="or-select-back" onClick={onClose}>◀ BACK</button>
    </div>
  );
}

/** App mode: the arcade HUD squeezed into the top strip. */
function Hud({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="or-strip" style={{ height: ctx.slot.y }}>
      <button className="or-strip-btn" onClick={ctx.goHome}>◀ PIT</button>
      <div className="or-strip-speed">{Math.round(ctx.car.speedMph).toString().padStart(3, "0")}<small>MPH</small></div>
      <Tach rpm={ctx.car.rpm} />
      <div className="or-strip-cam"><CameraFeed kind="front" label={false} filter="saturate(1.6) hue-rotate(-30deg)" /></div>
      {ctx.running.slice(0, 3).map((a) => <button key={a.key} className="or-cart" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="or-glyph" /></button>)}
      {ctx.state.keyboard.available && <button className="or-strip-btn" onClick={ctx.openKeyboard}>KEY</button>}
      <div className="or-strip-time">{hhmm(new Date(), true)}</div>
    </div>
  );
}

export const outrun: Design = {
  id: "outrun",
  name: "Arcade OutRun",
  tagline: "Sunset coin-op racer: score, stage, radio select, insert coin",
  slot: "bottom",
  swatch: ["#2a0a4a", "#ff4fd8"],
  Component: OutRun,
};
