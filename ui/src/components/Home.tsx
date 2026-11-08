import { formatDate, formatMeridiem, formatTime, useClock } from "../useClock";
import type { Layout } from "../daemon";
import { CarIcon, MusicIcon, PhoneIcon, PlayIcon } from "./icons";

interface Props {
  hidden: boolean;
  aaConnected: boolean;
  stremioRunning: boolean;
  onOpen: (layout: Layout) => void;
}

/** Home screen: shown when Android Auto is closed or no phone is connected. */
export function Home({ hidden, aaConnected, stremioRunning, onOpen }: Props) {
  const now = useClock();

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

        <button className="card card-stremio" onClick={() => onOpen("stremio")}>
          <div className="card-icon"><PlayIcon size={36} /></div>
          <div className="card-body">
            <div className="card-title">Stremio</div>
            <div className="card-sub">{stremioRunning ? "Running — tap to return" : "Movies & shows · when parked"}</div>
          </div>
        </button>

        <div className="card card-media">
          <div className="card-icon"><MusicIcon size={36} /></div>
          <div className="card-body">
            <div className="card-title">Nothing playing</div>
            <div className="card-sub">Bluetooth media comes in a later milestone</div>
          </div>
        </div>

        <div className="card card-stat">
          <div className="stat-value">—<span className="stat-unit">mph</span></div>
          <div className="card-sub">Speed needs a GPS or the ESP32</div>
        </div>
      </div>
    </div>
  );
}
