import "@fontsource/anton";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./brutalist.css";
import type { Design, DesignContext } from "../kit/types";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { pad2 } from "../kit/hooks";

/**
 * BRUTALIST DATA WALL: a raw grid of cells, exposed 2px rules, enormous
 * condensed numerals cropped by their cells, mono labels in three languages,
 * one hot colour reserved for warnings and the thing you can press.
 */
function Brutalist({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const hot = car.rpm > 4800 || car.coolantF > 225 || car.fuelPct < 15;

  return (
    <div className="br">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <div className="br-wall">
          <Cell cls="c-time" n="00" l="TIME / ВРЕМЯ / 时间">
            <div className="br-huge">{pad2(now.getHours())}:{pad2(now.getMinutes())}</div>
          </Cell>
          <Cell cls="c-speed" n="01" l="SPEED / СКОРОСТЬ / 速度" inv>
            <div className="br-huge">{Math.round(car.speedMph)}</div>
            <span className="br-unit">MPH</span>
          </Cell>
          <Cell cls="c-rpm" n="02" l="ENGINE / ДВИГАТЕЛЬ / 引擎" hot={car.rpm > 4800}>
            <div className="br-big">{Math.round(car.rpm)}</div>
            <div className="br-rule"><i style={{ width: `${(car.rpm / 7000) * 100}%` }} /></div>
          </Cell>
          <Cell cls="c-gear" n="03" l="GEAR">
            <div className="br-big">{car.gear}</div>
          </Cell>
          <Cell cls="c-cam" n="04" l={`CAM.FRONT ${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())} REC`}>
            <CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.5)" />
          </Cell>
          <Cell cls="c-data" n="05" l="TELEMETRY">
            <table className="br-table"><tbody>
              <tr><td>COOLANT</td><td>{Math.round(car.coolantF)}°F</td></tr>
              <tr><td>OIL</td><td>{Math.round(car.oilPsi)} PSI</td></tr>
              <tr><td>BATTERY</td><td>{car.voltage.toFixed(2)} V</td></tr>
              <tr className={car.fuelPct < 15 ? "br-hot" : ""}><td>FUEL</td><td>{Math.round(car.fuelPct)} %</td></tr>
              <tr><td>HEADING</td><td>{compass(car.headingDeg)} {Math.round(car.headingDeg)}°</td></tr>
              <tr><td>TRIP</td><td>{car.tripMi.toFixed(2)} MI</td></tr>
              <tr><td>ODO</td><td>{Math.floor(car.odometerMi)}</td></tr>
              <tr><td>OBJECTS</td><td>{car.objects.length}</td></tr>
            </tbody></table>
          </Cell>
          <Cell cls="c-media" n="06" l="AUDIO / ЗВУК / 音频">
            <div className="br-media-t">{ctx.media ? ctx.media.title.toUpperCase() : "—— SILENCE ——"}</div>
            <div className="br-media-a">{ctx.media ? `${ctx.media.artist} / ${ctx.media.app}`.toUpperCase() : "NO SOURCE"}</div>
            <div className="br-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>&lt;&lt;</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "STOP" : "PLAY"}</button>
              <button onClick={() => ctx.mediaControl("next")}>&gt;&gt;</button>
            </div>
          </Cell>
          <Cell cls="c-apps" n="07" l={`INDEX / ${ctx.apps.length} PROGRAMS`}>
            <div className="br-apps">
              {ctx.apps.map((a, i) => (
                <button key={a.key} disabled={a.disabled} onClick={a.open} data-running={a.running}>
                  <span>{pad2(i + 1)}</span>{a.title.toUpperCase()}<em>{a.running ? "■" : "→"}</em>
                </button>
              ))}
              <button className="br-apps-set" onClick={ctx.openSettings}><span>{hot ? "!!" : "∞"}</span>SETTINGS<em>→</em></button>
            </div>
          </Cell>
          <div className="br-ticker"><span>{`MUSTANG GT 5.0 /// МУСТАНГ /// 野马 /// 1995 /// ${Math.floor(car.odometerMi)} MI /// ${car.outsideF}°F /// AA ${ctx.state.aa.connected ? "LINKED" : "NO PHONE"} /// `.repeat(3)}</span></div>
        </div>
      )}
    </div>
  );
}

function Cell({ cls, n, l, inv, hot, children }: { cls: string; n: string; l: string; inv?: boolean; hot?: boolean; children: React.ReactNode }) {
  return (
    <section className={`br-cell ${cls}`} data-inv={inv} data-hot={hot}>
      <header><span>{n}</span>{l}</header>
      <div className="br-body">{children}</div>
    </section>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="br-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="br-strip-home" onClick={ctx.goHome}>← WALL</button>
      <div className="br-strip-cell br-strip-speed"><small>MPH</small>{Math.round(ctx.car.speedMph)}</div>
      <div className="br-strip-cell"><small>RPM</small>{Math.round(ctx.car.rpm)}</div>
      <div className="br-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) contrast(1.5)" /></div>
      {ctx.running.slice(0, 3).map((a, i) => <button key={a.key} className="br-strip-app" data-active={a.active} onClick={a.open}><small>{pad2(i + 1)}</small>{a.title.toUpperCase()}</button>)}
      {ctx.state.keyboard.available && <button className="br-strip-app" onClick={ctx.openKeyboard}><small>IN</small>KEYS</button>}
      <div className="br-strip-cell br-strip-time"><small>TIME</small>{pad2(new Date().getHours())}:{pad2(new Date().getMinutes())}</div>
    </div>
  );
}

export const brutalist: Design = {
  id: "brutalist",
  name: "Brutalist Data Wall",
  tagline: "Raw grid of cells, huge cropped numerals, one hot colour",
  slot: "top",
  swatch: ["#f2f2f0", "#ff3b00"],
  Component: Brutalist,
};
