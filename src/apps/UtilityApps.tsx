import { useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bike,
  Check,
  ChevronLeft,
  Circle,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Footprints,
  Heart,
  Home as HomeIcon,
  Key,
  Lightbulb,
  Lock,
  LogOut,
  Minus,
  Moon,
  Music,
  Pen,
  Plus,
  Shield,
  Speaker,
  Square,
  StickyNote,
  Sun,
  Thermometer,
  Triangle,
  Tv,
  Undo,
  X,
} from "lucide-react";
import { Empty, Group, NavBtn, Page, Row, ScrollView, SearchField, Segmented, Sheet } from "../os/ui";
import { useOS } from "../os/store";
import { sfx } from "../os/sound";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* ================================================================== */
/* Fitness                                                             */
/* ================================================================== */

interface Workout {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Footprints;
  color: string;
}

const WORKOUTS: Workout[] = [
  { id: "running", title: "Running", subtitle: "Outdoor Run", icon: Footprints, color: "#ff2d55" },
  { id: "cycling", title: "Cycling", subtitle: "Outdoor Cycle", icon: Bike, color: "#0a84ff" },
  { id: "yoga", title: "Yoga", subtitle: "Flow Yoga", icon: Heart, color: "#bf5af2" },
  { id: "hiit", title: "HIIT", subtitle: "High Intensity", icon: Flame, color: "#ff9500" },
  { id: "walking", title: "Walking", subtitle: "Outdoor Walk", icon: Activity, color: "#34c759" },
  { id: "dance", title: "Dance", subtitle: "Dance Cardio", icon: Music, color: "#ff2d55" },
];

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const TREND = [420, 380, 550, 480, 620, 590, 510];

const FITNESS_PLUS = [
  { id: "f1", title: "Bike Power", duration: 30, level: "Intermediate", icon: Bike, gradient: "linear-gradient(135deg, #0a84ff, #0040a0)" },
  { id: "f2", title: "HIIT Burn", duration: 20, level: "Advanced", icon: Flame, gradient: "linear-gradient(135deg, #ff9500, #b25700)" },
  { id: "f3", title: "Yoga Flow", duration: 45, level: "Beginner", icon: Heart, gradient: "linear-gradient(135deg, #bf5af2, #6a1b9a)" },
  { id: "f4", title: "Treadmill Mix", duration: 25, level: "Intermediate", icon: Footprints, gradient: "linear-gradient(135deg, #ff2d55, #a01030)" },
];

function Ring({ progress, color, r }: { progress: number; color: string; r: number }) {
  const c = 2 * Math.PI * r;
  return (
    <>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${Math.min(Math.max(progress, 0), 1) * c} ${c}`}
      />
    </>
  );
}

function ActivityRings({ move, exercise, stand }: { move: number; exercise: number; stand: number }) {
  return (
    <svg viewBox="0 0 100 100" className="-rotate-90" width="110" height="110">
      <Ring progress={move} color="#ff2d55" r={42} />
      <Ring progress={exercise} color="#a3e635" r={31} />
      <Ring progress={stand} color="#22d3ee" r={20} />
    </svg>
  );
}

export function FitnessApp() {
  const startWorkout = (w: Workout) => {
    sfx.pop();
    useOS.getState().set({
      liveActivity: {
        kind: "workout",
        title: w.title,
        subtitle: w.subtitle,
        progress: 0,
        color: w.color,
        startedAt: Date.now(),
      },
    });
    useOS.getState().goHome();
  };

  const maxTrend = Math.max(...TREND);

  return (
    <div className="flex h-full flex-col bg-ios-grouped">
      <Page title="Fitness" bg="bg-ios-grouped">
        {/* Activity rings card */}
        <div className="px-4">
          <div className="overflow-hidden rounded-[16px] bg-ios-cell p-4">
            <div className="mb-3 text-[15px] font-semibold text-ios-label2">Today</div>
            <div className="flex items-center gap-5">
              <ActivityRings move={0.78} exercise={0.92} stand={0.67} />
              <div className="flex-1 space-y-2.5">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px]" style={{ color: "#ff2d55" }}>Move</span>
                    <span className="text-[15px] font-semibold tabular-nums">546<span className="text-ios-label2">/700 cal</span></span>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px]" style={{ color: "#a3e635" }}>Exercise</span>
                    <span className="text-[15px] font-semibold tabular-nums">46<span className="text-ios-label2">/50 min</span></span>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px]" style={{ color: "#22d3ee" }}>Stand</span>
                    <span className="text-[15px] font-semibold tabular-nums">8<span className="text-ios-label2">/12 hr</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workouts */}
        <div className="mb-1 mt-5 px-4 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
          Workouts
        </div>
        <div className="grid grid-cols-3 gap-3 px-4">
          {WORKOUTS.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.id}
                onClick={() => startWorkout(w)}
                className="flex flex-col items-center gap-2 rounded-[14px] bg-ios-cell p-3 active:opacity-70"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: w.color + "22" }}>
                  <Icon size={26} style={{ color: w.color }} />
                </div>
                <span className="text-[13px] font-medium">{w.title}</span>
              </button>
            );
          })}
        </div>

        {/* Trends */}
        <div className="mb-1 mt-5 px-4 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
          Trends
        </div>
        <div className="px-4">
          <div className="overflow-hidden rounded-[16px] bg-ios-cell p-4">
            <div className="mb-1 text-[13px] text-ios-label2">Active Calories · This Week</div>
            <div className="flex items-end gap-2" style={{ height: 100 }}>
              {TREND.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="text-[9px] tabular-nums text-ios-label2">{v}</div>
                  <div className="w-full rounded-t-[3px]" style={{ height: `${(v / maxTrend) * 64}px`, background: "#ff2d55", minHeight: 2 }} />
                  <div className="text-[10px] text-ios-label2">{WEEK[i]}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[13px] text-ios-label2">
              Daily average: {Math.round(TREND.reduce((a, b) => a + b, 0) / 7)} cal · 12% increase from last week
            </div>
          </div>
        </div>

        {/* Fitness+ */}
        <div className="mb-1 mt-5 px-4 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
          Fitness+
        </div>
        <ScrollView axis="x" className="px-4 pb-2">
          <div className="flex gap-3">
            {FITNESS_PLUS.map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => useOS.getState().showToast(`${w.title} — tap a workout to start`)}
                  className="w-[200px] shrink-0 overflow-hidden rounded-[12px] text-left active:opacity-70"
                >
                  <div className="relative h-[120px]" style={{ background: w.gradient }}>
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
                    <div className="absolute right-3 top-3 text-white/90">
                      <Icon size={28} />
                    </div>
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <div className="text-[15px] font-semibold">{w.title}</div>
                      <div className="text-[12px] opacity-85">{w.duration} min · {w.level}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollView>
      </Page>
    </div>
  );
}

/* ================================================================== */
/* Freeform                                                            */
/* ================================================================== */

interface CanvasNote {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text: string;
}
interface CanvasShape {
  id: string;
  kind: "rect" | "circle" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}
interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
}

const NOTE_COLORS = ["#ffe066", "#ffc078", "#ffa8a8", "#b197fc", "#a5d8ff", "#b2f2bb", "#ffffff"];
const SHAPE_COLORS = ["#ff453a", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#5856d6", "#af52de"];
const PEN_COLOR = "#1c1c1e";

const SAMPLE_NOTES: CanvasNote[] = [
  { id: "n1", x: 24, y: 16, w: 140, h: 110, color: "#ffe066", text: "Welcome! Drag me around." },
  { id: "n2", x: 184, y: 60, w: 140, h: 110, color: "#b2f2bb", text: "Use the toolbar below to add notes, shapes, and drawings." },
];
const SAMPLE_SHAPES: CanvasShape[] = [
  { id: "s1", kind: "circle", x: 120, y: 200, w: 80, h: 80, color: "#0a84ff" },
];

type Tool = "idle" | "pen" | "eraser";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function FreeformApp() {
  const scale = useOS((s) => s.scale);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<CanvasNote[]>(() => load("ios-sim-freeform-notes", SAMPLE_NOTES));
  const [shapes, setShapes] = useState<CanvasShape[]>(() => load("ios-sim-freeform-shapes", SAMPLE_SHAPES));
  const [strokes, setStrokes] = useState<Stroke[]>(() => load("ios-sim-freeform-strokes", []));
  const [tool, setTool] = useState<Tool>("idle");
  const [picker, setPicker] = useState<"note" | "shape" | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number }[] | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const persist = (n: CanvasNote[], s: CanvasShape[], st: Stroke[]) => {
    try {
      localStorage.setItem("ios-sim-freeform-notes", JSON.stringify(n));
      localStorage.setItem("ios-sim-freeform-shapes", JSON.stringify(s));
      localStorage.setItem("ios-sim-freeform-strokes", JSON.stringify(st));
    } catch {
      /* ignore */
    }
  };

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const addNote = (color: string) => {
    const note: CanvasNote = { id: uid(), x: 40 + Math.random() * 60, y: 40 + Math.random() * 60, w: 140, h: 110, color, text: "" };
    const next = [...notes, note];
    setNotes(next);
    setHistory((h) => [...h, note.id]);
    persist(next, shapes, strokes);
    sfx.pop();
  };

  const addShape = (kind: "rect" | "circle" | "triangle", color: string) => {
    const shape: CanvasShape = { id: uid(), kind, x: 80 + Math.random() * 80, y: 80 + Math.random() * 80, w: 90, h: 90, color };
    const next = [...shapes, shape];
    setShapes(next);
    setHistory((h) => [...h, shape.id]);
    persist(notes, next, strokes);
    sfx.pop();
  };

  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    const nn = notes.filter((x) => x.id !== last);
    const ns = shapes.filter((x) => x.id !== last);
    const nst = strokes.filter((x) => x.id !== last);
    setNotes(nn);
    setShapes(ns);
    setStrokes(nst);
    setHistory((h) => h.slice(0, -1));
    persist(nn, ns, nst);
    sfx.tick();
  };

  const updateNoteText = (id: string, text: string) => {
    const next = notes.map((n) => (n.id === id ? { ...n, text } : n));
    setNotes(next);
    persist(next, shapes, strokes);
  };

  const deleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    setHistory((h) => h.filter((x) => x !== id));
    persist(next, shapes, strokes);
    sfx.tick();
  };

  // canvas pointer handlers (pen drawing)
  const onCanvasDown = (e: React.PointerEvent) => {
    if (tool !== "pen") return;
    const pos = getPos(e);
    setDraft([pos]);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onCanvasMove = (e: React.PointerEvent) => {
    if (tool !== "pen" || !draft) return;
    setDraft((d) => (d ? [...d, getPos(e)] : d));
  };
  const onCanvasUp = () => {
    if (tool !== "pen") return;
    if (draft && draft.length > 1) {
      const stroke: Stroke = { id: uid(), points: draft, color: PEN_COLOR };
      const next = [...strokes, stroke];
      setStrokes(next);
      setHistory((h) => [...h, stroke.id]);
      persist(notes, shapes, next);
    }
    setDraft(null);
  };

  // note / shape drag
  const onItemDown = (e: React.PointerEvent, item: CanvasNote | CanvasShape) => {
    if (tool === "eraser") {
      if ("text" in item) {
        const next = notes.filter((n) => n.id !== item.id);
        setNotes(next);
        persist(next, shapes, strokes);
      } else {
        const next = shapes.filter((s) => s.id !== item.id);
        setShapes(next);
        persist(notes, next, strokes);
      }
      setHistory((h) => h.filter((x) => x !== item.id));
      sfx.tick();
      return;
    }
    if (tool !== "idle") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.closest("[data-nodrag]")) return;
    e.stopPropagation();
    const pos = getPos(e);
    dragRef.current = { id: item.id, dx: pos.x - item.x, dy: pos.y - item.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onItemMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const pos = getPos(e);
    const drag = dragRef.current;
    setNotes((n) => n.map((x) => (x.id === drag.id ? { ...x, x: pos.x - drag.dx, y: pos.y - drag.dy } : x)));
    setShapes((n) => n.map((x) => (x.id === drag.id ? { ...x, x: pos.x - drag.dx, y: pos.y - drag.dy } : x)));
  };
  const onItemUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      // persist current state
      setTimeout(() => persist(notes, shapes, strokes), 0);
    }
  };

  const shapeStyle = (s: CanvasShape): React.CSSProperties => {
    const base: React.CSSProperties = { position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, background: s.color };
    if (s.kind === "circle") base.borderRadius = "50%";
    if (s.kind === "triangle") base.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
    return base;
  };

  const toolBtn = (active: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-ios-label text-ios-bg" : "bg-ios-fill text-ios-label"} active:opacity-60`;

  return (
    <div className="flex h-full flex-col bg-ios-bg">
      {/* header */}
      <div className="glass z-10 shrink-0" style={{ paddingTop: "var(--safe-top)", borderBottom: "0.5px solid var(--ios-sep)" }}>
        <div className="flex h-[44px] items-center justify-between px-4">
          <span className="text-[17px] font-semibold">Freeform</span>
          <span className="text-[13px] text-ios-label2">{notes.length + shapes.length + strokes.length} items</span>
        </div>
      </div>

      {/* canvas */}
      <div
        ref={canvasRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          touchAction: "none",
          backgroundColor: "var(--ios-grouped)",
          backgroundImage: "radial-gradient(var(--ios-sep) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        onPointerDown={onCanvasDown}
        onPointerMove={onCanvasMove}
        onPointerUp={onCanvasUp}
        onPointerCancel={onCanvasUp}
      >
        {/* SVG strokes */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {strokes.map((s) => (
            <polyline
              key={s.id}
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {draft && (
            <polyline
              points={draft.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={PEN_COLOR}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* shapes */}
        {shapes.map((s) => (
          <div
            key={s.id}
            style={{ ...shapeStyle(s), pointerEvents: tool === "pen" ? "none" : "auto", cursor: tool === "eraser" ? "pointer" : "move" }}
            onPointerDown={(e) => onItemDown(e, s)}
            onPointerMove={onItemMove}
            onPointerUp={onItemUp}
          />
        ))}

        {/* notes */}
        {notes.map((n) => (
          <div
            key={n.id}
            className="overflow-hidden rounded-[6px] shadow-md"
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              width: n.w,
              height: n.h,
              background: n.color,
              pointerEvents: tool === "pen" ? "none" : "auto",
              cursor: tool === "eraser" ? "pointer" : "move",
            }}
            onPointerDown={(e) => onItemDown(e, n)}
            onPointerMove={onItemMove}
            onPointerUp={onItemUp}
          >
            <div className="flex items-center justify-between px-2 py-1" data-nodrag>
              <span className="text-[10px] font-semibold uppercase opacity-50">Note</span>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNote(n.id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-black/60"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
            <textarea
              value={n.text}
              onChange={(e) => updateNoteText(n.id, e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Type…"
              className="block w-full resize-none bg-transparent px-2 text-[14px] leading-[18px] outline-none"
              style={{ height: n.h - 28, color: "#1c1c1e" }}
            />
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="glass z-10 shrink-0 px-3 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)", borderTop: "0.5px solid var(--ios-sep)" }}>
        {picker === "note" && (
          <div className="mb-2 flex items-center justify-center gap-3">
            {NOTE_COLORS.map((c) => (
              <button key={c} onClick={() => { addNote(c); setPicker(null); }} className="h-9 w-9 rounded-full border border-black/10 active:scale-90" style={{ background: c }} />
            ))}
          </div>
        )}
        {picker === "shape" && (
          <div className="mb-2 flex items-center justify-center gap-2">
            {SHAPE_COLORS.map((c) => (
              <div key={c} className="flex items-center gap-1">
                <button onClick={() => { addShape("rect", c); setPicker(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-ios-fill text-ios-label active:opacity-60"><Square size={18} /></button>
                <button onClick={() => { addShape("circle", c); setPicker(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-ios-fill text-ios-label active:opacity-60"><Circle size={18} /></button>
                <button onClick={() => { addShape("triangle", c); setPicker(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-ios-fill text-ios-label active:opacity-60"><Triangle size={18} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-around">
          <button onClick={() => { setPicker(picker === "note" ? null : "note"); setTool("idle"); }} className={toolBtn(false)} title="Add Note">
            <StickyNote size={20} />
          </button>
          <button onClick={() => { setPicker(picker === "shape" ? null : "shape"); setTool("idle"); }} className={toolBtn(false)} title="Add Shape">
            <Square size={20} />
          </button>
          <button onClick={() => { setTool(tool === "pen" ? "idle" : "pen"); setPicker(null); }} className={toolBtn(tool === "pen")} title="Pen">
            <Pen size={20} />
          </button>
          <button onClick={() => { setTool(tool === "eraser" ? "idle" : "eraser"); setPicker(null); }} className={toolBtn(tool === "eraser")} title="Eraser">
            <Eraser size={20} />
          </button>
          <button onClick={undo} className={toolBtn(false)} title="Undo" disabled={!history.length}>
            <Undo size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Home (HomeKit)                                                      */
/* ================================================================== */

type AccType = "light" | "thermostat" | "lock" | "tv" | "speaker";
interface Accessory {
  id: string;
  name: string;
  type: AccType;
  room: string;
  on: boolean;
  temp?: number;
  locked?: boolean;
  volume?: number;
  fav: boolean;
}

const ROOMS = ["Living Room", "Kitchen", "Bedroom", "Office"] as const;
type Room = (typeof ROOMS)[number];

const SCENES = [
  { id: "morning", name: "Good Morning", icon: Sun, color: "#ff9500" },
  { id: "night", name: "Good Night", icon: Moon, color: "#5856d6" },
  { id: "leave", name: "Leave Home", icon: LogOut, color: "#8e8e93" },
  { id: "arrive", name: "Arrive Home", icon: HomeIcon, color: "#34c759" },
] as const;

const DEFAULT_ACCESSORIES: Accessory[] = [
  { id: "h1", name: "Ceiling Light", type: "light", room: "Living Room", on: true, fav: true },
  { id: "h2", name: "Thermostat", type: "thermostat", room: "Living Room", on: true, temp: 72, fav: true },
  { id: "h3", name: "Front Door", type: "lock", room: "Living Room", on: true, locked: true, fav: true },
  { id: "h4", name: "Living Room TV", type: "tv", room: "Living Room", on: false, fav: true },
  { id: "h5", name: "HomePod mini", type: "speaker", room: "Living Room", on: false, volume: 50, fav: true },
  { id: "h6", name: "Under Cabinet", type: "light", room: "Kitchen", on: false, fav: false },
  { id: "h7", name: "Kitchen Speaker", type: "speaker", room: "Kitchen", on: false, volume: 30, fav: false },
  { id: "h8", name: "Bedside Lamp", type: "light", room: "Bedroom", on: false, fav: false },
  { id: "h9", name: "Bedroom Lock", type: "lock", room: "Bedroom", on: true, locked: true, fav: false },
  { id: "h10", name: "Desk Light", type: "light", room: "Office", on: true, fav: false },
  { id: "h11", name: "Office TV", type: "tv", room: "Office", on: false, fav: false },
];

const ACC_ICONS: Record<AccType, typeof Lightbulb> = {
  light: Lightbulb,
  thermostat: Thermometer,
  lock: Lock,
  tv: Tv,
  speaker: Speaker,
};

function AccTile({ acc, onToggle, onAdjust }: { acc: Accessory; onToggle: () => void; onAdjust: (delta: number) => void }) {
  const Icon = ACC_ICONS[acc.type];

  if (acc.type === "thermostat") {
    return (
      <div className="overflow-hidden rounded-[16px] bg-ios-cell p-4">
        <div className="flex items-center gap-2">
          <Icon size={22} className="text-ios-orange" />
          <span className="truncate text-[14px] font-medium">{acc.name}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => onAdjust(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill active:opacity-60">
            <Minus size={18} />
          </button>
          <span className="text-[32px] font-bold tabular-nums" style={{ color: "#ff9500" }}>
            {acc.temp}°
          </span>
          <button onClick={() => onAdjust(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill active:opacity-60">
            <Plus size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (acc.type === "speaker") {
    return (
      <div className="overflow-hidden rounded-[16px] bg-ios-cell p-4">
        <div className="flex items-center gap-2">
          <Icon size={22} style={{ color: acc.on ? "#ff2d55" : "var(--ios-label3)" }} />
          <span className="truncate text-[14px] font-medium">{acc.name}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => onAdjust(-10)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill active:opacity-60">
            <Minus size={16} />
          </button>
          <span className="text-[20px] font-bold tabular-nums">{acc.volume}</span>
          <button onClick={() => onAdjust(10)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill active:opacity-60">
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }

  // light, lock, tv — tap to toggle
  const color = acc.type === "lock" ? (acc.locked ? "#ff453a" : "#34c759") : acc.type === "tv" ? "#0a84ff" : "#ffcc00";

  return (
    <button
      onClick={onToggle}
      className="flex h-[140px] flex-col justify-between rounded-[16px] p-4 text-left active:opacity-70"
      style={{ background: acc.type === "light" && acc.on ? color : "var(--ios-cell)", color: acc.type === "light" && acc.on ? "#1c1c1e" : "var(--ios-label)" }}
    >
      <Icon
        size={26}
        style={{ color: acc.type === "light" && acc.on ? "#1c1c1e" : color }}
      />
      <div>
        <div className="text-[15px] font-semibold">{acc.name}</div>
        <div className="text-[13px] opacity-70">
          {acc.type === "lock" ? (acc.locked ? "Locked" : "Unlocked") : acc.on ? "On" : "Off"}
        </div>
      </div>
    </button>
  );
}

export function HomeApp() {
  const [accessories, setAccessories] = useState<Accessory[]>(() => load("ios-sim-home", DEFAULT_ACCESSORIES));
  const [room, setRoom] = useState<Room>("Living Room");

  const save = (next: Accessory[]) => {
    setAccessories(next);
    try {
      localStorage.setItem("ios-sim-home", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    sfx.tick();
    save(accessories.map((a) => (a.id === id ? { ...a, on: !a.on, locked: a.type === "lock" ? !a.locked : a.locked } : a)));
  };

  const adjust = (id: string, delta: number) => {
    sfx.tick();
    save(
      accessories.map((a) => {
        if (a.id !== id) return a;
        if (a.type === "thermostat") return { ...a, temp: Math.max(60, Math.min(85, (a.temp ?? 70) + delta)) };
        if (a.type === "speaker") return { ...a, volume: Math.max(0, Math.min(100, (a.volume ?? 50) + delta)) };
        return a;
      }),
    );
  };

  const applyScene = (sceneId: string) => {
    sfx.pop();
    const next = accessories.map((a) => {
      if (sceneId === "morning") {
        if (a.type === "light") return { ...a, on: true };
        if (a.type === "thermostat") return { ...a, temp: 72 };
        if (a.type === "lock") return { ...a, locked: false };
      }
      if (sceneId === "night") {
        if (a.type === "light" || a.type === "tv" || a.type === "speaker") return { ...a, on: false };
        if (a.type === "thermostat") return { ...a, temp: 68 };
        if (a.type === "lock") return { ...a, locked: true };
      }
      if (sceneId === "leave") {
        if (a.type === "light" || a.type === "tv" || a.type === "speaker") return { ...a, on: false };
        if (a.type === "thermostat") return { ...a, temp: 65 };
        if (a.type === "lock") return { ...a, locked: true };
      }
      if (sceneId === "arrive") {
        if (a.type === "light") return { ...a, on: true };
        if (a.type === "thermostat") return { ...a, temp: 72 };
        if (a.type === "lock") return { ...a, locked: false };
      }
      return a;
    });
    save(next);
    useOS.getState().showToast(`Scene: ${SCENES.find((s) => s.id === sceneId)?.name}`);
  };

  const roomAccs = accessories.filter((a) => a.room === room);

  return (
    <div className="flex h-full flex-col bg-ios-grouped">
      <Page title="Home" bg="bg-ios-grouped">
        {/* Scenes */}
        <div className="mb-1 px-4 text-[13px] font-semibold uppercase text-ios-label2">Scenes</div>
        <ScrollView axis="x" className="px-4 pb-2">
          <div className="flex gap-3">
            {SCENES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => applyScene(s.id)}
                  className="flex w-[120px] shrink-0 flex-col items-center gap-2 rounded-[14px] bg-ios-cell py-4 active:opacity-70"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: s.color + "22" }}>
                    <Icon size={26} style={{ color: s.color }} />
                  </div>
                  <span className="text-[13px] font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollView>

        {/* Room selector */}
        <div className="px-4 pb-2 pt-2">
          <Segmented
            options={ROOMS.map((r) => ({ id: r, label: r.split(" ")[0] }))}
            value={room}
            onChange={setRoom}
          />
        </div>

        {/* Accessories grid */}
        <div className="mb-2 px-4 text-[15px] font-semibold text-ios-label2">{room}</div>
        <div className="grid grid-cols-2 gap-3 px-4">
          {roomAccs.map((a) => (
            <AccTile key={a.id} acc={a} onToggle={() => toggle(a.id)} onAdjust={(d) => adjust(a.id, d)} />
          ))}
        </div>
      </Page>
    </div>
  );
}

/* ================================================================== */
/* Passwords                                                           */
/* ================================================================== */

interface Credential {
  id: string;
  site: string;
  username: string;
  password: string;
  color: string;
  weak?: boolean;
  reused?: boolean;
  passkey?: boolean;
}

const DEFAULT_CREDS: Credential[] = [
  { id: "c1", site: "iCloud", username: "alex@icloud.com", password: "apple123", color: "#007aff", weak: true },
  { id: "c2", site: "Google", username: "alex@gmail.com", password: "Tr0ub4dor&3", color: "#4285f4" },
  { id: "c3", site: "Netflix", username: "alex@mail.com", password: "password123", color: "#e50914", reused: true },
  { id: "c4", site: "Amazon", username: "alex@gmail.com", password: "Am4z0n!2024", color: "#ff9900" },
  { id: "c5", site: "GitHub", username: "alexdev", password: "", color: "#24292e", passkey: true },
  { id: "c6", site: "Twitter", username: "@alex", password: "X2024secure!", color: "#1da1f2" },
  { id: "c7", site: "Bank", username: "alex_m", password: "123456", color: "#2e7d32", weak: true },
  { id: "c8", site: "Spotify", username: "alex@icloud.com", password: "", color: "#1db954", passkey: true },
];

function SiteIcon({ site, color, size = 29 }: { site: string; color: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[7px] text-[14px] font-bold text-white"
      style={{ width: size, height: size, background: color }}
    >
      {site[0].toUpperCase()}
    </div>
  );
}

function CredDetail({ cred, onClose }: { cred: Credential; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
    sfx.tick();
    useOS.getState().showToast(`${label} copied`);
  };

  const masked = "•".repeat(Math.max(cred.password.length, 8));

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ios-grouped">
      <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <div className="glass absolute inset-0" style={{ borderBottom: "0.5px solid var(--ios-sep)" }} />
        <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
          <NavBtn onClick={onClose}>
            <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
            <span className="-ml-1">Passwords</span>
          </NavBtn>
          <button onClick={() => useOS.getState().showToast("Edit not available in demo")} className="text-ios-blue">
            <Pen size={18} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
        <div className="flex flex-col items-center py-6">
          <SiteIcon site={cred.site} color={cred.color} size={64} />
          <div className="mt-3 text-[24px] font-bold" style={{ letterSpacing: "-0.02em" }}>
            {cred.site}
          </div>
          {cred.passkey && (
            <div className="mt-1 flex items-center gap-1 text-[13px] text-ios-green">
              <Fingerprint size={14} /> Passkey
            </div>
          )}
        </div>

        {(cred.weak || cred.reused) && (
          <div className="mx-4 mb-4 flex items-start gap-2 rounded-[12px] bg-ios-cell p-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ios-orange" />
            <div className="text-[14px]">
              <div className="font-semibold text-ios-orange">
                {cred.weak ? "Weak Password" : "Reused Password"}
              </div>
              <div className="text-ios-label2">
                {cred.weak
                  ? "This password is easily guessable. Consider changing it."
                  : "This password is used on other accounts. Use a unique password."}
              </div>
            </div>
          </div>
        )}

        <Group header="Website">
          <Row leading={<SiteIcon site={cred.site} color={cred.color} />} title={cred.site} />
        </Group>

        <Group header="Username">
          <div className="ios-row flex items-center gap-3 px-4 py-[10px]" style={{ ["--sep-left" as string]: "60px" }}>
            <div className="min-w-0 flex-1 truncate text-[17px]">{cred.username}</div>
            <button onClick={() => copy(cred.username, "Username")} className="flex items-center gap-1 text-[15px] text-ios-blue">
              {copied === "Username" ? <Check size={16} /> : <Copy size={16} />}
              {copied === "Username" ? "Copied" : "Copy"}
            </button>
          </div>
        </Group>

        <Group header="Password">
          {cred.passkey ? (
            <div className="ios-row flex items-center gap-3 px-4 py-[10px]">
              <div className="min-w-0 flex-1 truncate text-[17px] text-ios-label2">No password — uses Passkey</div>
              <Fingerprint size={20} className="text-ios-green" />
            </div>
          ) : (
            <div className="ios-row flex items-center gap-3 px-4 py-[10px]" style={{ ["--sep-left" as string]: "60px" }}>
              <div className="min-w-0 flex-1 truncate text-[17px] tabular-nums">{revealed ? cred.password : masked}</div>
              <button onClick={() => { setRevealed((r) => !r); sfx.tick(); }} className="text-ios-label2">
                {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <button onClick={() => copy(cred.password, "Password")} className="flex items-center gap-1 text-[15px] text-ios-blue">
                {copied === "Password" ? <Check size={16} /> : <Copy size={16} />}
                {copied === "Password" ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </Group>
        <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />
      </div>
    </div>
  );
}

export function PasswordsApp() {
  const [creds, setCreds] = useState<Credential[]>(() => load("ios-sim-passwords", DEFAULT_CREDS));
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Credential | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ site: "", username: "", password: "" });

  const save = (next: Credential[]) => {
    setCreds(next);
    try {
      localStorage.setItem("ios-sim-passwords", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const copy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    sfx.tick();
    useOS.getState().showToast(`${label} copied`);
  };

  const addCred = () => {
    if (!form.site.trim() || !form.username.trim()) return;
    const colors = ["#007aff", "#ff9500", "#34c759", "#af52de", "#ff2d55", "#5856d6"];
    const cred: Credential = {
      id: uid(),
      site: form.site.trim(),
      username: form.username.trim(),
      password: form.password.trim(),
      color: colors[creds.length % colors.length],
    };
    save([cred, ...creds]);
    setForm({ site: "", username: "", password: "" });
    setAdding(false);
    sfx.pop();
  };

  const recommendations = creds.filter((c) => c.weak || c.reused);
  const passkeys = creds.filter((c) => c.passkey);
  const filtered = q ? creds.filter((c) => (c.site + c.username).toLowerCase().includes(q.toLowerCase())) : creds;

  return (
    <div className="relative flex h-full flex-col bg-ios-grouped">
      <Page
        title="Passwords"
        bg="bg-ios-grouped"
        right={
          <button onClick={() => setAdding(true)} className="text-ios-blue">
            <Plus size={26} />
          </button>
        }
      >
        <div className="px-4 pb-2">
          <SearchField value={q} onChange={setQ} placeholder="Search Passwords" />
        </div>

        {!q && recommendations.length > 0 && (
          <Group
            header={
              <span className="flex items-center gap-1 text-ios-orange">
                <Shield size={13} /> Security Recommendations
              </span>
            }
          >
            {recommendations.map((c) => (
              <Row
                key={c.id}
                leading={<SiteIcon site={c.site} color={c.color} />}
                title={c.site}
                subtitle={c.weak ? "Weak password" : "Reused password"}
                destructive
                chevron
                onClick={() => { sfx.pop(); setDetail(c); }}
              />
            ))}
          </Group>
        )}

        {!q && passkeys.length > 0 && (
          <Group
            header={
              <span className="flex items-center gap-1 text-ios-green">
                <Fingerprint size={13} /> Passkeys
              </span>
            }
          >
            {passkeys.map((c) => (
              <Row
                key={c.id}
                leading={<SiteIcon site={c.site} color={c.color} />}
                title={c.site}
                subtitle={c.username}
                chevron
                onClick={() => { sfx.pop(); setDetail(c); }}
              />
            ))}
          </Group>
        )}

        <Group header={q ? "Results" : "All Passwords"}>
          {filtered.length ? (
            filtered.map((c) => (
              <Row
                key={c.id}
                leading={<SiteIcon site={c.site} color={c.color} />}
                title={c.site}
                subtitle={c.username}
                chevron
                onClick={() => { sfx.pop(); setDetail(c); }}
              />
            ))
          ) : (
            <Empty icon={Key} title="No Passwords" text={q ? `No matches for "${q}".` : "Tap + to add a password."} />
          )}
        </Group>
      </Page>

      {detail && <CredDetail cred={detail} onClose={() => setDetail(null)} />}

      <Sheet open={adding} onClose={() => setAdding(false)} height="60%">
        <Page
          title="New Password"
          large={false}
          left={<NavBtn onClick={() => setAdding(false)}>Cancel</NavBtn>}
          right={
            <NavBtn bold disabled={!form.site.trim() || !form.username.trim()} onClick={addCred}>
              Done
            </NavBtn>
          }
        >
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between rounded-[10px] bg-ios-cell px-4 py-3">
              <span className="text-[15px] text-ios-label2">Website</span>
              <input
                value={form.site}
                onChange={(e) => setForm({ ...form, site: e.target.value })}
                placeholder="example.com"
                className="w-[60%] bg-transparent text-right text-[17px] outline-none"
              />
            </div>
            <div className="mb-2 flex items-center justify-between rounded-[10px] bg-ios-cell px-4 py-3">
              <span className="text-[15px] text-ios-label2">Username</span>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="user@example.com"
                className="w-[60%] bg-transparent text-right text-[17px] outline-none"
              />
            </div>
            <div className="mb-4 flex items-center justify-between rounded-[10px] bg-ios-cell px-4 py-3">
              <span className="text-[15px] text-ios-label2">Password</span>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-[60%] bg-transparent text-right text-[17px] outline-none"
              />
            </div>
            <button
              onClick={() => copy(form.password || "—", "Password")}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-ios-cell py-3 text-[15px] text-ios-blue active:opacity-60"
            >
              <Copy size={16} /> Copy Password
            </button>
          </div>
        </Page>
      </Sheet>
    </div>
  );
}
