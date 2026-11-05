import { useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Bluetooth,
  Calculator,
  Camera,
  Flashlight,
  Lock,
  Moon,
  Pause,
  Play,
  Plane,
  Radio,
  Settings,
  SkipBack,
  SkipForward,
  StickyNote,
  Sun,
  SunMoon,
  Timer,
  Volume2,
  Wifi,
  Zap,
  Cast,
  BatteryLow,
  Briefcase,
  Home as HomeIcon,
  Bed,
} from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { TRACKS, artGradient, musicNext, musicPrev, musicToggle } from "./music";
import { sendAction } from "./actions";
import { useDark } from "./store";
import { sfx } from "./sound";

function Tile({ on, onClick, children, className = "", color = "#fff", fg = "#000" }: { on?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; color?: string; fg?: string }) {
  return (
    <button
      onClick={onClick}
      className={`glass-dark flex items-center justify-center rounded-[22px] text-white transition-colors active:scale-95 ${className}`}
      style={on ? { background: color, color: fg, backdropFilter: "none" } : undefined}
    >
      {children}
    </button>
  );
}

function Round({ on, onClick, color, children }: { on: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors active:scale-90" style={{ background: on ? color : "rgba(255,255,255,0.22)", color: "#fff" }}>
      {children}
    </button>
  );
}

function VSlider({ value, onChange, icon }: { value: number; onChange: (v: number) => void; icon: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const calc = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)));
  };
  return (
    <div
      ref={ref}
      className="glass-dark relative h-full w-full touch-none overflow-hidden rounded-[22px]"
      onPointerDown={(e) => {
        down.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        calc(e);
      }}
      onPointerMove={(e) => down.current && calc(e)}
      onPointerUp={() => (down.current = false)}
    >
      <div className="absolute inset-x-0 bottom-0 bg-white" style={{ height: `${value * 100}%` }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center text-black mix-blend-difference" style={{ color: "#fff" }}>
        {icon}
      </div>
    </div>
  );
}

export function ControlCenter() {
  const spec = useSpec();
  const s = useOS();
  const dark = useDark();
  const track = TRACKS[s.music.idx];
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const cell = (spec.w - 44 - 36) / 4;
  const close = () => { sfx.sheetClose(); s.set({ cc: false }); };
  const go = (id: string, action?: string) => {
    s.set({ cc: false });
    setTimeout(() => {
      useOS.getState().openApp(id);
      if (action) sendAction(id, action);
    }, 60);
  };

  return (
    <div
      className="absolute inset-0 z-[56]"
      style={{
        opacity: s.cc ? 1 : 0,
        visibility: s.cc ? "visible" : "hidden",
        pointerEvents: s.cc ? "auto" : "none",
        transition: `opacity .28s ease, visibility 0s linear ${s.cc ? 0 : 0.28}s`,
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button,[data-cc]")) return;
        start.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (start.current !== null) setDy(Math.max(0, (start.current - e.clientY) / s.scale));
      }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const moved = Math.abs(start.current - e.clientY) / s.scale;
        start.current = null;
        if (dy > 60 || moved < 6) close();
        setDy(0);
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[40px]" />
      <div
        className="absolute inset-x-[22px]"
        style={{ top: spec.safeTop + 6, transform: `scale(${s.cc ? 1 : 0.92}) translateY(${-dy}px)`, transformOrigin: "top right", transition: start.current !== null ? "none" : "transform .35s cubic-bezier(.2,.9,.3,1)" }}
        data-cc
      >
        <div className="grid grid-cols-4 gap-3" style={{ gridAutoRows: cell }}>
          {/* connectivity */}
          <div className="glass-dark col-span-2 row-span-2 grid grid-cols-2 place-items-center rounded-[26px] p-2">
            <Round on={s.airplane} color="#ff9f0a" onClick={() => s.setAirplane(!s.airplane)}>
              <Plane size={24} fill={s.airplane ? "#fff" : "none"} />
            </Round>
            <Round on={s.cellular && !s.airplane} color="#30d158" onClick={() => s.set({ cellular: !s.cellular })}>
              <Radio size={24} />
            </Round>
            <Round on={s.wifi} color="#0a84ff" onClick={() => s.set({ wifi: !s.wifi, airplane: s.airplane && !s.wifi ? s.airplane : s.airplane })}>
              <Wifi size={24} />
            </Round>
            <Round on={s.bluetooth} color="#0a84ff" onClick={() => s.set({ bluetooth: !s.bluetooth })}>
              <Bluetooth size={24} />
            </Round>
          </div>

          {/* now playing */}
          <div className="glass-dark col-span-2 row-span-2 flex flex-col justify-between overflow-hidden rounded-[26px] p-3 text-white">
            {s.music.active ? (
              <>
                <div className="flex items-start gap-2">
                  <div className="h-[44px] w-[44px] shrink-0 rounded-[8px]" style={{ background: artGradient(track) }} />
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{track.title}</div>
                    <div className="truncate text-[12px] text-white/60">{track.artist}</div>
                  </div>
                </div>
                <div className="flex items-center justify-around pb-1">
                  <button onClick={musicPrev}><SkipBack size={22} fill="#fff" /></button>
                  <button onClick={musicToggle}>{s.music.playing ? <Pause size={30} fill="#fff" /> : <Play size={30} fill="#fff" />}</button>
                  <button onClick={() => musicNext()}><SkipForward size={22} fill="#fff" /></button>
                </div>
              </>
            ) : (
              <button className="flex h-full flex-col items-center justify-center gap-2 text-white/70" onClick={() => go("music")}>
                <Play size={28} />
                <span className="text-[13px] font-medium">Not Playing</span>
              </button>
            )}
          </div>

          {/* orientation + mirroring */}
          <Tile on={s.orientationLock} color="#ff453a" fg="#fff" onClick={() => { s.set({ orientationLock: !s.orientationLock }); s.showToast(`Portrait Orientation Lock: ${s.orientationLock ? "Off" : "On"}`); }}>
            <Lock size={24} />
          </Tile>
          <Tile onClick={() => s.showToast("No AirPlay devices found")}>
            <Cast size={24} />
          </Tile>

          {/* brightness & volume */}
          <div className="row-span-2" data-cc>
            <VSlider value={s.brightness} onChange={(v) => s.set({ brightness: Math.max(0.12, v) })} icon={<Sun size={24} />} />
          </div>
          <div className="row-span-2" data-cc>
            <VSlider
              value={s.volume}
              onChange={(v) => {
                s.set({ volume: v });
              }}
              icon={<Volume2 size={24} />}
            />
          </div>

          {/* focus */}
          <FocusTile />

          {/* quick tiles */}
          <Tile on={s.flashlight} onClick={() => { s.set({ flashlight: !s.flashlight }); sfx.toggleOn(); }}>
            <Flashlight size={26} fill={s.flashlight ? "#000" : "none"} />
          </Tile>
          <Tile onClick={() => { go("clock", "timer"); sfx.tick(); }}>
            <Timer size={26} />
          </Tile>
          <Tile onClick={() => go("calculator")}>
            <Calculator size={26} />
          </Tile>
          <Tile onClick={() => go("camera")}>
            <Camera size={26} />
          </Tile>

          <Tile on={dark} onClick={() => { s.set({ appearance: dark ? "light" : "dark" }); sfx.toggleOn(); }}>
            <SunMoon size={26} />
          </Tile>
          <Tile on={s.lowPower} color="#ffd60a" onClick={() => { s.set({ lowPower: !s.lowPower }); sfx.toggleOn(); }}>
            <BatteryLow size={26} />
          </Tile>
          <Tile on={s.silent} color="#ff453a" fg="#fff" onClick={() => { s.toggleSilent(); sfx.toggleOn(); }}>
            {s.silent ? <BellOff size={26} /> : <Bell size={26} />}
          </Tile>
          <Tile onClick={() => go("notes", "new")}>
            <StickyNote size={26} />
          </Tile>

          <Tile className="col-span-2 !justify-start gap-2.5 px-4" onClick={() => go("settings")}>
            <Settings size={22} />
            <span className="text-[15px] font-semibold">Settings</span>
          </Tile>
          <Tile on={s.charging} color="#30d158" className="col-span-2 !justify-start gap-2.5 px-4" onClick={() => { const next = !s.charging; s.set({ charging: next }); if (next) sfx.charge(); else sfx.toggleOff(); }}>
            <Zap size={22} fill={s.charging ? "#000" : "none"} />
            <span className="text-[15px] font-semibold">{s.charging ? "Charging" : "Plug In"}</span>
          </Tile>
        </div>
        <div className="mt-4 text-center text-[12px] text-white/50">Tap anywhere or swipe up to close</div>
      </div>
    </div>
  );
}

const FOCUS_MODES: { id: "off" | "dnd" | "personal" | "work" | "sleep"; label: string; icon: typeof Moon; color: string }[] = [
  { id: "off", label: "Off", icon: Bell, color: "#8e8e93" },
  { id: "dnd", label: "Do Not Disturb", icon: Moon, color: "#5e5ce6" },
  { id: "personal", label: "Personal", icon: HomeIcon, color: "#ff9500" },
  { id: "work", label: "Work", icon: Briefcase, color: "#0a84ff" },
  { id: "sleep", label: "Sleep", icon: Bed, color: "#5856d6" },
];

function FocusTile() {
  const focus = useOS((s) => s.focus);
  const set = useOS((s) => s.set);
  const [open, setOpen] = useState(false);
  const cur = FOCUS_MODES.find((f) => f.id === focus) ?? FOCUS_MODES[0];
  const on = focus !== "off";

  const pick = (id: typeof focus) => {
    set({ focus: id, dnd: id === "dnd" });
    if (id === "sleep") set({ appearance: "dark" });
    setOpen(false);
  };

  return (
    <>
      <div className="col-span-2 flex gap-2" data-cc>
        <Tile on={on} color={cur.color} fg="#fff" className="flex-1 !justify-start gap-2.5 px-4" onClick={() => pick(on ? "off" : "dnd")}>
          <cur.icon size={22} fill={on ? "#fff" : "none"} />
          <span className="truncate text-[14px] font-semibold">{on ? cur.label : "Focus"}</span>
        </Tile>
        <Tile onClick={() => setOpen(true)} className="!w-12 !px-0">
          <span className="text-[20px] font-light text-white/70 leading-none">⌄</span>
        </Tile>
      </div>
      {open && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative rounded-2xl bg-[#1c1c1e]/95 p-2 text-white backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-2 py-2 text-[13px] font-semibold uppercase tracking-wider text-white/50">Focus</div>
            {FOCUS_MODES.map((f) => (
              <button
                key={f.id}
                onClick={() => pick(f.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[7px]" style={{ background: f.color }}>
                  <f.icon size={18} fill={f.id !== "off" ? "#fff" : "none"} />
                </div>
                <span className="flex-1 text-[16px]">{f.label}</span>
                {focus === f.id && <span className="text-ios-blue">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
