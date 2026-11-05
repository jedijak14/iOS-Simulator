import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { useOS } from "../os/store";

/* ------------------------------ 2048 ------------------------------ */
type Grid = number[][];
const empty = (): Grid => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const addTile = (g: Grid): Grid => {
  const cells: [number, number][] = [];
  g.forEach((r, y) => r.forEach((v, x) => !v && cells.push([y, x])));
  if (!cells.length) return g;
  const [y, x] = cells[Math.floor(Math.random() * cells.length)];
  const n = g.map((r) => r.slice());
  n[y][x] = Math.random() < 0.9 ? 2 : 4;
  return n;
};
const fresh = () => addTile(addTile(empty()));

function slide(row: number[]): { row: number[]; gain: number } {
  const t = row.filter(Boolean);
  let gain = 0;
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i] === t[i + 1]) {
      t[i] *= 2;
      gain += t[i];
      t.splice(i + 1, 1);
    }
  }
  while (t.length < 4) t.push(0);
  return { row: t, gain };
}
function move(g: Grid, dir: "l" | "r" | "u" | "d") {
  let gain = 0;
  const rot = (m: Grid) => m[0].map((_, i) => m.map((r) => r[i]));
  let m = g.map((r) => r.slice());
  if (dir === "u" || dir === "d") m = rot(m);
  m = m.map((r) => {
    const rr = dir === "r" || dir === "d" ? r.slice().reverse() : r;
    const s = slide(rr);
    gain += s.gain;
    return dir === "r" || dir === "d" ? s.row.reverse() : s.row;
  });
  if (dir === "u" || dir === "d") m = rot(m);
  const moved = m.some((r, y) => r.some((v, x) => v !== g[y][x]));
  return { grid: m, gain, moved };
}
const canMove = (g: Grid) => (["l", "r", "u", "d"] as const).some((d) => move(g, d).moved);

const TILE: Record<number, [string, string]> = {
  2: ["#eee4da", "#776e65"],
  4: ["#ede0c8", "#776e65"],
  8: ["#f2b179", "#fff"],
  16: ["#f59563", "#fff"],
  32: ["#f67c5f", "#fff"],
  64: ["#f65e3b", "#fff"],
  128: ["#edcf72", "#fff"],
  256: ["#edcc61", "#fff"],
  512: ["#edc850", "#fff"],
  1024: ["#edc53f", "#fff"],
  2048: ["#edc22e", "#fff"],
};

export function Twenty48App() {
  const [grid, setGrid] = useState<Grid>(() => fresh());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => +(localStorage.getItem("ios-sim-2048") ?? 0));
  const fg = useOS((s) => s.foreground) === "twenty48";
  const start = useRef<{ x: number; y: number } | null>(null);
  const over = !canMove(grid);
  const won = grid.some((r) => r.includes(2048));

  const go = useCallback(
    (d: "l" | "r" | "u" | "d") => {
      setGrid((g) => {
        const r = move(g, d);
        if (!r.moved) return g;
        setScore((s) => {
          const ns = s + r.gain;
          setBest((b) => {
            const nb = Math.max(b, ns);
            localStorage.setItem("ios-sim-2048", String(nb));
            return nb;
          });
          return ns;
        });
        return addTile(r.grid);
      });
    },
    [],
  );
  useEffect(() => {
    if (!fg) return;
    const f = (e: KeyboardEvent) => {
      const m: Record<string, "l" | "r" | "u" | "d"> = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d" };
      if (m[e.key]) {
        e.preventDefault();
        go(m[e.key]);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [fg, go]);

  const reset = () => {
    setGrid(fresh());
    setScore(0);
  };

  return (
    <div className="flex h-full flex-col bg-[#faf8ef] px-5 text-[#776e65]" style={{ paddingTop: "calc(var(--safe-top) + 14px)", paddingBottom: "calc(var(--safe-bottom) + 14px)" }}>
      <div className="flex items-center justify-between">
        <div className="text-[56px] font-extrabold leading-none">2048</div>
        <div className="flex gap-2">
          {[["SCORE", score], ["BEST", best]].map(([l, v]) => (
            <div key={l} className="min-w-[68px] rounded-md bg-[#bbada0] px-3 py-1.5 text-center text-white">
              <div className="text-[11px] font-bold opacity-80">{l}</div>
              <div className="text-[20px] font-bold leading-tight">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[15px]">
        <span>Join the tiles, get to <b>2048!</b></span>
        <button onClick={reset} className="flex items-center gap-1 rounded-md bg-[#8f7a66] px-3 py-1.5 font-bold text-white active:opacity-80">
          <RotateCcw size={14} /> New
        </button>
      </div>
      <div
        className="relative mx-auto mt-5 aspect-square w-full touch-none rounded-lg bg-[#bbada0] p-2"
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : dy > 0 ? "d" : "u");
        }}
      >
        <div className="grid h-full grid-cols-4 grid-rows-4 gap-2">
          {grid.flat().map((v, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-md font-extrabold transition-colors duration-100"
              style={{ background: v ? (TILE[v] ?? ["#3c3a32", "#fff"])[0] : "rgba(238,228,218,0.35)", color: v ? (TILE[v] ?? ["", "#fff"])[1] : undefined, fontSize: v >= 1024 ? 26 : v >= 128 ? 32 : 40 }}
            >
              {v || ""}
            </div>
          ))}
        </div>
        {(over || won) && (
          <div className="fade-in absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-[#faf8ef]/80">
            <div className="text-[42px] font-extrabold">{won ? "You win!" : "Game over!"}</div>
            <button onClick={reset} className="mt-3 rounded-md bg-[#8f7a66] px-5 py-2 text-[17px] font-bold text-white">
              Try again
            </button>
          </div>
        )}
      </div>
      <div className="mt-auto text-center text-[13px] opacity-70">Swipe or use arrow keys to move the tiles.</div>
    </div>
  );
}

/* ------------------------------ Snake ------------------------------ */
const N = 18;
type P = { x: number; y: number };
export function SnakeApp() {
  const fg = useOS((s) => s.foreground) === "snake";
  const [snake, setSnake] = useState<P[]>([{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]);
  const [food, setFood] = useState<P>({ x: 13, y: 9 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => +(localStorage.getItem("ios-sim-snake") ?? 0));
  const [state, setState] = useState<"ready" | "run" | "dead">("ready");
  const dir = useRef<P>({ x: 1, y: 0 });
  const next = useRef<P>({ x: 1, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);

  const turn = useCallback((x: number, y: number) => {
    if (x === -dir.current.x && y === -dir.current.y) return;
    next.current = { x, y };
    setState((s) => (s === "ready" ? "run" : s));
  }, []);

  useEffect(() => {
    if (!fg) return;
    const f = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (m[e.key]) {
        e.preventDefault();
        turn(...m[e.key]);
      } else if (e.key === " ") setState((s) => (s === "run" ? "ready" : s === "ready" ? "run" : s));
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [fg, turn]);

  useEffect(() => {
    if (state !== "run" || !fg) return;
    const id = setInterval(() => {
      setSnake((sn) => {
        dir.current = next.current;
        const h = { x: sn[0].x + dir.current.x, y: sn[0].y + dir.current.y };
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || sn.some((s) => s.x === h.x && s.y === h.y)) {
          setState("dead");
          return sn;
        }
        const ate = h.x === food.x && h.y === food.y;
        const ns = [h, ...sn];
        if (!ate) ns.pop();
        else {
          setScore((s) => {
            const n = s + 1;
            setBest((b) => {
              const nb = Math.max(b, n);
              localStorage.setItem("ios-sim-snake", String(nb));
              return nb;
            });
            return n;
          });
          let f: P;
          do f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
          while (ns.some((s) => s.x === f.x && s.y === f.y));
          setFood(f);
        }
        return ns;
      });
    }, 130);
    return () => clearInterval(id);
  }, [state, fg, food]);

  const reset = () => {
    setSnake([{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]);
    setFood({ x: 13, y: 9 });
    dir.current = { x: 1, y: 0 };
    next.current = { x: 1, y: 0 };
    setScore(0);
    setState("ready");
  };

  return (
    <div className="flex h-full flex-col bg-[#0e2a1a] px-4 text-white" style={{ paddingTop: "calc(var(--safe-top) + 12px)", paddingBottom: "calc(var(--safe-bottom) + 12px)" }}>
      <div className="flex items-end justify-between">
        <div className="text-[34px] font-bold">Snake</div>
        <div className="text-right text-[14px] opacity-80">
          Score <b className="text-[20px] text-[#78e08f]">{score}</b> · Best {best}
        </div>
      </div>
      <div
        className="relative mt-3 aspect-square w-full touch-none overflow-hidden rounded-xl bg-[#143d26]"
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
          else turn(0, dy > 0 ? 1 : -1);
        }}
      >
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${N},1fr)`, gridTemplateRows: `repeat(${N},1fr)` }}>
          {Array.from({ length: N * N }).map((_, i) => (
            <div key={i} style={{ background: (Math.floor(i / N) + (i % N)) % 2 ? "rgba(255,255,255,0.03)" : "transparent" }} />
          ))}
        </div>
        {snake.map((s, i) => (
          <div key={i} className="absolute rounded-[4px]" style={{ left: `${(s.x / N) * 100}%`, top: `${(s.y / N) * 100}%`, width: `${100 / N}%`, height: `${100 / N}%`, background: i === 0 ? "#b8f5c8" : "#4cd37b", transform: "scale(.92)" }} />
        ))}
        <div className="absolute rounded-full bg-[#ff453a]" style={{ left: `${(food.x / N) * 100}%`, top: `${(food.y / N) * 100}%`, width: `${100 / N}%`, height: `${100 / N}%`, transform: "scale(.75)" }} />
        {state !== "run" && (
          <div className="fade-in absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <div className="text-[30px] font-bold">{state === "dead" ? "Game Over" : "Ready?"}</div>
            <button onClick={state === "dead" ? reset : () => setState("run")} className="mt-3 rounded-full bg-[#34c759] px-6 py-2 text-[17px] font-semibold">
              {state === "dead" ? "Play Again" : "Start"}
            </button>
          </div>
        )}
      </div>
      <div className="mx-auto mt-5 grid w-[190px] grid-cols-3 gap-2">
        {[
          [null, ArrowUp, [0, -1]],
          [ArrowLeft, null, null],
          [ArrowRight, ArrowDown, null],
        ].length && (
          <>
            <div />
            <Pad icon={ArrowUp} onClick={() => turn(0, -1)} />
            <div />
            <Pad icon={ArrowLeft} onClick={() => turn(-1, 0)} />
            <Pad icon={ArrowDown} onClick={() => turn(0, 1)} />
            <Pad icon={ArrowRight} onClick={() => turn(1, 0)} />
          </>
        )}
      </div>
    </div>
  );
}

function Pad({ icon: Icon, onClick }: { icon: typeof ArrowUp; onClick: () => void }) {
  return (
    <button onPointerDown={onClick} className="flex h-14 items-center justify-center rounded-2xl bg-white/15 active:bg-white/30">
      <Icon size={26} />
    </button>
  );
}
