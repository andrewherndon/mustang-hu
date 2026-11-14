import { useEffect, useRef, useState } from "react";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./terminal.css";
import type { Design, DesignContext } from "../kit/types";
import type { CarData } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { hhmm, pad2, useIdle } from "../kit/hooks";

/**
 * TERMINAL: the head unit as a tmux session. neofetch, htop-style gauges, a
 * live log from the object detector, a camera pane, and apps launched as
 * commands. Screensaver: cmatrix in Latin, Cyrillic and Han.
 */
function Terminal({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(90_000) && car.parked && !ctx.appOpen;
  const log = useDetectorLog(car);

  return (
    <div className="tm">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <div className="tm-panes">
            <section className="tm-pane tm-fetch">
              <Title n={0} t="neofetch" />
              <pre className="tm-ascii">{ASCII}</pre>
              <div className="tm-info">
                <div><b>andrey</b>@<b>mustang</b></div>
                <div>---------------</div>
                <Kv k="OS" v="Arch Linux ARM aarch64" />
                <Kv k="Host" v="Surface Pro 11 (X Elite)" />
                <Kv k="Car" v="1995 Ford Mustang GT" />
                <Kv k="Engine" v="5.0L V8 (302 ci)" />
                <Kv k="WM" v="sway" />
                <Kv k="Odometer" v={`${Math.floor(car.odometerMi).toLocaleString()} mi`} />
                <Kv k="Locale" v="en_US · ru_RU · zh_CN" />
                <div className="tm-swatch">{["#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#a89984"].map((c) => <i key={c} style={{ background: c }} />)}</div>
              </div>
            </section>

            <section className="tm-pane tm-htop">
              <Title n={1} t="htop --car" />
              <Meter k="RPM" v={car.rpm} max={7000} label={`${Math.round(car.rpm)}`} />
              <Meter k="SPD" v={car.speedMph} max={140} label={`${Math.round(car.speedMph)} mph`} />
              <Meter k="TMP" v={car.coolantF - 120} max={140} label={`${Math.round(car.coolantF)}°F`} />
              <Meter k="OIL" v={car.oilPsi} max={80} label={`${Math.round(car.oilPsi)} psi`} />
              <Meter k="BAT" v={car.voltage - 10} max={6} label={`${car.voltage.toFixed(2)} V`} />
              <Meter k="GAS" v={car.fuelPct} max={100} label={`${Math.round(car.fuelPct)}%`} />
              <div className="tm-htop-sum">
                Gear: <b>{car.gear}</b>  Trip: <b>{car.tripMi.toFixed(2)} mi</b>  Load avg: <b>{(car.rpm / 3000).toFixed(2)}</b><br />
                Tasks: <b>{ctx.running.length}</b> running, AA: <b>{ctx.state.aa.connected ? "connected" : "no phone"}</b>
              </div>
            </section>

            <section className="tm-pane tm-cam">
              <Title n={2} t="ffplay /dev/video-front" />
              <div className="tm-cam-feed"><CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(5deg) saturate(2) contrast(1.3)" /></div>
            </section>

            <section className="tm-pane tm-log">
              <Title n={3} t="journalctl -fu hu-vision" />
              <div className="tm-log-lines">
                {log.map((l, i) => <div key={i} className={`tm-l-${l.lvl}`}>{l.text}</div>)}
              </div>
            </section>
          </div>

          <section className="tm-cmd">
            <div className="tm-prompt">
              <span className="tm-p-user">andrey@mustang</span>:<span className="tm-p-dir">~</span>$ ./launch <span className="tm-cursor">█</span>
              <span className="tm-mpc">
                [{ctx.media?.playing ? "playing" : "paused"}] {ctx.media ? `${ctx.media.artist} - ${ctx.media.title}` : "mpd: no song"}
                <button onClick={() => ctx.mediaControl("previous")}>prev</button>
                <button onClick={() => ctx.mediaControl("play-pause")}>toggle</button>
                <button onClick={() => ctx.mediaControl("next")}>next</button>
              </span>
            </div>
            <div className="tm-apps">
              {ctx.apps.map((a) => (
                <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}>
                  {a.kind === "android" ? "am start " : ""}{a.key.replace("android:", "").replace("mock.", "")}{a.running ? "*" : ""}
                </button>
              ))}
              <button onClick={ctx.openSettings}>settings</button>
            </div>
          </section>
          <footer className="tm-bar">
            <span className="tm-bar-s">[mustang]</span>
            <span className="tm-bar-w">0:dash*</span><span>1:apps</span><span>2:logs</span>
            <span className="tm-bar-fill" />
            <span>"{ctx.online ? "hu-daemon ok" : "hu-daemon offline"}"</span>
            <span className="tm-bar-t">{hhmm(now, true)} {now.toLocaleDateString("ru-RU")}</span>
          </footer>
        </>
      )}
      {idle && <Matrix />}
    </div>
  );
}

const ASCII = String.raw`
          ______________
      ___/   |      |   \___
 ____/ ___    MUSTANG    ___ \__
|   ./   \.____________./   \. _|
'--(  (o) )------------(  (o) )-'
     \___/   5.0 · 野马   \___/
`;

const Title = ({ n, t }: { n: number; t: string }) => <div className="tm-title"><span>{n}</span> {t}</div>;
const Kv = ({ k, v }: { k: string; v: string }) => <div><b>{k}</b>: {v}</div>;

function Meter({ k, v, max, label }: { k: string; v: number; max: number; label: string }) {
  const n = 34, f = Math.max(0, Math.min(1, v / max)), lit = Math.round(f * n);
  const bars = "|".repeat(lit);
  return (
    <div className="tm-meter">
      <span className="tm-meter-k">{k}</span>[
      <span className="tm-g">{bars.slice(0, Math.round(n * 0.6))}</span>
      <span className="tm-y">{bars.slice(Math.round(n * 0.6), Math.round(n * 0.85))}</span>
      <span className="tm-r">{bars.slice(Math.round(n * 0.85))}</span>
      <span className="tm-dim">{" ".repeat(n - lit)}</span>
      <span className="tm-meter-l">{label.padStart(9)}</span>]
    </div>
  );
}

/** A rolling log of (mock) detector output. */
function useDetectorLog(car: CarData) {
  const [lines, setLines] = useState<{ lvl: string; text: string }[]>([]);
  const carRef = useRef(car);
  carRef.current = car;
  useEffect(() => {
    const t = window.setInterval(() => {
      const c = carRef.current, d = new Date();
      const ts = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
      const o = c.objects[Math.floor(Math.random() * Math.max(1, c.objects.length))];
      const line = o
        ? { lvl: o.distM < 12 ? "warn" : "info", text: `${ts} yolo11n  ${o.kind.padEnd(6)} id=${String(o.id).padStart(3, "0")} conf=${(0.7 + Math.random() * 0.29).toFixed(2)} lane=${o.lane >= 0 ? "+" : ""}${o.lane.toFixed(1)} d=${o.distM.toFixed(1)}m` }
        : { lvl: "dim", text: `${ts} yolo11n  no detections (${Math.round(28 + Math.random() * 4)} fps)` };
      setLines((ls) => [...ls.slice(-15), line]);
    }, 450);
    return () => window.clearInterval(t);
  }, []);
  return lines;
}

/** cmatrix with Latin, Cyrillic and Han glyphs. */
function Matrix() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    el.width = 1440; el.height = 960;
    const glyphs = "MUSTANG50V8МУСТАНГЖЗИЛДФЯ野马快车路速度引擎01".split("");
    const cols = Math.floor(1440 / 22), drops = Array.from({ length: cols }, () => Math.random() * -50);
    let raf = 0, f = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (f++ % 3) return;
      c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(0, 0, 1440, 960);
      c.font = "20px 'IBM Plex Mono', monospace";
      drops.forEach((y, i) => {
        c.fillStyle = Math.random() < 0.05 ? "#e8ffe8" : "#3ddc84";
        c.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 22, y * 24);
        drops[i] = y * 24 > 960 && Math.random() > 0.975 ? 0 : y + 1;
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="tm-matrix"><canvas ref={ref} /></div>;
}

/** App mode: tmux status + a compact gauge line in the top strip. */
function Strip({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  return (
    <div className="tm-strip" style={{ height: ctx.slot.y }}>
      <div className="tm-strip-row">
        <button onClick={ctx.goHome}>^b 0 [dash]</button>
        {ctx.running.slice(0, 4).map((a, i) => <button key={a.key} data-active={a.active} onClick={a.open}>{i + 1}:{a.title.toLowerCase().replace(/\s/g, "")}{a.active ? "*" : ""}</button>)}
        {ctx.state.keyboard.available && <button onClick={ctx.openKeyboard}>kbd</button>}
        <span className="tm-bar-fill" />
        <span className="tm-strip-t">{hhmm(new Date(), true)}</span>
      </div>
      <div className="tm-strip-row tm-strip-g">
        <span className="tm-strip-speed">{Math.round(car.speedMph).toString().padStart(3, " ")}<small>mph</small></span>
        <Meter k="RPM" v={car.rpm} max={7000} label={`${Math.round(car.rpm)}`} />
        <div className="tm-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) saturate(2)" /></div>
      </div>
    </div>
  );
}

export const terminal: Design = {
  id: "terminal",
  name: "Terminal",
  tagline: "tmux session: neofetch, htop gauges, detector log, cmatrix",
  slot: "bottom",
  swatch: ["#1d2021", "#b8bb26"],
  Component: Terminal,
};
