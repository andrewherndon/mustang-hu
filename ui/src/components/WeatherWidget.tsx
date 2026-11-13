import { describe, useWeather } from "../weather";

/** Small weather line above now playing: icon, temperature, conditions, rain outlook. */
export function WeatherWidget() {
  const w = useWeather();
  if (!w) {
    return <div className="weather weather-empty">Weather unavailable</div>;
  }
  const { label, icon } = describe(w.code);
  const stale = Date.now() - w.fetchedAt > 2 * 60 * 60_000;
  return (
    <div className="weather" data-rain={w.rainSoon}>
      <span className="weather-icon"><WeatherIcon kind={icon} day={w.isDay} /></span>
      <span className="weather-temp">{w.temp}°</span>
      <span className="weather-text">
        <span className="weather-label">{label}{stale && " · offline"}</span>
        <span className="weather-outlook">{w.outlook}</span>
      </span>
    </div>
  );
}

function WeatherIcon({ kind, day }: { kind: ReturnType<typeof describe>["icon"]; day: boolean }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const sun = day
    ? <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>
    : <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />;
  const cloud = <path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z" />;
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" {...p}>
      {kind === "clear" && sun}
      {kind === "partly" && <><g transform="translate(-3 -3) scale(0.75)">{sun}</g><path d="M9 20h8a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.3A2.9 2.9 0 0 0 9 20z" /></>}
      {kind === "cloud" && cloud}
      {kind === "fog" && <path d="M4 9h16M3 13h18M5 17h14" />}
      {kind === "rain" && <><path d="M7 15h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 15z" /><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" /></>}
      {kind === "snow" && <>{cloud}<path d="M9 21h.01M12 21h.01M15 21h.01" /></>}
      {kind === "storm" && <><path d="M7 15h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 15z" /><path d="m12 15-2 4h3l-2 3.5" /></>}
    </svg>
  );
}
