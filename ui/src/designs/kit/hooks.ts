import { useEffect, useState } from "react";

/** True after `ms` without any touch/pointer input (screensavers, attract modes). */
export function useIdle(ms: number) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let t = window.setTimeout(() => setIdle(true), ms);
    const wake = () => { setIdle(false); window.clearTimeout(t); t = window.setTimeout(() => setIdle(true), ms); };
    window.addEventListener("pointerdown", wake, true);
    window.addEventListener("pointermove", wake, true);
    return () => { window.clearTimeout(t); window.removeEventListener("pointerdown", wake, true); window.removeEventListener("pointermove", wake, true); };
  }, [ms]);
  return idle;
}

/** Re-render every `ms` (clocks with seconds, blinking things). */
export function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setN((x) => x + 1), ms); return () => window.clearInterval(t); }, [ms]);
  return n;
}

/** Greetings by time of day in English, Russian and Chinese. */
export function greetings(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return { en: "Good morning", ru: "Доброе утро", zh: "早上好" };
  if (h >= 12 && h < 18) return { en: "Good afternoon", ru: "Добрый день", zh: "下午好" };
  return { en: "Good evening", ru: "Добрый вечер", zh: "晚上好" };
}

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, "0");
export const hhmm = (d: Date, h24 = false) => {
  const h = h24 ? d.getHours() : ((d.getHours() + 11) % 12) + 1;
  return `${h24 ? pad2(h) : h}:${pad2(d.getMinutes())}`;
};
