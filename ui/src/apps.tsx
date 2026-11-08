/**
 * Look of each app in the shell (icon, tile colour). Which apps exist, their
 * titles and whether they are running come from the daemon (daemon/hu_daemon.py
 * APPS); an app without an entry here still works and gets a generic tile.
 */
import type { ReactNode } from "react";
import { CarIcon } from "./components/icons";

const g = (size: number, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export interface AppLook {
  icon: (size: number) => ReactNode;
  /** Tile tint: [background, foreground]. */
  tint: [string, string];
}

export const APP_LOOKS: Record<string, AppLook> = {
  aa: { icon: (s) => <CarIcon size={s} />, tint: ["rgba(79,140,255,0.14)", "#4f8cff"] },
  stremio: {
    icon: (s) => g(s, <><rect x="2.5" y="4" width="19" height="16" rx="3" /><path d="m10 9 5 3-5 3z" /></>),
    tint: ["rgba(128,90,255,0.16)", "#a58bff"],
  },
  youtube: {
    icon: (s) => g(s, <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3z" fill="currentColor" /></>),
    tint: ["rgba(255,60,60,0.14)", "#ff5a5a"],
  },
  gmail: {
    icon: (s) => g(s, <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="m3 6.5 9 6.5 9-6.5" /></>),
    tint: ["rgba(234,67,53,0.12)", "#f28b82"],
  },
  calendar: {
    icon: (s) => g(s, <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" /></>),
    tint: ["rgba(66,133,244,0.14)", "#8ab4f8"],
  },
  chess: {
    icon: (s) => g(s, <><path d="M8 20h9M9 20c0-3 1-5 1.5-7L8 12l1-4 4-3.5 1.5 1.5c2 1.5 3 4 3 7.5V20" /><circle cx="12.5" cy="8.5" r="0.6" fill="currentColor" /></>),
    tint: ["rgba(129,182,76,0.14)", "#a3d977"],
  },
  android: {
    icon: (s) => g(s, <><path d="M6 10.5h12V18a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18z" /><path d="M6 9.5a6 6 0 0 1 12 0" /><path d="m8 4 1.3 2M16 4l-1.3 2" /><path d="M9.5 7.5h.01M14.5 7.5h.01" /></>),
    tint: ["rgba(61,220,132,0.14)", "#3ddc84"],
  },
  browser: {
    icon: (s) => g(s, <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z" /></>),
    tint: ["rgba(255,255,255,0.08)", "#e8eaed"],
  },
};

const FALLBACK: AppLook = {
  icon: (s) => g(s, <rect x="4" y="4" width="16" height="16" rx="4" />),
  tint: ["rgba(255,255,255,0.06)", "#8b9099"],
};

export const appLook = (id: string): AppLook => APP_LOOKS[id] ?? FALLBACK;
