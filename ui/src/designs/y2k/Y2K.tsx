import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource-variable/open-sans";
import "./y2k.css";
import type { Design, DesignContext } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { greetings, hhmm, useIdle } from "../kit/hooks";
import { CAR_REDLINE } from "../kit/car";

/**
 * FRUTIGER AERO (sincere, not parody): the 2006-2009 desktop. A photographic
 * sky-and-grass wallpaper with soap bubbles, a glossy product shot of the car,
 * a sidebar of dark glass gadgets (dual-dial gauge, clock, player, camera),
 * and an Aero glass taskbar with a glowing orb that opens a two-column menu.
 */
function Y2K({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const g = greetings(now);
  const [menu, setMenu] = useState(false);
  const mediaApp = ctx.media ? ctx.apps.find((a) => a.key === `android:${ctx.media!.package}` || a.title === ctx.media!.app) : undefined;
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const bubbles = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    left: 4 + ((i * 41) % 60), size: 26 + ((i * 29) % 60), delay: -((i * 4.3) % 30), dur: 24 + ((i * 7) % 16),
  })), []);

  return (
    <div className="ae">
      <div className="ae-wall" />
      <div className="ae-bubbles">{bubbles.map((b, i) => <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />)}</div>

      {ctx.appOpen ? <Taskbar ctx={ctx} onOrb={ctx.goHome} strip /> : (
        <>
          <section className="ae-welcome">
            <h1>{g.zh}，安德烈</h1>
          </section>

          <div className="ae-car-shadow" />
          <AeroCar speedMph={car.speedMph} className="ae-car" />

          <aside className="ae-sidebar">
            <Gadget title="Drive">
              <div className="ae-meter">
                <Dial value={car.speedMph / 140} label={`${Math.round(car.speedMph)}`} unit="mph" big />
                <Dial value={car.rpm / 7000} red={CAR_REDLINE / 7000} label={(car.rpm / 1000).toFixed(1)} unit="rpm" />
              </div>
            </Gadget>
            <Gadget title="Now Playing" big>
              <div className="ae-player">
                <div className="ae-cover"><span>{ctx.media ? "♫" : "♪"}</span></div>
                <div className="ae-player-t">
                  <b>{ctx.media?.title ?? "No media"}</b>
                  <span>{ctx.media ? ctx.media.artist : "Play something on Android"}</span>
                  {mediaApp && <button className="ae-pill ae-pill-open" onClick={mediaApp.open}>Open {mediaApp.title} ›</button>}
                </div>
              </div>
              <div className="ae-player-b">
                <button className="ae-round" onClick={() => ctx.mediaControl("previous")} aria-label="Previous">⏮</button>
                <button className="ae-round ae-round-play" onClick={() => ctx.mediaControl("play-pause")} aria-label="Play or pause">{ctx.media?.playing ? "⏸" : "▶"}</button>
                <button className="ae-round" onClick={() => ctx.mediaControl("next")} aria-label="Next">⏭</button>
              </div>
              <div className="ae-vol">
                <button className="ae-pill" onClick={() => ctx.setMute(!ctx.state.volume.muted)}>{ctx.state.volume.muted ? "🔇" : "🔈"}</button>
                <button className="ae-pill" onClick={() => ctx.setVolume(Math.max(0, ctx.state.volume.level - 0.1))}>−</button>
                <div className="ae-vol-bar"><i style={{ width: `${ctx.state.volume.muted ? 0 : ctx.state.volume.level * 100}%` }} /></div>
                <button className="ae-pill" onClick={() => ctx.setVolume(Math.min(1, ctx.state.volume.level + 0.1))}>+</button>
              </div>
            </Gadget>
            <Gadget title="Front Camera" grow>
              <div className="ae-cam"><CameraFeed kind="front" label={false} /></div>
            </Gadget>
          </aside>

          <Taskbar ctx={ctx} onOrb={() => setMenu(!menu)} />
          {menu && <StartMenu ctx={ctx} onClose={() => setMenu(false)} />}
        </>
      )}
      {idle && (
        <div className="ae-saver">
          <img src="/art/y2k/car.png" alt="" />
          <div>Mustang · Мустанг · 野马</div>
        </div>
      )}
    </div>
  );
}

/**
 * The glossy car, unchanged, with only the spokes turning — in true perspective.
 * tools/rim_fit.py fits each rim's ellipse and hub, builds the homography H from
 * a head-on disc to that rim, and un-projects the rim to a frontal disc that keeps
 * only the spokes and centre cap (five-fold-symmetric bright pixels). The barrel,
 * lip, rotor and calliper don't turn: while moving they come from hubs.png, the
 * same picture with the spokes removed (AI edit, wheel interiors only). Each disc
 * spins flat and is re-projected through H (CSS matrix3d). Parked, the untouched
 * photo shows; spin rate follows speed and settles on a five-spoke multiple.
 */
const CAR_W = 1400, CAR_H = 538;
const RIMS = [
  { src: "/art/y2k/front.png", size: 204, h: "matrix3d(0.2467546, 0.9696934, 0, 1.929843e-05, -1.015908, 0.1555687, 0, -0.0001516555, 0, 0, 1, 0, 837.4443, 283.7018, 0, 1)" },
  { src: "/art/y2k/rear.png", size: 158, h: "matrix3d(0.06756157, 0.8791339, 0, 6.076005e-05, -0.7187701, -0.5489015, 0, -0.001706218, 0, 0, 1, 0, 167.0116, 271.443, 0, 1)" },
];

function AeroCar({ speedMph, className }: { speedMph: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rims = useRef<(HTMLImageElement | null)[]>([]);
  const plate = useRef<HTMLImageElement>(null);
  const speed = useRef(speedMph);
  speed.current = speedMph;
  useEffect(() => {
    // the art is laid out at its natural 1400x538 and scaled to the box
    const fit = () => { if (box.current && stage.current) stage.current.style.transform = `scale(${box.current.clientWidth / CAR_W})`; };
    fit();
    const ro = new ResizeObserver(fit); if (box.current) ro.observe(box.current);
    let raf = 0, last = performance.now(), angle = 0, rate = 0, shown = false;
    const show = (on: boolean) => {
      if (on === shown) return; shown = on;
      for (const r of rims.current) if (r?.parentElement) r.parentElement.style.opacity = on ? "1" : "0";
      if (plate.current) plate.current.style.opacity = on ? "1" : "0";
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      // calm, readable spin: ~0.25 rev/s at walking pace up to ~1.4 rev/s on the highway
      const target = speed.current < 0.5 ? 0 : 90 + Math.min(speed.current, 80) * 5.5;   // deg/s
      if (target > 0) {
        show(true);
        rate += (target - rate) * Math.min(1, dt * 1.5);
        angle = (angle + rate * dt) % 360;
      } else if (shown) {
        // stopping: coast, then settle on the next multiple of 72° (five spokes), where
        // the disc matches the photo exactly, and hand back to the untouched picture
        rate = Math.max(28, rate - rate * dt * 1.5);
        const dest = Math.ceil(angle / 72 - 1e-6) * 72;
        angle = Math.min(dest, angle + rate * dt);
        if (dest - angle < 0.05) { angle = dest % 360; rate = 0; show(false); }
      }
      for (const r of rims.current) if (r) r.style.transform = `rotate(${angle}deg)`;
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return (
    <div ref={box} className={`ae-carbox ${className ?? ""}`} style={{ aspectRatio: `${CAR_W} / ${CAR_H}` }}>
      <div ref={stage} className="ae-car-stage">
        <img className="ae-car-img" src="/art/y2k/car.png" alt="" />
        <img ref={plate} className="ae-car-img ae-hubs" src="/art/y2k/hubs.png" alt="" style={{ opacity: 0 }} />
        {RIMS.map((w, i) => (
          <div key={w.src} className="ae-rim" style={{ width: w.size, height: w.size, transform: w.h, opacity: 0 }}>
            <img ref={(el) => { rims.current[i] = el; }} src={w.src} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Gadget({ title, children, grow, big }: { title: string; children: React.ReactNode; grow?: boolean; big?: boolean }) {
  return <section className="ae-gadget" data-grow={grow} data-big={big}><header>{title}</header><div className="ae-gadget-b">{children}</div></section>;
}

/** A black-chrome gauge dial, like the old CPU-meter gadget. */
function Dial({ value, label, unit, red, big }: { value: number; label: string; unit: string; red?: number; big?: boolean }) {
  const v = Math.max(0, Math.min(1, value)), a = -135 + v * 270;
  return (
    <div className="ae-dial" data-big={big}>
      <svg viewBox="0 0 120 120">
        <defs>
          <radialGradient id="ae-face" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#3a4048" /><stop offset="1" stopColor="#07090c" /></radialGradient>
          <linearGradient id="ae-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f7fa" /><stop offset="0.5" stopColor="#8d98a3" /><stop offset="1" stopColor="#e1e6eb" /></linearGradient>
        </defs>
        <circle cx="60" cy="60" r="58" fill="url(#ae-rim)" />
        <circle cx="60" cy="60" r="52" fill="url(#ae-face)" />
        {Array.from({ length: 11 }, (_, i) => {
          const t = ((-225 + i * 27) * Math.PI) / 180, isRed = red !== undefined && i / 10 >= red;
          return <line key={i} x1={60 + 46 * Math.cos(t)} y1={60 + 46 * Math.sin(t)} x2={60 + 40 * Math.cos(t)} y2={60 + 40 * Math.sin(t)} stroke={isRed ? "#ff4d3d" : "#cfe8ff"} strokeWidth="2.5" />;
        })}
        <g transform={`rotate(${a} 60 60)`}><path d="M58 60 L60 18 L62 60 Z" fill="#7cd7ff" /></g>
        <circle cx="60" cy="60" r="6" fill="#d9e2ea" />
        <ellipse cx="60" cy="34" rx="40" ry="20" fill="rgba(255,255,255,0.13)" />
      </svg>
      <div className="ae-dial-t"><b>{label}</b><span>{unit}</span></div>
    </div>
  );
}

function AnalogClock({ d }: { d: Date }) {
  const h = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5, m = d.getMinutes() * 6, s = d.getSeconds() * 6;
  return (
    <svg viewBox="0 0 100 100" className="ae-analog">
      <defs><radialGradient id="ae-cf" cx="50%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfdbe6" /></radialGradient></defs>
      <circle cx="50" cy="50" r="48" fill="#9aa8b5" />
      <circle cx="50" cy="50" r="44" fill="url(#ae-cf)" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="9" x2="50" y2={i % 3 ? 13 : 16} stroke="#3c4a57" strokeWidth={i % 3 ? 1.2 : 2.4} transform={`rotate(${i * 30} 50 50)`} />)}
      <line x1="50" y1="50" x2="50" y2="27" stroke="#1d2833" strokeWidth="3.4" strokeLinecap="round" transform={`rotate(${h} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="15" stroke="#1d2833" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${m} 50 50)`} />
      <line x1="50" y1="56" x2="50" y2="13" stroke="#e8462e" strokeWidth="1" transform={`rotate(${s} 50 50)`} />
      <circle cx="50" cy="50" r="2.6" fill="#1d2833" />
      <ellipse cx="50" cy="28" rx="34" ry="18" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

/** Aero glass taskbar; in app mode it is the whole bottom strip. */
function Taskbar({ ctx, onOrb, strip }: { ctx: DesignContext; onOrb: () => void; strip?: boolean }) {
  const pinned = strip ? ctx.running.slice(0, 5) : ctx.apps.filter((a) => !a.disabled).slice(0, 7);
  const now = new Date();
  return (
    <nav className="ae-taskbar" data-strip={strip} style={strip ? { top: ctx.slot.y + ctx.slot.height } : undefined}>
      <button className="ae-orb" onClick={onOrb} aria-label={strip ? "Home" : "Menu"}><span>5.0</span></button>
      {strip && (
        <>
          <div className="ae-tb-speed"><b>{Math.round(ctx.car.speedMph)}</b><span>mph</span></div>
          <div className="ae-tb-cam"><CameraFeed kind="front" label={false} /></div>
        </>
      )}
      <div className="ae-tb-apps">
        {pinned.map((a) => (
          <button key={a.key} className="ae-tb-app" data-running={a.running} data-active={a.active} onClick={a.open}>
            <AppGlyph app={a} className="ae-tb-glyph" />
          </button>
        ))}
        {strip && ctx.state.keyboard.available && <button className="ae-tb-app" onClick={ctx.openKeyboard}><span className="ae-tb-glyph glyph-letter">⌨</span></button>}
      </div>
      <div className="ae-tray">
        <span className="ae-tray-i" data-on={ctx.state.aa.connected} title="Phone">📱</span>
        <span className="ae-tray-i">🔊 {Math.round(ctx.state.volume.level * 100)}</span>
        <div className="ae-tray-clock"><b>{hhmm(now)}</b><span>{now.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}</span></div>
      </div>
    </nav>
  );
}

function StartMenu({ ctx, onClose }: { ctx: DesignContext; onClose: () => void }) {
  return (
    <div className="ae-menu-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ae-menu">
        <div className="ae-menu-left">
          {ctx.apps.map((a) => (
            <button key={a.key} disabled={a.disabled} onClick={() => { onClose(); a.open(); }}>
              <AppGlyph app={a} className="ae-menu-glyph" /><span>{a.title}</span>
              {a.running && <i>●</i>}
            </button>
          ))}
        </div>
        <div className="ae-menu-right">
          <div className="ae-user"><div className="ae-user-pic">🐎</div><b>Andrey</b></div>
          <button onClick={() => { onClose(); ctx.openLayout("aa"); }} disabled={!ctx.state.aa.connected}>Android Auto</button>
          <button onClick={() => { onClose(); ctx.openSettings(); }}>Control Panel</button>
          <button onClick={() => { onClose(); ctx.openSettings(); }}>Appearance</button>
          <div className="ae-menu-fill" />
          <div className="ae-menu-car">1995 Mustang GT<br /><small>{Math.floor(ctx.car.odometerMi).toLocaleString()} mi · {ctx.car.outsideF}°F</small></div>
        </div>
      </div>
    </div>
  );
}

export const y2k: Design = {
  id: "y2k",
  name: "Frutiger Aero",
  tagline: "Sincere 2007 desktop: sky-and-grass wallpaper, glass gadgets, Aero taskbar and orb",
  slot: "top",
  swatch: ["#3fa9f5", "#7ccf3c"],
  Component: Y2K,
};
