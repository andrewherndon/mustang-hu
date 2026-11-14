import { useRef } from "react";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter-tight";
import "./instrument.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * FIELD INSTRUMENT (after Teenage Engineering / Rabbit): the screen is a
 * piece of hardware. A black OLED window with simple colour vector gauges,
 * four colour-coded knobs that you turn by dragging, and apps as keycaps on
 * a light-grey moulded body with one orange key.
 */
const C = { blue: "#2f6ff2", green: "#25c25a", white: "#f2f2f2", orange: "#ff5a1f" };

function Instrument({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  return (
    <div className="ti">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <div className="ti-brand">MUSTANG <b>GT-95</b> <span>field unit · полевой блок · 野马</span></div>
          <div className="ti-screen">
            <div className="ti-oled">
              <div className="ti-gauges">
                <Gauge color={C.blue} label="RPM" value={car.rpm / 7000} text={(car.rpm / 1000).toFixed(1)} unit="×1000" />
                <Gauge color={C.green} label="MPH" value={car.speedMph / 120} text={String(Math.round(car.speedMph))} unit={`gear ${car.gear}`} big />
                <Gauge color={C.white} label="FUEL" value={car.fuelPct / 100} text={String(Math.round(car.fuelPct))} unit="%" />
                <Gauge color={C.orange} label="TEMP" value={(car.coolantF - 120) / 140} text={String(Math.round(car.coolantF))} unit="°F" />
              </div>
              <div className="ti-oled-row">
                <div className="ti-cam"><CameraFeed kind="front" label={false} /><span>CAM 1</span></div>
                <div className="ti-track">
                  <div className="ti-track-k">{ctx.media ? "▶ PLAYING" : "■ STOPPED"}</div>
                  <div className="ti-track-t">{ctx.media?.title ?? "no tape"}</div>
                  <div className="ti-track-a">{ctx.media ? `${ctx.media.artist} / ${ctx.media.app}` : "load music on android"}</div>
                  <div className="ti-wave">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${20 + 70 * Math.abs(Math.sin(i * 1.7 + now.getSeconds() * (ctx.media?.playing ? 1 : 0)))}%` }} />)}</div>
                </div>
                <div className="ti-clock">{hhmm(now, true)}</div>
              </div>
            </div>
          </div>

          <div className="ti-knobs">
            <Knob color={C.blue} label="VOL" value={ctx.state.volume.level} onChange={ctx.setVolume} />
            <Knob color={C.green} label="BRT" value={ctx.state.brightness} onChange={ctx.setBrightness} />
            <Knob color={C.white} label="TRK" value={0.5} onTurn={(d) => ctx.mediaControl(d > 0 ? "next" : "previous")} onPress={() => ctx.mediaControl("play-pause")} />
            <Knob color={C.orange} label="SET" value={0.5} onPress={ctx.openSettings} />
          </div>

          <nav className="ti-keys">
            {ctx.apps.slice(0, 10).map((a, i) => (
              <button key={a.key} className="ti-key" disabled={a.disabled} onClick={a.open} data-running={a.running} data-accent={i === 0}>
                <AppGlyph app={a} className="ti-key-g" filter="grayscale(1) contrast(1.3) brightness(0.6)" />
                <span>{a.title.toLowerCase()}</span>
                <i />
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

function Gauge({ color, label, value, text, unit, big }: { color: string; label: string; value: number; text: string; unit: string; big?: boolean }) {
  const v = Math.max(0, Math.min(1, value)), r = 52, c = 2 * Math.PI * r;
  return (
    <div className="ti-gauge" data-big={big}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#222" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke={color} strokeWidth="10" fill="none" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 60 60)" strokeLinecap="butt" />
        <line x1="60" y1="60" x2={60 + 34 * Math.sin(v * 2 * Math.PI)} y2={60 - 34 * Math.cos(v * 2 * Math.PI)} stroke={color} strokeWidth="5" strokeLinecap="round" />
        <circle cx="60" cy="60" r="7" fill={color} />
      </svg>
      <div className="ti-g-text"><b>{text}</b><span>{unit}</span></div>
      <div className="ti-g-label" style={{ color }}>{label}</div>
    </div>
  );
}

/** A knob: drag up/down (or around) to turn; tap to press. */
function Knob({ color, label, value, onChange, onTurn, onPress }: { color: string; label: string; value: number; onChange?: (v: number) => void; onTurn?: (dir: number) => void; onPress?: () => void }) {
  const drag = useRef<{ y: number; v: number; moved: boolean; acc: number } | null>(null);
  const angle = -135 + value * 270;
  return (
    <div className="ti-knob-wrap">
      <div className="ti-knob" style={{ ["--k" as string]: color, touchAction: "none" }}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); drag.current = { y: e.clientY, v: value, moved: false, acc: 0 }; }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return;
          const dy = d.y - e.clientY;
          if (Math.abs(dy) > 6) d.moved = true;
          if (onChange) onChange(Math.max(0, Math.min(1, d.v + dy / 300)));
          if (onTurn && Math.abs(dy - d.acc) > 60) { onTurn(dy - d.acc > 0 ? 1 : -1); d.acc = dy; }
        }}
        onPointerUp={() => { if (drag.current && !drag.current.moved) onPress?.(); drag.current = null; }}>
        <div className="ti-knob-cap" style={{ transform: `rotate(${angle}deg)` }}><i /></div>
      </div>
      <span>{label}</span>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="ti-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="ti-key ti-strip-key" data-accent="true" onClick={ctx.goHome}><span>home</span><i /></button>
      <div className="ti-strip-oled">
        <b style={{ color: C.green }}>{Math.round(ctx.car.speedMph)}</b><span>mph</span>
        <b style={{ color: C.blue }}>{(ctx.car.rpm / 1000).toFixed(1)}</b><span>rpm×1k</span>
        <div className="ti-strip-cam"><CameraFeed kind="front" label={false} /></div>
        <b style={{ color: C.white }}>{hhmm(new Date(), true)}</b>
      </div>
      {ctx.running.slice(0, 3).map((a) => (
        <button key={a.key} className="ti-key ti-strip-key" data-running={a.active} onClick={a.open}>
          <AppGlyph app={a} className="ti-key-g" filter="grayscale(1) contrast(1.3) brightness(0.6)" /><i />
        </button>
      ))}
      {ctx.state.keyboard.available && <button className="ti-key ti-strip-key" onClick={ctx.openKeyboard}><span>keys</span><i /></button>}
    </div>
  );
}

export const instrument: Design = {
  id: "instrument",
  name: "Field Instrument",
  tagline: "Teenage Engineering-style hardware: OLED window, colour knobs, keycap apps",
  slot: "top",
  swatch: ["#d9d9d5", "#ff5a1f"],
  Component: Instrument,
};
