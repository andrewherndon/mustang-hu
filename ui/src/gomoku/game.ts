/**
 * Five in a row (gomoku), freestyle rules: players alternate placing X and O;
 * five or more of your marks in a straight line (horizontal, vertical or
 * diagonal) wins. The board is either a classic 15x15 or unbounded.
 */
export type Mark = "X" | "O";
export type Board = Map<string, Mark>;
export const key = (x: number, y: number) => `${x},${y}`;
export const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
export const CLASSIC = 15;

export function inBounds(x: number, y: number, infinite: boolean) {
  return infinite || (x >= 0 && y >= 0 && x < CLASSIC && y < CLASSIC);
}

/** The winning line through (x, y), if the mark there completes five or more. */
export function winningLine(board: Board, x: number, y: number): [number, number][] | null {
  const m = board.get(key(x, y));
  if (!m) return null;
  for (const [dx, dy] of DIRS) {
    const line: [number, number][] = [[x, y]];
    for (const s of [1, -1]) {
      let i = 1;
      while (board.get(key(x + s * dx * i, y + s * dy * i)) === m) {
        line.push([x + s * dx * i, y + s * dy * i]);
        i++;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

/* ---------------- computer opponent ----------------
 * Scores every empty cell near existing marks by the lines it would make for
 * itself (attack) and the lines it would block for the opponent (defense),
 * using the classic pattern values: five > open four > four/open three > ...
 */
function lineValue(count: number, openEnds: number) {
  if (count >= 5) return 1_000_000;
  if (openEnds === 0) return 0;
  const table: Record<number, [number, number]> = {
    4: [12_000, 100_000],    // [one end open, both ends open]
    3: [900, 12_000],
    2: [90, 900],
    1: [6, 40],
  };
  return table[count][openEnds - 1];
}

function scoreFor(board: Board, x: number, y: number, m: Mark, infinite: boolean) {
  let total = 0;
  for (const [dx, dy] of DIRS) {
    let count = 1;
    let open = 0;
    for (const s of [1, -1]) {
      let i = 1;
      while (board.get(key(x + s * dx * i, y + s * dy * i)) === m) { count++; i++; }
      const nx = x + s * dx * i, ny = y + s * dy * i;
      if (inBounds(nx, ny, infinite) && !board.has(key(nx, ny))) open++;
    }
    total += lineValue(count, open);
  }
  return total;
}

export function bestMove(board: Board, me: Mark, infinite: boolean): [number, number] {
  if (board.size === 0) return infinite ? [0, 0] : [7, 7];
  const them: Mark = me === "X" ? "O" : "X";
  const candidates = new Set<string>();
  for (const k of board.keys()) {
    const [cx, cy] = k.split(",").map(Number);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
      const x = cx + dx, y = cy + dy;
      if (inBounds(x, y, infinite) && !board.has(key(x, y))) candidates.add(key(x, y));
    }
  }
  let best: [number, number] = [0, 0];
  let bestScore = -1;
  for (const k of candidates) {
    const [x, y] = k.split(",").map(Number);
    const attack = scoreFor(board, x, y, me, infinite);
    const defense = scoreFor(board, x, y, them, infinite);
    // Prefer winning, then blocking a win, otherwise attack slightly over defense;
    // a tiny random term varies otherwise-equal games.
    const score = attack * 1.1 + defense + Math.random();
    if (score > bestScore) { bestScore = score; best = [x, y]; }
  }
  return best;
}
