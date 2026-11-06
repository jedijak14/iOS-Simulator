import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Home as HomeIcon,
  Layers,
  Lock,
  Mic,
  Moon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Bell as NotifIcon,
} from "lucide-react";
import { Screen } from "./os/Screen";
import { DeviceCtx } from "./os/device-context";
import { COLORS, DEVICES } from "./os/devices";
import { useOS, useDark } from "./os/store";
import { AirDropDropZone } from "./os/StandBy";
import { IntroAnimation } from "./os/IntroAnimation";
import { sendAction } from "./os/actions";
import { APPS } from "./os/registry";
import { AppIcon } from "./os/icons";
import { clearImportedFiles } from "./os/importedFiles";

const BEZEL = 5; // titanium rim

function SideButton({
  side,
  top,
  h,
  color,
  title,
  onDown,
  onUp,
  onClick,
}: {
  side: "l" | "r";
  top: number;
  h: number;
  color: string;
  title: string;
  onDown?: () => void;
  onUp?: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onClick={onClick}
      className="absolute z-0 cursor-pointer transition-transform active:scale-x-50"
      style={{
        [side === "l" ? "left" : "right"]: -4,
        top,
        width: 5,
        height: h,
        background: color,
        borderRadius: side === "l" ? "3px 0 0 3px" : "0 3px 3px 0",
        boxShadow: "inset 0 0 2px rgba(0,0,0,0.5)",
        transformOrigin: side === "l" ? "right" : "left",
      }}
    />
  );
}

export default function App() {
  const deviceId = useOS((s) => s.deviceId);
  const colorId = useOS((s) => s.deviceColor);
  const flashlight = useOS((s) => s.flashlight);
  const power = useOS((s) => s.power);
  const silent = useOS((s) => s.silent);
  const dark = useDark();
  const spec = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0];
  const color = COLORS.find((c) => c.id === colorId) ?? COLORS[0];

  const frameW = spec.w + spec.bezelSide * 2 + BEZEL * 2;
  const frameH = spec.h + spec.bezelTop + spec.bezelBottom + BEZEL * 2 - (spec.homeButton ? 0 : 0);
  const [appCategory, setAppCategory] = useState("All");
  const installed = useOS((s) => s.installed);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  // Always show the sidebar control panel (compact on small screens)
  const showPanel = true;
  const compact = vp.w < 920;
  const panelW = compact ? 220 : 280;
  const scale = Math.max(0.25, Math.min((vp.w - panelW - 48) / frameW, (vp.h - 40) / frameH, 1.2));

  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  useEffect(() => {
    useOS.setState({ scale });
  }, [scale]);
  const previousDevice = useRef(deviceId);
  const [folding, setFolding] = useState(false);
  useEffect(() => {
    const isFold = previousDevice.current.startsWith("duo-") && deviceId.startsWith("duo-");
    previousDevice.current = deviceId;
    if (isFold) {
      setFolding(true);
      const timer = window.setTimeout(() => setFolding(false), 550);
      return () => clearTimeout(timer);
    }
    useOS.setState({ homePage: 0, foreground: null, switcher: false, launchRects: {} });
  }, [deviceId]);

  /* keyboard shortcuts */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable;
      const s = useOS.getState();
      if (e.key === "Escape") {
        if (typing) return (t as HTMLElement).blur();
        if (s.locked && s.screenOn) return;
        return s.goHome();
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter" && s.locked && s.screenOn && s.power === "on") return void window.dispatchEvent(new Event("lock-attempt"));
      const k = e.key.toLowerCase();
      if (k === "h") s.goHome();
      else if (k === "l") s.pressSide();
      else if (k === "d") s.set({ appearance: dark ? "light" : "dark" });
      else if (k === "s") (s.switcher ? s.goHome() : s.openSwitcher());
      else if (k === "c") s.set({ cc: !s.cc, shade: false });
      else if (k === "n") s.set({ shade: !s.shade, cc: false });
      else if (k === "i") s.set({ siri: !s.siri });
      else if (k === "/") {
        e.preventDefault();
        if (!s.locked) s.set({ foreground: null, switcher: false, spotlight: true });
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [dark]);

  /* power / home buttons */
  const powerT = useRef(0);
  const powerLong = useRef(false);
  const homeClicks = useRef(0);
  const homeT = useRef(0);
  const homeLongT = useRef(0);
  const homeLong = useRef(false);

  const powerDown = () => {
    powerLong.current = false;
    window.clearTimeout(powerT.current);
    powerT.current = window.setTimeout(() => {
      powerLong.current = true;
      const s = useOS.getState();
      if (s.power === "on" && s.screenOn && !s.locked) s.set({ siri: true });
      else if (s.power === "on" && s.screenOn) s.showToast("Unlock to use Siri");
    }, 700);
  };
  const powerUp = () => {
    if (!powerT.current) return;
    window.clearTimeout(powerT.current);
    powerT.current = 0;
    if (!powerLong.current) useOS.getState().pressSide();
  };

  const homeDown = () => {
    homeLong.current = false;
    window.clearTimeout(homeLongT.current);
    homeLongT.current = window.setTimeout(() => {
      homeLong.current = true;
      const s = useOS.getState();
      if (s.power === "on" && s.screenOn && !s.locked) s.set({ siri: true });
    }, 700);
  };
  const homeUp = () => {
    window.clearTimeout(homeLongT.current);
    if (homeLong.current) return;
    const s = useOS.getState();
    if (s.power !== "on") return s.pressSide();
    if (!s.screenOn) return s.wake();
    if (s.locked) return void window.dispatchEvent(new Event("lock-attempt"));
    homeClicks.current++;
    window.clearTimeout(homeT.current);
    homeT.current = window.setTimeout(() => {
      const n = homeClicks.current;
      homeClicks.current = 0;
      const st = useOS.getState();
      if (n >= 2) st.openSwitcher();
      else st.goHome();
    }, 230);
  };

  const outerR = spec.homeButton ? 58 : spec.radius + spec.bezelSide + BEZEL;
  const innerR = outerR - BEZEL;
  const s = useOS.getState;

  const panelBtn = (label: string, icon: React.ReactNode, onClick: () => void, active?: boolean) => (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition active:scale-95 ${active ? "bg-white text-black" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden" style={{ fontFamily: "var(--font-sf)" }}>
      <AirDropDropZone />
      <IntroAnimation />
      {/* the phone */}
      <div style={{ width: frameW * scale, height: frameH * scale, flexShrink: 0 }}>
        <div className={`relative ${folding ? "duo-fold" : ""}`} style={{ width: frameW, height: frameH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {/* flashlight glow */}
          {flashlight && power === "on" && (
            <div className="pointer-events-none absolute left-1/2 -top-10 h-24 w-48 -translate-x-1/2 rounded-full bg-[#fffbe0] opacity-90 blur-2xl" />
          )}
          {/* side buttons */}
          <SideButton side="l" top={frameH * 0.135} h={frameH * 0.035} color={color.btn} title={silent ? "Silent mode: on" : "Silent / Action button"} onClick={() => s().toggleSilent()} />
          <SideButton side="l" top={frameH * 0.2} h={frameH * 0.065} color={color.btn} title="Volume up" onClick={() => s().volumeStep(1 / 16)} />
          <SideButton side="l" top={frameH * 0.285} h={frameH * 0.065} color={color.btn} title="Volume down" onClick={() => s().volumeStep(-1 / 16)} />
          <SideButton side="r" top={frameH * 0.26} h={frameH * 0.1} color={color.btn} title="Side button — click to lock/wake, hold for Siri" onDown={powerDown} onUp={powerUp} />

          {/* body */}
          <div
            className="absolute inset-0"
            style={{
              borderRadius: outerR,
              background: color.frame,
              boxShadow: "0 40px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(0,0,0,.6), inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 6px rgba(0,0,0,.4)",
            }}
          >
            <div
              className="absolute"
              style={{
                inset: BEZEL,
                borderRadius: innerR,
                background: "#050506",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)",
              }}
            >
              <div
                className="absolute overflow-hidden"
                style={{ left: spec.bezelSide, top: spec.bezelTop, width: spec.w, height: spec.h, borderRadius: spec.radius, background: "#000" }}
              >
                <DeviceCtx.Provider value={spec}>
                  <Screen />
                </DeviceCtx.Provider>
              </div>
              {spec.homeButton && (
                <>
                  <div className="absolute left-1/2 top-[34px] h-[7px] w-[64px] -translate-x-1/2 rounded-full bg-[#1b1b1e]" />
                  <div className="absolute left-[118px] top-[32px] h-[11px] w-[11px] rounded-full bg-[#14141a] ring-1 ring-[#25252c]" />
                  <button
                    title="Home button (click: Home · double-click: App Switcher · hold: Siri)"
                    onPointerDown={homeDown}
                    onPointerUp={homeUp}
                    onPointerLeave={() => window.clearTimeout(homeLongT.current)}
                    className="absolute left-1/2 h-[60px] w-[60px] -translate-x-1/2 rounded-full active:scale-95"
                    style={{ bottom: 18, border: "2px solid #26262a", background: "radial-gradient(circle at 50% 40%, #0a0a0c, #000)" }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* control panel */}
      {showPanel && (
        <div className="ml-6 shrink-0 rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-2xl backdrop-blur-xl" style={{ width: panelW, maxHeight: vp.h - 40, overflowY: "auto" }}>
          <div className="mb-1 flex items-center gap-2 text-[17px] font-semibold">
            <SlidersHorizontal size={18} /> Simulator
          </div>
          <div className="mb-4 text-[12px] text-white/50">iOS-inspired simulator · {spec.name}</div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Device</div>
          <div className="mb-4 flex flex-col gap-1.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => useOS.setState({ deviceId: d.id })}
                className={`rounded-lg px-3 py-2 text-left text-[13px] transition ${d.id === deviceId ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}
              >
                {d.name}
                <span className="ml-1 text-[11px] opacity-50">
                  {d.w}×{d.h}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Apps by category</div>
          <select aria-label="App category" value={appCategory} onChange={(e) => setAppCategory(e.target.value)} className="mb-2 w-full rounded-lg bg-[#292a30] px-3 py-2 text-sm text-white"><option>All</option>{[...new Set(installed.map((id) => APPS[id]?.category).filter(Boolean))].sort().map((category) => <option key={category}>{category}</option>)}</select>
          <div className="mb-4 max-h-48 overflow-y-auto rounded-xl bg-black/15 p-1">{installed.filter((id) => APPS[id] && (appCategory === "All" || APPS[id].category === appCategory)).map((id) => <button key={id} aria-label={`Open ${APPS[id].name} app`} onClick={() => s().openApp(id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-white/10"><AppIcon id={id} size={25}/>{APPS[id].name}</button>)}</div>
          {deviceId.startsWith("duo-") && <button onClick={() => useOS.setState({ deviceId: deviceId === "duo-inner" ? "duo-outer" : "duo-inner" })} className="mb-4 w-full rounded-xl bg-white/15 py-2 text-sm font-semibold hover:bg-white/25">{deviceId === "duo-inner" ? "Close concept device" : "Open concept device"}</button>}
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Finish</div>
          <div className="mb-4 flex gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                title={c.name}
                onClick={() => useOS.setState({ deviceColor: c.id })}
                className="h-7 w-7 rounded-full transition active:scale-90"
                style={{ background: c.frame, outline: c.id === colorId ? "2px solid #0a84ff" : "1px solid rgba(255,255,255,.25)", outlineOffset: 2 }}
              />
            ))}
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Controls</div>
          <div className="mb-2 flex gap-2">
            {panelBtn("Home", <HomeIcon size={18} />, () => s().goHome())}
            {panelBtn("Lock", <Lock size={18} />, () => s().pressSide())}
            {panelBtn("Switcher", <Layers size={18} />, () => (s().switcher ? s().goHome() : s().openSwitcher()))}
          </div>
          <div className="mb-2 flex gap-2">
            {panelBtn("Control", <SlidersHorizontal size={18} />, () => s().set({ cc: !s().cc, shade: false }))}
            {panelBtn("Notifs", <NotifIcon size={18} />, () => s().set({ shade: !s().shade, cc: false }))}
            {panelBtn("Search", <Search size={18} />, () => !s().locked && s().set({ foreground: null, switcher: false, spotlight: true }))}
          </div>
          <div className="mb-4 flex gap-2">
            {panelBtn("Siri", <Mic size={18} />, () => !s().locked && s().set({ siri: true }))}
            {panelBtn(dark ? "Light" : "Dark", dark ? <Sun size={18} /> : <Moon size={18} />, () => s().set({ appearance: dark ? "light" : "dark" }))}
            {panelBtn(silent ? "Silent" : "Ring", silent ? <BellOff size={18} /> : <Bell size={18} />, () => s().toggleSilent(), silent)}
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Live Activities</div>
          <div className="mb-4 flex flex-col gap-1.5">
            <button
              onClick={() => {
                if (s().liveActivity) s().set({ liveActivity: null });
                else s().set({ liveActivity: { kind: "workout", title: "Walking", subtitle: "Outdoor Walk", progress: 0, color: "#ff2d55", startedAt: Date.now() } });
              }}
              className={`rounded-lg px-3 py-2 text-left text-[13px] transition ${s().liveActivity ? "bg-[#ff2d55] text-white" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
            >
              {s().liveActivity ? "Stop Workout" : "Start Workout"} · Dynamic Island
            </button>
            <button
              onClick={() => {
                if (s().liveActivity) s().set({ liveActivity: null });
                else s().set({ liveActivity: { kind: "delivery", title: "Package", subtitle: "Out for delivery", progress: 35, color: "#0a84ff", startedAt: Date.now() } });
              }}
              className={`rounded-lg px-3 py-2 text-left text-[13px] transition ${s().liveActivity?.kind === "delivery" ? "bg-[#0a84ff] text-white" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
            >
              {s().liveActivity?.kind === "delivery" ? "Stop Delivery" : "Track Delivery"} · Dynamic Island
            </button>
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Developer</div>
          <div className="mb-4 flex flex-col gap-1.5">
            <button
              onClick={() => { s().openApp("appstore"); setTimeout(() => sendAction("appstore", "ipa"), 100); }}
              className="rounded-lg bg-white/10 px-3 py-2 text-left text-[13px] text-white/90 transition hover:bg-white/20"
            >
              Test IPA · Upload & analyze package
            </button>
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Power Features</div>
          <div className="mb-4 flex flex-col gap-1.5">
            <button
              onClick={() => s().set({ standby: !s().standby })}
              className={`rounded-lg px-3 py-2 text-left text-[13px] transition ${s().standby ? "bg-white text-black" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
            >
              {s().standby ? "Exit StandBy" : "StandBy Mode"} · Landscape desk clock
            </button>
            <button
              onClick={() => {
                const cur = s().foreground;
                if (s().splitView) s().set({ splitView: null });
                else if (cur && cur !== "settings") s().set({ splitView: { left: cur, right: "notes" } });
                else s().set({ splitView: { left: "safari", right: "notes" } });
              }}
              className={`rounded-lg px-3 py-2 text-left text-[13px] transition ${s().splitView ? "bg-white text-black" : "bg-white/10 text-white/90 hover:bg-white/20"}`}
            >
              {s().splitView ? "Exit Split View" : "Split View"} · Two apps side-by-side
            </button>
            <button
              onClick={() => {
                s().set({ airdrop: { name: "Photo.jpg", size: "2.4 MB", type: "image", progress: 0, phase: "incoming" } });
              }}
              className="rounded-lg bg-white/10 px-3 py-2 text-left text-[13px] text-white/90 transition hover:bg-white/20"
            >
              Simulate AirDrop · Incoming file
            </button>
            <label className="rounded-lg bg-white/10 px-3 py-2 text-left text-[13px] text-white/90 transition hover:bg-white/20 cursor-pointer">
              Drop a file (or click) → AirDrop
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = URL.createObjectURL(f);
                    s().set({ airdrop: { name: f.name, size: `${(f.size / 1024 / 1024).toFixed(2)} MB`, type: f.type.startsWith("image/") ? "image" : "file", url, progress: 0, phase: "incoming" } });
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Shortcuts</div>
          <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/60">
            {[
              ["Esc / H", "Home"],
              ["L", "Lock / wake"],
              ["S", "App switcher"],
              ["C", "Control Center"],
              ["N", "Notifications"],
              ["/", "Spotlight"],
              ["I", "Siri"],
              ["D", "Dark mode"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white">{k}</kbd>
                <span>{v}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (confirm("Erase all content and settings? This resets the simulator.")) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith("ios-sim"))
                  .forEach((k) => localStorage.removeItem(k));
                void clearImportedFiles().catch(() => {}).finally(() => location.reload());
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/20 py-2 text-[13px] font-medium text-red-300 transition hover:bg-red-500/30"
          >
            <RotateCcw size={14} /> Erase All Content
          </button>
          <p className="mt-3 text-[11px] leading-snug text-white/35">
            Drag to scroll, swipe up from the bottom edge to go home, and swipe down from the top corners for Control Center and Notifications.
          </p>
        </div>
      )}
    </div>
  );
}
