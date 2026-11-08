import { formatDate, formatMeridiem, formatTime, useClock } from "../useClock";
import type { AppState, Layout } from "../daemon";
import { appLook } from "../apps";
import { CarIcon, PhoneIcon } from "./icons";

interface Props {
  hidden: boolean;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  onOpen: (layout: Layout) => void;
}

/** Home screen: clock, Android Auto, and a launcher grid of the other apps. */
export function Home({ hidden, aaConnected, apps, onOpen }: Props) {
  const now = useClock();
  const launchable = Object.entries(apps).filter(([id]) => id !== "aa");

  return (
    <div className="home" data-hidden={hidden}>
      <div className="home-clock">
        <div className="time">
          {formatTime(now)}
          <span className="meridiem">{formatMeridiem(now)}</span>
        </div>
        <div className="date">{formatDate(now)}</div>
      </div>

      <div className="home-cards">
        <button className="card card-aa" data-connected={aaConnected}
                disabled={!aaConnected} onClick={() => onOpen("aa")}>
          <div className="card-icon">{aaConnected ? <CarIcon size={36} /> : <PhoneIcon size={36} />}</div>
          <div className="card-body">
            <div className="card-title">Android Auto</div>
            <div className="card-sub">
              {aaConnected ? "Phone connected — tap to open" : "Plug in your phone to start"}
            </div>
          </div>
          <span className="status-dot" />
        </button>

        <div className="app-grid">
          {launchable.map(([id, app]) => {
            const look = appLook(id);
            return (
              <button key={id} className="app-tile" onClick={() => onOpen(id)} data-running={app.running}>
                <span className="app-tile-icon" style={{ background: look.tint[0], color: look.tint[1] }}>
                  {look.icon(40)}
                </span>
                <span className="app-tile-title">{app.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
