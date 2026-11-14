import "@fontsource-variable/fraunces";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./paper.css";
import type { Design, DesignContext } from "../kit/types";
import type { CarData } from "../kit/car";
import { compass } from "../kit/car";
import { CameraFeed } from "../kit/CameraFeed";
import { RoadScene, type RoadStyle } from "../kit/RoadScene";
import { hhmm, useIdle } from "../kit/hooks";

/**
 * PAPER: an e-ink broadsheet. Ink on newsprint, no colour and almost no
 * motion; the front page is written from the car's data (headline, lede,
 * tables), apps are the "sections".
 */
const ROAD: RoadStyle = { kind: "flat", bg: "", road: "#d9d5ca", lane: "#1a1a1a", object: "#1a1a1a", objectAccent: "#1a1a1a", ego: "#1a1a1a", horizon: 0.2 };

function headline(c: CarData) {
  if (c.parked) return { h: "Mustang Rests; Engine Idles Quietly", d: "Driver expected to depart shortly, sources say" };
  if (c.speedMph > 55) return { h: `Highway Cruise Continues at ${Math.round(c.speedMph)} MPH`, d: `Fifth gear holds as convertible heads ${compass(c.headingDeg)}` };
  if (c.speedMph > 25) return { h: "Steady Progress Through Town", d: `Gear ${c.gear}, ${Math.round(c.rpm)} revolutions a minute, no incidents reported` };
  return { h: "Traffic Slows Mustang's Advance", d: "Low-speed manoeuvres reported; patience urged" };
}

function Paper({ ctx }: { ctx: DesignContext }) {
  const { car } = ctx;
  const now = new Date();
  const idle = useIdle(120_000) && car.parked && !ctx.appOpen;
  const hl = headline(car);
  const ahead = [...car.objects].sort((a, b) => a.distM - b.distM)[0];

  return (
    <div className="pp">
      {ctx.appOpen ? <Strip ctx={ctx} /> : (
        <>
          <header className="pp-mast">
            <div className="pp-ear">Vol. XXXI · No. {now.getDate() + now.getMonth() * 31}<br />Atlanta Edition</div>
            <div className="pp-title">The Mustang Gazette</div>
            <div className="pp-ear pp-ear-r">{hhmm(now)}<br />Price: one gallon</div>
          </header>
          <div className="pp-rule">
            <span>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            <span>Вестник Мустанга</span>
            <span>野马日报</span>
            <span>{car.outsideF}°F · Fair</span>
          </div>

          <main className="pp-grid">
            <article className="pp-lead">
              <h1>{hl.h}</h1>
              <h2>{hl.d}</h2>
              <figure className="pp-photo">
                <CameraFeed kind="front" label={false} filter="grayscale(1) brightness(2.6) contrast(1.4)" />
                <div className="pp-halftone" />
              </figure>
              <figcaption>The road ahead, as seen from the grille. Photograph: Front Camera / Gazette.</figcaption>
              <p className="pp-brief"><b>IN BRIEF —</b> The 1995 GT convertible has covered {car.tripMi.toFixed(1)} miles on this trip and {Math.floor(car.odometerMi).toLocaleString()} in its life. Its 5.0-litre V8 reports {Math.round(car.coolantF)}°F and {Math.round(car.oilPsi)} psi; mechanics call it “healthy.” <i>Подробнее на стр. 2 · 详见第二版。</i></p>
            </article>

            <section className="pp-col">
              <h3>Instruments</h3>
              <table className="pp-table">
                <tbody>
                  <Row k="Speed" v={`${Math.round(car.speedMph)} mph`} />
                  <Row k="Engine" v={`${Math.round(car.rpm / 10) * 10} rpm`} />
                  <Row k="Gear" v={car.gear} />
                  <Row k="Coolant" v={`${Math.round(car.coolantF)}°F`} />
                  <Row k="Oil" v={`${Math.round(car.oilPsi)} psi`} />
                  <Row k="Battery" v={`${car.voltage.toFixed(1)} V`} />
                  <Row k="Fuel" v={`${Math.round(car.fuelPct)}%`} />
                  <Row k="Trip" v={`${car.tripMi.toFixed(1)} mi`} />
                </tbody>
              </table>
              <h3>Road Report</h3>
              <div className="pp-road"><RoadScene objects={car.objects} speedMph={car.speedMph} style={ROAD} /></div>
              <p className="pp-small">{ahead ? `Nearest: a ${ahead.kind} ${Math.round(ahead.distM)} m ahead.` : "Road clear."} {car.objects.length} objects tracked.</p>
            </section>

            <section className="pp-col">
              <h3>Arts &amp; Music</h3>
              <p className="pp-music">{ctx.media ? <><em>“{ctx.media.title}”</em> by {ctx.media.artist}, now on {ctx.media.app}.</> : "No music is playing. The critic waits."}</p>
              <div className="pp-btns">
                <button onClick={() => ctx.mediaControl("previous")}>◂ Prev</button>
                <button onClick={() => ctx.mediaControl("play-pause")}>{ctx.media?.playing ? "Pause" : "Play"}</button>
                <button onClick={() => ctx.mediaControl("next")}>Next ▸</button>
              </div>
              <h3>Sections</h3>
              <ol className="pp-sections">
                {ctx.apps.slice(0, 12).map((a, i) => (
                  <li key={a.key}><button disabled={a.disabled} onClick={a.open}>
                    <span className="pp-sec-n">{String.fromCharCode(65 + Math.floor(i / 4))}{(i % 4) + 1}</span>
                    <span className="pp-sec-t">{a.title}</span>
                    <span className="pp-sec-d" />
                    <span className="pp-sec-s">{a.running ? "open" : a.kind === "android" ? "and." : ""}</span>
                  </button></li>
                ))}
              </ol>
              <button className="pp-settings" onClick={ctx.openSettings}>Classifieds &amp; Settings ▸</button>
            </section>
          </main>
        </>
      )}
      {idle && (
        <div className="pp-saver">
          <div className="pp-saver-t">Edition Closed</div>
          <div className="pp-saver-s">Издание закрыто · 本期完 · {hhmm(now)}</div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <tr><td>{k}</td><td>{v}</td></tr>;
}

function Strip({ ctx }: { ctx: DesignContext }) {
  return (
    <div className="pp-strip" style={{ top: ctx.slot.y + ctx.slot.height }}>
      <button className="pp-strip-home" onClick={ctx.goHome}>◂ Front Page</button>
      <div className="pp-strip-speed">{Math.round(ctx.car.speedMph)}<small>mph</small></div>
      <figure className="pp-strip-cam"><CameraFeed kind="front" label={false} filter="grayscale(1) brightness(2.6) contrast(1.4)" /><div className="pp-halftone" /></figure>
      <div className="pp-strip-apps">
        {ctx.running.slice(0, 4).map((a) => <button key={a.key} data-active={a.active} onClick={a.open}>{a.title}</button>)}
        {ctx.state.keyboard.available && <button onClick={ctx.openKeyboard}>Typewriter</button>}
      </div>
      <div className="pp-strip-time">{hhmm(new Date())}</div>
    </div>
  );
}

export const paper: Design = {
  id: "paper",
  name: "Paper",
  tagline: "E-ink broadsheet written from the car's data, apps as sections",
  slot: "top",
  swatch: ["#efebe1", "#1a1a1a"],
  Component: Paper,
};
