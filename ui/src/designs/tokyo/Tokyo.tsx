import { useEffect, useMemo, useRef } from "react";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource/rajdhani/600.css";
import "./tokyo.css";
import type { Design, DesignContext, UApp } from "../kit/types";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * NEON TOKYO NIGHT: rain over a night skyline, apps as neon shop signs with
 * their Chinese names, a vertical ムスタング sign, the camera on a billboard.
 */
const HANZI: Record<string, string> = {
  aa: "车载", youtube: "视频", stremio: "影院", gmail: "邮件", calendar: "日历", "chess-offline": "象棋", gomoku: "五子棋",
  chess: "棋局", browser: "浏览器", maps: "地图", spotify: "音乐", playstore: "商店", waze: "导航", messages: "信息",
};
const NEON = ["#ff3fa4", "#2ff3ff", "#ffe14d", "#7cff6b", "#b56bff", "#ff7a2f"];
const ROAD: RoadStyle = { kind: "wire", bg: "", road: "", lane: "#2ff3ff", object: "#ff3fa4", objectAccent: "#ffe14d", ego: "#ff3fa4", horizon: 0.1, glow: 8, focal: 12 };

const hanziFor = (a: UApp) => HANZI[a.key] ?? HANZI[a.key.split(".").pop() ?? ""] ?? HANZI[a.title.toLowerCase().replace(/\s/g, "")] ?? "应用";

function Tokyo({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const windows = useMemo(() => Array.from({ length: 160 }, (_, i) => ({ x: (i * 97) % 1440, y: 120 + ((i * 53) % 380), on: (i * 7) % 5 !== 0 })), []);

  return (
    <div className="tk">
      <div className="tk-city">
        {windows.map((w, i) => <i key={i} style={{ left: w.x, top: w.y, opacity: w.on ? 0.9 : 0.15 }} />)}
      </div>
      <Rain />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <div className="tk-vsign"><span>ムスタング</span></div>
          <div className="tk-vsign tk-vsign2"><span>野马五〇</span></div>

          <section className="tk-billboard">
            <CameraFeed kind="front" label={false} filter="saturate(1.4) hue-rotate(-20deg) contrast(1.15)" />
            <div className="tk-bb-scan" />
            <span>前方カメラ · LIVE</span>
          </section>

          <section className="tk-speed">
            <div className="tk-speed-k">時速 · SPEED</div>
            <div className="tk-speed-n">{Math.round(car.speedMph)}</div>
            <div className="tk-speed-u">MPH · {car.gear}速 · {Math.round(car.rpm)} RPM</div>
          </section>

          <section className="tk-road"><RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} /></section>

          <section className="tk-clock">
            <div className="tk-clock-t">{hhmm(now, true)}</div>
            <div className="tk-clock-d">{now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</div>
          </section>

          <section className="tk-led">
            <span>{(ctx.media ? `再生中 ♪ ${ctx.media.title} / ${ctx.media.artist} ♪ 正在播放 ♪ ` : "♪ 静か · 安静 · ТИШИНА · ").repeat(4)}</span>
          </section>
          <div className="tk-media-b">
            <button onClick={() => ctx.mediaControl("previous")}>◀◀</button>
            <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "❚❚" : "▶"}</button>
            <button onClick={() => ctx.mediaControl("next")}>▶▶</button>
          </div>

          <nav className="tk-signs">
            {ctx.apps.slice(0, 11).map((a, i) => (
              <button key={a.key} className="tk-sign" disabled={a.disabled} onClick={a.open} data-running={a.running} style={{ ["--n" as string]: NEON[i % NEON.length], animationDelay: `${(i * 1.7) % 7}s` }}>
                <b>{hanziFor(a)}</b>
                <span>{a.title}</span>
              </button>
            ))}
            <button className="tk-sign" onClick={ctx.openSettings} style={{ ["--n" as string]: "#ffffff" }}><b>设置</b><span>Settings</span></button>
          </nav>
        </>
      )}
      {idle && <div className="tk-saver"><div className="tk-saver-t">野马</div><div className="tk-saver-s">MUSTANG · МУСТАНГ · ムスタング</div></div>}
    </div>
  );
}

function Rain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, c = el.getContext("2d")!;
    el.width = 1440; el.height = 960;
    const drops = Array.from({ length: 180 }, () => ({ x: Math.random() * 1500, y: Math.random() * 960, v: 14 + Math.random() * 14, l: 10 + Math.random() * 22 }));
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      c.clearRect(0, 0, 1440, 960);
      c.strokeStyle = "rgba(170,200,255,0.28)"; c.lineWidth = 1.2;
      c.beginPath();
      for (const d of drops) {
        c.moveTo(d.x, d.y); c.lineTo(d.x - d.l * 0.15, d.y + d.l);
        d.y += d.v; d.x -= d.v * 0.15;
        if (d.y > 960) { d.y = -30; d.x = Math.random() * 1500; }
      }
      c.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="tk-rain" />;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="tk-strip" style={{ height: ctx.slot.y }}>
      <button className="tk-sign tk-strip-home" onClick={ctx.goHome} style={{ ["--n" as string]: "#ff3fa4" }}><b>主页</b><span>Home</span></button>
      <div className="tk-strip-speed">{Math.round(ctx.car.speedMph)}<small>MPH</small></div>
      <div className="tk-strip-cam"><CameraFeed kind="front" label={false} filter="saturate(1.4) hue-rotate(-20deg)" /></div>
      {ctx.running.slice(0, 4).map((a, i) => (
        <button key={a.key} className="tk-sign" data-active={a.active} onClick={a.open} style={{ ["--n" as string]: NEON[(i + 1) % NEON.length] }}><b>{hanziFor(a)}</b><span>{a.title}</span></button>
      ))}
      {ctx.state.keyboard.available && <button className="tk-sign" onClick={ctx.openKeyboard} style={{ ["--n" as string]: "#fff" }}><b>键盘</b><span>Keys</span></button>}
      <div className="tk-strip-time">{hhmm(new Date(), true)}</div>
    </div>
  );
}

export const tokyo: Design = {
  id: "tokyo",
  name: "Neon Tokyo Night",
  tagline: "Rain, skyline, neon shop-sign apps in hanzi, camera on a billboard",
  slot: "bottom",
  swatch: ["#0a0820", "#ff3fa4"],
  Component: Tokyo,
};
