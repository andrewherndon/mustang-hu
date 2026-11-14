import { memo } from "react";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter-tight";
import "./dotmatrix.css";
import type { Design, DesignContext } from "../kit/types";
import { CAR_REDLINE, compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { DotText } from "../kit/DotText";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, pad2 } from "../kit/hooks";

/**
 * DOT MATRIX (after Nothing): black, white and one red. Numbers are 5x7 LED
 * dot glyphs with the unlit dots faintly visible; a circular "glyph matrix"
 * shows the tach; apps are monochrome circles; labels in a tight mono.
 */
const RED = "#d71921";

function DotMatrix({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return (
    <div className="dm">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="dm-top">
            <DotText text={time} dot={9} color="#fff" dim="#1c1c1c" />
            <span className="dm-label">{now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} · {car.outsideF}°F · {compass(car.headingDeg)}</span>
            <span className="dm-fill" />
            <span className="dm-label dm-red">● REC FRONT</span>
            <button className="dm-round dm-set" onClick={ctx.openSettings}>⚙</button>
          </header>

          <section className="dm-speed">
            <DotText text={String(Math.round(car.speedMph))} cells={3} dot={30} color="#fff" dim="#161616" />
            <div className="dm-speed-u"><span className="dm-label">MPH</span><span className="dm-gear">{car.gear}</span></div>
          </section>

          <section className="dm-glyph"><GlyphMatrix lit={Math.round((car.rpm / 7000) * 60)} /><span className="dm-label">{Math.round(car.rpm)} RPM</span></section>

          <section className="dm-cam">
            <CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.3)" />
            <div className="dm-cam-dots" />
            <span className="dm-label dm-cam-l">FRONT CAMERA</span>
          </section>

          <section className="dm-widgets">
            <div className="dm-w">
              <span className="dm-label">FUEL</span>
              <DotBar v={car.fuelPct / 100} n={14} />
              <b>{Math.round(car.fuelPct)}%</b>
            </div>
            <div className="dm-w">
              <span className="dm-label">COOLANT</span>
              <DotBar v={(car.coolantF - 120) / 140} n={14} />
              <b>{Math.round(car.coolantF)}°</b>
            </div>
            <div className="dm-w dm-w-media">
              <span className="dm-label">{ctx.media ? `NOW PLAYING · ${ctx.media.app.toUpperCase()}` : "MEDIA"}</span>
              <b className="dm-media-t">{ctx.media?.title ?? "Nothing playing"}</b>
              <span className="dm-media-a">{ctx.media?.artist ?? "—"}</span>
              <div className="dm-media-b">
                <button className="dm-round" onClick={() => ctx.mediaControl("previous")}>⏮</button>
                <button className="dm-round dm-round-red" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
                <button className="dm-round" onClick={() => ctx.mediaControl("next")}>⏭</button>
              </div>
            </div>
          </section>

          <nav className="dm-apps">
            {ctx.apps.slice(0, 9).map((a) => (
              <button key={a.key} className="dm-app" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <span className="dm-app-c"><AppGlyph app={a} className="dm-glyph-i" filter="grayscale(1) brightness(1.4) contrast(1.2)" /></span>
                <span className="dm-app-t">{a.title}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

/** A circular 21x21 dot matrix: dots sweep clockwise with rpm, red past the redline. */
const GlyphMatrix = memo(function GlyphMatrix({ lit }: { lit: number }) {
  const N = 21, c = (N - 1) / 2, f = lit / 60, redF = CAR_REDLINE / 7000;
  const dots = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
    if (d > c + 0.3) continue;
    const ang = ((Math.atan2(dx, -dy) / (Math.PI * 2)) + 1) % 1;   // 0 at top, clockwise
    const ring = d > c - 2.2;
    const on = ring && ang <= f;
    const fill = on ? (ang > redF ? RED : "#fff") : d < 2.2 ? "#fff" : "#1c1c1c";
    dots.push(<circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.36} fill={fill} />);
  }
  return <svg className="dm-glyph-svg" viewBox={`0 0 ${N} ${N}`}>{dots}</svg>;
});

function DotBar({ v, n }: { v: number; n: number }) {
  const lit = Math.round(Math.max(0, Math.min(1, v)) * n);
  return <div className="dm-bar">{Array.from({ length: n }, (_, i) => <i key={i} data-on={i < lit} />)}</div>;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="dm-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="dm-round dm-strip-home" onClick={ctx.goHome}>●</button>
      <DotText text={String(Math.round(ctx.car.speedMph))} cells={3} dot={13} color="#fff" dim="#161616" />
      <span className="dm-label">MPH</span>
      <div className="dm-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.3)" /><div className="dm-cam-dots" /></div>
      {ctx.running.slice(0, 4).map((a) => (
        <button key={a.key} className="dm-app-c dm-strip-app" data-active={a.active} onClick={a.open}>
          <AppGlyph app={a} className="dm-glyph-i" filter="grayscale(1) brightness(1.4) contrast(1.2)" />
        </button>
      ))}
      {ctx.state.keyboard.available && <button className="dm-round" onClick={ctx.openKeyboard}>⌨</button>}
      <span className="dm-fill" />
      <DotText text={hhmm(new Date(), true)} dot={8} color="#fff" dim="#1c1c1c" />
    </div>
  );
}

export const dotMatrix: Design = {
  id: "dotmatrix",
  name: "Dot Matrix",
  tagline: "Nothing-style LED dot type, circular glyph tach, black/white/red",
  slot: "top",
  swatch: ["#000000", "#d71921"],
  Component: DotMatrix,
};
