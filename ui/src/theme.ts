import { useCallback, useEffect, useState } from "react";

/**
 * Appearance: one hue drives the whole palette (background band, glows,
 * accents) through OKLCH, so any hue gives evenly balanced colours.
 * Saved in this Chromium profile (localStorage) on the Surface.
 */
export interface Appearance {
  hue: number;        // 0..360 (OKLCH hue)
  motion: boolean;    // slow drifting background
}

const KEY = "hu.appearance";
const DEFAULT: Appearance = { hue: 262, motion: true };   // deep blue, like the reference

export const PRESETS: { name: string; hue: number }[] = [
  { name: "Midnight", hue: 262 },
  { name: "Violet", hue: 300 },
  { name: "Rose", hue: 10 },
  { name: "Ember", hue: 40 },
  { name: "Gold", hue: 80 },
  { name: "Mint", hue: 160 },
  { name: "Teal", hue: 200 },
  { name: "Sky", hue: 235 },
];

function load(): Appearance {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT;
  }
}

/** Applies the palette as CSS variables on :root and persists changes. */
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(load);

  useEffect(() => {
    const h = appearance.hue;
    const root = document.documentElement.style;
    root.setProperty("--hue", String(h));
    root.setProperty("--bg-base", `oklch(0.13 0.03 ${h})`);
    root.setProperty("--band-1", `oklch(0.42 0.24 ${h})`);
    root.setProperty("--band-2", `oklch(0.30 0.20 ${h + 12})`);
    root.setProperty("--glow-1", `oklch(0.55 0.22 ${h - 10} / 0.55)`);
    root.setProperty("--glow-2", `oklch(0.35 0.18 ${h + 25} / 0.6)`);
    root.setProperty("--accent", `oklch(0.75 0.15 ${h})`);
    root.setProperty("--motion", appearance.motion ? "running" : "paused");
    try {
      localStorage.setItem(KEY, JSON.stringify(appearance));
    } catch {
      /* private mode etc.: appearance just won't persist */
    }
  }, [appearance]);

  const update = useCallback((patch: Partial<Appearance>) => setAppearance((a) => ({ ...a, ...patch })), []);
  return { appearance, update };
}
