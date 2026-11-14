import "@fontsource-variable/inter-tight";
import "./rams.css";
import type { Design, DesignContext } from "../kit/types";
import { CAR_REDLINE } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm } from "../kit/hooks";

/**
 * RAMS (after Dieter Rams / Braun): "less, but better". Cream, black and one
 * yellow. A Braun-clock speedometer with watch-style sub-dials, a speaker
 * grille of perforations, and round calculator keys for apps (ET66).
 */
function Rams({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  return (
    <div className="br2">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="br2-dial">
            <Speedo mph={car.speedMph} rpm={car.rpm} gear={car.gear} fuel={car.fuelPct} temp={car.coolantF} />
          </section>

          <section className="br2-right">
            <div className="br2-clock">
              <Clock d={now} />
              <div className="br2-clock-t"><b>{hhmm(now)}</b><span>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span></div>
            </div>
            <div className="br2-cam"><CameraFeed kind="front" label={false} filter="grayscale(0.2) contrast(1.05)" /></div>
            <div className="br2-radio">
              <div className="br2-grille" />
              <div className="br2-radio-info">
                <span className="br2-k">{ctx.media ? ctx.media.app : "Radio"}</span>
                <b>{ctx.media?.title ?? "—"}</b>
                <span>{ctx.media?.artist ?? "No signal"}</span>
              </div>
              <div className="br2-radio-b">
                <button className="br2-key" onClick={() => ctx.mediaControl("previous")}>◂◂</button>
                <button className="br2-key br2-key-y" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▸"}</button>
                <button className="br2-key" onClick={() => ctx.mediaControl("next")}>▸▸</button>
              </div>
            </div>
          </section>

          <nav className="br2-keys">
            {ctx.apps.slice(0, 9).map((a) => (
              <button key={a.key} className="br2-app" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <span className="br2-key br2-key-big"><AppGlyph app={a} className="br2-glyph" filter="grayscale(1) brightness(3)" /></span>
                <span>{a.title}</span>
              </button>
            ))}
            <button className="br2-app" onClick={ctx.openSettings}><span className="br2-key br2-key-big br2-key-y">⚙</span><span>Settings</span></button>
          </nav>
        </>
      )}
    </div>
  );
}

function Speedo({ mph, rpm, gear, fuel, temp }: { mph: number; rpm: number; gear: string; fuel: number; temp: number }) {
  const max = 140, a0 = -225, sweep = 270;
  const ang = (v: number) => a0 + (Math.min(v, max) / max) * sweep;
  const ticks = [];
  for (let v = 0; v <= max; v += 5) {
    const a = (ang(v) * Math.PI) / 180, major = v % 20 === 0;
    const r1 = 300, r2 = major ? 270 : 286;
    ticks.push(<line key={v} x1={330 + r1 * Math.cos(a)} y1={330 + r1 * Math.sin(a)} x2={330 + r2 * Math.cos(a)} y2={330 + r2 * Math.sin(a)} className={major ? "br2-tk-major" : "br2-tk"} />);
    if (major) ticks.push(<text key={`t${v}`} x={330 + 238 * Math.cos(a)} y={330 + 238 * Math.sin(a) + 11} className="br2-num">{v}</text>);
  }
  const needle = ang(mph);
  return (
    <svg viewBox="0 0 660 660" className="br2-speedo">
      <circle cx="330" cy="330" r="322" className="br2-face-ring" />
      <circle cx="330" cy="330" r="314" className="br2-face" />
      {ticks}
      <text x="330" y="210" className="br2-unit">mph</text>
      <SubDial cx={215} cy={420} label="rpm ×1000" v={rpm / 7000} red={CAR_REDLINE / 7000} text={(rpm / 1000).toFixed(1)} />
      <SubDial cx={445} cy={420} label="fuel" v={fuel / 100} text={`${Math.round(fuel)}`} />
      <SubDial cx={330} cy={510} label="temp" v={(temp - 120) / 140} text={`${Math.round(temp)}°`} small />
      <text x="330" y="335" className="br2-gear">{gear}</text>
      <g transform={`rotate(${needle + 90} 330 330)`} className="br2-needle-g">
        <rect x="326" y="58" width="8" height="300" rx="4" className="br2-needle" />
      </g>
      <circle cx="330" cy="330" r="22" className="br2-hub" />
      <circle cx="330" cy="330" r="8" className="br2-hub-y" />
      <text x="330" y="620" className="br2-read">{Math.round(mph)}</text>
    </svg>
  );
}

function SubDial({ cx, cy, label, v, text, red, small }: { cx: number; cy: number; label: string; v: number; text: string; red?: number; small?: boolean }) {
  const r = small ? 48 : 62, a = -225 + Math.max(0, Math.min(1, v)) * 270;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const t = ((-225 + i * 27) * Math.PI) / 180;
    return <line key={i} x1={cx + r * Math.cos(t)} y1={cy + r * Math.sin(t)} x2={cx + (r - 8) * Math.cos(t)} y2={cy + (r - 8) * Math.sin(t)} className={red !== undefined && i / 10 >= red ? "br2-tk-red" : "br2-tk"} />;
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 6} className="br2-sub" />
      {ticks}
      <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos((a * Math.PI) / 180)} y2={cy + (r - 12) * Math.sin((a * Math.PI) / 180)} className="br2-sub-hand" />
      <circle cx={cx} cy={cy} r="5" className="br2-hub-y" />
      <text x={cx} y={cy + r - 16} className="br2-sub-t">{text}</text>
      <text x={cx} y={cy - r - 14} className="br2-sub-l">{label}</text>
    </g>
  );
}

/** A small Braun AB1-style analogue clock. */
function Clock({ d }: { d: Date }) {
  const h = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5, m = d.getMinutes() * 6, s = d.getSeconds() * 6;
  return (
    <svg viewBox="0 0 200 200" className="br2-ab1">
      <circle cx="100" cy="100" r="96" className="br2-face" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="100" y1="12" x2="100" y2={i % 3 ? 22 : 30} transform={`rotate(${i * 30} 100 100)`} className="br2-tk-major" />)}
      <line x1="100" y1="100" x2="100" y2="50" transform={`rotate(${h} 100 100)`} className="br2-hand" />
      <line x1="100" y1="100" x2="100" y2="24" transform={`rotate(${m} 100 100)`} className="br2-hand" />
      <line x1="100" y1="116" x2="100" y2="20" transform={`rotate(${s} 100 100)`} className="br2-sec" />
      <circle cx="100" cy="100" r="5" className="br2-hub-y" />
    </svg>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="br2-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="br2-key br2-key-y br2-strip-home" onClick={ctx.goHome}>⌂</button>
      <div className="br2-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="br2-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 4).map((a) => <button key={a.key} className="br2-key br2-strip-app" data-active={a.active} onClick={a.open}><AppGlyph app={a} className="br2-glyph" filter="grayscale(1) brightness(3)" /></button>)}
      {ctx.state.keyboard.available && <button className="br2-key br2-strip-app" onClick={ctx.openKeyboard}>⌨</button>}
      <div className="br2-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const rams: Design = {
  id: "rams",
  name: "Rams",
  tagline: "Braun / Dieter Rams: clock-face speedo, sub-dials, speaker grille, round keys",
  slot: "top",
  swatch: ["#efece4", "#f4c300"],
  Component: Rams,
};
