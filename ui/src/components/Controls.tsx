import { useEffect, useRef, useState } from "react";
import { Slider } from "./Slider";
import { BrightnessIcon, MuteIcon, VolumeIcon } from "./icons";

interface Props {
  height: number;
  volume: { level: number; muted: boolean };
  brightness: number;
  onVolume: (level: number) => void;
  onMute: (muted: boolean) => void;
  onBrightness: (level: number) => void;
  onClose: () => void;
}

/**
 * Throttle outgoing changes while dragging (the daemon runs a command per
 * change) but always send the final value; show the local value meanwhile.
 */
function useThrottled(remote: number, send: (v: number) => void, ms = 60) {
  const [local, setLocal] = useState<number | null>(null);
  const last = useRef(0);
  const pending = useRef<number | undefined>(undefined);
  const idle = useRef<number | undefined>(undefined);

  useEffect(() => () => { window.clearTimeout(pending.current); window.clearTimeout(idle.current); }, []);

  const change = (v: number) => {
    setLocal(v);
    window.clearTimeout(pending.current);
    const wait = last.current + ms - Date.now();
    if (wait <= 0) {
      last.current = Date.now();
      send(v);
    } else {
      pending.current = window.setTimeout(() => { last.current = Date.now(); send(v); }, wait);
    }
    // Hand display back to the daemon's value once the drag settles.
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setLocal(null), 800);
  };
  return [local ?? remote, change] as const;
}

/** Volume and brightness, shown in place of the dock (so it works over any app). */
export function Controls({ height, volume, brightness, onVolume, onMute, onBrightness, onClose }: Props) {
  const [vol, setVol] = useThrottled(volume.muted ? 0 : volume.level, onVolume);
  const [bri, setBri] = useThrottled(brightness, onBrightness);

  return (
    <div className="controls" style={{ height }}>
      <button className="dock-btn" onClick={() => onMute(!volume.muted)}
              aria-label={volume.muted ? "Unmute" : "Mute"} data-active={volume.muted}>
        {volume.muted ? <MuteIcon /> : <VolumeIcon />}
      </button>
      <Slider label="Volume" value={vol} onChange={setVol} />

      <span className="controls-sep" />

      <span className="controls-icon"><BrightnessIcon /></span>
      <Slider label="Brightness" value={bri} onChange={setBri} min={0.03} />

      <button className="controls-done" onClick={onClose}>Done</button>
    </div>
  );
}
