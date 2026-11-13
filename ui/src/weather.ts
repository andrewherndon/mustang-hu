import { useEffect, useState } from "react";

/**
 * Current weather and a short rain outlook from Open-Meteo (free, no API key).
 * Fixed location for now; it will follow the car once a GPS is connected.
 * Refreshes every 15 minutes; the last result is cached so something shows
 * immediately at startup and when offline.
 */
export const WEATHER_LOCATION = { lat: 33.78, lon: -84.4, name: "Atlanta" };
const REFRESH_MS = 15 * 60_000;
const KEY = "hu.weather";

export interface Weather {
  temp: number;          // °F, rounded
  code: number;          // WMO weather code
  isDay: boolean;
  outlook: string;       // e.g. "Rain likely around 3 PM" / "No rain for the next 12 h"
  rainSoon: boolean;
  fetchedAt: number;
}

/** WMO weather code -> short label and icon kind. */
export function describe(code: number): { label: string; icon: "clear" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm" } {
  if (code === 0) return { label: "Clear", icon: "clear" };
  if (code <= 2) return { label: "Partly cloudy", icon: "partly" };
  if (code === 3) return { label: "Cloudy", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "fog" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 61 ? "Rain" : "Drizzle", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", icon: "snow" };
  if (code >= 95) return { label: "Thunderstorms", icon: "storm" };
  return { label: "—", icon: "cloud" };
}

const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric" }).replace(/\s/g, " ");

async function fetchWeather(): Promise<Weather> {
  const { lat, lon } = WEATHER_LOCATION;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day&hourly=precipitation_probability` +
    `&temperature_unit=fahrenheit&timezone=auto&forecast_hours=12`;
  const d = await (await fetch(url)).json();
  const probs: number[] = d.hourly.precipitation_probability;
  const times: string[] = d.hourly.time;
  const firstRain = probs.findIndex((p) => p >= 50);
  const code: number = d.current.weather_code;
  const rainingNow = describe(code).icon === "rain" || describe(code).icon === "storm";
  const outlook = rainingNow
    ? "Raining now"
    : firstRain >= 0
      ? `Rain likely around ${hourLabel(times[firstRain])} (${probs[firstRain]}%)`
      : `No rain for the next ${probs.length} h`;
  return {
    temp: Math.round(d.current.temperature_2m), code, isDay: d.current.is_day === 1,
    outlook, rainSoon: rainingNow || firstRain >= 0, fetchedAt: Date.now(),
  };
}

export function useWeather() {
  const [weather, setWeather] = useState<Weather | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
  });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchWeather()
        .then((w) => {
          if (!alive) return;
          setWeather(w);
          try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* not cached */ }
        })
        .catch(() => { /* offline: keep the cached reading */ });
    load();
    const t = window.setInterval(load, REFRESH_MS);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  return weather;
}
