import { useEffect, useRef } from "react";
import { useOS, useDark } from "./store";
import { useSpec } from "./device-context";
import { wallpaperOf } from "./devices";
import { APPS } from "./registry";
import { StatusBar, Island, HomeIndicator } from "./Chrome";
import { HomeScreen } from "./HomeScreen";
import { AppLayer } from "./AppLayer";
import { LockScreen, Shade } from "./LockScreen";
import { ControlCenter } from "./ControlCenter";
import { Keyboard } from "./Keyboard";
import { Spotlight } from "./Spotlight";
import { Siri } from "./Siri";
import { AlertHost, Banner, BootScreen, DndPill, RingingOverlay, SheetHost, Toast, VolumeHud } from "./Overlays";
import { ShareSheet } from "./share";
import { WritingToolsOverlay } from "./WritingTools";
import { ShakeToUndo } from "./ShakeToUndo";
import { StandBy, AirDropOverlay } from "./StandBy";
import { SplitView } from "./SplitView";
import { ContactPoster, AlwaysOnDisplay } from "./ContactPoster";
import { musicTick } from "./music";

export function Screen() {
  const spec = useSpec();
  const rootRef = useRef<HTMLDivElement>(null);
  const power = useOS((s) => s.power);
  const screenOn = useOS((s) => s.screenOn);
  const locked = useOS((s) => s.locked);
  const fg = useOS((s) => s.foreground);
  const switcher = useOS((s) => s.switcher);
  const cc = useOS((s) => s.cc);
  const shade = useOS((s) => s.shade);
  const spotlight = useOS((s) => s.spotlight);
  const siri = useOS((s) => s.siri);
  const wallpaper = useOS((s) => s.wallpaper);
  const lockWallpaper = useOS((s) => s.lockWallpaper);
  const brightness = useOS((s) => s.brightness);
  const bold = useOS((s) => s.boldText);
  const reduce = useOS((s) => s.reduceMotion);
  const welcomed = useOS((s) => s.welcomed);
  const call = useOS((s) => s.call);
  const set = useOS((s) => s.set);
  const dark = useDark();

  // system ticker (timers, alarms, battery, music, auto-lock)
  useEffect(() => {
    const id = setInterval(() => {
      useOS.getState().tick();
      musicTick();
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Battery Status is not available in every browser (notably Safari/Firefox).
  // Keep the simulator fallback when the host does not expose it.
  useEffect(() => {
    type BatteryManager = EventTarget & { level: number; charging: boolean };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    let disposed = false;
    let manager: BatteryManager | undefined;
    const update = () => { if (manager && !disposed) useOS.setState({ battery: Math.round(manager.level * 100), charging: manager.charging, batterySource: "device" }); };
    nav.getBattery?.().then((battery) => {
      if (disposed) return;
      manager = battery;
      update();
      battery.addEventListener("levelchange", update);
      battery.addEventListener("chargingchange", update);
    }).catch(() => {});
    return () => { disposed = true; manager?.removeEventListener("levelchange", update); manager?.removeEventListener("chargingchange", update); };
  }, []);

  // dismiss keyboard when context changes
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [fg, switcher, locked, screenOn, cc, shade]);

  // welcome notification a few seconds after first unlock
  useEffect(() => {
    if (!locked && !welcomed && power === "on") {
      const t = setTimeout(() => {
        const s = useOS.getState();
        s.set({ welcomed: true });
        s.notify({ app: "messages", title: "Mom", body: "Welcome to your new iPhone! 🎉 Try swiping down from the top right for Control Center." });
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [locked, welcomed, power]);

  // keep recents in sync with what the screen is showing
  const wp = wallpaperOf(wallpaper);
  const homeLight = wallpaper !== "peach";
  let light = true;
  if (locked) light = lockWallpaper !== "peach";
  else if (cc || shade || siri || spotlight) light = true;
  else if (switcher || fg === null) light = homeLight;
  else light = !!APPS[fg]?.light || dark;
  const indicatorLight = light && (locked || switcher || fg === null || !!APPS[fg ?? ""]?.light || dark || cc || shade);

  // top-edge swipe zones
  const zone = useRef<{ y: number; x: number; side: "l" | "r" } | null>(null);
  const zoneH = Math.min(spec.safeTop - 4, 30);
  const topZone = (side: "l" | "r") => (
    <div
      className="absolute top-0 z-[88]"
      style={{ [side === "l" ? "left" : "right"]: 0, width: "50%", height: zoneH, display: locked || !screenOn || switcher ? "none" : "block" }}
      onPointerDown={(e) => {
        zone.current = { y: e.clientY, x: e.clientX, side };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const z = zone.current;
        if (!z) return;
        if ((e.clientY - z.y) / useOS.getState().scale > 36) {
          zone.current = null;
          if (z.side === "r") set({ cc: true, shade: false, spotlight: false });
          else set({ shade: true, cc: false, spotlight: false });
        }
      }}
      onPointerUp={() => {
        const z = zone.current;
        zone.current = null;
        if (z) {
          if (z.side === "r") set({ cc: true, shade: false });
          else set({ shade: true, cc: false });
        }
      }}
    />
  );

  return (
    <div
      ref={rootRef}
      data-screen-root
      data-theme={dark ? "dark" : "light"}
      className={`ios-screen relative overflow-hidden bg-black ${bold ? "bold-text" : ""} ${reduce ? "reduce-motion" : ""}`}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.radius,
        ["--safe-top" as string]: `${spec.safeTop}px`,
        ["--safe-bottom" as string]: `${spec.safeBottom}px`,
      }}
      onPointerDownCapture={() => useOS.getState().touch()}
      onKeyDownCapture={() => useOS.getState().touch()}
    >
      {/* wallpaper */}
      <div className="absolute inset-0" style={{ background: wp.css }} />

      {/* home */}
      <div
        className="absolute inset-0 z-10"
        style={{
          transform: `scale(${fg ? 0.9 : switcher ? 0.96 : 1})`,
          opacity: fg && !switcher ? 0 : 1,
          transition: "transform .4s cubic-bezier(.2,.85,.25,1), opacity .25s linear",
        }}
      >
        <HomeScreen />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[15] bg-black/35 backdrop-blur-xl transition-opacity duration-300"
        style={{ opacity: switcher ? 1 : 0 }}
      />

      <AppLayer />
      <SplitView />

      {spotlight && <Spotlight />}
      <Siri />
      <LockScreen />
      <Shade />
      <ControlCenter />
      <Keyboard rootRef={rootRef} dark={dark} spec={spec} />

      <StatusBar light={light} />
      {spec.island && <Island />}
      {!locked && <HomeIndicator light={indicatorLight} />}
      {!spec.island && call && fg !== "phone" && !locked && (
        <button
          className="absolute inset-x-0 top-0 z-[89]"
          style={{ height: spec.safeTop }}
          onClick={() => useOS.getState().openApp("phone")}
        />
      )}
      {topZone("l")}
      {topZone("r")}

      <Banner />
      <VolumeHud />
      <DndPill />
      <Toast />
      <AlertHost />
      <SheetHost />
      <ShareSheet />
      <WritingToolsOverlay />
      <AirDropOverlay />
      <ContactPoster />
      <RingingOverlay />

      {/* Shake-to-Undo listener (renders nothing) */}
      <ShakeToUndo />

      {/* StandBy mode (covers everything when active) */}
      <StandBy />

      {/* Always-On Display (dim clock when locked) */}
      <AlwaysOnDisplay />

      {/* brightness dimmer */}
      <div className="pointer-events-none absolute inset-0 z-[140] bg-black" style={{ opacity: (1 - brightness) * 0.75 }} />
      {/* sleeping screen */}
      <div
        className="absolute inset-0 z-[150] bg-black"
        style={{ opacity: screenOn ? 0 : 1, pointerEvents: screenOn ? "none" : "auto", transition: "opacity .3s ease" }}
        onClick={() => useOS.getState().wake()}
      />
      <BootScreen />
    </div>
  );
}
