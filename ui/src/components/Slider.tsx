import { useRef } from "react";

interface Props {
  value: number;              // 0..1
  onChange: (v: number) => void;
  min?: number;
  label: string;
}

/**
 * Large touch slider: drag anywhere on the track (pointer capture keeps the drag
 * even when the finger leaves it). The parent owns the value, so it can show
 * changes made elsewhere (hardware buttons) when not being dragged.
 */
export function Slider({ value, onChange, min = 0, label }: Props) {
  const track = useRef<HTMLDivElement>(null);

  const valueAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(min, Math.min(1, (clientX - r.left) / r.width));
  };

  return (
    <div
      ref={track}
      className="slider"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(valueAt(e.clientX));
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onChange(valueAt(e.clientX));
      }}
    >
      <div className="slider-fill" style={{ transform: `scaleX(${value})` }} />
      <div className="slider-value">{Math.round(value * 100)}</div>
    </div>
  );
}
