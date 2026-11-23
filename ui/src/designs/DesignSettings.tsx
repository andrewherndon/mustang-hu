import { DESIGNS } from "./registry";

interface Props {
  current: string;
  onPick: (id: string) => void;
  androidPreload: boolean;
  onAndroidPreload: (v: boolean) => void;
  androidSplit: boolean;
  onAndroidSplit: (v: boolean) => void;
  reverse: boolean;
  onReverse: (v: boolean) => void;
  onClose: () => void;
}

/** Settings shared by every design: the design picker and system options. */
export function DesignSettings({ current, onPick, androidPreload, onAndroidPreload, androidSplit, onAndroidSplit, reverse, onReverse, onClose }: Props) {
  const all = [{ id: "classic", name: "Classic", tagline: "The original: dithered gradient, glass icons, Mustang clip", swatch: ["#0b3d2e", "#2ec27e"] as [string, string] }, ...DESIGNS];
  return (
    <div className="dsheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dsheet">
        <h2>Settings <button className="dsheet-btn" onClick={onClose}>Done</button></h2>
        <h3>Design</h3>
        <div className="dsheet-grid">
          {all.map((d) => (
            <button key={d.id} className="dcard" data-on={d.id === current} onClick={() => onPick(d.id)}>
              <div className="dcard-swatch" style={{ background: `linear-gradient(135deg, ${d.swatch[0]}, ${d.swatch[1]})` }} />
              <div className="dcard-text">
                <div className="dcard-name">{d.name}</div>
                <div className="dcard-tag">{d.tagline}</div>
              </div>
            </button>
          ))}
        </div>
        <h3>Android</h3>
        <div className="dsheet-row">
          <button className="dsheet-btn" data-on={androidPreload} onClick={() => onAndroidPreload(!androidPreload)}>
            Start Android at boot: {androidPreload ? "on" : "off"}
          </button>
          <button className="dsheet-btn" data-on={androidSplit} onClick={() => onAndroidSplit(!androidSplit)}>
            Split view (Maps + media): {androidSplit ? "on" : "off"}
          </button>
        </div>
        <h3>Test</h3>
        <div className="dsheet-row">
          <button className="dsheet-btn" data-on={reverse} onClick={() => onReverse(!reverse)}>
            Simulate reverse gear (rear camera)
          </button>
        </div>
      </div>
    </div>
  );
}
