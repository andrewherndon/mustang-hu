import "@fontsource-variable/orbitron";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "./holo.css";
import type { Design, DesignContext } from "../kit/types";
import type { Detected } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { AppGlyph } from "../kit/AppGlyph";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * HOLOGRAPHIC SCI-FI: a cyan hologram. A wireframe car turns slowly inside
 * gyroscope rings, the camera sits in a hexagon with targeting reticles on
 * every detection, apps are a honeycomb, readouts live in brackets.
 */
function Holo({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const f = Math.min(1, car.speedMph / 140);

  return (
    <div className="ho">
      <div className="ho-hex" />
      <div className="ho-scan" />
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="ho-top">
            <span className="ho-brand">MUSTANG//OS <em>v5.0</em></span>
            <span>SYS.TIME [{hhmm(now, true)}:{String(now.getSeconds()).padStart(2, "0")}]</span>
            <span>EXT.TEMP [{car.outsideF}°F]</span>
            <span>LINK [{ctx.state.aa.connected ? "PHONE" : "----"}]</span>
            <span className="ho-fill" />
            <span className="ho-ru">СИСТЕМА В НОРМЕ · 系统正常</span>
          </header>

          <section className="ho-core">
            <div className="ho-ring ho-ring1" /><div className="ho-ring ho-ring2" /><div className="ho-ring ho-ring3" />
            <img className="ho-carimg" src="/art/holo/car.jpg" alt="" />
            <svg className="ho-gauge" viewBox="0 0 400 400">
              {Array.from({ length: 61 }, (_, i) => {
                const a = (-225 + i * 4.5) * Math.PI / 180, r1 = 188, r2 = i % 5 ? 180 : 170;
                return <line key={i} x1={200 + r1 * Math.cos(a)} y1={200 + r1 * Math.sin(a)} x2={200 + r2 * Math.cos(a)} y2={200 + r2 * Math.sin(a)} data-on={i / 60 <= f} />;
              })}
            </svg>
            <div className="ho-speed">{Math.round(car.speedMph).toString().padStart(3, "0")}<span>MPH · GEAR {car.gear}</span></div>
          </section>

          <section className="ho-cam">
            <div className="ho-cam-in">
              <CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(150deg) saturate(2.5) brightness(1.1)" />
              <Reticles objects={car.objects} />
            </div>
            <span className="ho-label">OPTIC.FRONT // ОБЪЕКТЫ: {car.objects.length}</span>
          </section>

          <section className="ho-data">
            <Readout k="RPM" v={Math.round(car.rpm).toString()} f={car.rpm / 7000} />
            <Readout k="COOLANT" v={`${Math.round(car.coolantF)}°F`} f={(car.coolantF - 120) / 140} />
            <Readout k="OIL.PRESS" v={`${Math.round(car.oilPsi)} PSI`} f={car.oilPsi / 80} />
            <Readout k="CELL.V" v={`${car.voltage.toFixed(2)}`} f={(car.voltage - 10) / 6} />
            <Readout k="FUEL" v={`${Math.round(car.fuelPct)}%`} f={car.fuelPct / 100} />
            <Readout k="G.LAT" v={car.gLat.toFixed(2)} f={0.5 + car.gLat} />
          </section>

          <section className="ho-media">
            <span className="ho-label">AUDIO.STREAM</span>
            <div className="ho-media-t">{ctx.media ? ctx.media.title.toUpperCase() : "NO CARRIER"}</div>
            <div className="ho-media-a">{ctx.media ? `${ctx.media.artist} :: ${ctx.media.app}`.toUpperCase() : "—"}</div>
            <div className="ho-media-b">
              <button onClick={() => ctx.mediaControl("previous")}>⟨⟨</button>
              <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "▮▮" : "▶"}</button>
              <button onClick={() => ctx.mediaControl("next")}>⟩⟩</button>
            </div>
          </section>

          <nav className="ho-comb">
            {ctx.apps.slice(0, 11).map((a) => (
              <button key={a.key} className="ho-cell" disabled={a.disabled} onClick={a.open} data-running={a.running}>
                <AppGlyph app={a} className="ho-glyph" filter="grayscale(1) brightness(1.6) sepia(1) hue-rotate(150deg) saturate(3)" />
                <span>{a.title.toUpperCase().slice(0, 12)}</span>
              </button>
            ))}
            <button className="ho-cell" onClick={ctx.openSettings}><span className="ho-glyph glyph-letter">⚙</span><span>CONFIG</span></button>
          </nav>
        </>
      )}
      {idle && (
        <div className="ho-saver">
          <div className="ho-ring ho-ring1" /><div className="ho-ring ho-ring2" />
          <img className="ho-carimg-big" src="/art/holo/car.jpg" alt="" />
          <div className="ho-saver-t">МУСТАНГ · MUSTANG · 野马</div>
        </div>
      )}
    </div>
  );
}

function Readout({ k, v, f }: { k: string; v: string; f: number }) {
  return (
    <div className="ho-ro">
      <span className="ho-ro-k">{k}</span>
      <span className="ho-ro-v">[ {v} ]</span>
      <div className="ho-ro-bar"><i style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></div>
    </div>
  );
}

/** Targeting boxes over the camera, placed by the detection's lane/distance. */
function Reticles({ objects }: { objects: Detected[] }) {
  return (
    <svg className="ho-ret" viewBox="0 0 100 100" preserveAspectRatio="none">
      {objects.filter((o) => o.distM < 70).map((o) => {
        const s = 8 / (o.distM + 8);
        const cx = 50 + o.lane * 34 * s, by = 45 + 55 * s, w = (o.kind === "truck" ? 44 : o.kind === "car" ? 36 : 12) * s, h = (o.kind === "person" ? 40 : 26) * s;
        return (
          <g key={o.id} className={o.distM < 15 ? "ho-ret-near" : ""}>
            <path d={`M${cx - w / 2} ${by - h + 3} v-3 h3 M${cx + w / 2 - 3} ${by - h} h3 v3 M${cx + w / 2} ${by - 3} v3 h-3 M${cx - w / 2 + 3} ${by} h-3 v-3`} />
            <text x={cx - w / 2} y={by - h - 1.5}>{o.kind.toUpperCase()} {Math.round(o.distM)}M</text>
          </g>
        );
      })}
    </svg>
  );
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="ho-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="ho-strip-home" onClick={ctx.goHome}>⟨ CORE</button>
      <div className="ho-strip-speed">{Math.round(ctx.car.speedMph).toString().padStart(3, "0")}<small>MPH</small></div>
      <div className="ho-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) sepia(1) hue-rotate(150deg) saturate(2.5)" /><Reticles objects={ctx.car.objects} /></div>
      {ctx.running.slice(0, 4).map((a) => (
        <button key={a.key} className="ho-cell ho-strip-cell" data-active={a.active} onClick={a.open}>
          <AppGlyph app={a} className="ho-glyph" filter="grayscale(1) brightness(1.6) sepia(1) hue-rotate(150deg) saturate(3)" />
        </button>
      ))}
      {ctx.state.keyboard.available && <button className="ho-strip-home" onClick={ctx.openKeyboard}>INPUT</button>}
      <div className="ho-strip-time">{hhmm(new Date(), true)}</div>
    </div>
  );
}

export const holo: Design = {
  id: "holo",
  name: "Holographic",
  tagline: "Cyan hologram: rotating wireframe car, reticles on the camera, hex apps",
  slot: "top",
  swatch: ["#021a22", "#5ff8ff"],
  Component: Holo,
};
