import { useEffect, useMemo, useRef, useState } from "react";
import { bestMove, CLASSIC, inBounds, key, winningLine, type Board, type Mark } from "./game";

/**
 * Five in a row for the head unit. Classic 15x15 or an infinite board you pan
 * by dragging with one finger and zoom with the +/- buttons (two-finger
 * gestures don't reach apps in the slot). Play the computer or pass-and-play.
 * Drawn on a canvas so huge infinite games stay smooth. Saved on the device.
 */

type Opponent = "computer" | "two";
interface Saved { moves: [number, number][]; infinite: boolean; opponent: Opponent; you: Mark; cell: number }
const KEY = "hu.gomoku";
const MIN_CELL = 22, MAX_CELL = 110;
const COLORS = { X: "#5ab0ff", O: "#ff8a5c", grid: "rgba(255,255,255,0.12)", gridBold: "rgba(255,255,255,0.22)" };

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (s && Array.isArray(s.moves)) return s;
  } catch { /* first run */ }
  return { moves: [], infinite: true, opponent: "computer", you: "X", cell: 56 };
}

export function GomokuApp() {
  const initial = useMemo(load, []);
  const [moves, setMoves] = useState<[number, number][]>(initial.moves);
  const [infinite, setInfinite] = useState(initial.infinite);
  const [opponent, setOpponent] = useState<Opponent>(initial.opponent);
  const [you, setYou] = useState<Mark>(initial.you);
  const [cell, setCell] = useState(initial.cell);                // cell size in CSS px
  // View centre in cell coordinates (the board point shown in the canvas centre).
  const [center, setCenter] = useState<[number, number]>(() => initialCenter(initial.moves, initial.infinite));
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Derived game state.
  const board: Board = useMemo(() => {
    const b: Board = new Map();
    moves.forEach(([x, y], i) => b.set(key(x, y), i % 2 === 0 ? "X" : "O"));
    return b;
  }, [moves]);
  const last = moves.at(-1);
  const win = last ? winningLine(board, last[0], last[1]) : null;
  const turn: Mark = moves.length % 2 === 0 ? "X" : "O";
  const full = !infinite && moves.length >= CLASSIC * CLASSIC;
  const over = !!win || full;
  const computerTurn = opponent === "computer" && !over && turn !== you;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ moves, infinite, opponent, you, cell } satisfies Saved));
    } catch { /* no persistence */ }
  }, [moves, infinite, opponent, you, cell]);

  // Computer's move, after a short pause so it reads as a turn.
  useEffect(() => {
    if (!computerTurn) return;
    const t = window.setTimeout(() => setMoves((m) => [...m, bestMove(board, turn, infinite)]), 350);
    return () => window.clearTimeout(t);
  }, [computerTurn, board, turn, infinite]);

  // Keep the computer's move in view on the infinite board.
  useEffect(() => {
    if (!last || !infinite || !wrap.current) return;
    const { width, height } = wrap.current.getBoundingClientRect();
    const halfW = width / cell / 2 - 1, halfH = height / cell / 2 - 1;
    setCenter(([cx, cy]) => [
      Math.abs(last[0] - cx) > halfW ? last[0] : cx,
      Math.abs(last[1] - cy) > halfH ? last[1] : cy,
    ]);
  }, [last, infinite, cell]);

  // ---------- drawing ----------
  useEffect(() => {
    const el = canvas.current, box = wrap.current;
    if (!el || !box) return;
    const draw = () => {
      const { width, height } = box.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (el.width !== Math.round(width * dpr)) { el.width = Math.round(width * dpr); el.height = Math.round(height * dpr); }
      const ctx = el.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const toScreen = (x: number, y: number): [number, number] =>
        [width / 2 + (x - center[0]) * cell, height / 2 + (y - center[1]) * cell];
      // Visible cell range.
      const x0 = Math.floor(center[0] - width / cell / 2) - 1, x1 = Math.ceil(center[0] + width / cell / 2) + 1;
      const y0 = Math.floor(center[1] - height / cell / 2) - 1, y1 = Math.ceil(center[1] + height / cell / 2) + 1;
      const bx0 = infinite ? x0 : Math.max(x0, 0), bx1 = infinite ? x1 : Math.min(x1, CLASSIC);
      const by0 = infinite ? y0 : Math.max(y0, 0), by1 = infinite ? y1 : Math.min(y1, CLASSIC);

      if (!infinite) {           // classic board background
        const [ax, ay] = toScreen(0, 0);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.beginPath(); ctx.roundRect(ax, ay, CLASSIC * cell, CLASSIC * cell, 12); ctx.fill();
      }
      // Grid: cell borders; every 5th line a little brighter on the infinite board.
      ctx.lineWidth = 1;
      for (let x = bx0; x <= bx1; x++) {
        const [sx] = toScreen(x, 0);
        ctx.strokeStyle = infinite && x % 5 === 0 ? COLORS.gridBold : COLORS.grid;
        ctx.beginPath(); ctx.moveTo(Math.round(sx) + 0.5, toScreen(0, by0)[1]); ctx.lineTo(Math.round(sx) + 0.5, toScreen(0, by1)[1]); ctx.stroke();
      }
      for (let y = by0; y <= by1; y++) {
        const [, sy] = toScreen(0, y);
        ctx.strokeStyle = infinite && y % 5 === 0 ? COLORS.gridBold : COLORS.grid;
        ctx.beginPath(); ctx.moveTo(toScreen(bx0, 0)[0], Math.round(sy) + 0.5); ctx.lineTo(toScreen(bx1, 0)[0], Math.round(sy) + 0.5); ctx.stroke();
      }

      // Marks.
      const pad = cell * 0.22;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2.5, cell * 0.1);
      for (const [k, m] of board) {
        const [x, y] = k.split(",").map(Number);
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const [sx, sy] = toScreen(x, y);
        ctx.strokeStyle = COLORS[m];
        ctx.beginPath();
        if (m === "X") {
          ctx.moveTo(sx + pad, sy + pad); ctx.lineTo(sx + cell - pad, sy + cell - pad);
          ctx.moveTo(sx + cell - pad, sy + pad); ctx.lineTo(sx + pad, sy + cell - pad);
        } else {
          ctx.arc(sx + cell / 2, sy + cell / 2, cell / 2 - pad, 0, Math.PI * 2);
        }
        ctx.stroke();
      }
      // Last move marker.
      if (last) {
        const [sx, sy] = toScreen(last[0], last[1]);
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(sx + 1, sy + 1, cell - 1, cell - 1);
      }
      // Winning line.
      if (win) {
        const pts = [...win].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const [ax, ay] = toScreen(pts[0][0] + 0.5, pts[0][1] + 0.5);
        const [bx, by] = toScreen(pts.at(-1)![0] + 0.5, pts.at(-1)![1] + 0.5);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = Math.max(4, cell * 0.14);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [board, center, cell, infinite, last, win]);

  // ---------- input: one-finger drag pans, a tap places a mark ----------
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, cx: center[0], cy: center[1], moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 10) return;   // still a tap
    d.moved = true;
    setCenter([d.cx - dx / cell, d.cy - dy / cell]);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || over || computerTurn) return;
    const r = wrap.current!.getBoundingClientRect();
    const x = Math.floor(center[0] + (e.clientX - r.left - r.width / 2) / cell);
    const y = Math.floor(center[1] + (e.clientY - r.top - r.height / 2) / cell);
    if (!inBounds(x, y, infinite) || board.has(key(x, y))) return;
    setMoves((m) => [...m, [x, y]]);
  };

  const zoom = (f: number) => setCell((c) => Math.round(Math.min(MAX_CELL, Math.max(MIN_CELL, c * f))));
  const recenter = () => setCenter(initialCenter(moves, infinite));

  const newGame = (inf = infinite, opp = opponent, me = you) => {
    setInfinite(inf); setOpponent(opp); setYou(me);
    setMoves([]);
    setCenter(initialCenter([], inf));
  };
  const undo = () => setMoves((m) => m.slice(0, opponent === "computer" ? Math.max(0, m.length - (turn === you ? 2 : 1)) : -1));

  const status = win
    ? `${board.get(key(last![0], last![1]))} wins — five in a row!`
    : full ? "Draw — the board is full"
    : computerTurn ? "Computer is thinking…"
    : opponent === "computer" ? `Your move (${you})` : `${turn} to move`;

  return (
    <div className="gomoku">
      <div className="gboard" ref={wrap} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
           onPointerCancel={() => (drag.current = null)}
           onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)}>
        <canvas ref={canvas} />
        <div className="zoom" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <button onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
          <button onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">−</button>
          <button onClick={recenter} aria-label="Recenter">◎</button>
        </div>
      </div>

      <aside className="panel">
        <div className="status">{status}</div>
        <div className="group">
          <div className="label">Board</div>
          <div className="seg">
            <button data-on={infinite} onClick={() => newGame(true)}>Infinite</button>
            <button data-on={!infinite} onClick={() => newGame(false)}>Classic 15×15</button>
          </div>
        </div>
        <div className="group">
          <div className="label">Opponent</div>
          <div className="seg">
            <button data-on={opponent === "computer"} onClick={() => newGame(infinite, "computer")}>Computer</button>
            <button data-on={opponent === "two"} onClick={() => newGame(infinite, "two")}>2 players</button>
          </div>
        </div>
        {opponent === "computer" && (
          <div className="group">
            <div className="label">You play</div>
            <div className="seg">
              <button data-on={you === "X"} onClick={() => newGame(infinite, opponent, "X")}>X (first)</button>
              <button data-on={you === "O"} onClick={() => newGame(infinite, opponent, "O")}>O</button>
            </div>
          </div>
        )}
        <div className="rules">
          Take turns placing marks. Get <b>five in a row</b> — across, down or diagonal — to win.
          {infinite && <> Drag to move around; use + and − to zoom.</>}
        </div>
        <div className="actions">
          <button onClick={undo} disabled={moves.length === 0}>Undo</button>
          <button onClick={() => newGame()}>New game</button>
        </div>
      </aside>
    </div>
  );
}

/** Centre on the middle of the classic board, or of the marks played so far. */
function initialCenter(moves: [number, number][], infinite: boolean): [number, number] {
  if (!infinite) return [CLASSIC / 2, CLASSIC / 2];
  if (moves.length === 0) return [0.5, 0.5];
  const xs = moves.map((m) => m[0]), ys = moves.map((m) => m[1]);
  return [(Math.min(...xs) + Math.max(...xs) + 1) / 2, (Math.min(...ys) + Math.max(...ys) + 1) / 2];
}
