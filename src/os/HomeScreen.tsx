import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Pencil, Trash2, Plus, LayoutGrid } from "lucide-react";
import { useOS, type LayoutItem, type Rect } from "./store";
import { useSpec } from "./device-context";
import { APPS, runQuickAction } from "./registry";
import { AppIcon, FolderIcon } from "./icons";
import { WidgetView, WIDGET_APP } from "./Widgets";
import { SearchField, ScrollView, useLongPress } from "./ui";
import { clamp, cx } from "./utils";
import { sfx } from "./sound";

export function relRect(el: Element): Rect {
  const root = document.querySelector("[data-screen-root]") as HTMLElement | null;
  const r = el.getBoundingClientRect();
  const rr = root?.getBoundingClientRect() ?? ({ left: 0, top: 0 } as DOMRect);
  const s = useOS.getState().scale || 1;
  return { x: (r.left - rr.left) / s, y: (r.top - rr.top) / s, w: r.width / s, h: r.height / s };
}

interface Placed {
  item: LayoutItem;
  idx: number;
  col: number;
  row: number;
  w: number;
  h: number;
}

function paginate(layout: LayoutItem[], rows: number): Placed[][] {
  const pages: Placed[][] = [];
  let occ: boolean[][] = [];
  let cur: Placed[] = [];
  const newPage = () => {
    cur = [];
    pages.push(cur);
    occ = Array.from({ length: rows }, () => [false, false, false, false]);
  };
  newPage();
  layout.forEach((item, idx) => {
    const w = item.t === "widget" ? item.w : 1;
    const h = item.t === "widget" ? Math.min(item.h, rows) : 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      let done = false;
      for (let r = 0; r + h <= rows && !done; r++) {
        for (let c = 0; c + w <= 4 && !done; c++) {
          let free = true;
          for (let rr = r; rr < r + h && free; rr++) for (let cc = c; cc < c + w; cc++) if (occ[rr][cc]) free = false;
          if (free) {
            for (let rr = r; rr < r + h; rr++) for (let cc = c; cc < c + w; cc++) occ[rr][cc] = true;
            cur.push({ item, idx, col: c, row: r, w, h });
            done = true;
          }
        }
      }
      if (done) break;
      newPage();
    }
  });
  const out = pages.filter((p) => p.length > 0);
  return out.length ? out : [[]];
}

/* ------------------------------------------------------------------ */

interface IconProps {
  id: string;
  edit: boolean;
  delay?: number;
  label?: boolean;
  onOpen: (id: string, r: Rect) => void;
  onMenu: (id: string, r: Rect) => void;
  onMinus?: (id: string) => void;
  onDragStart?: (e: React.PointerEvent, el: HTMLElement) => void;
  textClass?: string;
}

function HomeIcon({ id, edit, delay = 0, label = true, onOpen, onMenu, onMinus, onDragStart, textClass }: IconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lp = useLongPress(() => {
    if (!edit && ref.current) onMenu(id, relRect(ref.current));
  });
  const app = APPS[id];
  if (!app) return null;
  return (
    <div
      ref={ref}
      className={cx("pointer-events-auto relative flex w-[72px] cursor-pointer flex-col items-center", edit && "jiggle")}
      style={{ animationDelay: `${-delay}ms` }}
      {...(edit
        ? {
            onPointerDown: (e: React.PointerEvent) => {
              e.stopPropagation();
              onDragStart?.(e, ref.current!);
            },
          }
        : lp.handlers)}
      onClick={() => {
        if (edit || lp.fired.current) return;
        if (ref.current) onOpen(id, relRect(ref.current.firstElementChild as Element));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!edit && ref.current) onMenu(id, relRect(ref.current));
      }}
    >
      <div className="transition-transform duration-150 active:scale-95">
        <AppIcon id={id} size={60} />
      </div>
      {edit && onMinus && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onMinus(id);
          }}
          className="absolute -left-1 -top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#8e8e93]/90 text-white shadow"
        >
          <Minus size={14} strokeWidth={3.5} />
        </button>
      )}
      {label && <div className={cx("mt-[5px] w-[76px] truncate text-center text-[12px] font-medium leading-[14px] text-white", textClass)} style={{ textShadow: "0 1px 4px rgba(0,0,0,.45)" }}>{app.name}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Library({ onOpen, onMenu }: { onOpen: (id: string, r: Rect) => void; onMenu: (id: string, r: Rect) => void }) {
  const spec = useSpec();
  const installed = useOS((s) => s.installed);
  const running = useOS((s) => s.running);
  const [q, setQ] = useState("");
  const [list, setList] = useState(false);
  const groups = useMemo(() => {
    const cats: Record<string, string[]> = {};
    installed.forEach((id) => {
      const c = APPS[id]?.category;
      if (c) (cats[c] ||= []).push(id);
    });
    const sugg = [...running, "messages", "safari", "photos", "music", "notes", "camera"].filter((v, i, a) => installed.includes(v) && a.indexOf(v) === i).slice(0, 4);
    const recent = installed.slice(-4).reverse();
    return [{ name: "Suggestions", apps: sugg }, { name: "Recently Added", apps: recent }, ...Object.entries(cats).map(([name, apps]) => ({ name, apps }))];
  }, [installed, running]);

  const all = installed.filter((id) => APPS[id]).sort((a, b) => APPS[a].name.localeCompare(APPS[b].name));
  const results = all.filter((id) => APPS[id].name.toLowerCase().includes(q.toLowerCase()));
  const letters = Array.from(new Set(results.map((id) => APPS[id].name[0].toUpperCase())));

  return (
    <div className="relative h-full w-full" data-nopage={list ? "1" : undefined}>
      <div className="absolute inset-x-0 flex items-center gap-2 px-4" style={{ top: spec.safeTop + 6 }}>
        <SearchField dark value={q} onChange={setQ} placeholder="App Library" className="flex-1 !bg-white/20" onFocus={() => setList(true)} />
        {list && (
          <button
            className="text-[17px] text-white"
            onClick={() => {
              setList(false);
              setQ("");
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            Cancel
          </button>
        )}
      </div>
      {!list ? (
        <ScrollView className="absolute inset-x-0 bottom-0" style={{ top: spec.safeTop + 56 }}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-[18px] px-4 pb-24">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="glass-light grid grid-cols-2 gap-[14px] rounded-[26px] p-[15px]" style={{ background: "rgba(220,220,225,0.32)" }}>
                  {g.apps.slice(0, 3).map((id) => (
                    <LibIcon key={id} id={id} onOpen={onOpen} onMenu={onMenu} />
                  ))}
                  {g.apps.length === 4 && <LibIcon id={g.apps[3]} onOpen={onOpen} onMenu={onMenu} />}
                  {g.apps.length > 4 && (
                    <div className="grid grid-cols-2 gap-[5px]">
                      {g.apps.slice(3, 7).map((id) => (
                        <button key={id} onClick={(e) => onOpen(id, relRect(e.currentTarget))}>
                          <AppIcon id={id} size={26} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-center text-[12px] font-medium text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>
                  {g.name}
                </div>
              </div>
            ))}
          </div>
        </ScrollView>
      ) : (
        <ScrollView className="absolute inset-x-4 bottom-0 rounded-t-[20px] bg-black/30 backdrop-blur-2xl" style={{ top: spec.safeTop + 56 }}>
          <div className="px-4 pb-40 pt-2">
            {letters.map((l) => (
              <div key={l}>
                <div className="pb-1 pt-3 text-[13px] font-semibold text-white/60">{l}</div>
                {results
                  .filter((id) => APPS[id].name[0].toUpperCase() === l)
                  .map((id) => (
                    <button key={id} className="flex w-full items-center gap-3 py-1.5 text-left text-white" onClick={(e) => onOpen(id, relRect(e.currentTarget.firstElementChild as Element))}>
                      <AppIcon id={id} size={44} />
                      <span className="text-[17px]">{APPS[id].name}</span>
                    </button>
                  ))}
              </div>
            ))}
            {results.length === 0 && <div className="py-10 text-center text-white/60">No Results</div>}
          </div>
        </ScrollView>
      )}
    </div>
  );
}

function LibIcon({ id, onOpen, onMenu }: { id: string; onOpen: (id: string, r: Rect) => void; onMenu: (id: string, r: Rect) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const lp = useLongPress(() => ref.current && onMenu(id, relRect(ref.current)));
  return (
    <button
      ref={ref}
      {...lp.handlers}
      onClick={() => !lp.fired.current && ref.current && onOpen(id, relRect(ref.current))}
      onContextMenu={(e) => {
        e.preventDefault();
        if (ref.current) onMenu(id, relRect(ref.current));
      }}
      className="active:scale-95"
    >
      <AppIcon id={id} size={52} />
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function HomeScreen() {
  const spec = useSpec();
  const W = spec.w;
  const H = spec.h;
  const layout = useOS((s) => s.layout);
  const dock = useOS((s) => s.dock);
  const edit = useOS((s) => s.editMode);
  const page = useOS((s) => s.homePage);
  const scale = useOS((s) => s.scale);
  const set = useOS((s) => s.set);
  const pages = useMemo(() => paginate(layout, spec.rows), [layout, spec.rows]);
  const P = pages.length;
  const total = P + 1;
  const cur = Math.min(page, total - 1);

  const sidePad = 19;
  const duoInner = spec.id === "duo-inner";
  const cellW = (W - sidePad * 2 - (duoInner ? 108 : 0)) / 4;
  const dockH = spec.homeButton ? 88 : 96;
  const dockBottom = spec.homeButton ? 6 : 10;
  const dockTop = H - dockBottom - dockH;
  const dotsY = dockTop - 26;
  const gridTop = spec.safeTop + 8;
  const cellH = Math.min(104, (dotsY - 10 - gridTop) / spec.rows);

  const [dragX, setDragX] = useState(0);
  const [paging, setPaging] = useState(false);
  const [folder, setFolder] = useState<{ id: string; rect: Rect } | null>(null);
  const [menu, setMenu] = useState<{ kind: "app" | "widget" | "folder" | "lib"; id: string; rect: Rect } | null>(null);
  const [dragIt, setDragIt] = useState<{ idx: number; id: string; x: number; y: number } | null>(null);
  const g = useRef({ x: 0, y: 0, axis: "" as "" | "x" | "y", down: false, t: 0, bg: false, lp: 0 });
  const wheelT = useRef(0);
  const curRef = useRef(cur);
  curRef.current = cur;

  useEffect(() => {
    if (page !== cur) set({ homePage: cur });
  }, [page, cur, set]);

  const open = (id: string, r: Rect) => {
    setFolder(null);
    setMenu(null);
    useOS.getState().openApp(id, r);
  };
  const openMenu = (kind: "app" | "widget" | "folder" | "lib") => (id: string, rect: Rect) => {
    sfx.pop();
    setMenu({ kind, id, rect });
  };

  /* --- page swiping --- */
  const onDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-nopage]")) return;
    g.current = { x: e.clientX, y: e.clientY, axis: "", down: true, t: performance.now(), bg: !!t.closest("[data-bg]") && !t.closest("button"), lp: 0 };
    if (g.current.bg && !edit) {
      g.current.lp = window.setTimeout(() => {
        if (g.current.down && !g.current.axis) {
          sfx.pop();
          set({ editMode: true });
        }
      }, 600);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const c = g.current;
    if (!c.down) return;
    const dx = (e.clientX - c.x) / scale;
    const dy = (e.clientY - c.y) / scale;
    if (!c.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      window.clearTimeout(c.lp);
      c.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (c.axis === "x") {
        setPaging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
    if (c.axis === "x") {
      let d = dx;
      if ((cur === 0 && d > 0) || (cur === total - 1 && d < 0)) d *= 0.3;
      setDragX(d);
    } else if (c.axis === "y" && dy > 70 && !edit && cur < P) {
      c.down = false;
      set({ spotlight: true });
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const c = g.current;
    window.clearTimeout(c.lp);
    if (!c.down) return;
    c.down = false;
    if (c.axis === "x") {
      const dx = (e.clientX - c.x) / scale;
      const v = dx / Math.max(1, performance.now() - c.t);
      let n = cur;
      if (dx < -W * 0.18 || v < -0.45) n = cur + 1;
      else if (dx > W * 0.18 || v > 0.45) n = cur - 1;
      set({ homePage: clamp(n, 0, total - 1) });
      setPaging(false);
      setDragX(0);
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, true), 50);
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20 && Date.now() - wheelT.current > 450) {
      wheelT.current = Date.now();
      set({ homePage: clamp(cur + (e.deltaX > 0 ? 1 : -1), 0, total - 1) });
    }
  };

  /* --- reorder drag (edit mode) --- */
  const startDrag = (idx: number, id: string) => (e: React.PointerEvent) => {
    const root = document.querySelector("[data-screen-root]") as HTMLElement;
    const sx = e.clientX;
    const sy = e.clientY;
    let started = false;
    let lastSwap = 0;
    let edgeT = 0;
    let curIdx = idx;
    const pos = (ev: PointerEvent) => {
      const rr = root.getBoundingClientRect();
      return { x: (ev.clientX - rr.left) / scale, y: (ev.clientY - rr.top) / scale };
    };
    const move = (ev: PointerEvent) => {
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        started = true;
      }
      const p = pos(ev);
      setDragIt({ idx: curIdx, id, x: p.x, y: p.y });
      // edge paging
      window.clearTimeout(edgeT);
      if (p.x < 22 && curRef.current > 0) edgeT = window.setTimeout(() => useOS.getState().set({ homePage: curRef.current - 1 }), 550);
      else if (p.x > W - 22 && curRef.current < P - 1) edgeT = window.setTimeout(() => useOS.getState().set({ homePage: curRef.current + 1 }), 550);
      // hit test on current page
      if (Date.now() - lastSwap < 220) return;
      const lay = useOS.getState().layout;
      const pg = paginate(lay, spec.rows)[curRef.current] ?? [];
      const hit = pg.find((pl) => {
        if (pl.idx === curIdx) return false;
        const l = sidePad + pl.col * cellW;
        const t = gridTop + pl.row * cellH;
        return p.x >= l && p.x <= l + pl.w * cellW && p.y >= t && p.y <= t + pl.h * cellH;
      });
      if (hit) {
        const arr = lay.slice();
        const [m] = arr.splice(curIdx, 1);
        arr.splice(hit.idx, 0, m);
        curIdx = hit.idx;
        lastSwap = Date.now();
        useOS.setState({ layout: arr });
        sfx.tock();
      } else if (!pg.some((pl) => pl.idx === curIdx)) {
        // dragged onto a different page with no hit -> move to end of that page
        const target = pg.length ? pg[pg.length - 1].idx : lay.length - 1;
        const arr = lay.slice();
        const [m] = arr.splice(curIdx, 1);
        arr.splice(Math.min(target, arr.length), 0, m);
        curIdx = Math.min(target, arr.length - 1);
        lastSwap = Date.now();
        useOS.setState({ layout: arr });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.clearTimeout(edgeT);
      setDragIt(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const removeFromHome = (id: string) => {
    const s = useOS.getState();
    useOS.setState({ layout: s.layout.filter((it) => !(it.t === "app" && it.id === id)), dock: s.dock.filter((d) => d !== id) });
  };
  const askRemove = (id: string) => {
    const s = useOS.getState();
    s.showAlert({
      title: `Remove “${APPS[id]?.name}”?`,
      message: "Removing from Home Screen keeps the app in your App Library.",
      buttons: [
        { text: "Delete App", style: "destructive", onPress: () => s.uninstall(id) },
        { text: "Remove from Home Screen", onPress: () => removeFromHome(id) },
        { text: "Cancel", style: "cancel", bold: true },
      ],
    });
  };

  const libP = clamp(cur + (paging ? -dragX / W : 0) - (P - 1), 0, 1);
  const trackX = -cur * W + dragX;
  const folderItem = folder ? (layout.find((i) => i.t === "folder" && i.id === folder.id) as Extract<LayoutItem, { t: "folder" }> | undefined) : undefined;
  const inHome = (id: string) => layout.some((it) => it.t === "app" && it.id === id) || dock.includes(id);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ touchAction: "pan-y" }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      <div className="pointer-events-none absolute inset-0 bg-black/30 backdrop-blur-2xl transition-opacity" style={{ opacity: libP, backdropFilter: `blur(${libP * 30}px)` }} />

      {/* pages track */}
      <div className="absolute inset-0" style={{ width: total * W, transform: `translateX(${trackX}px)`, transition: paging || dragIt ? "none" : "transform .38s cubic-bezier(.2,.85,.25,1)" }}>
        {pages.map((pg, pi) => (
          <div key={pi} data-bg className="absolute top-0 h-full" style={{ left: pi * W, width: W }}>
            {pg.map((pl) => {
              const it = pl.item;
              const left = sidePad + pl.col * cellW;
              const top = gridTop + pl.row * cellH;
              const hidden = dragIt?.idx === pl.idx;
              const style = { left, top, width: pl.w * cellW, height: pl.h * cellH, opacity: hidden ? 0 : 1 };
              const delay = (pl.idx * 53) % 260;
              if (it.t === "app")
                return (
                  <div key={`a:${it.id}`} className="pointer-events-none absolute flex justify-center pt-[6px]" style={style}>
                    <HomeIcon id={it.id} edit={edit} delay={delay} onOpen={open} onMenu={openMenu("app")} onMinus={askRemove} onDragStart={(e) => startDrag(pl.idx, it.id)(e)} />
                  </div>
                );
              if (it.t === "folder")
                return (
                  <div key={`f:${it.id}`} className="pointer-events-none absolute flex justify-center pt-[6px]" style={style}>
                    <FolderButton
                      folder={it}
                      edit={edit}
                      delay={delay}
                      onOpen={(r) => setFolder({ id: it.id, rect: r })}
                      onMenu={(r) => openMenu("folder")(it.id, r)}
                      onDragStart={(e) => startDrag(pl.idx, it.id)(e)}
                    />
                  </div>
                );
              return (
                <div key={`w:${it.id}`} className="pointer-events-none absolute" style={style}>
                  <WidgetBox
                    id={it.id}
                    w={pl.w * cellW - 28}
                    h={Math.min(pl.h * cellW - 28, pl.h * cellH - 12)}
                    edit={edit}
                    delay={delay}
                    onOpen={(r) => open(WIDGET_APP[it.id] ?? it.id, r)}
                    onMenu={(r) => openMenu("widget")(it.id, r)}
                    onRemove={() => useOS.setState({ layout: useOS.getState().layout.filter((x) => !(x.t === "widget" && x.id === it.id)) })}
                    onDragStart={(e) => startDrag(pl.idx, it.id)(e)}
                  />
                </div>
              );
            })}
          </div>
        ))}
        <div className="absolute top-0 h-full" style={{ left: P * W, width: W }}>
          <Library onOpen={open} onMenu={openMenu("lib")} />
        </div>
      </div>

      {/* page dots */}
      <div className="pointer-events-auto absolute inset-x-0 flex items-center justify-center gap-[9px]" style={{ top: dotsY, opacity: 1 - libP }}>
        {edit ? (
          <div className="glass-dark rounded-full px-3 py-1 text-[12px] font-medium text-white">Drag icons to rearrange</div>
        ) : (
          Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => set({ homePage: i })} className="flex h-3 w-3 items-center justify-center" data-nopage>
              <span className="block rounded-full bg-white transition-all" style={{ width: 7, height: 7, opacity: i === cur ? 1 : 0.4, transform: i === cur ? "scale(1)" : "scale(0.95)" }} />
            </button>
          ))
        )}
      </div>

      {/* dock */}
      <div
        className="glass-light absolute left-3 right-3 flex items-center justify-around rounded-[36px]"
        style={{ ...(duoInner ? { left: "auto", right: 12, top: "50%", width: 100, height: 360, flexDirection: "column" as const } : { top: dockTop, height: dockH }), opacity: 1 - libP, transform: duoInner ? `translateY(calc(-50% + ${libP * 40}px))` : `translateY(${libP * 40}px)`, pointerEvents: libP > 0.5 ? "none" : "auto", }}
      >
        {dock.map((id, i) => (
          <HomeIcon key={id} id={id} edit={edit} delay={i * 70} label={false} onOpen={open} onMenu={openMenu("app")} onMinus={askRemove} />
        ))}
      </div>

      {/* edit mode top bar */}
      {edit && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-4" style={{ top: spec.safeTop - 8 }}>
          <button className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur" onClick={() => useOS.getState().showToast("Widgets can be arranged by dragging")}>
            <Plus size={20} />
          </button>
          <button className="pointer-events-auto rounded-full bg-white/25 px-4 py-1 text-[15px] font-semibold text-white backdrop-blur" onClick={() => set({ editMode: false })}>
            Done
          </button>
        </div>
      )}

      {/* dragged item */}
      {dragIt && (
        <div className="pointer-events-none absolute z-50" style={{ left: dragIt.x - 36, top: dragIt.y - 36, transform: "scale(1.15)", filter: "drop-shadow(0 8px 14px rgba(0,0,0,.4))" }}>
          {APPS[dragIt.id] ? (
            <AppIcon id={dragIt.id} size={72} />
          ) : (
            <div className="h-[72px] w-[72px] rounded-2xl bg-white/50 backdrop-blur" />
          )}
        </div>
      )}

      {/* folder overlay */}
      {folder && folderItem && (
        <div className="absolute inset-0 z-40" onPointerDown={(e) => e.stopPropagation()}>
          <div className="fade-in absolute inset-0 bg-black/25 backdrop-blur-2xl" onClick={() => setFolder(null)} />
          <div className="pop-in absolute left-[30px] right-[30px] text-center" style={{ top: spec.safeTop + 90 }}>
            <div className="mb-4 text-[26px] font-semibold text-white">{folderItem.name}</div>
            <div className="grid grid-cols-3 justify-items-center gap-y-5 rounded-[38px] px-4 py-6" style={{ background: "rgba(200,200,205,0.35)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" }}>
              {folderItem.apps.map((id) => (
                <HomeIcon key={id} id={id} edit={false} onOpen={open} onMenu={openMenu("app")} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* context menu */}
      {menu && (
        <div className="absolute inset-0 z-50" onPointerDown={(e) => e.stopPropagation()}>
          <div className="fade-in absolute inset-0 bg-black/30 backdrop-blur-xl" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
          {menu.kind === "app" || menu.kind === "lib" ? (
            <div className="pointer-events-none absolute flex flex-col items-center" style={{ left: menu.rect.x + menu.rect.w / 2 - 36, top: menu.rect.y + (menu.kind === "lib" ? 0 : 6), width: 72 }}>
              <AppIcon id={menu.id} size={menu.kind === "lib" ? 52 : 60} />
            </div>
          ) : null}
          <div
            className="pop-in glass absolute w-[250px] overflow-hidden rounded-[14px] text-[17px]"
            style={{
              left: clamp(menu.rect.x + menu.rect.w / 2 - 125, 12, W - 262),
              top: menu.rect.y > H * 0.55 ? undefined : menu.rect.y + menu.rect.h + 10,
              bottom: menu.rect.y > H * 0.55 ? H - menu.rect.y + 10 : undefined,
              color: "var(--ios-label)",
              transformOrigin: "top center",
            }}
          >
            {(menu.kind === "app" || menu.kind === "lib") &&
              APPS[menu.id]?.actions?.map((a) => (
                <MenuRow key={a.action} label={a.label} onClick={() => { setMenu(null); runQuickAction(menu.id, a.action, (id) => useOS.getState().openApp(id, menu.rect)); }} />
              ))}
            {menu.kind === "lib" && !inHome(menu.id) && (
              <MenuRow label="Add to Home Screen" icon={<Plus size={18} />} onClick={() => { useOS.setState({ layout: [...layout, { t: "app", id: menu.id }] }); setMenu(null); }} />
            )}
            {menu.kind !== "lib" && <MenuRow label="Edit Home Screen" icon={<Pencil size={17} />} onClick={() => { setMenu(null); set({ editMode: true }); }} />}
            {(menu.kind === "app" || menu.kind === "lib") && (
              <MenuRow label={menu.kind === "lib" ? "Delete App" : "Remove App"} red icon={<Trash2 size={17} />} onClick={() => { const id = menu.id; setMenu(null); if (menu.kind === "lib") useOS.getState().uninstall(id); else askRemove(id); }} />
            )}
            {menu.kind === "widget" && (
              <MenuRow label="Remove Widget" red icon={<Trash2 size={17} />} onClick={() => { useOS.setState({ layout: layout.filter((x) => !(x.t === "widget" && x.id === menu.id)) }); setMenu(null); }} />
            )}
            {menu.kind === "folder" && <MenuRow label="Rename Folder" icon={<LayoutGrid size={17} />} onClick={() => setMenu(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({ label, onClick, red, icon }: { label: string; onClick: () => void; red?: boolean; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="ios-row flex h-[44px] w-full items-center justify-between px-4 text-left active:bg-black/10" style={{ color: red ? "var(--ios-red)" : undefined, ["--sep-left" as string]: "0px" }}>
      <span>{label}</span>
      {icon}
    </button>
  );
}

function FolderButton({ folder, edit, delay, onOpen, onMenu, onDragStart }: { folder: Extract<LayoutItem, { t: "folder" }>; edit: boolean; delay: number; onOpen: (r: Rect) => void; onMenu: (r: Rect) => void; onDragStart: (e: React.PointerEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lp = useLongPress(() => !edit && ref.current && onMenu(relRect(ref.current)));
  return (
    <div
      ref={ref}
      className={cx("pointer-events-auto flex w-[72px] cursor-pointer flex-col items-center", edit && "jiggle")}
      style={{ animationDelay: `${-delay}ms` }}
      {...(edit ? { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onDragStart(e); } } : lp.handlers)}
      onClick={() => !edit && !lp.fired.current && ref.current && onOpen(relRect(ref.current))}
      onContextMenu={(e) => { e.preventDefault(); if (ref.current) onMenu(relRect(ref.current)); }}
    >
      <div className="transition-transform active:scale-95">
        <FolderIcon apps={folder.apps} size={60} />
      </div>
      <div className="mt-[5px] w-[76px] truncate text-center text-[12px] font-medium leading-[14px] text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,.45)" }}>
        {folder.name}
      </div>
    </div>
  );
}

function WidgetBox({ id, w, h, edit, delay, onOpen, onMenu, onRemove, onDragStart }: { id: string; w: number; h: number; edit: boolean; delay: number; onOpen: (r: Rect) => void; onMenu: (r: Rect) => void; onRemove: () => void; onDragStart: (e: React.PointerEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lp = useLongPress(() => !edit && ref.current && onMenu(relRect(ref.current)));
  return (
    <div
      ref={ref}
      className={cx("pointer-events-auto absolute", edit && "jiggle")}
      style={{ left: 14, top: 6, width: w, height: h, animationDelay: `${-delay}ms`, boxShadow: "0 2px 12px rgba(0,0,0,.15)", borderRadius: 22 }}
      {...(edit ? { onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); onDragStart(e); } } : lp.handlers)}
      onContextMenu={(e) => { e.preventDefault(); if (ref.current) onMenu(relRect(ref.current)); }}
    >
      <div className="h-full w-full" style={{ pointerEvents: edit ? "none" : "auto" }}>
        <WidgetView
          id={id}
          onOpen={() => {
            if (!edit && !lp.fired.current && ref.current) onOpen(relRect(ref.current));
          }}
        />
      </div>
      {edit && (
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onRemove} className="absolute -left-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#8e8e93]/90 text-white shadow">
          <Minus size={14} strokeWidth={3.5} />
        </button>
      )}
    </div>
  );
}
