import { useState } from "react";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter-tight";
import "./amber.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm, pad2 } from "../kit/hooks";

/**
 * AMBER NIGHT (after Daylight Computer): sunrise amber and pale wheat by day.
 * After sunset the whole screen drops to amber-on-umber with no blue light
 * (camera and app icons included), so it doesn't glare in the windshield.
 * Shadows fall along the sun's path.
 */
const SUNRISE = 7.1, SUNSET = 17.6;   // Atlanta, mid-November (mock until GPS/ephemeris)

function Amber({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const q = new URLSearchParams(location.search);
  const autoNight = h < SUNRISE || h > SUNSET;
  const [override, setOverride] = useState<boolean | null>(q.has("night") ? true : q.has("day") ? false : null);
  const night = override ?? autoNight;
  const dayF = Math.max(0, Math.min(1, (h - SUNRISE) / (SUNSET - SUNRISE)));
  // shadow direction follows the sun across the sky
  const sx = Math.round((0.5 - dayF) * 30), sy = Math.round(10 + Math.abs(0.5 - dayF) * 18);
  const g = greetings(now);
  const toSunset = SUNSET - h;

  return (
    <div className="am" data-night={night} style={{ ["--sx" as string]: `${sx}px`, ["--sy" as string]: `${sy}px` }}>
      {ctx.appOpen ? <Strip ctx={ctx} night={night} /> : (
        <>
          <section className="am-hero">
            <div className="am-greet">Good <em>{g.en.replace("Good ", "")}</em>, Andrey</div>
            <div className="am-time">{hhmm(now)}</div>
            <div className="am-sub">{g.ru} · {g.zh}</div>
          </section>

          <section className="am-sun">
            <svg viewBox="0 0 400 130">
              <path d="M10 120 Q200 -60 390 120" className="am-arc" />
              <circle cx={10 + 380 * dayF} cy={120 - Math.sin(dayF * Math.PI) * 88} r="12" className="am-ball" />
              <line x1="0" y1="120" x2="400" y2="120" className="am-hz" />
            </svg>
            <div className="am-sun-t">
              {night ? <>Night mode · no blue light</> : toSunset > 0 ? <>Sunset in {Math.floor(toSunset)}h {pad2((toSunset % 1) * 60)}m</> : <>After sunset</>}
              <button onClick={() => setOverride(!night)}>{night ? "☀ Day" : "☾ Night"}</button>
            </div>
          </section>

          <section className="am-card am-cam">
            <CameraFeed kind="front" label={false} filter={night ? "grayscale(1) sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(0.9)" : "sepia(0.25) saturate(1.1)"} />
          </section>

          <section className="am-card am-drive">
            <div className="am-speed">{Math.round(car.speedMph)}<span>mph</span></div>
            <div className="am-facts">
              <span>gear <b>{car.gear}</b></span>
              <span><b>{Math.round(car.rpm)}</b> rpm</span>
              <span><b>{Math.round(car.fuelPct)}%</b> fuel</span>
              <span><b>{car.outsideF}°</b> outside</span>
            </div>
          </section>

          <section className="am-card am-media">
            <div className="am-media-t"><em>{ctx.media?.title ?? "Quiet"}</em></div>
            <div className="am-media-a">{ctx.media ? `${ctx.media.artist} · ${ctx.media.app}` : "nothing playing"}</div>
            <div className="am-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>Prev</button>
              <button className="am-primary" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "Pause" : "Play"}</button>
              <button onClick={() => ctx.mediaControl("next")}>Next</button>
            </div>
          </section>

          <nav className="am-apps">
            {ctx.apps.slice(0, 8).map((a) => (
              <button key={a.key} className="am-app" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="am-glyph" filter={night ? "grayscale(1) sepia(1) saturate(3) hue-rotate(-10deg) brightness(0.85)" : "sepia(0.3)"} />
                <span>{a.title}</span>
              </button>
            ))}
            <button className="am-app" onClick={ctx.openSettings}><span className="am-glyph glyph-letter">✺</span><span>Settings</span></button>
          </nav>
        </>
      )}
    </div>
  );
}

function Strip({ ctx, night }: { ctx: DesignContext; night: boolean }) {
  return (
    <div className="am-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="am-strip-home" onClick={ctx.goHome}>← Home</button>
      <div className="am-strip-speed">{Math.round(ctx.car.speedMph)}<span>mph</span></div>
      <div className="am-strip-cam"><CameraFeed kind="front" label={false} filter={night ? "grayscale(1) sepia(1) saturate(2.4) hue-rotate(-12deg)" : "sepia(0.25)"} /></div>
      {ctx.running.slice(0, 4).map((a) => (
        <button key={a.key} className="am-app am-strip-app" data-active={a.active} onClick={a.open}>
          <AppGlyph app={a} className="am-glyph" filter={night ? "grayscale(1) sepia(1) saturate(3) hue-rotate(-10deg)" : "sepia(0.3)"} />
        </button>
      ))}
      {ctx.state.keyboard.available && <button className="am-strip-home" onClick={ctx.openKeyboard}>Keys</button>}
      <div className="am-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const amber: Design = {
  id: "amber",
  name: "Amber Night",
  tagline: "Daylight-style wheat and amber; amber-only night mode with no blue light",
  slot: "top",
  swatch: ["#f4ead2", "#e8962e"],
  Component: Amber,
};
