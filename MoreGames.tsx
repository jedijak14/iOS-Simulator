import { useEffect, useReducer, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { sfx } from "../os/sound";
import { useOS } from "../os/store";

/* ================================================================== */
/* Minesweeper                                                        */
/* ================================================================== */

const MS_SIZE = 9;
const MS_MINES = 10;

type MSCell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type MSState = {
  grid: MSCell[][];
  status: "ready" | "playing" | "won" | "lost";
  flags: number;
  startedAt: number | null;
  seconds: number;
};

type MSAction =
  | { t: "reveal"; x: number; y: number }
  | { t: "flag"; x: number; y: number }
  | { t: "tick" }
  | { t: "reset" };

const MS_COLORS: Record<number, string> = {
  1: "#0a84ff",
  2: "#34c759",
  3: "#ff453a",
  4: "#5e5ce6",
  5: "#ff9f0a",
  6: "#64d2ff",
  7: "#ff375f",
  8: "#8e8e93",
};

function msEmptyGrid(): MSCell[][] {
  return Array.from({ length: MS_SIZE }, () =>
    Array.from({ length: MS_SIZE }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );
}

function msInit(): MSState {
  return { grid: msEmptyGrid(), status: "ready", flags: 0, startedAt: null, seconds: 0 };
}

function msPlaceMines(grid: MSCell[][], safeX: number, safeY: number): MSCell[][] {
  const g = grid.map((r) => r.map((c) => ({ ...c })));
  const cells: [number, number][] = [];
  for (let y = 0; y < MS_SIZE; y++) {
    for (let x = 0; x < MS_SIZE; x++) {
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
      cells.push([x, y]);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < MS_MINES && i < cells.length; i++) {
    const [x, y] = cells[i];
    g[y][x].mine = true;
  }
  for (let y = 0; y < MS_SIZE; y++) {
    for (let x = 0; x < MS_SIZE; x++) {
      if (g[y][x].mine) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= MS_SIZE || ny >= MS_SIZE) continue;
          if (g[ny][nx].mine) n++;
        }
      }
      g[y][x].adjacent = n;
    }
  }
  return g;
}

function msFlood(grid: MSCell[][], x: number, y: number): MSCell[][] {
  const g = grid.map((r) => r.map((c) => ({ ...c })));
  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop() as [number, number];
    const cell = g[cy][cx];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= MS_SIZE || ny >= MS_SIZE) continue;
          if (!g[ny][nx].revealed && !g[ny][nx].flagged) stack.push([nx, ny]);
        }
      }
    }
  }
  return g;
}

function msReducer(s: MSState, a: MSAction): MSState {
  switch (a.t) {
    case "reset":
      return msInit();
    case "tick": {
      if (s.status !== "playing" || s.startedAt === null) return s;
      const ns = Math.min(999, Math.floor((Date.now() - s.startedAt) / 1000));
      return ns === s.seconds ? s : { ...s, seconds: ns };
    }
    case "flag": {
      if (s.status === "won" || s.status === "lost") return s;
      const cell = s.grid[a.y][a.x];
      if (cell.revealed) return s;
      const g = s.grid.map((r) => r.map((c) => ({ ...c })));
      g[a.y][a.x].flagged = !g[a.y][a.x].flagged;
      return { ...s, grid: g, flags: s.flags + (g[a.y][a.x].flagged ? 1 : -1) };
    }
    case "reveal": {
      if (s.status === "won" || s.status === "lost") return s;
      const cell = s.grid[a.y][a.x];
      if (cell.revealed || cell.flagged) return s;
      let grid = s.grid;
      let startedAt = s.startedAt;
      let status: MSState["status"] = s.status;
      if (s.status === "ready") {
        grid = msPlaceMines(s.grid, a.x, a.y);
        startedAt = Date.now();
        status = "playing";
      }
      const target = grid[a.y][a.x];
      if (target.mine) {
        const g = grid.map((r) => r.map((c) => ({ ...c })));
        for (const row of g) for (const c of row) if (c.mine) c.revealed = true;
        return { ...s, grid: g, status: "lost", startedAt };
      }
      const revealed = msFlood(grid, a.x, a.y);
      let unrevealed = 0;
      for (const row of revealed) for (const c of row) if (!c.revealed && !c.mine) unrevealed++;
      return { ...s, grid: revealed, status: unrevealed === 0 ? "won" : status, startedAt };
    }
  }
}

export function MinesweeperApp() {
  const [state, dispatch] = useReducer(msReducer, undefined, msInit);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    if (state.status !== "playing" || state.startedAt === null) return;
    const id = window.setInterval(() => dispatch({ t: "tick" }), 500);
    return () => window.clearInterval(id);
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (state.status === "won") sfx.success();
    else if (state.status === "lost") sfx.error();
  }, [state.status]);

  const reveal = (x: number, y: number) => {
    const cell = state.grid[y][x];
    if (cell.flagged || cell.revealed) return;
    if (state.status === "playing" && cell.mine) sfx.error();
    else sfx.tick();
    dispatch({ t: "reveal", x, y });
  };

  const flag = (x: number, y: number) => {
    if (state.status === "won" || state.status === "lost") return;
    const cell = state.grid[y][x];
    if (cell.revealed) return;
    sfx.pop();
    dispatch({ t: "flag", x, y });
  };

  const onCellDown = (x: number, y: number) => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      flag(x, y);
    }, 350);
  };

  const onCellUp = (x: number, y: number) => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!longPressed.current) reveal(x, y);
  };

  const onCellLeave = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const reset = () => {
    sfx.pop();
    dispatch({ t: "reset" });
  };

  const face = state.status === "won" ? "😎" : state.status === "lost" ? "😣" : "🙂";
  const minesLeft = MS_MINES - state.flags;

  return (
    <div
      className="relative flex h-full flex-col bg-black px-4 text-white"
      style={{ paddingTop: "calc(var(--safe-top) + 14px)", paddingBottom: "calc(var(--safe-bottom) + 14px)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[28px] font-bold">Minesweeper</div>
        <button onClick={reset} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold active:bg-white/20">
          <RotateCcw size={14} /> New
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-[360px] items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1.5 font-mono text-[22px] font-bold text-[#ff453a]">
          <span>💣</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(Math.max(0, minesLeft)).padStart(3, "0")}</span>
        </div>
        <button
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[28px] active:scale-95"
        >
          {face}
        </button>
        <div className="flex items-center gap-1.5 font-mono text-[22px] font-bold text-[#ff453a]">
          <span>⏱</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(state.seconds).padStart(3, "0")}</span>
        </div>
      </div>
      <div
        className="mx-auto mt-4 grid w-full max-w-[360px] touch-none gap-1 rounded-xl bg-white/5 p-2"
        style={{ gridTemplateColumns: `repeat(${MS_SIZE}, 1fr)` }}
      >
        {state.grid.flatMap((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onPointerDown={() => onCellDown(x, y)}
              onPointerUp={() => onCellUp(x, y)}
              onPointerLeave={onCellLeave}
              onContextMenu={(e) => {
                e.preventDefault();
                flag(x, y);
              }}
              className={`flex aspect-square items-center justify-center rounded text-[18px] font-bold ${
                cell.revealed
                  ? cell.mine
                    ? "bg-[#ff453a]/40"
                    : "bg-white/5"
                  : "bg-white/15 active:bg-white/25"
              }`}
              style={{
                color: cell.revealed && cell.adjacent > 0 ? MS_COLORS[cell.adjacent] : undefined,
              }}
            >
              {cell.revealed
                ? cell.mine
                  ? "💣"
                  : cell.adjacent > 0
                    ? cell.adjacent
                    : ""
                : cell.flagged
                  ? "🚩"
                  : ""}
            </button>
          )),
        )}
      </div>
      <div className="mt-auto pt-3 text-center text-[12px] text-white/50">
        Tap to reveal · Long-press or right-click to flag
      </div>
      {(state.status === "won" || state.status === "lost") && (
        <div className="fade-in absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur">
            <div className="text-[32px]">{state.status === "won" ? "🎉 You Win!" : "💥 Boom!"}</div>
            <div className="mt-2 text-[14px] text-white/70">
              Time: {state.seconds}s · Flags: {state.flags}
            </div>
            <button
              onClick={reset}
              className="mt-4 rounded-full bg-[#0a84ff] px-6 py-2 text-[16px] font-semibold active:opacity-80"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Solitaire (simplified Klondike)                                    */
/* ================================================================== */

type Suit = "♠" | "♥" | "♦" | "♣";

type SolCard = {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
};

type SolSource = { src: "waste" | "foundation" | "tableau"; col: number; idx: number };
type SolDest = { src: "foundation" | "tableau"; col: number };

type SolState = {
  stock: SolCard[];
  waste: SolCard[];
  foundations: SolCard[][];
  tableau: SolCard[][];
  selected: SolSource | null;
  moves: number;
  won: boolean;
};

type SolAction =
  | { t: "reset" }
  | { t: "draw" }
  | { t: "tap"; src: "stock" | "waste" | "foundation" | "tableau"; col: number; idx: number };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];

const isRed = (s: Suit): boolean => s === "♥" || s === "♦";

const rankStr = (r: number): string =>
  r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r);

function newDeck(): SolCard[] {
  const deck: SolCard[] = [];
  for (const s of SUITS) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ id: `${s}${r}`, suit: s, rank: r, faceUp: false });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solDeal(): SolState {
  const deck = shuffle(newDeck());
  const tableau: SolCard[][] = [[], [], [], [], [], [], []];
  let i = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const c = { ...deck[i++], faceUp: row === col };
      tableau[col].push(c);
    }
  }
  const stock = deck.slice(i).map((c) => ({ ...c, faceUp: false }));
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    selected: null,
    moves: 0,
    won: false,
  };
}

function canPlaceFoundation(card: SolCard, foundation: SolCard[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function canPlaceTableau(card: SolCard, column: SolCard[]): boolean {
  if (column.length === 0) return card.rank === 13;
  const top = column[column.length - 1];
  if (!top.faceUp) return false;
  return isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
}

function solTryMove(s: SolState, from: SolSource, to: SolDest): SolState | null {
  let moving: SolCard[] = [];
  const stock = s.stock;
  let waste = s.waste;
  let foundations = s.foundations.map((f) => [...f]);
  let tableau = s.tableau.map((c) => [...c]);

  if (from.src === "waste") {
    if (s.waste.length === 0) return null;
    moving = [s.waste[s.waste.length - 1]];
    waste = s.waste.slice(0, -1);
  } else if (from.src === "foundation") {
    if (s.foundations[from.col].length === 0) return null;
    moving = [s.foundations[from.col][s.foundations[from.col].length - 1]];
    foundations[from.col] = foundations[from.col].slice(0, -1);
  } else {
    const col = s.tableau[from.col];
    if (from.idx >= col.length) return null;
    moving = col.slice(from.idx);
    tableau[from.col] = col.slice(0, from.idx);
  }

  if (moving.length === 0) return null;
  if (moving.some((c) => !c.faceUp)) return null;

  if (to.src === "foundation") {
    if (moving.length !== 1) return null;
    if (!canPlaceFoundation(moving[0], foundations[to.col])) return null;
    foundations[to.col] = [...foundations[to.col], moving[0]];
  } else {
    if (!canPlaceTableau(moving[0], tableau[to.col])) return null;
    tableau[to.col] = [...tableau[to.col], ...moving];
  }

  if (from.src === "tableau") {
    const col = tableau[from.col];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
    }
  }

  const won = foundations.every((f) => f.length === 13);
  return { ...s, stock, waste, foundations, tableau, selected: null, moves: s.moves + 1, won };
}

function solSelect(s: SolState, src: "waste" | "foundation" | "tableau", col: number, idx: number): SolState {
  if (src === "waste") {
    if (s.waste.length === 0) return { ...s, selected: null };
    return { ...s, selected: { src: "waste", col: 0, idx: s.waste.length - 1 } };
  }
  if (src === "foundation") {
    if (s.foundations[col].length === 0) return { ...s, selected: null };
    return { ...s, selected: { src: "foundation", col, idx: s.foundations[col].length - 1 } };
  }
  const c = s.tableau[col];
  if (idx >= c.length || !c[idx].faceUp) return { ...s, selected: null };
  if (s.selected && s.selected.src === "tableau" && s.selected.col === col && s.selected.idx === idx) {
    return { ...s, selected: null };
  }
  return { ...s, selected: { src: "tableau", col, idx } };
}

function solDraw(s: SolState): SolState {
  const ss = { ...s, selected: null };
  if (ss.stock.length > 0) {
    const stock = [...ss.stock];
    const card = stock.pop() as SolCard;
    return { ...ss, stock, waste: [...ss.waste, { ...card, faceUp: true }] };
  }
  if (ss.waste.length === 0) return ss;
  const stock = ss.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
  return { ...ss, stock, waste: [] };
}

function solReducer(s: SolState, a: SolAction): SolState {
  switch (a.t) {
    case "reset":
      return solDeal();
    case "draw":
      return solDraw(s);
    case "tap": {
      if (s.won) return s;
      if (a.src === "stock") return solDraw(s);

      const card: SolCard | undefined =
        a.src === "waste"
          ? s.waste[s.waste.length - 1]
          : a.src === "foundation"
            ? s.foundations[a.col][s.foundations[a.col].length - 1]
            : s.tableau[a.col][a.idx];

      if (s.selected && a.src !== "waste") {
        const moved = solTryMove(s, s.selected, { src: a.src, col: a.col });
        if (moved) return moved;
      }

      if (s.selected && s.selected.src === a.src && s.selected.col === a.col && s.selected.idx === a.idx) {
        return { ...s, selected: null };
      }

      // Auto-foundation: if the tapped card is the top of its pile and can go to a foundation, send it.
      if (card && card.faceUp) {
        const isTop =
          a.src === "waste"
            ? s.waste.length > 0
            : a.src === "foundation"
              ? s.foundations[a.col].length > 0
              : a.idx === s.tableau[a.col].length - 1;
        if (isTop) {
          for (let f = 0; f < 4; f++) {
            if (canPlaceFoundation(card, s.foundations[f])) {
              const from: SolSource =
                a.src === "waste"
                  ? { src: "waste", col: 0, idx: s.waste.length - 1 }
                  : a.src === "foundation"
                    ? { src: "foundation", col: a.col, idx: s.foundations[a.col].length - 1 }
                    : { src: "tableau", col: a.col, idx: a.idx };
              const moved = solTryMove(s, from, { src: "foundation", col: f });
              if (moved) return moved;
            }
          }
        }
      }

      return solSelect(s, a.src, a.col, a.idx);
    }
  }
}

function CardSlot({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex aspect-[3/4] w-full items-center justify-center rounded-md bg-white/5"
    >
      {children}
    </button>
  );
}

function EmptySlot({ label }: { label: string }) {
  return <div className="text-[20px] text-white/20">{label}</div>;
}

function CardBack() {
  return (
    <div className="h-full w-full rounded-md bg-gradient-to-br from-[#5e5ce6] to-[#3a3a99] p-1">
      <div
        className="h-full w-full rounded opacity-30"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0 2px, transparent 2px 6px)" }}
      />
    </div>
  );
}

function CardFace({ card, selected }: { card: SolCard; selected?: boolean }) {
  const red = isRed(card.suit);
  const color = red ? "text-[#ff453a]" : "text-black";
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-md bg-white p-1 shadow ${
        selected ? "ring-2 ring-[#0a84ff]" : ""
      }`}
    >
      <div className={`flex flex-col items-center leading-none ${color}`}>
        <div className="text-[11px] font-bold leading-none">{rankStr(card.rank)}</div>
        <div className="text-[10px] leading-none">{card.suit}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center pt-3 text-[22px] ${color}`}>
        {card.suit}
      </div>
    </div>
  );
}

export function SolitaireApp() {
  const [state, dispatch] = useReducer(solReducer, undefined, solDeal);

  useEffect(() => {
    if (state.won) sfx.success();
  }, [state.won]);

  const newGame = () => {
    sfx.pop();
    dispatch({ t: "reset" });
  };

  const handleTap = (src: "stock" | "waste" | "foundation" | "tableau", col: number, idx: number) => {
    sfx.tick();
    dispatch({ t: "tap", src, col, idx });
  };

  return (
    <div
      className="relative flex h-full flex-col bg-black px-3 text-white"
      style={{ paddingTop: "calc(var(--safe-top) + 14px)", paddingBottom: "calc(var(--safe-bottom) + 14px)" }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="text-[24px] font-bold">Solitaire</div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-white/60">
            Moves: <span className="text-white">{state.moves}</span>
          </span>
          <button
            onClick={newGame}
            className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold active:bg-white/20"
          >
            <RotateCcw size={14} /> New
          </button>
        </div>
      </div>

      {/* Top row: stock, waste, foundations */}
      <div className="grid grid-cols-7 gap-1">
        <CardSlot onClick={() => handleTap("stock", 0, 0)}>
          {state.stock.length > 0 ? <CardBack /> : <EmptySlot label="↻" />}
          {state.stock.length > 0 && (
            <div className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white/70">
              {state.stock.length}
            </div>
          )}
        </CardSlot>
        <CardSlot
          onClick={() => {
            if (state.waste.length > 0) handleTap("waste", 0, state.waste.length - 1);
          }}
        >
          {state.waste.length > 0 && (
            <CardFace
              card={state.waste[state.waste.length - 1]}
              selected={state.selected?.src === "waste"}
            />
          )}
        </CardSlot>
        <div />
        {state.foundations.map((f, i) => (
          <CardSlot
            key={i}
            onClick={() => handleTap("foundation", i, Math.max(0, f.length - 1))}
          >
            {f.length > 0 ? (
              <CardFace
                card={f[f.length - 1]}
                selected={state.selected?.src === "foundation" && state.selected.col === i}
              />
            ) : (
              <EmptySlot label="A" />
            )}
          </CardSlot>
        ))}
      </div>

      {/* Tableau */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {state.tableau.map((col, ci) => (
          <div key={ci} className="relative min-h-[64px]">
            {col.length === 0 && (
              <CardSlot onClick={() => handleTap("tableau", ci, 0)} />
            )}
            {col.map((card, idx) => (
              <div
                key={card.id}
                style={{ marginTop: idx === 0 ? 0 : -42, height: 64 }}
                onClick={() => handleTap("tableau", ci, idx)}
              >
                {card.faceUp ? (
                  <CardFace
                    card={card}
                    selected={
                      state.selected?.src === "tableau" &&
                      state.selected.col === ci &&
                      state.selected.idx === idx
                    }
                  />
                ) : (
                  <CardBack />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 text-center text-[12px] text-white/50">
        Tap a card to send to foundation · Tap & tap destination to move
      </div>

      {state.won && (
        <div className="fade-in absolute inset-0 z-10 flex items-center justify-center bg-black/70">
          <div className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur">
            <div className="text-[32px]">🎉 You Win!</div>
            <div className="mt-2 text-[14px] text-white/70">Moves: {state.moves}</div>
            <button
              onClick={newGame}
              className="mt-4 rounded-full bg-[#0a84ff] px-6 py-2 text-[16px] font-semibold active:opacity-80"
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Memory                                                             */
/* ================================================================== */

type MemCard = { id: number; value: number; flipped: boolean; matched: boolean };
type MemState = {
  cards: MemCard[];
  first: number | null;
  second: number | null;
  moves: number;
  matched: number;
  startedAt: number | null;
  seconds: number;
  status: "ready" | "playing" | "won";
  lock: boolean;
};
type MemAction =
  | { t: "flip"; i: number }
  | { t: "resolve" }
  | { t: "reset" }
  | { t: "tick" };

const MEM_EMOJIS = ["🍎", "🚀", "🌟", "🎵", "🐱", "⚽", "🌈", "🍕"];

function memDeal(): MemState {
  const values: number[] = [];
  for (let i = 0; i < 8; i++) values.push(i, i);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return {
    cards: values.map((v, i) => ({ id: i, value: v, flipped: false, matched: false })),
    first: null,
    second: null,
    moves: 0,
    matched: 0,
    startedAt: null,
    seconds: 0,
    status: "ready",
    lock: false,
  };
}

function memReducer(s: MemState, a: MemAction): MemState {
  switch (a.t) {
    case "reset":
      return memDeal();
    case "tick": {
      if (s.status !== "playing" || s.startedAt === null) return s;
      const ns = Math.floor((Date.now() - s.startedAt) / 1000);
      return ns === s.seconds ? s : { ...s, seconds: ns };
    }
    case "flip": {
      if (s.lock || s.status === "won") return s;
      if (a.i < 0 || a.i >= s.cards.length) return s;
      const c = s.cards[a.i];
      if (c.flipped || c.matched) return s;
      const cards = s.cards.map((card, idx) => (idx === a.i ? { ...card, flipped: true } : card));
      let first = s.first;
      let second = s.second;
      let status = s.status;
      let startedAt = s.startedAt;
      if (s.first === null) {
        first = a.i;
        if (status === "ready") {
          status = "playing";
          startedAt = Date.now();
        }
      } else {
        second = a.i;
      }
      return { ...s, cards, first, second, status, startedAt, lock: second !== null };
    }
    case "resolve": {
      if (s.first === null || s.second === null) return s;
      const a = s.cards[s.first];
      const b = s.cards[s.second];
      const matched = a.value === b.value;
      const cards = s.cards.map((card, idx) => {
        if (idx === s.first || idx === s.second) {
          return matched ? { ...card, matched: true, flipped: true } : { ...card, flipped: false };
        }
        return card;
      });
      const newMatched = matched ? s.matched + 1 : s.matched;
      const moves = s.moves + 1;
      const won = newMatched === 8;
      return {
        ...s,
        cards,
        first: null,
        second: null,
        matched: newMatched,
        moves,
        status: won ? "won" : s.status,
        lock: false,
      };
    }
  }
}

export function MemoryApp() {
  const [state, dispatch] = useReducer(memReducer, undefined, memDeal);

  useEffect(() => {
    if (state.status !== "playing" || state.startedAt === null) return;
    const id = window.setInterval(() => dispatch({ t: "tick" }), 500);
    return () => window.clearInterval(id);
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (!state.lock) return;
    const id = window.setTimeout(() => dispatch({ t: "resolve" }), 800);
    return () => window.clearTimeout(id);
  }, [state.lock]);

  useEffect(() => {
    if (state.status === "won") sfx.success();
  }, [state.status]);

  const flip = (i: number) => {
    if (state.lock || state.status === "won") return;
    const c = state.cards[i];
    if (c.flipped || c.matched) return;
    // Second flip — play match / mismatch sound immediately.
    if (state.first !== null) {
      const firstCard = state.cards[state.first];
      if (firstCard.value === c.value) sfx.success();
      else sfx.pop();
    } else {
      sfx.tick();
    }
    dispatch({ t: "flip", i });
  };

  const reset = () => {
    sfx.pop();
    dispatch({ t: "reset" });
  };

  return (
    <div
      className="relative flex h-full flex-col bg-black px-4 text-white"
      style={{ paddingTop: "calc(var(--safe-top) + 14px)", paddingBottom: "calc(var(--safe-bottom) + 14px)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[28px] font-bold">Memory</div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold active:bg-white/20"
        >
          <RotateCcw size={14} /> New
        </button>
      </div>
      <div className="mb-3 flex justify-around rounded-xl bg-white/5 py-2 text-[14px]">
        <div>
          <span className="text-white/50">Moves:</span> <span className="font-bold">{state.moves}</span>
        </div>
        <div>
          <span className="text-white/50">Pairs:</span>{" "}
          <span className="font-bold">{state.matched}/8</span>
        </div>
        <div>
          <span className="text-white/50">Time:</span>{" "}
          <span className="font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {state.seconds}s
          </span>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[360px] grid-cols-4 gap-2">
        {state.cards.map((card, i) => {
          const show = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => flip(i)}
              className={`flex aspect-square items-center justify-center rounded-xl text-[32px] transition-all ${
                show
                  ? card.matched
                    ? "bg-[#34c759]/30"
                    : "bg-white/15"
                  : "bg-white/10 active:bg-white/20"
              }`}
            >
              {show ? MEM_EMOJIS[card.value] : ""}
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-3 text-center text-[12px] text-white/50">Match all 8 pairs to win</div>
      {state.status === "won" && (
        <div className="fade-in absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur">
            <div className="text-[32px]">🎉 You Win!</div>
            <div className="mt-2 text-[14px] text-white/70">
              {state.moves} moves · {state.seconds}s
            </div>
            <button
              onClick={reset}
              className="mt-4 rounded-full bg-[#0a84ff] px-6 py-2 text-[16px] font-semibold active:opacity-80"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Tic-Tac-Toe                                                        */
/* ================================================================== */

type TTTMark = "X" | "O" | null;
type TTTStatus = "playing" | "X" | "O" | "draw";
type TTTState = {
  board: TTTMark[];
  turn: "X" | "O";
  status: TTTStatus;
  scores: { X: number; O: number; draws: number };
  difficulty: "easy" | "hard";
};
type TTTAction =
  | { t: "play"; i: number }
  | { t: "reset" }
  | { t: "resetScores" }
  | { t: "difficulty"; d: "easy" | "hard" };

const TTT_LINES: readonly [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function tttWinner(board: TTTMark[]): TTTStatus {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as "X" | "O";
  }
  if (board.every((c) => c !== null)) return "draw";
  return "playing";
}

function tttInit(): TTTState {
  return {
    board: Array(9).fill(null),
    turn: "X",
    status: "playing",
    scores: { X: 0, O: 0, draws: 0 },
    difficulty: "hard",
  };
}

function tttReducer(s: TTTState, a: TTTAction): TTTState {
  switch (a.t) {
    case "reset":
      return { ...s, board: Array(9).fill(null), turn: "X", status: "playing" };
    case "resetScores":
      return { ...s, scores: { X: 0, O: 0, draws: 0 } };
    case "difficulty":
      return { ...s, difficulty: a.d };
    case "play": {
      if (s.status !== "playing") return s;
      if (a.i < 0 || a.i >= 9 || s.board[a.i] !== null) return s;
      const board = [...s.board];
      board[a.i] = s.turn;
      const status = tttWinner(board);
      if (status === "draw")
        return { ...s, board, status, scores: { ...s.scores, draws: s.scores.draws + 1 } };
      if (status === "X" || status === "O")
        return { ...s, board, status, scores: { ...s.scores, [status]: s.scores[status] + 1 } };
      return { ...s, board, turn: s.turn === "X" ? "O" : "X" };
    }
  }
}

function tttMinimax(board: TTTMark[], player: "X" | "O", ai: "X" | "O"): number {
  const winner = tttWinner(board);
  if (winner === ai) return 10;
  if (winner && winner !== "draw") return -10;
  if (winner === "draw") return 0;
  const scores: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const nb = [...board];
      nb[i] = player;
      scores.push(tttMinimax(nb, player === "X" ? "O" : "X", ai));
    }
  }
  return player === ai ? Math.max(...scores) : Math.min(...scores);
}

function tttBestMove(board: TTTMark[], ai: "X" | "O"): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const nb = [...board];
      nb[i] = ai;
      const score = tttMinimax(nb, ai === "X" ? "O" : "X", ai);
      if (score > best) {
        best = score;
        move = i;
      }
    }
  }
  return move;
}

function tttRandomMove(board: TTTMark[]): number {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) if (board[i] === null) empty.push(i);
  if (empty.length === 0) return -1;
  return empty[Math.floor(Math.random() * empty.length)];
}

export function TicTacToeApp() {
  const [state, dispatch] = useReducer(tttReducer, undefined, tttInit);

  // AI move
  useEffect(() => {
    if (state.status !== "playing" || state.turn !== "O") return;
    const id = window.setTimeout(() => {
      const move =
        state.difficulty === "hard" ? tttBestMove(state.board, "O") : tttRandomMove(state.board);
      if (move >= 0) {
        sfx.tock();
        dispatch({ t: "play", i: move });
      }
    }, 450);
    return () => window.clearTimeout(id);
  }, [state.status, state.turn, state.board, state.difficulty]);

  // Status sounds
  useEffect(() => {
    if (state.status === "X") sfx.success();
    else if (state.status === "O") sfx.error();
    else if (state.status === "draw") sfx.pop();
  }, [state.status]);

  const play = (i: number) => {
    if (state.status !== "playing" || state.turn !== "X") return;
    if (state.board[i] !== null) return;
    sfx.tick();
    dispatch({ t: "play", i });
  };

  const reset = () => {
    sfx.pop();
    dispatch({ t: "reset" });
  };

  const resetScores = () => {
    sfx.pop();
    dispatch({ t: "resetScores" });
    dispatch({ t: "reset" });
  };

  const winLine =
    state.status === "X" || state.status === "O"
      ? TTT_LINES.find(
          ([a, b, c]) =>
            state.board[a] !== null && state.board[a] === state.board[b] && state.board[a] === state.board[c],
        )
      : undefined;

  const scoreRows: { label: string; key: "X" | "O" | "draws" }[] = [
    { label: "You (X)", key: "X" },
    { label: "Draws", key: "draws" },
    { label: "AI (O)", key: "O" },
  ];

  return (
    <div
      className="relative flex h-full flex-col bg-black px-4 text-white"
      style={{ paddingTop: "calc(var(--safe-top) + 14px)", paddingBottom: "calc(var(--safe-bottom) + 14px)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[28px] font-bold">Tic-Tac-Toe</div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold active:bg-white/20"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="mb-3 flex rounded-xl bg-white/5 p-1">
        {(["easy", "hard"] as const).map((d) => (
          <button
            key={d}
            onClick={() => {
              sfx.pop();
              dispatch({ t: "difficulty", d });
            }}
            className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold ${
              state.difficulty === d ? "bg-[#0a84ff]" : "text-white/60"
            }`}
          >
            {d === "hard" ? "Unbeatable" : "Easy"}
          </button>
        ))}
      </div>

      <div className="mb-3 text-center text-[16px] font-semibold h-6">
        {state.status === "playing"
          ? state.turn === "X"
            ? "Your turn (X)"
            : "AI thinking…"
          : state.status === "X"
            ? "🎉 You win!"
            : state.status === "O"
              ? "💀 AI wins!"
              : "🤝 Draw"}
      </div>

      <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-2">
        {state.board.map((mark, i) => {
          const isWin = winLine?.includes(i) ?? false;
          return (
            <button
              key={i}
              onClick={() => play(i)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-[44px] font-bold ${
                isWin ? "bg-[#34c759]/40" : "bg-white/10 active:bg-white/20"
              } ${mark === "X" ? "text-[#0a84ff]" : mark === "O" ? "text-[#ff453a]" : ""}`}
            >
              {mark}
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="mb-2 grid grid-cols-3 gap-2">
          {scoreRows.map((row) => (
            <div key={row.key} className="rounded-xl bg-white/5 py-2 text-center">
              <div className="text-[11px] text-white/50">{row.label}</div>
              <div className="text-[22px] font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {state.scores[row.key]}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={resetScores}
          className="w-full rounded-xl bg-white/5 py-2 text-[13px] font-semibold text-white/70 active:bg-white/10"
        >
          Reset Scores
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Flappy Bird                                                        */
/* ================================================================== */

const FB_W = 360;
const FB_H = 540;
const FB_BIRD_X = 90;
const FB_GRAVITY = 0.45;
const FB_FLAP = -7.5;
const FB_PIPE_W = 60;
const FB_GAP = 150;
const FB_SPEED = 2.4;
const FB_SPAWN_MS = 1500;

export function FlappyBirdApp() {
  const fg = useOS((s) => s.foreground) === "flappybird";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => +(localStorage.getItem("ios-sim-flappy") ?? 0));
  const [status, setStatus] = useState<"ready" | "playing" | "dead">("ready");

  const birdY = useRef(FB_H / 2);
  const birdV = useRef(0);
  const pipes = useRef<{ x: number; gapY: number; passed: boolean }[]>([]);
  const lastSpawn = useRef(0);
  const statusRef = useRef<"ready" | "playing" | "dead">("ready");
  const scoreRef = useRef(0);
  const fgRef = useRef(fg);

  useEffect(() => {
    fgRef.current = fg;
  }, [fg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext("2d");
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const die = () => {
    if (statusRef.current !== "playing") return;
    statusRef.current = "dead";
    setStatus("dead");
    sfx.error();
    setBest((b) => {
      const nb = Math.max(b, scoreRef.current);
      localStorage.setItem("ios-sim-flappy", String(nb));
      return nb;
    });
  };

  const flap = () => {
    if (statusRef.current === "ready") {
      statusRef.current = "playing";
      setStatus("playing");
      birdV.current = FB_FLAP;
      sfx.pop();
    } else if (statusRef.current === "playing") {
      birdV.current = FB_FLAP;
      sfx.pop();
    } else {
      // dead — restart and immediately start playing
      birdY.current = FB_H / 2;
      pipes.current = [];
      lastSpawn.current = 0;
      scoreRef.current = 0;
      setScore(0);
      statusRef.current = "playing";
      setStatus("playing");
      birdV.current = FB_FLAP;
      sfx.pop();
    }
  };

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const draw = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      // Sky background
      const grad = ctx.createLinearGradient(0, 0, 0, FB_H);
      grad.addColorStop(0, "#0b1026");
      grad.addColorStop(1, "#1a1f3a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, FB_W, FB_H);

      // Distant stars
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 30; i++) {
        const sx = (i * 73) % FB_W;
        const sy = (i * 137) % (FB_H - 80);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Pipes
      for (const p of pipes.current) {
        // Top pipe body
        ctx.fillStyle = "#34c759";
        ctx.fillRect(p.x, 0, FB_PIPE_W, p.gapY);
        ctx.fillRect(p.x, p.gapY + FB_GAP, FB_PIPE_W, FB_H - p.gapY - FB_GAP);
        // Pipe shading
        ctx.fillStyle = "#1f8a3b";
        ctx.fillRect(p.x + FB_PIPE_W - 7, 0, 7, p.gapY);
        ctx.fillRect(p.x + FB_PIPE_W - 7, p.gapY + FB_GAP, 7, FB_H - p.gapY - FB_GAP);
        // Pipe lips
        ctx.fillStyle = "#2fa94e";
        ctx.fillRect(p.x - 4, p.gapY - 16, FB_PIPE_W + 8, 16);
        ctx.fillRect(p.x - 4, p.gapY + FB_GAP, FB_PIPE_W + 8, 16);
      }

      // Ground
      ctx.fillStyle = "#262b4a";
      ctx.fillRect(0, FB_H - 12, FB_W, 12);
      ctx.fillStyle = "#34c759";
      ctx.fillRect(0, FB_H - 14, FB_W, 2);

      // Bird
      const y = birdY.current;
      ctx.save();
      ctx.translate(FB_BIRD_X, y);
      const tilt = Math.max(-0.4, Math.min(1.2, birdV.current / 10));
      ctx.rotate(tilt);
      // Body
      ctx.fillStyle = "#ffd60a";
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      // Wing
      ctx.fillStyle = "#ff9f0a";
      ctx.beginPath();
      ctx.ellipse(-3, 3, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(7, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#ff6b00";
      ctx.beginPath();
      ctx.moveTo(10, 1);
      ctx.lineTo(17, 0);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const loop = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      const f = dt / 16;

      if (statusRef.current === "playing" && fgRef.current) {
        birdV.current += FB_GRAVITY * f;
        birdY.current += birdV.current * f;

        if (t - lastSpawn.current > FB_SPAWN_MS) {
          lastSpawn.current = t;
          const gapY = 60 + Math.random() * (FB_H - 120 - FB_GAP);
          pipes.current.push({ x: FB_W, gapY, passed: false });
        }

        for (const p of pipes.current) p.x -= FB_SPEED * f;
        pipes.current = pipes.current.filter((p) => p.x + FB_PIPE_W > -10);

        for (const p of pipes.current) {
          if (!p.passed && p.x + FB_PIPE_W < FB_BIRD_X) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            sfx.tick();
          }
        }

        // Collision: ground/ceiling
        if (birdY.current < 12 || birdY.current > FB_H - 18) {
          die();
        }
        // Collision: pipes
        for (const p of pipes.current) {
          if (FB_BIRD_X + 12 > p.x && FB_BIRD_X - 12 < p.x + FB_PIPE_W) {
            if (birdY.current - 12 < p.gapY || birdY.current + 12 > p.gapY + FB_GAP) {
              die();
              break;
            }
          }
        }
      }

      draw();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fg]);

  // Keyboard
  useEffect(() => {
    if (!fg) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fg]);

  return (
    <div
      className="flex h-full flex-col bg-black text-white"
      style={{ paddingTop: "calc(var(--safe-top) + 8px)", paddingBottom: "calc(var(--safe-bottom) + 8px)" }}
    >
      <div className="mb-1 flex items-center justify-between px-4">
        <div className="text-[24px] font-bold">Flappy Bird</div>
        <div className="text-[13px] text-white/60">
          Best: <span className="font-bold text-white">{best}</span>
        </div>
      </div>
      <div className="relative mx-auto w-full max-w-[420px] flex-1 px-2">
        <div
          className="relative mx-auto h-full"
          style={{ aspectRatio: `${FB_W} / ${FB_H}`, maxHeight: "100%", maxWidth: "100%" }}
          onPointerDown={(e) => {
            e.preventDefault();
            flap();
          }}
        >
          <canvas
            ref={canvasRef}
            width={FB_W}
            height={FB_H}
            className="absolute inset-0 h-full w-full rounded-2xl"
          />
          {/* Score overlay */}
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 text-center">
            <div
              className="text-[48px] font-extrabold text-white"
              style={{ textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
            >
              {score}
            </div>
          </div>
          {/* Status overlay */}
          {status !== "playing" && (
            <div className="fade-in absolute inset-0 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-black/60 px-6 py-5 text-center backdrop-blur">
                <div className="text-[28px] font-bold">
                  {status === "ready" ? "Flappy Bird" : "Game Over"}
                </div>
                {status === "dead" && (
                  <div className="mt-1 text-[15px] text-white/80">
                    Score: <b>{score}</b> · Best: <b>{best}</b>
                  </div>
                )}
                <div className="mt-3 text-[13px] text-white/60">
                  {status === "ready" ? "Tap / click / space to flap" : "Tap to restart"}
                </div>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    flap();
                  }}
                  className="mt-4 rounded-full bg-[#0a84ff] px-6 py-2 text-[15px] font-semibold active:opacity-80"
                >
                  {status === "ready" ? "Start" : "Restart"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
