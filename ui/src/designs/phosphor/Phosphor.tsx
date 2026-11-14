import { useEffect, useRef, useState } from "react";
import "@fontsource/vt323";
import "@fontsource/share-tech-mono";
import "./phosphor.css";
import type { Design, DesignContext } from "../kit/types";
import { CAR_REDLINE, compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * PHOSPHOR: early-80s vector-CRT instrument panel (think Z31 300ZX digital
 * dash). Everything is green phosphor on black with bloom and scanlines.
 */
const ROAD: RoadStyle = {
  kind: "phosphor", bg: "", road: "", lane: "#4dff9a", object: "#4dff9a", objectAccent: "#ffd23f", ego: "#4dff9a", glow: 8,
};
const CAM_FILTER = "grayscale(1) sepia(1) hue-rotate(70deg) saturate(3) brightness(0.9) contrast(1.2)";

function Phosphor({ ctx }: { ctx: DesignContext }) {
  const { car, appOpen } = ctx;
  const idle = useIdle(90_000) && car.parked && !appOpen;
  const [channels, setChannels] = useState(false);
  const now = new Date();

  return (
    <div className="ph" data-app={appOpen}>
      <div className="ph-scan" />
      {appOpen ? <AppStrip ctx={ctx} /> : (
        <>
          <header className="ph-head">
            <div className="ph-clock">{hhmm(now, true)}<span className="ph-sub">{now.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" }).toUpperCase()}</span></div>
            <div className="ph-speed">
              <span className="ph-speed-n">{Math.round(car.speedMph).toString().padStart(3, " ")}</span>
              <span className="ph-speed-u">MPH</span>
            </div>
            <div className="ph-gear">
              <span className="ph-gear-n">{car.gear}</span>
              <span className="ph-sub">{compass(car.headingDeg)} {Math.round(car.headingDeg).toString().padStart(3, "0")}°</span>
            </div>
          </header>
          <Tach rpm={car.rpm} />

          <main className="ph-main">
            <section className="ph-left">
              <div className="ph-panel ph-cam">
                <CameraFeed kind="front" filter={CAM_FILTER} />
                <span className="ph-panel-tag">ПЕРЕДНЯЯ КАМЕРА · FRONT</span>
              </div>
              <MediaTicker ctx={ctx} />
            </section>
            <section className="ph-panel ph-road">
              <RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} />
              <span className="ph-panel-tag">OBJ {car.objects.length.toString().padStart(2, "0")} · RANGE 90M</span>
            </section>
            <section className="ph-gauges">
              <Bar label="TEMP" value={car.coolantF} min={120} max={260} warn={225} fmt={(v) => `${Math.round(v)}°F`} />
              <Bar label="OIL" value={car.oilPsi} min={0} max={80} fmt={(v) => `${Math.round(v)} PSI`} />
              <Bar label="VOLT" value={car.voltage} min={10} max={16} fmt={(v) => `${v.toFixed(1)} V`} />
              <Bar label="FUEL" value={car.fuelPct} min={0} max={100} warn={-15} fmt={(v) => `${Math.round(v)}%`} />
              <div className="ph-trip"><span>TRIP</span>{car.tripMi.toFixed(1)}<span>ODO</span>{Math.floor(car.odometerMi).toLocaleString()}</div>
            </section>
          </main>

          <nav className="ph-modes">
            <Mode label="AUTO" on={ctx.state.aa.connected} onClick={() => ctx.openLayout("aa")} disabled={!ctx.state.aa.connected} />
            <Mode label="CHANNELS" onClick={() => setChannels(true)} />
            {ctx.running.slice(0, 3).map((a) => <Mode key={a.key} label={a.title.toUpperCase().slice(0, 10)} on onClick={a.open} />)}
            <span className="ph-modes-fill" />
            <Mode label={`VOL ${Math.round(ctx.state.volume.level * 100)}`} onClick={() => ctx.setVolume(Math.min(1, ctx.state.volume.level + 0.1))} />
            <Mode label="SET" onClick={ctx.openSettings} />
          </nav>
        </>
      )}
      {channels && !appOpen && <Channels ctx={ctx} onClose={() => setChannels(false)} />}
      {idle && <Scope />}
    </div>
  );
}

function Tach({ rpm }: { rpm: number }) {
  const segs = 40;
  const lit = Math.round((rpm / 7000) * segs);
  return (
    <div className="ph-tach">
      {Array.from({ length: segs }, (_, i) => {
        const r = (i + 1) * (7000 / segs);
        return <span key={i} data-on={i < lit} data-zone={r > CAR_REDLINE ? "red" : r > 4800 ? "amber" : "g"} style={{ height: `${30 + i * 1.2}px` }} />;
      })}
      <div className="ph-tach-scale">{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <span key={k}>{k}</span>)}</div>
      <div className="ph-tach-n">{Math.round(rpm / 10) * 10} RPM ×1000</div>
    </div>
  );
}

function Bar({ label, value, min, max, warn, fmt }: { label: string; value: number; min: number; max: number; warn?: number; fmt: (v: number) => string }) {
  const f = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const segs = 16, lit = Math.round(f * segs);
  const alarm = warn !== undefined && (warn > 0 ? value > warn : value < -warn);
  return (
    <div className="ph-bar" data-alarm={alarm}>
      <span className="ph-bar-l">{label}</span>
      <span className="ph-bar-segs">{Array.from({ length: segs }, (_, i) => <i key={i} data-on={i < lit} />)}</span>
      <span className="ph-bar-v">{fmt(value)}</span>
    </div>
  );
}

function Mode({ label, onClick, on, disabled }: { label: string; onClick: () => void; on?: boolean; disabled?: boolean }) {
  return <button className="ph-mode" data-on={on} disabled={disabled} onClick={onClick}>{label}</button>;
}

function MediaTicker({ ctx }: { ctx: DesignContext }) {
  const m = ctx.media;
  const text = m ? `${m.playing ? "▶" : "Ⅱ"} ${m.title} — ${m.artist}  ·  ${m.app.toUpperCase()}  ·  ` : "NO SIGNAL · НЕТ СИГНАЛА · 无信号 ·  ";
  return (
    <div className="ph-panel ph-media">
      <div className="ph-ticker"><span>{text.repeat(4)}</span></div>
      <div className="ph-media-btns">
        <button onClick={() => ctx.mediaControl("previous")}>◀◀</button>
        <button onClick={() => ctx.mediaControl("play-pause")}>{m?.playing ? "ⅡⅡ" : "▶"}</button>
        <button onClick={() => ctx.mediaControl("next")}>▶▶</button>
      </div>
    </div>
  );
}

/** App list as a channel guide: number, name, status. */
function Channels({ ctx, onClose }: { ctx: DesignContext; onClose: () => void }) {
  return (
    <div className="ph-channels" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ph-channels-box">
        <div className="ph-channels-title">CHANNEL GUIDE · КАНАЛЫ <button onClick={onClose}>EXIT</button></div>
        <div className="ph-channels-list">
          {ctx.apps.map((a, i) => (
            <button key={a.key} disabled={a.disabled} onClick={() => { onClose(); a.open(); }}>
              <span className="ph-ch-n">{String(i + 1).padStart(2, "0")}</span>
              {a.icon ? <img src={a.icon} alt="" /> : <i />}
              <span className="ph-ch-t">{a.title.toUpperCase()}</span>
              <span className="ph-ch-s">{a.kind === "android" ? "AND" : a.kind === "aa" ? "AA" : "LNX"}{a.running ? " ●" : ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** App mode: the cluster squeezed into the top strip above the app. */
function AppStrip({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  return (
    <div className="ph-strip" style={{ height: ctx.slot.y }}>
      <button className="ph-mode ph-home" onClick={ctx.goHome}>◄ HOME</button>
      <div className="ph-strip-speed">{Math.round(car.speedMph)}<small>MPH</small></div>
      <div className="ph-strip-tach"><span style={{ width: `${(car.rpm / 7000) * 100}%` }} /></div>
      <div className="ph-strip-cam"><CameraFeed kind="front" filter={CAM_FILTER} label={false} /></div>
      {ctx.running.slice(0, 3).map((a) => <button key={a.key} className="ph-mode" data-on={a.active} onClick={a.open}>{a.title.toUpperCase().slice(0, 9)}</button>)}
      {ctx.state.keyboard.available && <button className="ph-mode" onClick={ctx.openKeyboard}>KBD</button>}
      <div className="ph-strip-clock">{hhmm(new Date(), true)}</div>
    </div>
  );
}

/** Screensaver: an oscilloscope tracing Lissajous figures, with the car's name. */
function Scope() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    el.width = 1440; el.height = 960;
    let raf = 0, t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw); t += 0.004;
      c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(0, 0, 1440, 960);
      c.strokeStyle = "#4dff9a"; c.lineWidth = 2.2; c.shadowColor = "#4dff9a"; c.shadowBlur = 14;
      c.beginPath();
      for (let i = 0; i <= 600; i++) {
        const a = (i / 600) * Math.PI * 2;
        const x = 720 + 360 * Math.sin(3 * a + t * 3), y = 440 + 300 * Math.sin(2 * a + t * 1.3);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="ph-scope">
      <canvas ref={ref} />
      <div className="ph-scope-t">MUSTANG GT 5.0 · МУСТАНГ · 野马</div>
    </div>
  );
}

export const phosphor: Design = {
  id: "phosphor",
  name: "Phosphor",
  tagline: "Early-80s green vector-CRT dash, bar-graph tach, channel guide",
  slot: "bottom",
  swatch: ["#021006", "#4dff9a"],
  Component: Phosphor,
};
