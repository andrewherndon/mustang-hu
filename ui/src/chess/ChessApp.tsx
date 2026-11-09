import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Engine, LEVELS } from "./engine";

/**
 * Offline chess for the head unit: play Stockfish at six levels, or pass-and-
 * play with two people. Tap a piece then a square, or drag. Promotion picks a
 * queen. The game is saved on the device and resumes after a restart.
 */

type Mode = "engine" | "two";
interface Saved { fen: string; history: string[]; mode: Mode; color: "w" | "b"; level: number }
const KEY = "hu.chess";

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (s && typeof s.fen === "string") return s;
  } catch { /* first run or cleared */ }
  return { fen: new Chess().fen(), history: [], mode: "engine", color: "w", level: 2 };
}

export function ChessApp() {
  const initial = useMemo(load, []);
  // The game is rebuilt from its move list so undo and the move list work.
  const game = useRef(new Chess());
  const [history, setHistory] = useState<string[]>(initial.history);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [color, setColor] = useState<"w" | "b">(initial.color);
  const [level, setLevel] = useState(initial.level);
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const engine = useRef<Engine | null>(null);

  // Replay history into the game object.
  const fen = useMemo(() => {
    const g = new Chess();
    for (const san of history) g.move(san);
    game.current = g;
    return g.fen();
  }, [history]);
  const g = game.current;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ fen, history, mode, color, level } satisfies Saved));
    } catch { /* storage unavailable: just no resume */ }
  }, [fen, history, mode, color, level]);

  // Engine's turn.
  const engineTurn = mode === "engine" && !g.isGameOver() && g.turn() !== color;
  useEffect(() => {
    if (!engineTurn) return;
    engine.current ??= new Engine();
    let cancelled = false;
    setThinking(true);
    engine.current.bestMove(fen, LEVELS[level]).then((uci) => {
      if (cancelled) return;
      setThinking(false);
      const probe = new Chess(fen);
      const mv = probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
      if (mv) setHistory((h) => [...h, mv.san]);
    });
    return () => {
      cancelled = true;
      engine.current?.stop();
      setThinking(false);
    };
  }, [engineTurn, fen, level]);

  const canMove = !g.isGameOver() && (mode === "two" || g.turn() === color) && !thinking;

  const tryMove = (from: Square, to: Square) => {
    if (!canMove) return false;
    const probe = new Chess(fen);
    try {
      const mv = probe.move({ from, to, promotion: "q" });
      setHistory((h) => [...h, mv.san]);
      setSelected(null);
      return true;
    } catch {
      return false;
    }
  };

  const onSquare = (square: Square) => {
    const piece = g.get(square);
    if (selected && tryMove(selected, square)) return;
    if (piece && piece.color === g.turn() && canMove) setSelected(square === selected ? null : square);
    else setSelected(null);
  };

  // Highlights: last move, selected piece, its legal targets, king in check.
  const squareStyles: Record<string, React.CSSProperties> = {};
  const last = g.history({ verbose: true }).at(-1);
  if (last) {
    squareStyles[last.from] = { background: "rgba(255, 214, 102, 0.28)" };
    squareStyles[last.to] = { background: "rgba(255, 214, 102, 0.42)" };
  }
  if (selected) {
    squareStyles[selected] = { background: "rgba(120, 180, 255, 0.5)" };
    for (const m of g.moves({ square: selected, verbose: true })) {
      squareStyles[m.to] = m.captured
        ? { background: "radial-gradient(circle, transparent 58%, rgba(0,0,0,0.35) 60%)" }
        : { background: "radial-gradient(circle, rgba(0,0,0,0.3) 18%, transparent 20%)" };
    }
  }
  if (g.inCheck()) {
    const king = g.board().flat().find((p) => p && p.type === "k" && p.color === g.turn());
    if (king) squareStyles[king.square] = { background: "radial-gradient(circle, rgba(255,60,60,0.85) 25%, transparent 75%)" };
  }

  const status = g.isCheckmate()
    ? `Checkmate — ${g.turn() === "w" ? "Black" : "White"} wins`
    : g.isStalemate() ? "Stalemate"
    : g.isDraw() ? "Draw"
    : thinking ? "Stockfish is thinking…"
    : `${g.turn() === "w" ? "White" : "Black"} to move${g.inCheck() ? " — check" : ""}`;

  const newGame = (c = color, m = mode) => {
    engine.current?.stop();
    setSelected(null);
    setColor(c);
    setMode(m);
    setHistory([]);
  };

  const undo = () => {
    engine.current?.stop();
    setSelected(null);
    // Against the engine, take back your move and its reply.
    setHistory((h) => h.slice(0, mode === "engine" ? Math.max(0, h.length - (g.turn() === color ? 2 : 1)) : -1));
  };

  const pairs: string[][] = [];
  for (let i = 0; i < history.length; i += 2) pairs.push(history.slice(i, i + 2));

  return (
    <div className="chess">
      <div className="board">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: mode === "engine" ? (color === "w" ? "white" : "black") : "white",
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? tryMove(sourceSquare as Square, targetSquare as Square) : false,
            onSquareClick: ({ square }) => onSquare(square as Square),
            squareStyles,
            allowDragging: canMove,
            animationDurationInMs: 180,
            darkSquareStyle: { backgroundColor: "#6b7a8f" },
            lightSquareStyle: { backgroundColor: "#d9dee6" },
            boardStyle: { borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" },
          }}
        />
      </div>

      <aside className="panel">
        <div className="status">{status}</div>

        <div className="group">
          <div className="label">Opponent</div>
          <div className="seg">
            <button data-on={mode === "engine"} onClick={() => newGame(color, "engine")}>Stockfish</button>
            <button data-on={mode === "two"} onClick={() => newGame(color, "two")}>2 players</button>
          </div>
        </div>

        {mode === "engine" && (
          <>
            <div className="group">
              <div className="label">Level</div>
              <div className="levels">
                {LEVELS.map((l, i) => (
                  <button key={l.name} data-on={i === level} onClick={() => setLevel(i)}>{l.name}</button>
                ))}
              </div>
            </div>
            <div className="group">
              <div className="label">You play</div>
              <div className="seg">
                <button data-on={color === "w"} onClick={() => newGame("w")}>White</button>
                <button data-on={color === "b"} onClick={() => newGame("b")}>Black</button>
              </div>
            </div>
          </>
        )}

        <div className="moves">
          {pairs.map((p, i) => (
            <div key={i} className="move-row"><span>{i + 1}.</span><b>{p[0]}</b><b>{p[1] ?? ""}</b></div>
          ))}
        </div>

        <div className="actions">
          <button onClick={undo} disabled={history.length === 0}>Undo</button>
          <button onClick={() => newGame()}>New game</button>
        </div>
      </aside>
    </div>
  );
}
