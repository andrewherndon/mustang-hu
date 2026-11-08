import { formatDate, formatMeridiem, formatTime, useClock } from "../useClock";
import { CarIcon, MusicIcon, PhoneIcon } from "./icons";

interface Props {
  hidden: boolean;
  aaConnected: boolean;
  onOpenAA: () => void;
}

/** Home screen: shown when Android Auto is closed or no phone is connected. */
export function Home({ hidden, aaConnected, onOpenAA }: Props) {
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
                disabled={!aaConnected} onClick={onOpenAA}>
          <div className="card-icon">{aaConnected ? <CarIcon size={36} /> : <PhoneIcon size={36} />}</div>
          <div className="card-body">
            <div className="card-title">Android Auto</div>
            <div className="card-sub">
              {aaConnected ? "Phone connected — tap to open" : "Plug in your phone to start"}
            </div>
          </div>
          <span className="status-dot" />
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
