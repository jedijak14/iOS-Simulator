import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { audioFlags, sfx } from "./sound";
import { uid, clamp } from "./utils";
import { useData } from "./data";
import type { SharePayload } from "./share";
import type { IconMode } from "./TintedIcons";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Notif {
  id: string;
  app: string;
  title: string;
  body: string;
  at: number;
}
export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  bold?: boolean;
  onPress?: () => void;
}
export interface AlertSpec {
  title: string;
  message?: string;
  buttons: AlertButton[];
}
export interface SheetSpec {
  title?: string;
  message?: string;
  actions: AlertButton[];
}
export type LayoutItem =
  | { t: "app"; id: string }
  | { t: "folder"; id: string; name: string; apps: string[] }
  | { t: "widget"; id: string; w: number; h: number };

export interface Alarm {
  id: string;
  h: number;
  m: number;
  label: string;
  days: number[];
  on: boolean;
}
export interface TimerState {
  status: "idle" | "running" | "paused";
  total: number;
  endAt: number;
  left: number;
}
export interface MusicState {
  active: boolean;
  idx: number;
  playing: boolean;
  offset: number;
  startedAt: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
}
export interface CallState {
  name: string;
  number: string;
  state: "calling" | "connected";
  startedAt: number;
  muted: boolean;
  speaker: boolean;
  keypad: boolean;
}
export interface Ringing {
  kind: "alarm" | "timer";
  label: string;
}

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { t: "widget", id: "weather", w: 4, h: 2 },
  { t: "widget", id: "calendar", w: 2, h: 2 },
  { t: "widget", id: "photos", w: 2, h: 2 },
  { t: "app", id: "siriapp" },
  { t: "app", id: "facetime" },
  { t: "app", id: "calendar" },
  { t: "app", id: "photos" },
  { t: "app", id: "camera" },
  { t: "app", id: "mail" },
  { t: "app", id: "notes" },
  { t: "app", id: "reminders" },
  { t: "app", id: "clock" },
  { t: "app", id: "maps" },
  { t: "app", id: "wallet" },
  { t: "app", id: "health" },
  { t: "app", id: "fitness" },
  { t: "app", id: "translate" },
  { t: "app", id: "journal" },
  { t: "app", id: "podcasts" },
  { t: "app", id: "news" },
  { t: "app", id: "tv" },
  { t: "app", id: "books" },
  { t: "app", id: "freeform" },
  { t: "app", id: "home" },
  { t: "app", id: "passwords" },
  { t: "app", id: "files" },
  { t: "app", id: "shortcuts" },
  { t: "app", id: "tips" },
  { t: "app", id: "findmy" },
  { t: "app", id: "appstore" },
  { t: "app", id: "settings" },
  { t: "folder", id: "games", name: "Games", apps: ["twenty48", "snake", "minesweeper", "solitaire", "memory", "tictactoe", "flappybird"] },
  { t: "folder", id: "utilities", name: "Utilities", apps: ["calculator", "compass", "voicememos", "magnifier"] },
];
export const DEFAULT_DOCK = ["phone", "safari", "messages", "music"];
export const DEFAULT_INSTALLED = [
  "siriapp","phone","safari","messages","music","mail","clock","maps","camera",
  "reminders","notes","stocks","wallet","photos","weather","calendar",
  "appstore","settings","calculator","compass","voicememos",
  "contacts","facetime","health","translate","files","shortcuts",
  "journal","tips","findmy","magnifier",
  "podcasts","news","books","tv","fitness","freeform","home","passwords",
  "twenty48","snake","minesweeper","solitaire","memory","tictactoe","flappybird",
];

export interface OSState {
  power: "on" | "off" | "booting";
  screenOn: boolean;
  locked: boolean;
  foreground: string | null;
  running: string[];
  switcher: boolean;
  switcherFrom: string | null;
  cc: boolean;
  shade: boolean;
  spotlight: boolean;
  siri: boolean;
  editMode: boolean;
  homePage: number;
  launchRects: Record<string, Rect>;
  kbOpen: boolean;
  scale: number;
  toast: { id: string; text: string } | null;
  hud: { id: string; kind: "volume" | "silent" } | null;
  banner: Notif | null;
  alert: AlertSpec | null;
  sheet: SheetSpec | null;
  shareSheet: SharePayload | null;
  ringing: Ringing | null;
  snooze: { label: string; at: number } | null;
  call: CallState | null;
  ftCall: unknown | null;
  liveActivity: { kind: "workout" | "delivery" | "sports"; title: string; subtitle: string; progress: number; color: string; startedAt: number } | null;
  standby: boolean;
  aod: boolean;
  actionButton: "silent" | "camera" | "flashlight" | "shortcut" | "magnifier" | "voicememo";
  splitView: { left: string; right: string } | null;
  airdrop: { name: string; size: string; type: string; url?: string; progress: number; phase: "incoming" | "receiving" | "done" } | null;
  notifications: Notif[];
  /** Apps whose notifications have been disabled in Settings. */
  mutedApps: string[];
  flashlight: boolean;
  micActive: boolean;
  camActive: boolean;
  timer: TimerState;
  music: MusicState;
  lastActivity: number;
  islandExpanded: boolean;

  // persisted settings
  appearance: "light" | "dark" | "auto";
  brightness: number;
  glassOpacity: number;
  volume: number;
  silent: boolean;
  keyClicks: boolean;
  wifi: boolean;
  wifiName: string;
  bluetooth: boolean;
  cellular: boolean;
  airplane: boolean;
  dnd: boolean;
  focus: "off" | "dnd" | "personal" | "work" | "sleep";
  lowPower: boolean;
  orientationLock: boolean;
  wallpaper: string;
  lockWallpaper: string;
  passcode: string | null;
  faceId: boolean;
  autoLock: number;
  deviceName: string;
  use24h: boolean;
  boldText: boolean;
  reduceMotion: boolean;
  tempUnit: "c" | "f";
  deviceId: string;
  deviceColor: string;
  layout: LayoutItem[];
  dock: string[];
  installed: string[];
  alarms: Alarm[];
  battery: number;
  charging: boolean;
  batterySource: "device" | "simulated";
  welcomed: boolean;
  iconMode: IconMode;

  set: (p: Partial<OSState>) => void;
  openApp: (id: string, rect?: Rect) => void;
  goHome: () => void;
  openSwitcher: () => void;
  closeSwitcher: (to?: string | null) => void;
  closeApp: (id: string) => void;
  lock: () => void;
  wake: () => void;
  unlock: () => void;
  pressSide: () => void;
  powerOff: () => void;
  powerOn: () => void;
  notify: (n: Omit<Notif, "id" | "at">) => void;
  dismissNotif: (id: string) => void;
  clearNotifs: () => void;
  showAlert: (a: AlertSpec) => void;
  showSheet: (s: SheetSpec) => void;
  showToast: (text: string) => void;
  volumeStep: (d: number) => void;
  toggleSilent: () => void;
  setAirplane: (on: boolean) => void;
  startTimer: (total: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  stopRinging: (snooze?: boolean) => void;
  tick: () => void;
  startCall: (name: string, number: string) => void;
  endCall: () => void;
  install: (id: string) => void;
  uninstall: (id: string) => void;
  touch: () => void;
}

const eventsNotified = new Set<string>();
let prevRadios = { wifi: true, bluetooth: true };
let lastAlarmKey = "";
let lastBat = Date.now();
let lowShown = { 20: false, 10: false };

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      power: "on",
      screenOn: true,
      locked: true,
      foreground: null,
      running: [],
      switcher: false,
      switcherFrom: null,
      cc: false,
      shade: false,
      spotlight: false,
      siri: false,
      editMode: false,
      homePage: 0,
      launchRects: {},
      kbOpen: false,
      scale: 1,
      toast: null,
      hud: null,
      banner: null,
      alert: null,
      sheet: null,
      shareSheet: null,
      ringing: null,
      snooze: null,
      call: null,
      ftCall: null,
      liveActivity: null,
      standby: false,
      aod: false,
      actionButton: "silent",
      splitView: null,
      airdrop: null,
      notifications: [],
      mutedApps: [],
      flashlight: false,
      micActive: false,
      camActive: false,
      timer: { status: "idle", total: 0, endAt: 0, left: 0 },
      music: { active: false, idx: 0, playing: false, offset: 0, startedAt: 0, shuffle: false, repeat: "off" },
      lastActivity: Date.now(),
      islandExpanded: false,

      appearance: "light",
      brightness: 0.92,
      glassOpacity: 0.55,
      volume: 0.6,
      silent: false,
      keyClicks: true,
      wifi: true,
      wifiName: "Home Wi-Fi",
      bluetooth: true,
      cellular: true,
      airplane: false,
      dnd: false,
      focus: "off",
      lowPower: false,
      orientationLock: false,
      wallpaper: "aurora",
      lockWallpaper: "aurora",
      passcode: null,
      faceId: false,
      autoLock: 300,
      deviceName: "iPhone",
      use24h: false,
      boldText: false,
      reduceMotion: false,
      tempUnit: "c",
      deviceId: "15pro",
      deviceColor: "natural",
      layout: DEFAULT_LAYOUT,
      dock: DEFAULT_DOCK,
      installed: DEFAULT_INSTALLED,
      alarms: [
        { id: "a1", h: 7, m: 30, label: "Wake up", days: [1, 2, 3, 4, 5], on: false },
        { id: "a2", h: 9, m: 0, label: "Alarm", days: [], on: false },
      ],
      battery: 87,
      charging: false,
      batterySource: "simulated",
      welcomed: false,
      iconMode: "default",

      set: (p) => set(p),
      touch: () => set({ lastActivity: Date.now() }),

      openApp: (id, rect) => {
        const s = get();
        if (s.power !== "on" || s.locked) return;
        if (s.foreground !== id) sfx.appOpen();
        set({
          running: [id, ...s.running.filter((x) => x !== id)],
          foreground: id,
          switcher: false,
          cc: false,
          shade: false,
          spotlight: false,
          siri: false,
          editMode: false,
          islandExpanded: false,
          launchRects: rect ? { ...s.launchRects, [id]: rect } : s.launchRects,
        });
      },
      goHome: () => {
        const s = get();
        if (s.editMode) return set({ editMode: false });
        const already = s.foreground === null && !s.switcher && !s.cc && !s.shade && !s.spotlight && !s.siri;
        if (s.foreground !== null) sfx.appClose();
        set({
          foreground: null,
          switcher: false,
          cc: false,
          shade: false,
          spotlight: false,
          siri: false,
          islandExpanded: false,
          homePage: already ? 0 : s.homePage,
        });
      },
      openSwitcher: () => {
        const s = get();
        if (s.locked) return;
        set({ switcher: true, switcherFrom: s.foreground, cc: false, shade: false, spotlight: false, siri: false, editMode: false });
      },
      closeSwitcher: (to) => {
        const s = get();
        if (to === undefined) to = s.switcherFrom && s.running.includes(s.switcherFrom) ? s.switcherFrom : null;
        if (to) {
          set({ switcher: false, foreground: to, running: [to, ...s.running.filter((x) => x !== to)] });
        } else set({ switcher: false, foreground: null });
      },
      closeApp: (id) => {
        const s = get();
        set({
          running: s.running.filter((x) => x !== id),
          foreground: s.foreground === id ? null : s.foreground,
        });
      },
      lock: () => {
        const s = get();
        if (s.power !== "on") return;
        sfx.lock();
        set({
          screenOn: false,
          locked: true,
          cc: false,
          shade: false,
          spotlight: false,
          siri: false,
          switcher: false,
          editMode: false,
          banner: null,
          islandExpanded: false,
        });
      },
      wake: () => {
        const s = get();
        if (s.power !== "on") return;
        set({ screenOn: true, lastActivity: Date.now() });
      },
      unlock: () => {
        sfx.unlock();
        set({ locked: false, lastActivity: Date.now() });
      },
      pressSide: () => {
        const s = get();
        if (s.power === "off") return get().powerOn();
        if (s.power === "booting") return;
        if (s.screenOn) get().lock();
        else get().wake();
      },
      powerOff: () => {
        set({
          power: "off",
          screenOn: false,
          cc: false,
          shade: false,
          spotlight: false,
          siri: false,
          switcher: false,
          banner: null,
          alert: null,
          sheet: null,
          shareSheet: null,
          call: null,
          ftCall: null,
          liveActivity: null,
          standby: false,
          aod: false,
          splitView: null,
          airdrop: null,
          flashlight: false,
          micActive: false,
          camActive: false,
        });
      },
      powerOn: () => {
        sfx.boot();
        set({ power: "booting", screenOn: true });
        setTimeout(() => {
          set({
            power: "on",
            screenOn: true,
            locked: true,
            running: [],
            foreground: null,
            notifications: [],
            lastActivity: Date.now(),
            music: { ...get().music, playing: false, active: false },
          });
        }, 2800);
      },

      notify: (n) => {
        const s = get();
        if (s.power !== "on" || s.mutedApps.includes(n.app)) return;
        const notif: Notif = { ...n, id: uid(), at: Date.now() };
        if (!s.locked && s.foreground === n.app && s.screenOn) return;
        set({ notifications: [notif, ...s.notifications].slice(0, 40) });
        if (s.dnd) return;
        const patch: Partial<OSState> = { banner: !s.locked && s.screenOn ? notif : null };
        if (!s.screenOn) patch.screenOn = true;
        set(patch);
        sfx.ding();
      },
      dismissNotif: (id) => set({ notifications: get().notifications.filter((n) => n.id !== id) }),
      clearNotifs: () => set({ notifications: [] }),
      showAlert: (a) => set({ alert: a }),
      showSheet: (a) => set({ sheet: a }),
      showToast: (text) => set({ toast: { id: uid(), text } }),

      volumeStep: (d) => {
        const v = clamp(Math.round((get().volume + d) * 16) / 16, 0, 1);
        set({ volume: v, hud: { id: uid(), kind: "volume" }, silent: v > 0 ? get().silent : get().silent });
        audioFlags.volume = v;
        sfx.volume();
      },
      toggleSilent: () => {
        const silent = !get().silent;
        set({ silent, hud: { id: uid(), kind: "silent" } });
      },
      setAirplane: (on) => {
        const s = get();
        if (on) {
          prevRadios = { wifi: s.wifi, bluetooth: s.bluetooth };
          set({ airplane: true, wifi: false, bluetooth: false });
        } else {
          set({ airplane: false, wifi: prevRadios.wifi, bluetooth: prevRadios.bluetooth });
        }
      },

      startTimer: (total) => set({ timer: { status: "running", total, endAt: Date.now() + total * 1000, left: total } }),
      pauseTimer: () => {
        const t = get().timer;
        set({ timer: { ...t, status: "paused", left: Math.max(0, (t.endAt - Date.now()) / 1000) } });
      },
      resumeTimer: () => {
        const t = get().timer;
        set({ timer: { ...t, status: "running", endAt: Date.now() + t.left * 1000 } });
      },
      cancelTimer: () => set({ timer: { status: "idle", total: 0, endAt: 0, left: 0 } }),
      stopRinging: (snooze) => {
        const r = get().ringing;
        set({ ringing: null, snooze: snooze && r ? { label: r.label, at: Date.now() + 9 * 60_000 } : get().snooze });
      },

      tick: () => {
        const s = get();
        if (s.power !== "on") return;
        const now = Date.now();
        // timer
        if (s.timer.status === "running" && now >= s.timer.endAt) {
          set({
            timer: { status: "idle", total: 0, endAt: 0, left: 0 },
            ringing: { kind: "timer", label: "Timer" },
            screenOn: true,
          });
        }
        // snooze
        if (s.snooze && now >= s.snooze.at) {
          set({ snooze: null, ringing: { kind: "alarm", label: s.snooze.label }, screenOn: true });
        }
        // due reminders & upcoming calendar events
        const dd = useData.getState();
        const due = dd.reminders.filter((r) => !r.done && r.due && !r.notified && r.due <= now && r.due > now - 6 * 3600_000);
        if (due.length) {
          useData.setState({ reminders: dd.reminders.map((r) => (due.some((x) => x.id === r.id) ? { ...r, notified: true } : r)) });
          due.forEach((r) => get().notify({ app: "reminders", title: "Reminder", body: r.text }));
        }
        dd.events.forEach((e) => {
          if (!e.allDay && e.start > now && e.start - now < 5 * 60_000 && !eventsNotified.has(e.id + e.start)) {
            eventsNotified.add(e.id + e.start);
            get().notify({ app: "calendar", title: e.title, body: `Starts in ${Math.max(1, Math.ceil((e.start - now) / 60000))} min${e.location ? ` · ${e.location}` : ""}` });
          }
        });
        // alarms (once per minute)
        const d = new Date(now);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
        if (key !== lastAlarmKey) {
          lastAlarmKey = key;
          const hit = get().alarms.find(
            (a) => a.on && a.h === d.getHours() && a.m === d.getMinutes() && (a.days.length === 0 || a.days.includes(d.getDay())),
          );
          if (hit) {
            set({
              ringing: { kind: "alarm", label: hit.label || "Alarm" },
              screenOn: true,
              alarms: get().alarms.map((a) => (a.id === hit.id && a.days.length === 0 ? { ...a, on: false } : a)),
            });
          }
        }
        // battery
        const interval = s.charging ? 20_000 : s.lowPower ? 240_000 : 120_000;
        if (s.batterySource === "simulated" && now - lastBat >= interval) {
          lastBat = now;
          const b = clamp(s.battery + (s.charging ? 1 : -1), 1, 100);
          set({ battery: b });
          if (!s.charging && (b === 20 || b === 10) && !lowShown[b as 20 | 10]) {
            lowShown[b as 20 | 10] = true;
            set({
              alert: {
                title: "Low Battery",
                message: `${b}% of battery remaining.`,
                buttons: [
                  { text: "Low Power Mode", bold: true, onPress: () => set({ lowPower: true }) },
                  { text: "Close", style: "cancel" },
                ],
              },
            });
          }
          if (s.charging || b > 25) lowShown = { 20: false, 10: false };
          if (b >= 80 && s.lowPower && s.charging) set({ lowPower: false });
        }
        // auto lock
        if (s.autoLock > 0 && s.screenOn && !s.locked && now - s.lastActivity > s.autoLock * 1000 && !s.call && !s.ringing) {
          get().lock();
        } else if (s.autoLock > 0 && s.screenOn && s.locked && now - s.lastActivity > Math.max(20, Math.min(s.autoLock, 60)) * 1000 && !s.ringing) {
          get().lock();
        }
        // live activity progress (delivery, sports)
        if (s.liveActivity && s.liveActivity.kind !== "workout" && now - s.liveActivity.startedAt > 5_000) {
          const step = (now - s.liveActivity.startedAt) / 1000;
          const progress = Math.min(100, step * 2);
          set({ liveActivity: { ...s.liveActivity, progress } });
        }
      },

      startCall: (name, number) => {
        set({ call: { name, number, state: "calling", startedAt: Date.now(), muted: false, speaker: false, keypad: false } });
        setTimeout(() => {
          const c = get().call;
          if (c && c.state === "calling" && c.number === number) {
            set({ call: { ...c, state: "connected", startedAt: Date.now() } });
          }
        }, 3200);
      },
      endCall: () => set({ call: null }),

      install: (id) => {
        const s = get();
        if (s.installed.includes(id)) return;
        set({ installed: [...s.installed, id], layout: [...s.layout, { t: "app", id }] });
      },
      uninstall: (id) => {
        const s = get();
        set({
          installed: s.installed.filter((x) => x !== id),
          layout: s.layout
            .map((it) => (it.t === "folder" ? { ...it, apps: it.apps.filter((a) => a !== id) } : it))
            .filter((it) => !(it.t === "app" && it.id === id) && !(it.t === "folder" && it.apps.length === 0)),
          dock: s.dock.filter((x) => x !== id),
          running: s.running.filter((x) => x !== id),
          foreground: s.foreground === id ? null : s.foreground,
        });
      },
    }),
    {
      name: "ios-sim-os",
      version: 5,
      // Migrate older persisted state to include new fields (focus, etc.)
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = (persisted || {}) as Partial<OSState>;
        // v2 → v3: ensure focus field exists and matches dnd
        if (fromVersion < 3) {
          if (s.focus === undefined) s.focus = s.dnd ? "dnd" : "off";
        }
        // v3 → v4: ensure iconMode field exists (default "default")
        if (fromVersion < 4) {
          if (s.iconMode === undefined) s.iconMode = "default";
        }
        if (fromVersion < 5) {
          if (s.installed && !s.installed.includes("siriapp")) s.installed = [...s.installed, "siriapp"];
          if (s.layout && !s.layout.some((item) => item.t === "app" && item.id === "siriapp")) s.layout = [...s.layout, { t: "app", id: "siriapp" }];
        }
        return s;
      },
      partialize: (s) => ({
        appearance: s.appearance,
        brightness: s.brightness,
        glassOpacity: s.glassOpacity,
        volume: s.volume,
        silent: s.silent,
        keyClicks: s.keyClicks,
        wifi: s.wifi,
        wifiName: s.wifiName,
        bluetooth: s.bluetooth,
        cellular: s.cellular,
        airplane: s.airplane,
        dnd: s.dnd,
        focus: s.focus,
        mutedApps: s.mutedApps,
        lowPower: s.lowPower,
        orientationLock: s.orientationLock,
        wallpaper: s.wallpaper,
        lockWallpaper: s.lockWallpaper,
        passcode: s.passcode,
        faceId: s.faceId,
        autoLock: s.autoLock,
        deviceName: s.deviceName,
        use24h: s.use24h,
        boldText: s.boldText,
        reduceMotion: s.reduceMotion,
        tempUnit: s.tempUnit,
        deviceId: s.deviceId,
        deviceColor: s.deviceColor,
        layout: s.layout,
        dock: s.dock,
        installed: s.installed,
        alarms: s.alarms,
        battery: s.battery,
        charging: s.charging,
        welcomed: s.welcomed,
        iconMode: s.iconMode,
        aod: s.aod,
        actionButton: s.actionButton,
      }),
    },
  ),
);

// keep the synthesizer in sync with settings
function syncAudio(s: OSState) {
  audioFlags.volume = s.volume;
  audioFlags.silent = s.silent;
  audioFlags.keyClicks = s.keyClicks;
  audioFlags.masterOff = s.power !== "on" && s.power !== "booting";
}
syncAudio(useOS.getState());
useOS.subscribe(syncAudio);

// debugging / automation hook
if (typeof window !== "undefined") (window as unknown as { __iosSim: typeof useOS }).__iosSim = useOS;

export const isOnline = (s: Pick<OSState, "wifi" | "cellular" | "airplane">) => s.wifi || (s.cellular && !s.airplane);

export function useDark() {
  const appearance = useOS((s) => s.appearance);
  const [sys, setSys] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const fn = () => setSys(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return appearance === "dark" || (appearance === "auto" && sys);
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useDevice() {
  // imported lazily to avoid cycles
  const id = useOS((s) => s.deviceId);
  return id;
}
