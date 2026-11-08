import { PRESETS, type Appearance as A } from "../theme";
import { Slider } from "./Slider";

interface Props {
  appearance: A;
  onChange: (patch: Partial<A>) => void;
  onClose: () => void;
}

/** Appearance sheet over the home screen: background colour and motion. */
export function Appearance({ appearance, onChange, onClose }: Props) {
  return (
    <div className="sheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-head">
          <div className="sheet-title">Appearance</div>
          <button className="sheet-done" onClick={onClose}>Done</button>
        </div>

        <div className="sheet-label">Colour</div>
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
      </div>
    </div>
  );
}
