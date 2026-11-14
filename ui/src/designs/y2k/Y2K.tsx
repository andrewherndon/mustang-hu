import { useMemo } from "react";
import "@fontsource-variable/nunito";
import "./y2k.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm, useIdle } from "../kit/hooks";
import { CAR_REDLINE } from "../kit/car";

/**
 * Y2K TRANSLUCENT: Frutiger-Aero sky and grass, blueberry gel plastic,
 * chrome type, glossy bubble apps. Optimism circa 2001.
 */
function Y2K({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const g = greetings(now);
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const bubbles = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: (i * 73) % 100, size: 30 + ((i * 37) % 90), delay: -((i * 3.7) % 22), dur: 16 + ((i * 5) % 14),
  })), []);

  return (
    <div className="yk">
      <div className="yk-sky"><div className="yk-sun" /><div className="yk-hill" /><div className="yk-hill yk-hill2" /></div>
      <div className="yk-bubbles">{bubbles.map((b, i) => <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />)}</div>

      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="yk-top">
            <div className="yk-logo">Mustang<b>2000</b></div>
            <div className="yk-marquee"><span>{`✦ ${g.en}, Andrey! ✦ ${g.ru}, Андрей! ✦ ${g.zh}，安德烈！ ✦ Have a nice drive ✦ 一路顺风 ✦ Счастливого пути `.repeat(2)}</span></div>
            <div className="yk-clock">{hhmm(now)}<small>{now.getHours() < 12 ? "AM" : "PM"}</small></div>
          </header>

          <section className="yk-orb">
            <div className="yk-orb-gel" style={{ ["--fill" as string]: `${Math.min(1, car.rpm / CAR_REDLINE) * 100}%` }}>
              <div className="yk-orb-n">{Math.round(car.speedMph)}</div>
              <div className="yk-orb-u">MPH · {car.gear}</div>
              <div className="yk-orb-shine" />
            </div>
            <div className="yk-orb-row">
              <Pill label="RPM" value={Math.round(car.rpm).toString()} />
              <Pill label="FUEL" value={`${Math.round(car.fuelPct)}%`} />
              <Pill label="TEMP" value={`${Math.round(car.coolantF)}°`} />
            </div>
          </section>

          <section className="yk-win yk-cam">
            <div className="yk-win-bar"><i /><i /><i /><span>FrontCam.avi</span></div>
            <div className="yk-win-body"><CameraFeed kind="front" label={false} /></div>
          </section>

          <section className="yk-win yk-juke">
            <div className="yk-win-bar"><i /><i /><i /><span>Jukebox</span></div>
            <div className="yk-juke-body">
              <div className="yk-lcd">
                <div className="yk-lcd-t">{ctx.media ? ctx.media.title : "Insert disc…"}</div>
                <div className="yk-lcd-a">{ctx.media ? `${ctx.media.artist} · ${ctx.media.app}` : "No music playing"}</div>
                <div className="yk-eq">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ animationDelay: `${-i * 0.13}s`, animationPlayState: ctx.media?.playing ? "running" : "paused" }} />)}</div>
              </div>
              <div className="yk-juke-btns">
                <button className="yk-gel" onClick={() => ctx.mediaControl("previous")}>◀◀</button>
                <button className="yk-gel yk-gel-big" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
                <button className="yk-gel" onClick={() => ctx.mediaControl("next")}>▶▶</button>
              </div>
            </div>
          </section>

          <nav className="yk-apps">
            {ctx.apps.slice(0, 10).map((a) => (
              <button key={a.key} className="yk-app" disabled={a.disabled} onClick={a.open}>
                <span className="yk-bub"><AppGlyph app={a} className="yk-glyph" /></span>
                <span className="yk-app-t">{a.title}</span>
              </button>
            ))}
            <button className="yk-app" onClick={ctx.openSettings}>
              <span className="yk-bub yk-bub-chrome"><span className="yk-glyph glyph-letter">⚙</span></span>
              <span className="yk-app-t">Settings</span>
            </button>
          </nav>
        </>
      )}
      {idle && <div className="yk-saver"><div className="yk-saver-t">野马 · МУСТАНГ · MUSTANG</div></div>}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return <div className="yk-pill"><small>{label}</small>{value}</div>;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="yk-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="yk-gel yk-home" onClick={ctx.goHome}>⌂ Home</button>
      <div className="yk-strip-orb">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <div className="yk-strip-cam"><CameraFeed kind="front" label={false} /></div>
      {ctx.running.slice(0, 5).map((a) => (
        <button key={a.key} className="yk-strip-app" data-active={a.active} onClick={a.open}><span className="yk-bub"><AppGlyph app={a} className="yk-glyph" /></span></button>
      ))}
      {ctx.state.keyboard.available && <button className="yk-gel" onClick={ctx.openKeyboard}>⌨ Keys</button>}
      <div className="yk-strip-clock">{hhmm(new Date())}</div>
    </div>
  );
}

export const y2k: Design = {
  id: "y2k",
  name: "Y2K Translucent",
  tagline: "Frutiger Aero sky, blueberry gel plastic, bubble apps, chrome type",
  slot: "top",
  swatch: ["#38b6ff", "#9be15d"],
  Component: Y2K,
};
