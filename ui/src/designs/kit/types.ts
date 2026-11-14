import type { ComponentType } from "react";
import type { DaemonState, Layout, Media, MediaAction } from "../../daemon";
import type { CarData } from "./car";

/** One launchable thing, Linux or Android, as every design sees it. */
export interface UApp {
  key: string;               // "youtube" | "android:com.spotify.music" | "aa"
  title: string;
  icon?: string;             // image URL (official artwork) if any
  kind: "linux" | "android" | "aa";
  running: boolean;          // window open / recently used in Android
  active: boolean;           // shown in the slot right now
  disabled?: boolean;        // Android Auto without a phone
  open: () => void;
}

export interface DesignContext {
  state: DaemonState;
  online: boolean;
  car: CarData;
  /** Linux apps then Android apps (Android Auto first). */
  apps: UApp[];
  /** Apps with a window / recent use, most relevant first. */
  running: UApp[];
  /** An app is shown in the slot (the design shows its "app mode" chrome). */
  appOpen: boolean;
  currentApp: UApp | null;
  /** Slot in stage CSS px (1440x960 stage): where the app window will appear. */
  slot: { x: number; y: number; width: number; height: number };
  goHome: () => void;
  openLayout: (layout: Layout) => void;
  openSettings: () => void;
  openKeyboard: () => void;
  media: Media | null;
  mediaControl: (a: MediaAction) => void;
  setVolume: (v: number) => void;
  setMute: (m: boolean) => void;
  setBrightness: (v: number) => void;
  reverse: boolean;
  hue: number;
  motion: boolean;
  mock: boolean;
}

export interface Design {
  id: string;
  name: string;
  /** Short description for the picker. */
  tagline: string;
  /** Where this design puts the app slot. */
  slot: "top" | "bottom";
  /** Swatch colours for the picker card. */
  swatch: [string, string];
  Component: ComponentType<{ ctx: DesignContext }>;
}
