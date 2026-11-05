import { Component, memo, useEffect, useRef, useState, type ReactNode } from "react";
import { useOS, type Rect } from "./store";
import { useSpec } from "./device-context";
import { APPS } from "./registry";
import { AppIcon } from "./icons";
import { clamp } from "./utils";

const CARD = 0.6;

class AppBoundary extends Component<{ id: string; children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    console.error(`[${this.props.id}] crashed:`, err);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ios-bg px-10 text-center text-ios-label">
        <div className="text-[20px] font-semibold">“{APPS[this.props.id]?.name}” Unexpectedly Quit</div>
        <div className="text-[14px] text-ios-label2">{this.state.err.message}</div>
        <button className="rounded-full bg-ios-blue px-5 py-2 text-[16px] font-semibold text-white" onClick={() => this.setState({ err: null })}>
          Reopen
        </button>
        <button className="text-[15px] text-ios-red" onClick={() => useOS.getState().closeApp(this.props.id)}>
          Close App
        </button>
      </div>
    );
  }
}

interface WinProps {
  id: string;
  mode: "fg" | "hidden" | "card";
  rect: Rect;
  cardX: number;
  cardDy: number;
  cardAnim: boolean;
  drag: { dy: number; dx: number } | null;
  kbOpen: boolean;
  z: number;
}

const Window = memo(function Window({ id, mode, rect, cardX, cardDy, cardAnim, drag, kbOpen, z }: WinProps) {
  const spec = useSpec();
  const [entered, setEntered] = useState(false);
  const app = APPS[id];
  useEffect(() => {
    if (mode === "fg" && !entered) {
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
  }, [mode, entered]);
  if (!app) return null;
  const eff = mode === "fg" && !entered ? "hidden" : mode;
  const W = spec.w;
  const H = spec.h;
  const s0 = clamp(rect.w / W, 0.08, 1);
  let transform = "none";
  let opacity = 1;
  let radius = 0;
  let transition = "transform .48s cubic-bezier(.2,.85,.25,1), opacity .14s linear, border-radius .48s cubic-bezier(.2,.85,.25,1), visibility 0s";
  let visibility: "visible" | "hidden" = "visible";
  let pe: "auto" | "none" = "auto";

  if (eff === "hidden") {
    const cx = rect.x + rect.w / 2 - W / 2;
    const cy = rect.y + rect.h / 2 - H / 2;
    transform = `translate(${cx}px, ${cy}px) scale(${s0})`;
    opacity = 0;
    radius = (rect.w * 0.2237) / s0;
    visibility = "hidden";
    transition = "transform .48s cubic-bezier(.2,.85,.25,1), opacity .18s linear .26s, border-radius .48s cubic-bezier(.2,.85,.25,1), visibility 0s linear .5s";
    pe = "none";
  } else if (eff === "card") {
    transform = `translate(${cardX}px, ${cardDy - 20}px) scale(${CARD})`;
    radius = 44 / CARD;
    pe = "none";
    transition = cardAnim ? "transform .42s cubic-bezier(.2,.85,.25,1), opacity .2s, border-radius .38s" : "border-radius .38s";
  } else if (drag) {
    const p = clamp(drag.dy / 380, 0, 1);
    const sc = 1 - p * 0.5;
    transform = `translate(${drag.dx * 0.4}px, ${-drag.dy * 0.35}px) scale(${sc})`;
    radius = 8 + p * 40;
    transition = "none";
  } else {
    radius = spec.radius;
  }
  if (eff === "fg" && !drag) radius = spec.radius > 0 ? spec.radius : 0;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-ios-bg"
      style={{
        transform,
        opacity,
        borderRadius: radius,
        transition,
        visibility,
        pointerEvents: pe,
        zIndex: z,
        willChange: "transform",
        ["--safe-top" as string]: `${spec.safeTop}px`,
        ["--safe-bottom" as string]: `${kbOpen && eff === "fg" ? 0 : spec.safeBottom}px`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0"
        style={{ bottom: kbOpen && eff === "fg" ? spec.kbH : 0, transition: "bottom .32s cubic-bezier(.2,.8,.2,1)" }}
      >
        <AppBoundary id={id}>
          <app.Comp />
        </AppBoundary>
      </div>
    </div>
  );
});

export function AppLayer() {
  const spec = useSpec();
  const running = useOS((s) => s.running);
  const fg = useOS((s) => s.foreground);
  const switcher = useOS((s) => s.switcher);
  const rects = useOS((s) => s.launchRects);
  const kbOpen = useOS((s) => s.kbOpen);
  const locked = useOS((s) => s.locked);
  const scale = useOS((s) => s.scale);
  const W = spec.w;
  const H = spec.h;
  const spacing = W * CARD + 24;
  const cardW = W * CARD;
  const cardH = H * CARD;

  const [scrollX, setScrollX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismiss, setDismiss] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<{ dy: number; dx: number } | null>(null);
  const sw = useRef({ x: 0, y: 0, sx: 0, axis: "" as "" | "x" | "y", id: "" as string, moved: false, t: 0 });
  const strip = useRef({ x: 0, y: 0, t: 0 });
  const stripVal = useRef({ dy: 0, dx: 0, on: false });

  useEffect(() => {
    if (switcher) {
      setScrollX(0);
      setDismiss({});
    }
  }, [switcher]);

  const maxScroll = Math.max(0, (running.length - 1) * spacing);
  const defaultRect: Rect = { x: W / 2 - 30, y: H - 110, w: 60, h: 60 };

  /* ----- bottom swipe bar ----- */
  const onStripDown = (e: React.PointerEvent) => {
    strip.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    stripVal.current = { dy: 0, dx: 0, on: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ dy: 0, dx: 0 });
  };
  const onStripMove = (e: React.PointerEvent) => {
    if (!stripVal.current.on) return;
    stripVal.current.dy = (strip.current.y - e.clientY) / scale;
    stripVal.current.dx = (e.clientX - strip.current.x) / scale;
    setDrag({ dy: stripVal.current.dy, dx: stripVal.current.dx });
  };
  const onStripUp = () => {
    if (!stripVal.current.on) return;
    stripVal.current.on = false;
    const { dy, dx } = stripVal.current;
    const dt = Math.max(1, performance.now() - strip.current.t);
    const v = dy / dt;
    setDrag(null);
    const st = useOS.getState();
    if (st.switcher) {
      if (dy > 40) st.goHome();
      return;
    }
    if (st.foreground) {
      if (Math.abs(dx) > 90 && dy < 50 && st.running.length > 1) {
        st.openApp(st.running[1]);
      } else if (dy > 200 || v > 0.7) st.goHome();
      else if (dy > 55) st.openSwitcher();
    } else if (dy > 55 && v < 0.6) st.openSwitcher();
  };

  /* ----- switcher interactions ----- */
  const swDown = (e: React.PointerEvent) => {
    const el = (e.target as HTMLElement).closest("[data-card]") as HTMLElement | null;
    sw.current = { x: e.clientX, y: e.clientY, sx: scrollX, axis: "", id: el?.dataset.card ?? "", moved: false, t: performance.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const swMove = (e: React.PointerEvent) => {
    const c = sw.current;
    if (c.t === 0) return;
    const dx = (e.clientX - c.x) / scale;
    const dy = (e.clientY - c.y) / scale;
    if (!c.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      c.axis = Math.abs(dy) > Math.abs(dx) && c.id ? "y" : "x";
      c.moved = true;
      setDragging(true);
    }
    if (c.axis === "x") setScrollX(clamp(c.sx - dx, -60, maxScroll + 60));
    else setDismiss((d) => ({ ...d, [c.id]: Math.min(0, dy) }));
  };
  const swUp = (e: React.PointerEvent) => {
    const c = sw.current;
    if (c.t === 0) return;
    const dt = performance.now() - c.t;
    sw.current.t = 0;
    setDragging(false);
    const dy = (e.clientY - c.y) / scale;
    if (!c.moved) {
      if (c.id) useOS.getState().closeSwitcher(c.id);
      else useOS.getState().closeSwitcher();
      return;
    }
    if (c.axis === "x") {
      const v = ((c.x - e.clientX) / scale / Math.max(1, dt)) * 180;
      const target = clamp(Math.round((scrollX + (dt < 250 ? v : 0)) / spacing), 0, Math.max(0, running.length - 1));
      setScrollX(target * spacing);
    } else if (c.axis === "y") {
      if (dy < -110 || (dy < -40 && dy / dt < -0.5)) {
        setDismiss((d) => ({ ...d, [c.id]: -H }));
        const id = c.id;
        setTimeout(() => {
          useOS.getState().closeApp(id);
          setDismiss((d) => {
            const n = { ...d };
            delete n[id];
            return n;
          });
        }, 260);
      } else setDismiss((d) => ({ ...d, [c.id]: 0 }));
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    setScrollX((x) => clamp(x + (e.deltaX || e.deltaY), 0, maxScroll));
  };
  useEffect(() => {
    setScrollX((x) => clamp(x, 0, maxScroll));
  }, [maxScroll]);

  return (
    <>
      <div className="absolute inset-0 z-[20]" style={{ pointerEvents: "none" }}>
        {running.map((id, i) => {
          const mode: "fg" | "hidden" | "card" = switcher ? "card" : fg === id ? "fg" : "hidden";
          return (
            <Window
              key={id}
              id={id}
              mode={mode}
              rect={rects[id] ?? defaultRect}
              cardX={i * spacing - scrollX}
              cardDy={dismiss[id] ?? 0}
              cardAnim={!dragging || sw.current.axis === ""}
              drag={fg === id && !switcher ? drag : null}
              kbOpen={kbOpen}
              z={fg === id ? 3 : 2}
            />
          );
        })}
      </div>

      {/* app switcher interaction layer */}
      {switcher && (
        <div
          className="absolute inset-0 z-[30] touch-none"
          onPointerDown={swDown}
          onPointerMove={swMove}
          onPointerUp={swUp}
          onPointerCancel={swUp}
          onWheel={onWheel}
        >
          {running.length === 0 && (
            <div className="absolute inset-x-0 top-[44%] text-center text-[20px] font-semibold text-white/90">No Recent Apps</div>
          )}
          {running.map((id, i) => {
            const x = i * spacing - scrollX;
            const dy = dismiss[id] ?? 0;
            const app = APPS[id];
            if (!app || Math.abs(x) > W * 1.2) return null;
            return (
              <div key={id}>
                <div
                  className="absolute flex items-center gap-2 text-white"
                  style={{
                    left: W / 2 - cardW / 2 + x,
                    top: H / 2 - cardH / 2 - 20 + dy - 42,
                    width: cardW,
                    opacity: dy < -40 ? 0 : 1,
                    transition: dragging ? "opacity .2s" : "all .38s cubic-bezier(.2,.85,.25,1)",
                  }}
                >
                  <AppIcon id={id} size={30} />
                  <span className="truncate text-[15px] font-semibold drop-shadow">{app.name}</span>
                </div>
                <div
                  data-card={id}
                  className="absolute cursor-pointer"
                  style={{
                    left: W / 2 - cardW / 2 + x,
                    top: H / 2 - cardH / 2 - 20 + dy,
                    width: cardW,
                    height: cardH,
                    transition: dragging && sw.current.axis ? "none" : "all .38s cubic-bezier(.2,.85,.25,1)",
                  }}
                />
              </div>
            );
          })}
          {running.length > 0 && (
            <div className="absolute inset-x-0 text-center">
              <button
                className="glass-dark absolute left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[14px] font-medium text-white"
                style={{ top: H - 130 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  const st = useOS.getState();
                  st.set({ running: [], foreground: null });
                  st.closeSwitcher(null);
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* home gesture bar */}
      {!spec.homeButton && !locked && (
        <div
          className="absolute inset-x-0 bottom-0 z-[100] touch-none"
          style={{ height: 30 }}
          onPointerDown={onStripDown}
          onPointerMove={onStripMove}
          onPointerUp={onStripUp}
          onPointerCancel={onStripUp}
        />
      )}
    </>
  );
}
