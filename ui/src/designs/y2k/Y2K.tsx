import { useMemo, useState } from "react";
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
            <h1>{g.en}, Andrey</h1>
            <p>{g.ru} · {g.zh}</p>
          </section>

          <div className="ae-car-shadow" />
          <img className="ae-car" src="/art/y2k/car.png" alt="" />

          <aside className="ae-sidebar">
            <Gadget title="Drive">
              <div className="ae-meter">
                <Dial value={car.speedMph / 140} label={`${Math.round(car.speedMph)}`} unit="mph" big />
                <Dial value={car.rpm / 7000} red={CAR_REDLINE / 7000} label={(car.rpm / 1000).toFixed(1)} unit="rpm" />
              </div>
            </Gadget>
            <Gadget title="Clock">
              <div className="ae-clock-g">
                <AnalogClock d={now} />
                <div className="ae-clock-t"><b>{hhmm(now)}</b><span>{now.toLocaleDateString("en-US", { weekday: "long" })}</span><span>{now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span></div>
              </div>
            </Gadget>
            <Gadget title="Now Playing">
              <div className="ae-player">
                <div className="ae-cover"><span>{ctx.media ? "♫" : "♪"}</span></div>
                <div className="ae-player-t">
                  <b>{ctx.media?.title ?? "No media"}</b>
                  <span>{ctx.media ? ctx.media.artist : "Play something on Android"}</span>
                </div>
              </div>
              <div className="ae-player-b">
                <button className="ae-round" onClick={() => ctx.mediaControl("previous")}>⏮</button>
                <button className="ae-round ae-round-play" onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "⏸" : "▶"}</button>
                <button className="ae-round" onClick={() => ctx.mediaControl("next")}>⏭</button>
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

function Gadget({ title, children, grow }: { title: string; children: React.ReactNode; grow?: boolean }) {
  return <section className="ae-gadget" data-grow={grow}><header>{title}</header><div className="ae-gadget-b">{children}</div></section>;
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
