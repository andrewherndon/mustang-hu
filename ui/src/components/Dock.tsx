import type { AppState, Layout } from "../daemon";
import { appLook } from "../apps";
import { formatTime, useClock } from "../useClock";
import { CarIcon, HomeIcon, KeyboardIcon, SettingsIcon, VolumeIcon } from "./icons";

interface Props {
  height: number;
  layout: Layout;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  online: boolean;
  keyboardAvailable: boolean;
  onOpen: (layout: Layout) => void;
  onKeyboard: () => void;
}

/** Bottom strip below Android Auto; always visible, in every layout. */
export function Dock({ height, layout, aaConnected, apps, online, keyboardAvailable, onOpen, onKeyboard }: Props) {
  // Quick switching: every web app that is running (launch new ones from Home).
  const running = Object.entries(apps).filter(([id, app]) => id !== "aa" && app.running);
  const now = useClock();

  return (
    <nav className="dock" style={{ height }}>
      <div className="dock-group">
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
          <button key={id} className="dock-btn" data-active={layout === id} onClick={() => onOpen(id)}
                  aria-label={app.title} style={{ color: layout === id ? appLook(id).tint[1] : undefined }}>
            {appLook(id).icon(28)}
          </button>
        ))}
      </div>

      <div className="dock-center">
        <span className="dock-time">{formatTime(now)}</span>
      </div>

      <div className="dock-group">
        {keyboardAvailable && (
          <button className="dock-btn" onClick={onKeyboard} aria-label="Keyboard"><KeyboardIcon /></button>
        )}
        <button className="dock-btn" disabled aria-label="Volume"><VolumeIcon /></button>
        <button className="dock-btn" disabled aria-label="Settings"><SettingsIcon /></button>
        <span className="daemon-dot" data-online={online} title={online ? "daemon connected" : "daemon offline"} />
      </div>
    </nav>
  );
}
