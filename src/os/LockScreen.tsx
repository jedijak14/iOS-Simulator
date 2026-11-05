import { useEffect, useRef, useState } from "react";
import { Camera, Delete, Flashlight, Lock, LockOpen, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useOS, useNow } from "./store";
import { useSpec } from "./device-context";
import { useData } from "./data";
import { APPS } from "./registry";
import { AppIcon } from "./icons";
import { DAYS, MONTHS, fmtTime, relTime, sameDay } from "./utils";
import { wallpaperOf } from "./devices";
import { WALLPAPERS } from "./devices";
import { TRACKS, artGradient, musicNext, musicPrev, musicToggle } from "./music";
import { sfx } from "./sound";
import { ScrollView } from "./ui";
import { WeatherIcon, useTemp, useWeather } from "../apps/weatherData";

export function NotifList({ onOpen, max = 50 }: { onOpen: (app: string) => void; max?: number }) {
  const notifs = useOS((s) => s.notifications);
  const dismiss = useOS((s) => s.dismissNotif);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-2">
      {notifs.slice(0, max).map((n) => (
        <div
          key={n.id}
          onClick={() => onOpen(n.app)}
          className="fade-in group relative flex cursor-pointer items-start gap-3 rounded-[22px] p-3 text-white active:scale-[0.98]"
          style={{ background: "rgba(60,60,67,0.55)", backdropFilter: "blur(30px) saturate(160%)", WebkitBackdropFilter: "blur(30px) saturate(160%)" }}
        >
          <AppIcon id={n.app} size={38} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[15px] font-semibold">{n.title}</span>
              <span className="shrink-0 text-[12px] text-white/60">{relTime(n.at)}</span>
            </div>
            <div className="line-clamp-2 text-[15px] leading-[19px] text-white/90">{n.body}</div>
          </div>
          <button
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/90 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(n.id);
            }}
          >
            <X size={13} strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Passcode({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const passcode = useOS((s) => s.passcode);
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(0);
  const [msg, setMsg] = useState("Enter Passcode");

  const press = (d: string) => {
    sfx.tick();
    if (val.length >= 6) return;
    const nv = val + d;
    setVal(nv);
    if (nv.length === 6) {
      setTimeout(() => {
        if (nv === passcode) onSuccess();
        else {
          setShake((s) => s + 1);
          setMsg("Try Again");
          setVal("");
        }
      }, 120);
    }
  };
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setVal((v) => v.slice(0, -1));
      else if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });
  const keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"]];
  return (
    <div className="fade-in absolute inset-0 z-20 flex flex-col items-center bg-black/35 pt-[90px] text-white backdrop-blur-2xl">
      <div className="text-[20px] font-medium">{msg}</div>
      <div key={shake} className={`mt-6 flex gap-4 ${shake ? "shake" : ""}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[13px] w-[13px] rounded-full border-[1.5px] border-white transition-colors" style={{ background: i < val.length ? "#fff" : "transparent" }} />
        ))}
      </div>
      <div className="mt-12 grid grid-cols-3 gap-x-5 gap-y-4">
        {keys.map(([d, l]) => (
          <button key={d} onClick={() => press(d)} className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white/20 active:bg-white/50">
            <span className="text-[34px] font-light leading-[34px]">{d}</span>
            <span className="text-[10px] font-semibold tracking-[2px]">{l}</span>
          </button>
        ))}
        <div />
        <button onClick={() => press("0")} className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white/20 text-[34px] font-light active:bg-white/50">
          0
        </button>
        <div />
      </div>
      <div className="mt-8 flex w-[290px] justify-between text-[16px]">
        <span className="opacity-70">Emergency</span>
        <button onClick={val ? () => setVal((v) => v.slice(0, -1)) : onCancel}>{val ? <Delete size={24} /> : "Cancel"}</button>
      </div>
    </div>
  );
}

export function LockScreen() {
  const spec = useSpec();
  const locked = useOS((s) => s.locked);
  const screenOn = useOS((s) => s.screenOn);
  const passcode = useOS((s) => s.passcode);
  const faceId = useOS((s) => s.faceId);
  const flash = useOS((s) => s.flashlight);
  const wallpaper = useOS((s) => s.lockWallpaper);
  const set = useOS((s) => s.set);
  const use24 = useOS((s) => s.use24h);
  const music = useOS((s) => s.music);
  const battery = useOS((s) => s.battery);
  const scale = useOS((s) => s.scale);
  const events = useData((s) => s.events);
  const city = useData((s) => s.cities[0]);
  const { data: weather } = useWeather(city);
  const temp = useTemp();
  const now = useNow(1000);
  const [dy, setDy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [face, setFace] = useState<"idle" | "scan" | "ok">("idle");
  const [pad, setPad] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [clockColor, setClockColor] = useState<string>(() => localStorage.getItem("ios-sim-lock-clock-color") || "#ffffff");
  const [clockFont, setClockFont] = useState<"system" | "rounded" | "serif">(() => (localStorage.getItem("ios-sim-lock-clock-font") as "system" | "rounded" | "serif") || "system");
  const start = useRef({ y: 0, t: 0 });
  const pressing = useRef(false);
  const dragRef = useRef(false);
  const dyRef = useRef(0);
  const longPressT = useRef<number>(0);

  const saveClockColor = (c: string) => { setClockColor(c); localStorage.setItem("ios-sim-lock-clock-color", c); };
  const saveClockFont = (f: "system" | "rounded" | "serif") => { setClockFont(f); localStorage.setItem("ios-sim-lock-clock-font", f); };
  const track = TRACKS[music.idx];

  useEffect(() => {
    if (locked) {
      setFace("idle");
      setPad(false);
      setDy(0);
    }
  }, [locked, screenOn]);

  const finish = () => {
    setFace("ok");
    setTimeout(() => {
      useOS.getState().unlock();
      setPad(false);
    }, 380);
  };
  const attempt = () => {
    if (face !== "idle") return;
    if (!passcode) {
      setFace("scan");
      setTimeout(finish, 350);
    } else if (faceId) {
      setFace("scan");
      setTimeout(finish, 900);
    } else setPad(true);
  };

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  useEffect(() => {
    const f = () => attemptRef.current();
    window.addEventListener("lock-attempt", f);
    return () => window.removeEventListener("lock-attempt", f);
  }, []);

  const nextEvent = events.filter((e) => e.end > Date.now()).sort((a, b) => a.start - b.start)[0];
  const open = (app: string) => {
    const go = () => {
      useOS.getState().unlock();
      setTimeout(() => useOS.getState().openApp(app), 30);
    };
    if (!passcode) go();
    else if (faceId) {
      setFace("scan");
      setTimeout(() => {
        setFace("ok");
        setTimeout(go, 300);
      }, 800);
    } else setPad(true);
  };

  const wp = wallpaperOf(wallpaper);

  return (
    <div
      className="absolute inset-0 z-[50] touch-none overflow-hidden text-white"
      style={{
        transform: locked ? `translateY(${-dy}px)` : "translateY(-105%)",
        transition: drag ? "none" : "transform .5s cubic-bezier(.3,.8,.2,1)",
        pointerEvents: locked ? "auto" : "none",
        visibility: locked || !screenOn ? "visible" : "visible",
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        start.current = { y: e.clientY, t: performance.now() };
        pressing.current = true;
        // long-press to customize
        window.clearTimeout(longPressT.current);
        longPressT.current = window.setTimeout(() => {
          if (!dragRef.current) {
            sfx.pop();
            setCustomize(true);
          }
        }, 600);
      }}
      onPointerMove={(e) => {
        if (!pressing.current) return;
        const d = (start.current.y - e.clientY) / scale;
        if (!dragRef.current && Math.abs(d) > 8) {
          dragRef.current = true;
          setDrag(true);
          window.clearTimeout(longPressT.current);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }
        if (dragRef.current) {
          dyRef.current = Math.max(0, d);
          setDy(dyRef.current);
        }
      }}
      onPointerUp={() => {
        pressing.current = false;
        window.clearTimeout(longPressT.current);
        if (!dragRef.current) return;
        dragRef.current = false;
        setDrag(false);
        const dyv = dyRef.current;
        const v = dyv / Math.max(1, performance.now() - start.current.t);
        if (dyv > 110 || (dyv > 40 && v > 0.6)) attempt();
        dyRef.current = 0;
        setDy(0);
      }}
      onPointerCancel={() => {
        pressing.current = false;
        window.clearTimeout(longPressT.current);
        dragRef.current = false;
        dyRef.current = 0;
        setDrag(false);
        setDy(0);
      }}
    >
      <div className="absolute inset-0" style={{ background: wp.css }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

      {/* padlock */}
      <button onClick={attempt} className="absolute left-1/2 z-10 -translate-x-1/2" style={{ top: spec.safeTop - 8 }}>
        <div className={face === "scan" ? "animate-pulse" : ""}>{face === "ok" ? <LockOpen size={22} strokeWidth={2.4} /> : <Lock size={22} strokeWidth={2.4} />}</div>
      </button>

      {/* date + time */}
      <div className="absolute inset-x-0 text-center" style={{ top: spec.safeTop + 22 }}>
        <div className="text-[20px] font-semibold opacity-90" style={{ letterSpacing: "-0.018em" }}>
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
        </div>
        <div
          className="-mt-1 text-[88px] font-semibold leading-[100px] tabular-nums"
          style={{
            opacity: 0.95,
            letterSpacing: "-0.045em",
            fontVariantNumeric: "tabular-nums",
            color: clockColor,
            fontFamily: clockFont === "rounded" ? "ui-rounded, -apple-system, system-ui, sans-serif" : clockFont === "serif" ? "Georgia, serif" : undefined,
            textShadow: clockColor !== "#ffffff" ? `0 0 30px ${clockColor}66` : undefined,
          }}
          data-clock
        >
          {fmtTime(now, use24, false)}
        </div>
      </div>

      {/* widgets */}
      <div className="absolute inset-x-0 flex justify-center gap-3" style={{ top: spec.safeTop + 150 }}>
        <div className="flex h-[62px] min-w-[62px] flex-col items-center justify-center rounded-[16px] px-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.18)" }}>
          <div className="relative h-8 w-8">
            <svg viewBox="0 0 36 36" className="-rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${battery * 0.942} 100`} />
            </svg>
          </div>
          <span className="mt-0.5 text-[11px] font-semibold">{battery}%</span>
        </div>
        <div className="flex h-[62px] min-w-[62px] flex-col items-center justify-center rounded-[16px] px-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.18)" }}>
          {weather ? <WeatherIcon code={weather.current.code} isDay={weather.current.isDay} size={26} /> : null}
          <span className="text-[13px] font-semibold">{weather ? temp(weather.current.temp) : "–"}</span>
        </div>
        <div className="flex h-[62px] min-w-[120px] max-w-[160px] flex-col justify-center rounded-[16px] px-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.18)" }}>
          <span className="text-[11px] font-semibold uppercase text-[#ff6b6b]">{nextEvent ? (sameDay(new Date(nextEvent.start), now) ? "Today" : DAYS[new Date(nextEvent.start).getDay()].slice(0, 3)) : "Calendar"}</span>
          <span className="truncate text-[13px] font-semibold">{nextEvent ? nextEvent.title : "No events"}</span>
          <span className="text-[11px] opacity-70">{nextEvent ? fmtTime(new Date(nextEvent.start), use24) : ""}</span>
        </div>
      </div>

      {/* notifications */}
      <ScrollView className="absolute inset-x-0 px-3" style={{ top: spec.safeTop + 230, bottom: 150 }}>
        {music.active && (
          <div className="mb-2 flex items-center gap-3 rounded-[22px] p-3" style={{ background: "rgba(60,60,67,0.55)", backdropFilter: "blur(30px)" }}>
            <div className="h-[46px] w-[46px] shrink-0 rounded-[8px]" style={{ background: artGradient(track) }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{track.title}</div>
              <div className="truncate text-[13px] text-white/70">{track.artist}</div>
            </div>
            <button onClick={musicPrev}><SkipBack size={20} fill="#fff" /></button>
            <button onClick={musicToggle}>{music.playing ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}</button>
            <button onClick={() => musicNext()}><SkipForward size={20} fill="#fff" /></button>
          </div>
        )}
        <NotifList onOpen={(a) => APPS[a] && open(a)} max={6} />
      </ScrollView>

      {/* bottom controls */}
      <div className="absolute inset-x-0 flex items-center justify-between px-12" style={{ bottom: spec.homeButton ? 70 : 60 }}>
        <button
          onClick={() => useOS.getState().set({ flashlight: !flash })}
          className="flex h-[50px] w-[50px] items-center justify-center rounded-full backdrop-blur-xl"
          style={{ background: flash ? "#fff" : "rgba(40,40,44,0.55)", color: flash ? "#000" : "#fff" }}
        >
          <Flashlight size={22} fill={flash ? "#000" : "none"} />
        </button>
        <button onClick={() => open("camera")} className="flex h-[50px] w-[50px] items-center justify-center rounded-full backdrop-blur-xl" style={{ background: "rgba(40,40,44,0.55)" }}>
          <Camera size={22} />
        </button>
      </div>
      <div className="absolute inset-x-0 animate-pulse text-center text-[14px] font-medium opacity-70" style={{ bottom: spec.homeButton ? 24 : 40 }}>
        {spec.homeButton ? "Press home to open" : "Swipe up to unlock"}
      </div>
      {!spec.homeButton && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex h-8 items-end justify-center pb-2" onClick={attempt}>
          <div className="h-[5px] w-[139px] rounded-full bg-white/95" />
        </div>
      )}
      {pad && <Passcode onSuccess={finish} onCancel={() => setPad(false)} />}

      {/* Lock Screen Customization editor (long-press to open) */}
      {customize && (
        <div className="fade-in absolute inset-0 z-[60] flex flex-col items-center justify-end bg-black/60 backdrop-blur-2xl" onClick={() => setCustomize(false)}>
          <div className="mb-4 text-center text-white/90" onClick={(e) => e.stopPropagation()}>
            <div className="text-[14px] font-medium opacity-80">Long-press to customize</div>
            <div className="text-[12px] opacity-50">Tap anywhere to dismiss</div>
          </div>
          <div className="w-full max-w-[340px] rounded-3xl bg-ios-material p-5 text-ios-label shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-[16px] font-semibold" style={{ letterSpacing: "-0.015em" }}>Clock Color</div>
            <div className="mb-5 flex flex-wrap gap-2.5">
              {["#ffffff", "#ff9500", "#ff453a", "#ff2d55", "#bf5af2", "#0a84ff", "#5ac8fa", "#30d158", "#8e8e93", "#ffd60a"].map((c) => (
                <button
                  key={c}
                  onClick={() => { saveClockColor(c); sfx.toggleOn(); }}
                  className="h-9 w-9 rounded-full transition active:scale-90"
                  style={{ background: c, outline: c === clockColor ? "3px solid var(--ios-blue)" : "1px solid rgba(0,0,0,0.1)", outlineOffset: 2 }}
                />
              ))}
            </div>
            <div className="mb-3 text-[16px] font-semibold" style={{ letterSpacing: "-0.015em" }}>Font</div>
            <div className="mb-5 flex gap-2">
              {([
                { id: "system", label: "System", font: undefined },
                { id: "rounded", label: "Rounded", font: "ui-rounded, system-ui" },
                { id: "serif", label: "Serif", font: "Georgia, serif" },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => { saveClockFont(f.id); sfx.toggleOn(); }}
                  className={`flex-1 rounded-xl py-3 text-[15px] font-semibold transition ${f.id === clockFont ? "bg-ios-blue text-white" : "bg-ios-fill text-ios-label"}`}
                  style={{ fontFamily: f.font, background: f.id === clockFont ? "var(--ios-blue)" : "var(--ios-fill)" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="mb-3 text-[16px] font-semibold" style={{ letterSpacing: "-0.015em" }}>Wallpaper</div>
            <div className="flex flex-wrap gap-2">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { set({ lockWallpaper: w.id }); sfx.toggleOn(); }}
                  className="h-14 w-9 overflow-hidden rounded-lg transition active:scale-90"
                  style={{ background: w.css, outline: w.id === wallpaper ? "3px solid var(--ios-blue)" : "1px solid rgba(0,0,0,0.1)", outlineOffset: 1 }}
                />
              ))}
            </div>
            <button
              onClick={() => setCustomize(false)}
              className="mt-5 w-full rounded-xl bg-ios-blue py-3 text-[16px] font-semibold text-white"
              style={{ background: "var(--ios-blue)" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Shade() {
  const spec = useSpec();
  const shade = useOS((s) => s.shade);
  const set = useOS((s) => s.set);
  const wallpaper = useOS((s) => s.wallpaper);
  const use24 = useOS((s) => s.use24h);
  const notifs = useOS((s) => s.notifications);
  const clear = useOS((s) => s.clearNotifs);
  const scale = useOS((s) => s.scale);
  const now = useNow(1000);
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const wp = wallpaperOf(wallpaper);
  const close = () => set({ shade: false });
  const open = (app: string) => {
    set({ shade: false });
    useOS.getState().openApp(app);
  };
  return (
    <div
      className="absolute inset-0 z-[55] text-white"
      style={{
        transform: shade ? `translateY(${-dy}px)` : "translateY(-102%)",
        transition: start.current !== null ? "none" : "transform .45s cubic-bezier(.3,.8,.2,1)",
        pointerEvents: shade ? "auto" : "none",
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button,[data-notif]")) return;
        start.current = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current !== null) setDy(Math.max(0, (start.current - e.clientY) / scale));
      }}
      onPointerUp={() => {
        if (start.current === null) return;
        start.current = null;
        if (dy > 70) close();
        setDy(0);
      }}
    >
      <div className="absolute inset-0" style={{ background: wp.css }} />
      <div className="absolute inset-0 bg-black/45 backdrop-blur-2xl" />
      <div className="absolute inset-x-0 text-center" style={{ top: spec.safeTop + 4 }}>
        <div className="text-[18px] font-semibold opacity-90" style={{ letterSpacing: "-0.015em" }}>
          {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
        </div>
        <div className="text-[56px] font-semibold leading-[60px] tabular-nums" style={{ letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }} data-clock>{fmtTime(now, use24, false)}</div>
      </div>
      <ScrollView className="absolute inset-x-0 px-3" style={{ top: spec.safeTop + 90, bottom: 60 }}>
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[20px] font-semibold">Notification Center</span>
          {notifs.length > 0 && (
            <button onClick={clear} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
              <X size={15} strokeWidth={3} />
            </button>
          )}
        </div>
        <div data-notif>
          <NotifList onOpen={open} />
        </div>
        {notifs.length === 0 && <div className="mt-24 text-center text-[17px] font-medium text-white/60">No Notifications</div>}
      </ScrollView>
      <button onClick={close} className="absolute inset-x-0 bottom-0 flex h-14 items-end justify-center pb-2">
        <div className="h-[5px] w-[139px] rounded-full bg-white/90" />
      </button>
    </div>
  );
}
