import { useEffect, useState } from "react";
import { ANDROID_ICON_BASE, type AndroidApp, type AppState, type Layout } from "../daemon";
import { AppIcon } from "../apps";
import { formatTime, useClock } from "../useClock";
import { CarIcon, HomeIcon, KeyboardIcon, MuteIcon, SettingsIcon, VolumeIcon } from "./icons";

interface Props {
  height: number;
  layout: Layout;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  androidApps: AndroidApp[];
  androidFront: string | null;
  androidRecent: string[];
  onLaunchAndroid: (pkg: string) => void;
  online: boolean;
  keyboardAvailable: boolean;
  onOpen: (layout: Layout) => void;
  onKeyboard: () => void;
  onControls: () => void;
  onSettings: () => void;
  volume: { level: number; muted: boolean };
}

/** Running-app buttons that fit in the left column next to Home and Android Auto. */
const MAX_RUNNING_IN_DOCK = 4;

const rank = (recent: string[], id: string) => {
  const i = recent.indexOf(id);
  return i === -1 ? recent.length : i;
};

/**
 * Dock keys, most recently shown first: Linux app ids ("youtube") and Android
 * apps as "android:<package>" (Android is one window, so the app in front is
 * what counts as shown).
 */
function useRecentApps(layout: Layout, androidFront: string | null) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const key = layout === "android" ? (androidFront ? `android:${androidFront}` : null)
      : layout !== "home" ? layout : null;
    if (key) setRecent((r) => [key, ...r.filter((k) => k !== key)]);
  }, [layout, androidFront]);
  return recent;
}

/**
 * Bottom strip below the app slot; always visible, in every layout.
 * Three columns (left buttons | clock | right buttons) so the centred clock
 * never overlaps the icons.
 */
export function Dock({ height, layout, aaConnected, apps, androidApps, androidFront, androidRecent, onLaunchAndroid,
                      online, keyboardAvailable, onOpen, onKeyboard, onControls, onSettings, volume }: Props) {
  // Quick switching between running apps (launch new ones from Home): Linux
  // apps and each recently used Android app as its own button. Android ones get
  // an outlined tile so "YouTube (Android)" and "YouTube (web)" are told apart.
  // Only the most recently used fit beside the clock; the rest stay on Home.
  const recent = useRecentApps(layout, androidFront);
  type Entry = { key: string; title: string; android?: AndroidApp; id?: string };
  const entries: Entry[] = [
    ...Object.entries(apps)
      .filter(([id, app]) => id !== "aa" && id !== "android" && app.running)
      .map(([id, app]) => ({ key: id, title: app.title, id })),
    ...androidRecent
      .map((pkg) => androidApps.find((a) => a.pkg === pkg))
      .filter((a): a is AndroidApp => !!a)
      .map((a) => ({ key: `android:${a.pkg}`, title: a.title, android: a })),
  ];
  // Android open on its own launcher (no app in front): keep a plain Android button.
  if (apps.android?.running && !androidFront && layout === "android") {
    entries.push({ key: "android", title: "Android", id: "android" });
  }
  const running = entries
    .sort((a, b) => rank(recent, a.key) - rank(recent, b.key))
    .slice(0, MAX_RUNNING_IN_DOCK);
  const now = useClock();

  return (
    <nav className="dock" style={{ height }}>
      <div className="dock-group dock-left">
        <button className="dock-btn" data-active={layout === "home"} onClick={() => onOpen("home")} aria-label="Home">
          <HomeIcon />
        </button>
        <button className="dock-btn" data-active={layout === "aa"} disabled={!aaConnected}
                onClick={() => onOpen("aa")} aria-label="Android Auto">
          <CarIcon />
          {aaConnected && <span className="dock-badge" />}
        </button>
        {running.length > 0 && <span className="dock-sep" />}
        {running.map((e) => e.android ? (
          <button key={e.key} className="dock-btn dock-app dock-app-android"
                  data-active={layout === "android" && androidFront === e.android.pkg}
                  onClick={() => onLaunchAndroid(e.android!.pkg)} aria-label={`${e.title} (Android)`}>
            <AppIcon id={e.android.pkg} title={e.title} size={52}
                     src={e.android.icon ? ANDROID_ICON_BASE + e.android.icon : undefined} />
          </button>
        ) : (
          <button key={e.key} className="dock-btn dock-app" data-active={layout === e.id} onClick={() => onOpen(e.id!)}
                  aria-label={e.title}>
            <AppIcon id={e.id!} title={e.title} size={52} />
          </button>
        ))}
      </div>

      <div className="dock-center">
        <span className="dock-time">{formatTime(now)}</span>
      </div>

      <div className="dock-group dock-right">
        {keyboardAvailable && (
          <button className="dock-btn" onClick={onKeyboard} aria-label="Keyboard"><KeyboardIcon /></button>
        )}
        <button className="dock-btn dock-volume" onClick={onControls} aria-label="Volume and brightness">
          {volume.muted ? <MuteIcon /> : <VolumeIcon />}
          <span className="dock-volume-level">{volume.muted ? "" : Math.round(volume.level * 100)}</span>
        </button>
        <button className="dock-btn" onClick={onSettings} aria-label="Appearance"><SettingsIcon /></button>
        <span className="daemon-dot" data-online={online} title={online ? "daemon connected" : "daemon offline"} />
      </div>
    </nav>
  );
}
