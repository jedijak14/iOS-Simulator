import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Moon, Volume1, Volume2, VolumeX } from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { AppIcon } from "./icons";
import { sfx } from "./sound";
import { APPS } from "./registry";
import { relTime } from "./utils";

export function AlertHost() {
  const alert = useOS((s) => s.alert);
  const set = useOS((s) => s.set);
  if (!alert) return null;
  const stack = alert.buttons.length !== 2;
  const press = (i: number) => {
    const b = alert.buttons[i];
    set({ alert: null });
    b.onPress?.();
  };
  return (
    <div className="fade-in absolute inset-0 z-[110] flex items-center justify-center bg-black/40">
      <div className="pop-in glass w-[270px] overflow-hidden rounded-[14px] text-center text-ios-label">
        <div className="px-4 pb-4 pt-5">
          <div className="text-[17px] font-semibold leading-[22px]">{alert.title}</div>
          {alert.message && <div className="mt-1 text-[13px] leading-[18px]">{alert.message}</div>}
        </div>
        <div className={stack ? "flex flex-col" : "flex"} style={{ borderTop: "0.5px solid var(--ios-sep)" }}>
          {alert.buttons.map((b, i) => (
            <button
              key={i}
              onClick={() => press(i)}
              className="h-[44px] flex-1 text-[17px] active:bg-black/10"
              style={{
                color: b.style === "destructive" ? "var(--ios-red)" : "var(--ios-blue)",
                fontWeight: b.bold || b.style === "cancel" ? 600 : 400,
                borderLeft: !stack && i > 0 ? "0.5px solid var(--ios-sep)" : undefined,
                borderTop: stack && i > 0 ? "0.5px solid var(--ios-sep)" : undefined,
              }}
            >
              {b.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SheetHost() {
  const sheet = useOS((s) => s.sheet);
  const set = useOS((s) => s.set);
  const spec = useSpec();
  if (!sheet) return null;
  const cancel = sheet.actions.find((a) => a.style === "cancel");
  const rest = sheet.actions.filter((a) => a.style !== "cancel");
  const run = (b: { onPress?: () => void }) => {
    set({ sheet: null });
    b.onPress?.();
  };
  return (
    <div className="fade-in absolute inset-0 z-[110] flex flex-col justify-end bg-black/35" onClick={() => set({ sheet: null })}>
      <div className="px-2" style={{ paddingBottom: spec.safeBottom + 8 }} onClick={(e) => e.stopPropagation()}>
        <div className="glass overflow-hidden rounded-[14px] text-center text-ios-label">
          {(sheet.title || sheet.message) && (
            <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--ios-sep)" }}>
              {sheet.title && <div className="text-[13px] font-semibold text-ios-label2">{sheet.title}</div>}
              {sheet.message && <div className="text-[13px] text-ios-label2">{sheet.message}</div>}
            </div>
          )}
          {rest.map((a, i) => (
            <button
              key={i}
              onClick={() => run(a)}
              className="block h-[56px] w-full text-[20px] active:bg-black/10"
              style={{ color: a.style === "destructive" ? "var(--ios-red)" : "var(--ios-blue)", borderTop: i > 0 ? "0.5px solid var(--ios-sep)" : undefined }}
            >
              {a.text}
            </button>
          ))}
        </div>
        <button onClick={() => run(cancel ?? {})} className="glass mt-2 block h-[56px] w-full rounded-[14px] text-[20px] font-semibold text-ios-blue active:opacity-80">
          {cancel?.text ?? "Cancel"}
        </button>
      </div>
    </div>
  );
}

export function Banner() {
  const banner = useOS((s) => s.banner);
  const set = useOS((s) => s.set);
  const spec = useSpec();
  const scale = useOS((s) => s.scale);
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!banner) return;
    setDy(0);
    const t = setTimeout(() => useOS.getState().set({ banner: null }), 5000);
    const t2 = setInterval(() => tick((n) => n + 1), 20_000);
    return () => {
      clearTimeout(t);
      clearInterval(t2);
    };
  }, [banner?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!banner) return null;
  return (
    <div
      key={banner.id}
      className="banner-in glass absolute left-2 right-2 z-[95] flex cursor-pointer items-start gap-3 rounded-[26px] p-3 text-ios-label shadow-xl"
      style={{ top: spec.island ? 8 : 6, transform: `translateY(${dy}px)`, transition: start.current === null ? "transform .25s" : "none", background: "var(--ios-material)" }}
      onPointerDown={(e) => {
        start.current = e.clientY;
        moved.current = false;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        const d = (e.clientY - start.current) / scale;
        if (Math.abs(d) > 4) moved.current = true;
        setDy(Math.min(0, d));
      }}
      onPointerUp={() => {
        const d = dy;
        start.current = null;
        if (d < -24) return set({ banner: null });
        setDy(0);
        if (!moved.current) {
          set({ banner: null });
          if (APPS[banner.app]) useOS.getState().openApp(banner.app);
        }
      }}
    >
      <AppIcon id={banner.app} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="truncate text-[15px] font-semibold">{banner.title}</span>
          <span className="text-[12px] text-ios-label2">{relTime(banner.at)}</span>
        </div>
        <div className="line-clamp-2 text-[15px] leading-[19px]">{banner.body}</div>
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useOS((s) => s.toast);
  const set = useOS((s) => s.set);
  const spec = useSpec();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useOS.getState().set({ toast: null }), 1900);
    return () => clearTimeout(t);
  }, [toast?.id, set]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!toast) return null;
  return (
    <div key={toast.id} className="pop-in pointer-events-none absolute inset-x-0 z-[105] flex justify-center" style={{ bottom: spec.safeBottom + 90 }}>
      <div className="glass-dark rounded-full px-5 py-2.5 text-[15px] font-medium text-white shadow-lg">{toast.text}</div>
    </div>
  );
}

export function VolumeHud() {
  const hud = useOS((s) => s.hud);
  const volume = useOS((s) => s.volume);
  const silent = useOS((s) => s.silent);
  const spec = useSpec();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!hud) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), hud.kind === "silent" ? 2200 : 1600);
    return () => clearTimeout(t);
  }, [hud?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hud) return null;
  if (hud.kind === "silent") {
    return (
      <div
        className="pointer-events-none absolute left-1/2 z-[100] flex items-center justify-between overflow-hidden rounded-full bg-black px-4 text-white"
        style={{ top: spec.island ? 11 : 30, height: 37, width: show ? 210 : 126, marginLeft: show ? -105 : -63, opacity: show ? 1 : 0, transition: "all .45s cubic-bezier(.32,1.2,.4,1)" }}
      >
        {silent ? <BellOff size={18} color="#ff453a" /> : <Bell size={18} color="#fff" />}
        <span className="text-[14px] font-medium">{silent ? "Silent Mode On" : "Silent Mode Off"}</span>
      </div>
    );
  }
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="pointer-events-none absolute left-2.5 z-[100] flex flex-col items-center rounded-full bg-ios-material backdrop-blur-xl" style={{ top: "50%", marginTop: -110, width: 34, height: 220, opacity: show ? 1 : 0, transform: `translateX(${show ? 0 : -50}px)`, transition: "all .3s ease" }}>
      <div className="relative mt-2 flex-1 w-[6px] overflow-hidden rounded-full bg-ios-fill2">
        <div className="absolute inset-x-0 bottom-0 rounded-full bg-ios-label" style={{ height: `${volume * 100}%` }} />
      </div>
      <Icon size={18} className="my-2 text-ios-label" />
    </div>
  );
}

export function RingingOverlay() {
  const ringing = useOS((s) => s.ringing);
  const stop = useOS((s) => s.stopRinging);
  useEffect(() => {
    if (!ringing) return;
    sfx.alarm();
    const id = setInterval(() => sfx.alarm(), 1300);
    return () => clearInterval(id);
  }, [ringing]);
  if (!ringing) return null;
  return (
    <div className="fade-in absolute inset-0 z-[120] flex flex-col items-center justify-between bg-black/70 px-8 pb-24 pt-32 text-white backdrop-blur-2xl">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#ff9f0a]">
          <Bell size={40} fill="#fff" style={{ animation: "ringShake 1s infinite" }} />
        </div>
        <div className="text-[34px] font-semibold">{ringing.kind === "timer" ? "Timer" : "Alarm"}</div>
        <div className="mt-1 text-[20px] text-white/70">{ringing.kind === "timer" ? "Time's up" : ringing.label}</div>
      </div>
      <div className="flex w-full gap-4">
        {ringing.kind === "alarm" && (
          <button onClick={() => stop(true)} className="h-14 flex-1 rounded-full bg-white/20 text-[20px] font-semibold active:bg-white/30">
            Snooze
          </button>
        )}
        <button onClick={() => stop(false)} className="h-14 flex-1 rounded-full bg-[#ff9f0a] text-[20px] font-semibold text-black active:opacity-80">
          Stop
        </button>
      </div>
    </div>
  );
}

const APPLE = "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";

export function BootScreen() {
  const power = useOS((s) => s.power);
  if (power === "on") return null;
  return (
    <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black" onClick={() => power === "off" && useOS.getState().powerOn()}>
      {power === "booting" ? (
        <>
          <svg
            viewBox="0 0 384 512"
            width="84"
            height="108"
            fill="#fff"
            style={{
              animation: "introLogoIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) both",
              filter: "drop-shadow(0 0 24px rgba(255,255,255,0.18))",
            }}
          >
            <path d={APPLE} />
          </svg>
          <div className="mt-16 h-[4px] w-[180px] overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ animation: "boot 2.6s ease-in-out forwards" }} />
          </div>
        </>
      ) : (
        <div className="text-[13px] text-white/25">Press the side button to turn on</div>
      )}
    </div>
  );
}

export function DndPill() {
  const focus = useOS((s) => s.focus);
  const [show, setShow] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, [focus]);
  if (!show) return null;
  const labels: Record<string, string> = {
    off: "Focus Off",
    dnd: "Do Not Disturb On",
    personal: "Personal Focus On",
    work: "Work Focus On",
    sleep: "Sleep Focus On",
  };
  return (
    <div className="pop-in pointer-events-none absolute inset-x-0 z-[105] flex justify-center" style={{ top: 70 }}>
      <div className="glass-dark flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-white">
        <Moon size={16} fill="#fff" /> {labels[focus] ?? "Focus"}
      </div>
    </div>
  );
}
