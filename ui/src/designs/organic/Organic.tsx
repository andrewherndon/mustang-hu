import "@fontsource-variable/nunito";
import "@fontsource-variable/fraunces";
import "./organic.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm, useIdle } from "../kit/hooks";

/**
 * ORGANIC: calm and soft. Sage, moss, sand and clay; pebble shapes that
 * breathe; the sun's arc across today; a camera seen through a pebble.
 * Screensaver is a breathing guide in three languages.
 */
function Organic({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const g = greetings(now);
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  // Sun from 7:00 to 19:00 along an arc
  const dayF = Math.max(0, Math.min(1, (now.getHours() + now.getMinutes() / 60 - 7) / 12));
  const t = dayF, sunX = (1 - t) ** 2 * 40 + 2 * (1 - t) * t * 300 + t * t * 560, sunY = (1 - t) ** 2 * 190 + 2 * (1 - t) * t * -110 + t * t * 190;

  return (
    <div className="og">
      <div className="og-blob og-b1" /><div className="og-blob og-b2" /><div className="og-blob og-b3" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <section className="og-hello">
            <div className="og-greet">{g.en}, Andrey</div>
            <div className="og-greet-sub">{g.ru} · {g.zh}</div>
            <div className="og-time">{hhmm(now)}</div>
          </section>

          <section className="og-sun">
            <svg viewBox="0 0 600 220">
              <path d="M40 190 Q300 -110 560 190" className="og-arc" />
              <path d="M40 190 Q300 -110 560 190" className="og-arc-done" pathLength={1} strokeDasharray={`${dayF} 1`} />
              <line x1="0" y1="190" x2="600" y2="190" className="og-horizon" />
              <circle cx={sunX} cy={sunY} r="18" className="og-sunball" />
            </svg>
            <div className="og-sun-l"><span>7:00</span><span>{car.outsideF}° · clear and calm</span><span>19:00</span></div>
          </section>

          <section className="og-pebble og-cam">
            <CameraFeed kind="front" label={false} filter="sepia(0.35) saturate(0.8) brightness(1.1)" />
          </section>
          <div className="og-cam-l">the road ahead</div>

          <section className="og-drive">
            <div className="og-speed">{Math.round(car.speedMph)}<span>mph</span></div>
            <div className="og-leaves">
              <Leaf label="fuel" v={car.fuelPct / 100} />
              <Leaf label="warmth" v={(car.coolantF - 120) / 140} />
              <Leaf label="battery" v={(car.voltage - 10) / 6} />
            </div>
            <div className="og-trip">{car.tripMi.toFixed(1)} miles together today</div>
          </section>

          <section className="og-media">
            <div className="og-media-k">listening to</div>
            <div className="og-media-t">{ctx.media?.title ?? "the quiet"}</div>
            <div className="og-media-a">{ctx.media ? ctx.media.artist : "nothing playing"}</div>
            <div className="og-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>‹</button>
              <button className="og-play" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❙❙" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>›</button>
            </div>
          </section>

          <nav className="og-apps">
            {ctx.apps.slice(0, 9).map((a, i) => (
              <button key={a.key} className="og-stone" disabled={a.disabled} onClick={a.open} data-running={a.running} style={{ ["--r" as string]: STONES[i % STONES.length] }}>
                <AppGlyph app={a} className="og-glyph" />
                <span>{a.title}</span>
              </button>
            ))}
            <button className="og-stone" onClick={ctx.openSettings} style={{ ["--r" as string]: STONES[3] }}><span className="og-glyph glyph-letter">✿</span><span>settings</span></button>
          </nav>
        </>
      )}
      {idle && (
        <div className="og-breathe">
          <div className="og-breathe-c" />
          <div className="og-breathe-t"><span>breathe in · вдох · 吸气</span><span>breathe out · выдох · 呼气</span></div>
        </div>
      )}
    </div>
  );
}

const STONES = ["58% 42% 55% 45% / 50% 55% 45% 50%", "45% 55% 40% 60% / 55% 45% 55% 45%", "52% 48% 60% 40% / 42% 58% 42% 58%", "40% 60% 52% 48% / 60% 40% 60% 40%"];

function Leaf({ label, v }: { label: string; v: number }) {
  const f = Math.max(0, Math.min(1, v));
  return (
    <div className="og-leaf">
      <div className="og-leaf-shape"><i style={{ height: `${f * 100}%` }} /></div>
      <span>{label}</span>
    </div>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="og-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="og-strip-home" onClick={ctx.goHome}>⌂ home</button>
      <div className="og-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="og-strip-cam"><CameraFeed kind="front" label={false} filter="sepia(0.35) saturate(0.8)" /></div>
      {ctx.running.slice(0, 4).map((a, i) => (
        <button key={a.key} className="og-stone og-strip-app" data-active={a.active} onClick={a.open} style={{ ["--r" as string]: STONES[i % 4] }}><AppGlyph app={a} className="og-glyph" /></button>
      ))}
      {ctx.state.keyboard.available && <button className="og-strip-home" onClick={ctx.openKeyboard}>keys</button>}
      <div className="og-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const organic: Design = {
  id: "organic",
  name: "Organic Calm",
  tagline: "Sage and clay, breathing pebbles, the sun's arc, a breathing screensaver",
  slot: "top",
  swatch: ["#e9e3d5", "#7f9c7d"],
  Component: Organic,
};
