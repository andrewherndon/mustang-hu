import { useEffect, useState } from "react";
import type { AppState, Layout } from "../daemon";
import { AppIcon } from "../apps";
import { formatTime, useClock } from "../useClock";
import { CarIcon, HomeIcon, KeyboardIcon, MuteIcon, SettingsIcon, VolumeIcon } from "./icons";

interface Props {
  height: number;
  layout: Layout;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  online: boolean;
  keyboardAvailable: boolean;
  onOpen: (layout: Layout) => void;
  onKeyboard: () => void;
  onControls: () => void;
  onSettings: () => void;
  volume: { level: number; muted: boolean };
}

/** Running-app buttons that fit in the left column next to Home and Android Auto. */
const MAX_RUNNING_IN_DOCK = 3;

const rank = (recent: string[], id: string) => {
  const i = recent.indexOf(id);
  return i === -1 ? recent.length : i;
};

/** App ids, most recently shown first. */
function useRecentApps(layout: Layout) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    if (layout !== "home") setRecent((r) => [layout, ...r.filter((id) => id !== layout)]);
  }, [layout]);
  return recent;
}

/**
 * Bottom strip below the app slot; always visible, in every layout.
 * Three columns (left buttons | clock | right buttons) so the centred clock
 * never overlaps the icons.
 */
export function Dock({ height, layout, aaConnected, apps, online, keyboardAvailable, onOpen, onKeyboard, onControls, onSettings, volume }: Props) {
  // Quick switching between running web apps (launch new ones from Home).
  // Only the most recently used fit beside the clock; the rest stay on Home.
  const recent = useRecentApps(layout);
  const running = Object.entries(apps)
    .filter(([id, app]) => id !== "aa" && app.running)
    .sort(([a], [b]) => rank(recent, a) - rank(recent, b))
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
        {running.map(([id, app]) => (
          <button key={id} className="dock-btn dock-app" data-active={layout === id} onClick={() => onOpen(id)}
                  aria-label={app.title}>
            <AppIcon id={id} title={app.title} size={52} />
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
