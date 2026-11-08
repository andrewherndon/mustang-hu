import { formatDate, formatTime, useClock } from "../useClock";
import type { AppState, Layout } from "../daemon";
import { AppIcon } from "../apps";
import { MustangGraphic } from "./MustangGraphic";

interface Props {
  hidden: boolean;
  motion: boolean;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  onOpen: (layout: Layout) => void;
}

/** Home screen order (apps not listed here follow, in the daemon's order). */
const ORDER = ["aa", "youtube", "stremio", "gmail", "calendar", "android", "chess", "browser"];

/** Home: clock and now playing on the left, the apps as large icons on the right. */
export function Home({ hidden, motion, aaConnected, apps, onOpen }: Props) {
  const now = useClock();
  const ids = [...ORDER.filter((id) => apps[id]), ...Object.keys(apps).filter((id) => !ORDER.includes(id))];

  return (
    <div className="home" data-hidden={hidden}>
      <div className="home-left">
        <div className="clock">{formatTime(now)}</div>
        <div className="clock-date">{formatDate(now)}</div>

        <MustangGraphic playing={!hidden && motion} />

        <div className="nowplaying">
          <div className="np-art" />
          <div className="np-text">
            <div className="np-title">Nothing playing</div>
            <div className="np-sub">{aaConnected ? "Start music in Android Auto" : "Connect your phone"}</div>
          </div>
        </div>
      </div>

      <div className="app-grid">
        {ids.map((id) => {
          const app = apps[id];
          const disabled = id === "aa" && !aaConnected;
          return (
            <button key={id} className="app" disabled={disabled} onClick={() => onOpen(id)}>
              <AppIcon id={id} title={app.title} size={116} />
              <span className="app-label">{app.title}</span>
              {id === "aa" && aaConnected && <span className="app-badge app-badge-live" />}
              {id !== "aa" && app.running && <span className="app-badge" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
