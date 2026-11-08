import type { Layout } from "../daemon";
import { formatTime, useClock } from "../useClock";
import { CarIcon, HomeIcon, MusicIcon, SettingsIcon, VolumeIcon } from "./icons";

interface Props {
  height: number;
  layout: Layout;
  aaConnected: boolean;
  online: boolean;
  onHome: () => void;
  onAA: () => void;
}

/** Bottom strip below Android Auto; always visible, in every layout. */
export function Dock({ height, layout, aaConnected, online, onHome, onAA }: Props) {
  const now = useClock();

  return (
    <nav className="dock" style={{ height }}>
      <div className="dock-group">
        <button className="dock-btn" data-active={layout === "home"} onClick={onHome} aria-label="Home">
          <HomeIcon />
        </button>
        <button className="dock-btn" data-active={layout === "aa"} disabled={!aaConnected}
                onClick={onAA} aria-label="Android Auto">
          <CarIcon />
          {aaConnected && <span className="dock-badge" />}
        </button>
        <button className="dock-btn" disabled aria-label="Music"><MusicIcon /></button>
      </div>

      <div className="dock-center">
        <span className="dock-time">{formatTime(now)}</span>
      </div>

      <div className="dock-group">
        <button className="dock-btn" disabled aria-label="Volume"><VolumeIcon /></button>
        <button className="dock-btn" disabled aria-label="Settings"><SettingsIcon /></button>
        <span className="daemon-dot" data-online={online} title={online ? "daemon connected" : "daemon offline"} />
      </div>
    </nav>
  );
}
