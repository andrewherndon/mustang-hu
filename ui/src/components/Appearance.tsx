import { PRESETS, type Appearance as A } from "../theme";
import { Slider } from "./Slider";

interface Props {
  appearance: A;
  onChange: (patch: Partial<A>) => void;
  onClose: () => void;
  androidPreload: boolean;
  onAndroidPreload: (v: boolean) => void;
  androidSplit: boolean;
  onAndroidSplit: (v: boolean) => void;
  onDesigns: () => void;
}

/** Settings sheet over the home screen: appearance and Android. */
export function Appearance({ appearance, onChange, onClose, androidPreload, onAndroidPreload, androidSplit, onAndroidSplit, onDesigns }: Props) {
  return (
    <div className="sheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-head">
          <div className="sheet-title">Settings</div>
          <button className="sheet-done" onClick={onClose}>Done</button>
        </div>

        <button className="sheet-toggle" onClick={onDesigns}>
          <span>Design: Classic<small className="sheet-hint">Try other complete designs for the head unit</small></span>
          <span>›</span>
        </button>

        <div className="sheet-label">Appearance · Colour</div>
        <div className="swatches">
          {PRESETS.map((p) => (
            <button key={p.name} className="swatch" data-on={Math.abs(appearance.hue - p.hue) < 3}
                    onClick={() => onChange({ hue: p.hue })} aria-label={p.name}>
              <span style={{ background: `linear-gradient(135deg, oklch(0.5 0.24 ${p.hue}), oklch(0.2 0.12 ${p.hue + 15}))` }} />
              <em>{p.name}</em>
            </button>
          ))}
        </div>

        <div className="sheet-label">Fine-tune</div>
        <div className="hue-slider">
          <Slider label="Hue" value={appearance.hue / 360} onChange={(v) => onChange({ hue: Math.round(v * 360) })} />
        </div>

        <button className="sheet-toggle" data-on={appearance.motion} onClick={() => onChange({ motion: !appearance.motion })}>
          <span>Moving background</span>
          <span className="toggle"><span /></span>
        </button>

        <div className="sheet-label">Android</div>
        <button className="sheet-toggle" data-on={androidPreload} onClick={() => onAndroidPreload(!androidPreload)}>
          <span>
            Start Android at boot
            <small className="sheet-hint">Android apps open instantly; uses ~1.5 GB of memory in the background</small>
          </span>
          <span className="toggle"><span /></span>
        </button>
        <button className="sheet-toggle" data-on={androidSplit} onClick={() => onAndroidSplit(!androidSplit)}>
          <span>
            Split view: Maps + media
            <small className="sheet-hint">Like Android Auto: Maps on the left third; touch a side to make it big</small>
          </span>
          <span className="toggle"><span /></span>
        </button>
      </div>
    </div>
  );
}
