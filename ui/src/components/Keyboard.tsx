import { useEffect, useRef, useState } from "react";

/**
 * On-screen keyboard drawn by the shell. It replaces the dock while open; the
 * daemon shrinks the app above it and types each key into that app (wtype).
 *
 * Keys fire on pointerdown (not click) for instant feedback, and
 * preventDefault keeps the press from turning into a focus change or text
 * selection in the shell.
 */

export type KeyPress = { text: string } | { key: "BackSpace" | "Return" | "Tab" | "Left" | "Right" };

interface Props {
  height: number;
  onKey: (k: KeyPress) => void;
  onClose: () => void;
}

type Shift = "off" | "once" | "lock";

const LETTERS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];
const SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "&", "@", "\""],
  [".", ",", "?", "!", "'", "#", "%"],
];

export function Keyboard({ height, onKey, onClose }: Props) {
  const [shift, setShift] = useState<Shift>("off");
  const [symbols, setSymbols] = useState(false);
  const lastShiftTap = useRef(0);
  const repeat = useRef<{ timer?: number; interval?: number }>({});

  const stopRepeat = () => {
    window.clearTimeout(repeat.current.timer);
    window.clearInterval(repeat.current.interval);
  };
  useEffect(() => stopRepeat, []);

  const press = (e: React.PointerEvent, action: () => void) => {
    e.preventDefault();
    navigator.vibrate?.(5);
    action();
  };

  const typeChar = (c: string) => {
    onKey({ text: shift !== "off" && !symbols ? c.toUpperCase() : c });
    if (shift === "once") setShift("off");
  };

  const tapShift = () => {
    const now = Date.now();
    if (now - lastShiftTap.current < 350) setShift("lock");       // double tap: caps lock
    else setShift((s) => (s === "off" ? "once" : "off"));
    lastShiftTap.current = now;
  };

  // Backspace repeats while held, like a phone keyboard.
  const backspaceDown = (e: React.PointerEvent) => {
    press(e, () => onKey({ key: "BackSpace" }));
    stopRepeat();
    repeat.current.timer = window.setTimeout(() => {
      repeat.current.interval = window.setInterval(() => onKey({ key: "BackSpace" }), 60);
    }, 400);
  };

  const rows = symbols ? SYMBOLS : LETTERS;
  const label = (c: string) => (shift !== "off" && !symbols ? c.toUpperCase() : c);

  return (
    <div className="kb" style={{ height }} onPointerUp={stopRepeat} onPointerLeave={stopRepeat}
         onContextMenu={(e) => e.preventDefault()}>
      <div className="kb-row">
        {rows[0].map((c) => (
          <button key={c} className="kb-key" onPointerDown={(e) => press(e, () => typeChar(c))}>{label(c)}</button>
        ))}
        <button className="kb-key kb-fn" onPointerDown={backspaceDown} aria-label="Backspace">⌫</button>
      </div>
      <div className="kb-row kb-row-2">
        {rows[1].map((c) => (
          <button key={c} className="kb-key" onPointerDown={(e) => press(e, () => typeChar(c))}>{label(c)}</button>
        ))}
        <button className="kb-key kb-fn kb-wide" onPointerDown={(e) => press(e, () => onKey({ key: "Return" }))}>
          return
        </button>
      </div>
      <div className="kb-row">
        <button className="kb-key kb-fn kb-wide" data-on={shift !== "off"} data-lock={shift === "lock"}
                disabled={symbols} onPointerDown={(e) => press(e, tapShift)} aria-label="Shift">⇧</button>
        {rows[2].map((c) => (
          <button key={c} className="kb-key" onPointerDown={(e) => press(e, () => typeChar(c))}>{label(c)}</button>
        ))}
        <button className="kb-key" onPointerDown={(e) => press(e, () => onKey({ text: symbols ? "*" : "," }))}>
          {symbols ? "*" : ","}
        </button>
        <button className="kb-key" onPointerDown={(e) => press(e, () => onKey({ text: symbols ? "=" : "." }))}>
          {symbols ? "=" : "."}
        </button>
      </div>
      <div className="kb-row">
        <button className="kb-key kb-fn kb-wide" onPointerDown={(e) => press(e, () => setSymbols((s) => !s))}>
          {symbols ? "ABC" : "?123"}
        </button>
        <button className="kb-key kb-fn" onPointerDown={(e) => press(e, () => onKey({ key: "Left" }))} aria-label="Left">‹</button>
        <button className="kb-key kb-space" onPointerDown={(e) => press(e, () => onKey({ text: " " }))}>space</button>
        <button className="kb-key kb-fn" onPointerDown={(e) => press(e, () => onKey({ key: "Right" }))} aria-label="Right">›</button>
        <button className="kb-key kb-fn kb-wide" onPointerDown={(e) => press(e, onClose)} aria-label="Hide keyboard">
          hide ⌄
        </button>
      </div>
    </div>
  );
}
