/**
 * Stockfish 19 (lite, single-threaded WebAssembly) in a Web Worker, so the
 * board never stutters while it thinks. Files: public/chess/engine/ (GPL-3,
 * from the `stockfish` npm package). Speaks UCI.
 */
export interface Level {
  name: string;
  skill: number;     // Stockfish "Skill Level" 0..20
  movetime: number;  // ms per move
}

export const LEVELS: Level[] = [
  { name: "Beginner", skill: 0, movetime: 150 },
  { name: "Casual", skill: 3, movetime: 250 },
  { name: "Club", skill: 7, movetime: 400 },
  { name: "Strong", skill: 12, movetime: 700 },
  { name: "Expert", skill: 17, movetime: 1000 },
  { name: "Max", skill: 20, movetime: 1500 },
];

export class Engine {
  private worker: Worker;
  private ready: Promise<void>;
  private pending: ((move: string) => void) | null = null;

  constructor() {
    this.worker = new Worker("/chess/engine/stockfish-19-lite-single.js");
    let resolveReady!: () => void;
    this.ready = new Promise((r) => (resolveReady = r));
    this.worker.onmessage = (e: MessageEvent<string>) => {
      const line = String(e.data);
      if (line === "readyok") resolveReady();
      const m = /^bestmove (\S+)/.exec(line);
      if (m && this.pending) {
        const done = this.pending;
        this.pending = null;
        done(m[1]);
      }
    };
    this.worker.postMessage("uci");
    this.worker.postMessage("isready");
  }

  /** Best move (UCI, e.g. "e7e5" or "e7e8q") for the position at this level. */
  async bestMove(fen: string, level: Level): Promise<string> {
    await this.ready;
    this.stop();
    return new Promise((resolve) => {
      this.pending = resolve;
      this.worker.postMessage(`setoption name Skill Level value ${level.skill}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go movetime ${level.movetime}`);
    });
  }

  /** Abandon a search in progress (its result is ignored). */
  stop() {
    if (this.pending) {
      this.pending = null;
      this.worker.postMessage("stop");
    }
  }
}
