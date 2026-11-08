import { useEffect, useState } from "react";

/** Current time, re-rendering once per minute boundary (cheap for a clock). */
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
    };
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

export const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");

export const formatMeridiem = (d: Date) => (d.getHours() < 12 ? "AM" : "PM");

export const formatDate = (d: Date) =>
  d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
