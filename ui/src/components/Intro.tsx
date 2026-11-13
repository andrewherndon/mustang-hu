import { useEffect, useState } from "react";

/** Who the head unit greets. */
export const DRIVER_NAME = "Andrey";

/** Greeting for the time of day (Mandarin). */
export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "早上好";   // good morning
  if (h >= 11 && h < 13) return "中午好";  // good noon
  if (h >= 13 && h < 18) return "下午好";  // good afternoon
  return "晚上好";                         // good evening
}

const TYPE_MS = 120;        // per character
const HOLD_MS = 4500;       // greeting on screen before the home screen comes in

/**
 * Startup greeting, typed out character by character with a blinking caret.
 * Calls onDone after HOLD_MS; the parent then reveals the clock, car, etc.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const text = `${greeting()}, ${DRIVER_NAME}`;
  const [n, setN] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (n >= text.length) return;
    const t = window.setTimeout(() => setN((x) => x + 1), n === 0 ? 400 : TYPE_MS);
    return () => window.clearTimeout(t);
  }, [n, text.length]);

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), HOLD_MS - 500);
    const done = window.setTimeout(onDone, HOLD_MS);
    return () => { window.clearTimeout(leave); window.clearTimeout(done); };
  }, [onDone]);

  return (
    <div className="intro" data-leaving={leaving} aria-live="polite">
      <span className="intro-text">{text.slice(0, n)}</span>
      <span className="intro-caret" />
    </div>
  );
}
