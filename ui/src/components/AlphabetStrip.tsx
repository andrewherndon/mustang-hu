import { useRef, useState } from "react";

const LETTERS = ["★", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

interface Props {
  /** Letters that have at least one app (others are dimmed). */
  available: Set<string>;
  /** Called with the letter under the finger while sliding, null when released. */
  onScrub: (letter: string | null) => void;
  /** Called when the finger lifts on a letter. */
  onPick: (letter: string) => void;
}

/**
 * Niagara-style alphabet strip. While a finger slides along it, letters near
 * the finger bulge out to the left in a smooth wave (cosine falloff), and the
 * letter under the finger is reported so the home screen can show its apps.
 */
export function AlphabetStrip({ available, onScrub, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [fingerY, setFingerY] = useState<number | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const letterAt = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    const i = Math.floor(((clientY - r.top) / r.height) * LETTERS.length);
    return LETTERS[Math.max(0, Math.min(LETTERS.length - 1, i))];
  };

  const move = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    setFingerY(clientY - r.top);
    const l = letterAt(clientY);
    if (l !== active) {
      setActive(l);
      onScrub(l);
      navigator.vibrate?.(4);
    }
  };

  const end = () => {
    if (active) onPick(active);
    setFingerY(null);
    setActive(null);
    onScrub(null);
  };

  const rowH = ref.current ? ref.current.getBoundingClientRect().height / LETTERS.length : 0;

  return (
    <div
      ref={ref}
      className="alpha"
      data-scrubbing={fingerY !== null}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientY);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {LETTERS.map((l, i) => {
        let shift = 0;
        if (fingerY !== null && rowH > 0) {
          const d = Math.abs(fingerY - (i + 0.5) * rowH) / (rowH * 5);   // wave ~5 letters each side
          shift = d < 1 ? (Math.cos(d * Math.PI) + 1) / 2 : 0;
        }
        return (
          <span
            key={l}
            className="alpha-letter"
            data-has={available.has(l)}
            data-active={l === active}
            style={{ transform: `translateX(${-shift * 56}px) scale(${1 + shift * 0.9})` }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
}
