import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  Accessibility as AccIcon,
  BatteryFull,
  Bed,
  Bell,
  Bluetooth,
  Briefcase,
  Check,
  Hand,
  Home,
  Hourglass,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Mic,
  Moon,
  Plane,
  Radio,
  ScanFace,
  Settings as Cog,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  SunMoon,
  Volume2,
  Wallet,
  Wifi,
  Delete,
  type LucideIcon,
} from "lucide-react";
import { useOS, useDark, DEFAULT_LAYOUT } from "../os/store";
import { DEVICES, WALLPAPERS } from "../os/devices";
import { APPS } from "../os/registry";
import { BackBtn, Group, Page, Row, SearchField, Segmented, Slider, Spinner, Toggle, ScrollView, useLongPress } from "../os/ui";
import { sfx } from "../os/sound";
import { fmtTime } from "../os/utils";
import { useNow } from "../os/store";

interface RowDef {
  id: string;
  title: string;
  icon: LucideIcon;
  bg: string;
}

const R = {
  airplane: { id: "airplane", title: "Airplane Mode", icon: Plane, bg: "#ff9500" },
  wifi: { id: "wifi", title: "Wi-Fi", icon: Wifi, bg: "#007aff" },
  bluetooth: { id: "bluetooth", title: "Bluetooth", icon: Bluetooth, bg: "#007aff" },
  cellular: { id: "cellular", title: "Cellular", icon: Radio, bg: "#34c759" },
  hotspot: { id: "hotspot", title: "Personal Hotspot", icon: Link2, bg: "#34c759" },
  notifications: { id: "notifications", title: "Notifications", icon: Bell, bg: "#ff3b30" },
  sounds: { id: "sounds", title: "Sounds & Haptics", icon: Volume2, bg: "#ff2d55" },
  focus: { id: "focus", title: "Focus", icon: Moon, bg: "#5856d6" },
  screentime: { id: "screentime", title: "Screen Time", icon: Hourglass, bg: "#5856d6" },
  general: { id: "general", title: "General", icon: Cog, bg: "#8e8e93" },
  control: { id: "control", title: "Control Center", icon: SlidersHorizontal, bg: "#8e8e93" },
  display: { id: "display", title: "Display & Brightness", icon: SunMoon, bg: "#007aff" },
  home: { id: "home", title: "Home Screen & App Library", icon: LayoutGrid, bg: "#5856d6" },
  access: { id: "access", title: "Accessibility", icon: AccIcon, bg: "#007aff" },
  wallpaper: { id: "wallpaper", title: "Wallpaper", icon: ImageIcon, bg: "#00c7be" },
  siri: { id: "siri", title: "Siri & Search", icon: Mic, bg: "#2c2c2e" },
  faceid: { id: "faceid", title: "Face ID & Passcode", icon: ScanFace, bg: "#34c759" },
  sos: { id: "sos", title: "Emergency SOS", icon: ShieldAlert, bg: "#ff3b30" },
  battery: { id: "battery", title: "Battery", icon: BatteryFull, bg: "#34c759" },
  privacy: { id: "privacy", title: "Privacy & Security", icon: Hand, bg: "#007aff" },
  appstore: { id: "appstore", title: "App Store", icon: ShoppingBag, bg: "#0a84ff" },
  wallet: { id: "wallet", title: "Wallet & Apple Pay", icon: Wallet, bg: "#1c1c1e" },
} satisfies Record<string, RowDef>;

const GROUPS: RowDef[][] = [
  [R.airplane, R.wifi, R.bluetooth, R.cellular, R.hotspot],
  [R.notifications, R.sounds, R.focus, R.screentime],
  [R.general, R.control, R.display, R.home, R.access, R.wallpaper, R.siri, R.faceid, R.sos, R.battery, R.privacy],
  [R.appstore, R.wallet],
];

const INFO: Record<string, [string, string]> = {
  hotspot: ["Personal Hotspot", "Share your iPhone's cellular connection with other devices. Requires a cellular plan that supports tethering."],
  screentime: ["Screen Time", "Daily average: 3h 12m. Most used: Safari, Messages, Music. Set limits and schedule downtime for yourself or your family."],
  control: ["Control Center", "Swipe down from the top-right corner to open Control Center. Included controls: Connectivity, Now Playing, Focus, Brightness, Volume, Flashlight, Timer, Calculator, Camera."],
  siri: ["Siri & Search", "Press and hold the side button (or the Siri button in the side panel) to talk to Siri. Ask about the weather, set timers, open apps, call contacts or look things up on Wikipedia."],
  sos: ["Emergency SOS", "Press and hold the side button and a volume button to call emergency services. Disabled in the simulator."],
  privacy: ["Privacy & Security", "Camera and Microphone access is requested by your browser when an app uses them. Location is never shared unless you choose Use My Location."],
  appstore: ["App Store", "Automatic downloads are on. Apps you install appear on your Home Screen and in the App Library."],
  wallet: ["Wallet & Apple Pay", "Cards in Wallet are for demonstration only. No real payment information is stored."],
};

const BackCtx = createContext<ReactNode>(null);

function Sub({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const back = useContext(BackCtx);
  return (
    <Page title={title} large={false} left={back} footer={footer}>
      <div className="pt-3">{children}</div>
    </Page>
  );
}

function SlideIn({ children, back, leaving, depth }: { children: ReactNode; back: boolean; leaving: boolean; depth: number }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: leaving ? "translateX(100%)" : back ? "translateX(-28%)" : "translateX(0)",
        transition: "transform .34s cubic-bezier(.3,.8,.2,1)",
        animation: depth > 0 && !back && !leaving ? "slideInR .34s cubic-bezier(.3,.8,.2,1)" : undefined,
        boxShadow: depth > 0 ? "-6px 0 18px rgba(0,0,0,.12)" : undefined,
        filter: back ? "brightness(.94)" : undefined,
        pointerEvents: back ? "none" : "auto",
      }}
    >
      {children}
    </div>
  );
}

function PasscodeFlow({ mode, onDone }: { mode: "set" | "off" | "change"; onDone: () => void }) {
  const s = useOS();
  const [step, setStep] = useState<"old" | "new" | "verify">(mode === "set" ? "new" : "old");
  const [val, setVal] = useState("");
  const [first, setFirst] = useState("");
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(0);
  const title = step === "old" ? "Enter your passcode" : step === "new" ? "Enter a new passcode" : "Verify your new passcode";

  const submit = (v: string) => {
    if (step === "old") {
      if (v === s.passcode) {
        if (mode === "off") {
          s.set({ passcode: null });
          s.showToast("Passcode turned off");
          onDone();
        } else {
          setStep("new");
          setVal("");
          setMsg("");
        }
      } else fail("Incorrect passcode. Try again.");
    } else if (step === "new") {
      setFirst(v);
      setStep("verify");
      setVal("");
      setMsg("");
    } else if (v === first) {
      s.set({ passcode: v });
      s.showToast("Passcode set");
      onDone();
    } else {
      setStep("new");
      fail("Passcodes didn't match. Try again.");
    }
  };
  const fail = (m: string) => {
    setMsg(m);
    setShake((n) => n + 1);
    setVal("");
  };
  const press = (d: string) => {
    sfx.tick();
    if (val.length >= 6) return;
    const nv = val + d;
    setVal(nv);
    if (nv.length === 6) setTimeout(() => submit(nv), 150);
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setVal((v) => v.slice(0, -1));
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });
  return (
    <div className="flex flex-col items-center pt-8">
      <div className="text-[20px] font-medium">{title}</div>
      <div className="mt-1 h-5 text-[13px] text-ios-red">{msg}</div>
      <div key={shake} className={`mt-4 flex gap-4 ${shake ? "shake" : ""}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[13px] w-[13px] rounded-full border-[1.5px] border-ios-label" style={{ background: i < val.length ? "var(--ios-label)" : "transparent" }} />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-3 gap-x-5 gap-y-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ios-fill text-[32px] font-light active:bg-ios-fill2">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => press("0")} className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ios-fill text-[32px] font-light active:bg-ios-fill2">
          0
        </button>
        <button onClick={() => setVal((v) => v.slice(0, -1))} className="flex h-[72px] w-[72px] items-center justify-center text-ios-label2">
          <Delete size={26} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsApp() {
  const s = useOS();
  const dark = useDark();
  const now = useNow(1000);
  const [stack, setStack] = useState<string[]>(["root"]);
  const [leaving, setLeaving] = useState(false);
  const [q, setQ] = useState("");
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [preferences, setPreferences] = useState({
    siriNotices: true,
    suggestions: true,
    lockSound: true,
    smartActivation: true,
    crossDevice: true,
    autoTime: true,
    previews: true,
    scheduledSummary: false,
    backgroundRefresh: true,
    voiceOver: false,
    zoom: false,
  });
  const togglePreference = (key: keyof typeof preferences) => setPreferences((p) => ({ ...p, [key]: !p[key] }));
  const spec = DEVICES.find((d) => d.id === s.deviceId) ?? DEVICES[0];

  const push = (id: string) => setStack((st) => [...st, id]);
  const pop = () => {
    if (stack.length < 2 || leaving) return;
    setLeaving(true);
    setTimeout(() => {
      setStack((st) => st.slice(0, -1));
      setLeaving(false);
    }, 320);
  };
  const reset = () => {
    s.showAlert({
      title: "Erase All Content and Settings?",
      message: "This will erase all data on this simulated iPhone and restart it.",
      buttons: [
        {
          text: "Erase Now",
          style: "destructive",
          onPress: () => {
            Object.keys(localStorage)
              .filter((k) => k.startsWith("ios-sim"))
              .forEach((k) => localStorage.removeItem(k));
            location.reload();
          },
        },
        { text: "Cancel", style: "cancel", bold: true },
      ],
    });
  };

  const valueOf = (id: string): string | undefined => {
    switch (id) {
      case "wifi":
        return s.wifi ? s.wifiName : "Off";
      case "bluetooth":
        return s.bluetooth ? "On" : "Off";
      case "cellular":
        return s.cellular && !s.airplane ? "" : "Off";
      case "focus":
        return s.dnd ? "On" : undefined;
      case "display":
        return undefined;
      case "faceid":
        return s.passcode ? "On" : "Off";
      case "battery":
        return `${s.battery}%`;
      default:
        return undefined;
    }
  };

  const titleOf = (id: string) => {
    if (id.startsWith("notifications/")) return APPS[id.split("/")[1]]?.name ?? "Notifications";
    return id === "root" ? "Settings" : (Object.values(R).find((r) => r.id === id)?.title ?? INFO[id]?.[0] ?? id.charAt(0).toUpperCase() + id.slice(1));
  };

  const backFor = (id: string) => <BackBtn label={titleOf(stack[Math.max(0, stack.indexOf(id) - 1)])} onClick={pop} />;

  const page = (id: string): ReactNode => {
    const back = backFor(id);

    if (id === "root") {
      const all = Object.values(R);
      const hits = q ? all.filter((r) => r.title.toLowerCase().includes(q.toLowerCase())) : [];
      return (
        <Page title="Settings">
          <div className="px-4 pb-4">
            <SearchField value={q} onChange={setQ} placeholder="Search" />
          </div>
          {!q && (
            <Group>
              <Row
                leading={<div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-b from-[#9aa0aa] to-[#6c727d] text-[22px] font-medium text-white">AA</div>}
                title={<span className="text-[20px]">Alex Appleseed</span>}
                subtitle="Apple ID, iCloud+, Media & Purchases"
                chevron
                minH={76}
                onClick={() => s.showToast("Signed in as alex@icloud.com")}
              />
            </Group>
          )}
          {q ? (
            <Group>
              {hits.map((r) => (
                <Row key={r.id} icon={r.icon} iconBg={r.bg} title={r.title} chevron onClick={() => { setQ(""); push(r.id); }} />
              ))}
              {hits.length === 0 && <div className="py-8 text-center text-ios-label2">No Results</div>}
            </Group>
          ) : (
            GROUPS.map((g, gi) => (
              <Group key={gi}>
                {g.map((r) =>
                  r.id === "airplane" ? (
                    <Row key={r.id} icon={r.icon} iconBg={r.bg} title={r.title} right={<Toggle on={s.airplane} onChange={(v) => s.setAirplane(v)} />} />
                  ) : (
                    <Row key={r.id} icon={r.icon} iconBg={r.bg} title={r.title} value={valueOf(r.id)} chevron onClick={() => push(r.id)} />
                  ),
                )}
              </Group>
            ))
          )}
        </Page>
      );
    }

    if (id.startsWith("notifications/")) {
      const appId = id.split("/")[1];
      const enabled = !s.mutedApps.includes(appId);
      return (
        <Sub title={APPS[appId]?.name ?? "Notifications"}>
          <Group footer={`Choose whether ${APPS[appId]?.name ?? "this app"} can send alerts to Notification Center, the Lock Screen, and the Dynamic Island.`}>
            <Row
              title="Allow Notifications"
              right={<Toggle on={enabled} onChange={(value) => s.set({ mutedApps: value ? s.mutedApps.filter((a) => a !== appId) : [...new Set([...s.mutedApps, appId])] })} />}
            />
          </Group>
          {enabled && (
            <Group header="Alerts">
              <Row title="Lock Screen" check />
              <Row title="Notification Center" check />
              <Row title="Banners" check />
              <Row title="Sounds" check />
            </Group>
          )}
        </Sub>
      );
    }

    if (INFO[id])
      return (
        <Sub title={INFO[id][0]}>
          <Group footer={INFO[id][1]}>
            <Row title="Status" value="Available" />
          </Group>
        </Sub>
      );

    switch (id) {
      case "wifi":
        return (
          <Sub title="Wi-Fi">
            <Group>
              <Row title="Wi-Fi" right={<Toggle on={s.wifi} onChange={(v) => s.set({ wifi: v })} />} />
            </Group>
            {s.wifi && (
              <Group header="Networks">
                {["Home Wi-Fi", "Cafe Guest", "Neighbors_5G", "iPhone Hotspot"].map((n, i) => (
                  <Row key={n} title={n} check={s.wifiName === n} right={<span className="text-ios-label2">{i === 2 ? "🔒" : "🔒"}</span>} onClick={() => s.set({ wifiName: n })} />
                ))}
              </Group>
            )}
          </Sub>
        );
      case "bluetooth":
        return (
          <Sub title="Bluetooth">
            <Group footer="Now discoverable as “iPhone”.">
              <Row title="Bluetooth" right={<Toggle on={s.bluetooth} onChange={(v) => s.set({ bluetooth: v })} />} />
            </Group>
            {s.bluetooth && (
              <Group header="My Devices">
                <Row title="AirPods Pro" value="Connected" />
                <Row title="Apple Watch" value="Not Connected" />
                <Row title="Magic Keyboard" value="Not Connected" />
              </Group>
            )}
          </Sub>
        );
      case "cellular":
        return (
          <Sub title="Cellular">
            <Group>
              <Row title="Cellular Data" right={<Toggle on={s.cellular} onChange={(v) => s.set({ cellular: v })} />} />
            </Group>
            <Group header="Cellular Data">
              <Row title="Current Period" value="12.4 GB" />
              <Row title="Roaming" value="0 bytes" />
            </Group>
          </Sub>
        );
      case "notifications":
        return (
          <Sub title="Notifications">
            <Group header="General" footer="Notifications from the simulator's apps appear as banners and in Notification Center.">
              <Row title="Do Not Disturb" right={<Toggle on={s.dnd || s.focus !== "off"} onChange={(v) => s.set({ dnd: v, focus: v ? "dnd" : "off" })} />} />
              <Row title="Show Previews" value={preferences.previews ? "Always" : "Never"} chevron onClick={() => togglePreference("previews")} />
              <Row title="Scheduled Summary" value={preferences.scheduledSummary ? "On" : "Off"} chevron onClick={() => togglePreference("scheduledSummary")} />
            </Group>
            <Group header="Notification Style">
              {["messages", "mail", "reminders", "calendar", "clock", "facetime", "health", "stocks", "wallet"].map((a) => {
                const enabled = !s.mutedApps.includes(a);
                return <Row key={a} title={APPS[a]?.name ?? a} value={enabled ? "Banners, Sounds" : "Off"} chevron onClick={() => push(`notifications/${a}`)} />;
              })}
            </Group>
            <Group header="Siri">
              <Row title="Allow Siri in Notifications" right={<Toggle on={preferences.siriNotices} onChange={() => togglePreference("siriNotices")} />} />
              <Row title="Notification Suggestions" right={<Toggle on={preferences.suggestions} onChange={() => togglePreference("suggestions")} />} />
            </Group>
          </Sub>
        );
      case "sounds":
        return (
          <Sub title="Sounds & Haptics">
            <Group header="Ringer and Alerts">
              <Slider value={s.volume} onChange={(v) => s.set({ volume: v })} left={<Volume2 size={18} />} right={<Volume2 size={22} />} />
              <Row title="Silent Mode" right={<Toggle on={s.silent} onChange={() => s.toggleSilent()} />} />
            </Group>
            <Group header="Sounds and Haptic Patterns">
              <Row title="Ringtone" value="Reflection" onClick={() => sfx.ringtone()} chevron />
              <Row title="Text Tone" value="Note" onClick={() => sfx.receive()} chevron />
              <Row title="New Mail" value="Ding" onClick={() => sfx.ding()} chevron />
            </Group>
            <Group>
              <Row title="Keyboard Clicks" right={<Toggle on={s.keyClicks} onChange={(v) => s.set({ keyClicks: v })} />} />
              <Row title="Lock Sound" right={<Toggle on={preferences.lockSound} onChange={() => togglePreference("lockSound")} />} />
            </Group>
          </Sub>
        );
      case "focus":
        return (
          <Sub title="Focus">
            <Group footer="Focus modes silence calls, alerts, and notifications that arrive while this is on. Each Focus can be customized with allowed apps and contacts.">
              <Row
                icon={Moon}
                iconBg="#5856d6"
                title="Do Not Disturb"
                right={<Toggle on={s.focus === "dnd"} onChange={(v) => s.set({ dnd: v, focus: v ? "dnd" : "off" })} />}
                onClick={() => useOS.getState().showToast("Do Not Disturb silences all notifications")}
              />
              <Row
                icon={Home}
                iconBg="#ff9500"
                title="Personal"
                right={<Toggle on={s.focus === "personal"} onChange={(v) => s.set({ focus: v ? "personal" : "off", dnd: false })} />}
                onClick={() => useOS.getState().showToast("Personal Focus lets in family and friends")}
              />
              <Row
                icon={Briefcase}
                iconBg="#0a84ff"
                title="Work"
                right={<Toggle on={s.focus === "work"} onChange={(v) => s.set({ focus: v ? "work" : "off", dnd: false })} />}
                onClick={() => useOS.getState().showToast("Work Focus lets in colleagues and work apps")}
              />
              <Row
                icon={Bed}
                iconBg="#5856d6"
                title="Sleep"
                right={<Toggle on={s.focus === "sleep"} onChange={(v) => { s.set({ focus: v ? "sleep" : "off", dnd: false }); if (v) s.set({ appearance: "dark" }); }} />}
                onClick={() => useOS.getState().showToast("Sleep Focus dims the screen and silences notifications")}
              />
            </Group>
            <Group footer="Focus can be triggered automatically based on time, location, or app usage.">
              <Row title="Set a Schedule" value="Add Schedule" chevron onClick={() => useOS.getState().showToast("Schedule creation not available in simulator")} />
              <Row title="Smart Activation" right={<Toggle on={preferences.smartActivation} onChange={() => togglePreference("smartActivation")} />} />
              <Row title="Cross-Device Sharing" right={<Toggle on={preferences.crossDevice} onChange={() => togglePreference("crossDevice")} />} />
            </Group>
          </Sub>
        );
      case "general":
        return (
          <Sub title="General">
            <Group>
              <Row title="About" chevron onClick={() => push("about")} />
              <Row title="Software Update" chevron onClick={() => push("update")} />
            </Group>
            <Group>
              <Row title="iPhone Storage" chevron onClick={() => push("storage")} />
              <Row title="Background App Refresh" value={preferences.backgroundRefresh ? "On" : "Off"} chevron onClick={() => togglePreference("backgroundRefresh")} />
            </Group>
            <Group>
              <Row title="Date & Time" chevron onClick={() => push("datetime")} />
              <Row title="Keyboard" chevron onClick={() => push("sounds")} />
              <Row title="Language & Region" chevron onClick={() => push("language")} />
            </Group>
            <Group>
              <Row title="Transfer or Reset iPhone" chevron onClick={() => push("reset")} />
              <Row
                title={<span className="text-ios-blue">Shut Down</span>}
                onClick={() =>
                  s.showAlert({
                    title: "Shut Down",
                    message: "Are you sure you want to power off this iPhone?",
                    buttons: [
                      { text: "Shut Down", style: "destructive", onPress: () => useOS.getState().powerOff() },
                      { text: "Cancel", style: "cancel", bold: true },
                    ],
                  })
                }
              />
            </Group>
          </Sub>
        );
      case "about":
        return <About back={back} spec={spec} />;
      case "update":
        return (
          <Sub title="Software Update">
            <div className="flex flex-col items-center px-8 py-10 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[18px] bg-gradient-to-b from-[#b8bcc6] to-[#7f8591]">
                <Cog size={46} className="text-white" />
              </div>
              {checking ? (
                <>
                  <Spinner className="mb-2" />
                  <div className="text-ios-label2">Checking for Update…</div>
                </>
              ) : (
                <>
                  <div className="text-[20px] font-semibold">iOS 17.5.1</div>
                  <div className="mt-1 text-[15px] text-ios-label2">{checked ? "Your software is up to date." : "Tap below to check for updates."}</div>
                  <button
                    className="mt-5 rounded-full bg-ios-fill px-5 py-2 text-[16px] font-medium text-ios-blue active:opacity-60"
                    onClick={() => {
                      setChecking(true);
                      setTimeout(() => {
                        setChecking(false);
                        setChecked(true);
                      }, 1800);
                    }}
                  >
                    Check for Update
                  </button>
                </>
              )}
            </div>
          </Sub>
        );
      case "storage": {
        const rows: [string, number, string][] = [
          ["Apps", 62.4, "#ff9500"],
          ["Photos", 48.1, "#34c759"],
          ["Media", 21.8, "#ff2d55"],
          ["System Data", 17.2, "#8e8e93"],
        ];
        const total = 256;
        const used = rows.reduce((a, r) => a + r[1], 0);
        return (
          <Sub title="iPhone Storage">
            <Group>
              <div className="p-4">
                <div className="flex justify-between text-[15px]">
                  <span className="font-medium">{spec.name}</span>
                  <span className="text-ios-label2">
                    {used.toFixed(1)} GB of {total} GB Used
                  </span>
                </div>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-ios-fill2">
                  {rows.map(([n, v, c]) => (
                    <div key={n} style={{ width: `${(v / total) * 100}%`, background: c }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 text-[13px] text-ios-label2">
                  {rows.map(([n, v, c]) => (
                    <div key={n} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                      {n} {v} GB
                    </div>
                  ))}
                </div>
              </div>
            </Group>
            <Group header="Installed Apps">
              {s.installed.slice(0, 14).map((a, i) => (
                <Row key={a} title={APPS[a]?.name} value={`${(1.9 - i * 0.11 + 0.3).toFixed(1)} GB`} />
              ))}
            </Group>
          </Sub>
        );
      }
      case "datetime":
        return (
          <Sub title="Date & Time">
            <Group footer="Set Automatically is on. The simulator uses your computer's clock.">
              <Row title="24-Hour Time" right={<Toggle on={s.use24h} onChange={(v) => s.set({ use24h: v })} />} />
              <Row title="Set Automatically" right={<Toggle on={preferences.autoTime} onChange={() => togglePreference("autoTime")} />} />
            </Group>
            <Group>
              <Row title="Current Time" value={fmtTime(now, s.use24h)} />
              <Row title="Time Zone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
            </Group>
          </Sub>
        );
      case "language":
        return (
          <Sub title="Language & Region">
            <Group>
              <Row title="iPhone Language" value="English" />
              <Row title="Region" value="United States" />
            </Group>
            <Group header="Temperature Unit">
              <div className="p-3">
                <Segmented options={[{ id: "c", label: "Celsius °C" }, { id: "f", label: "Fahrenheit °F" }]} value={s.tempUnit} onChange={(v) => s.set({ tempUnit: v as "c" | "f" })} />
              </div>
            </Group>
          </Sub>
        );
      case "reset":
        return (
          <Sub title="Transfer or Reset iPhone">
            <Group>
              <Row title="Reset Home Screen Layout" onClick={() => { s.set({ layout: DEFAULT_LAYOUT.filter((it) => it.t !== "app" || s.installed.includes(it.id)), homePage: 0 }); s.showToast("Home Screen layout reset"); }} />
              <Row title={<span className="text-ios-red">Erase All Content and Settings</span>} onClick={reset} />
            </Group>
          </Sub>
        );
      case "display":
        return (
          <Sub title="Display & Brightness">
            <Group header="Appearance">
              <div className="flex justify-center gap-10 py-4">
                {(["light", "dark"] as const).map((m) => {
                  const on = s.appearance === m || (s.appearance === "auto" && (m === "dark") === dark);
                  return (
                    <button key={m} onClick={() => s.set({ appearance: m })} className="flex flex-col items-center gap-2">
                      <div className="flex h-[96px] w-[64px] flex-col items-center overflow-hidden rounded-[12px] border border-ios-sep" style={{ background: m === "dark" ? "#000" : "#f2f2f7", outline: on ? "2px solid var(--ios-blue)" : "none", outlineOffset: 2 }}>
                        <div className="mt-3 h-1.5 w-8 rounded-full" style={{ background: m === "dark" ? "#444" : "#ddd" }} />
                        <div className="mt-2 h-4 w-12 rounded" style={{ background: m === "dark" ? "#1c1c1e" : "#fff" }} />
                        <div className="mt-1.5 h-4 w-12 rounded" style={{ background: m === "dark" ? "#1c1c1e" : "#fff" }} />
                      </div>
                      <span className="text-[13px]">{m === "light" ? "Light" : "Dark"}</span>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: on ? "var(--ios-blue)" : "var(--ios-label3)", background: on ? "var(--ios-blue)" : "transparent" }}>
                        {on && <Check size={12} strokeWidth={4} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <Row title="Automatic" right={<Toggle on={s.appearance === "auto"} onChange={(v) => s.set({ appearance: v ? "auto" : dark ? "dark" : "light" })} />} />
            </Group>
            <Group header="Brightness">
              <Slider value={s.brightness} min={0.12} onChange={(v) => s.set({ brightness: v })} left={<Sun size={16} />} right={<Sun size={22} />} />
            </Group>
            <Group>
              <Row title="Auto-Lock" value={s.autoLock === 0 ? "Never" : s.autoLock >= 60 ? `${s.autoLock / 60} min` : `${s.autoLock} sec`} chevron onClick={() => push("autolock")} />
              <Row title="Bold Text" right={<Toggle on={s.boldText} onChange={(v) => s.set({ boldText: v })} />} />
            </Group>
          </Sub>
        );
      case "autolock":
        return (
          <Sub title="Auto-Lock">
            <Group>
              {[[30, "30 Seconds"], [60, "1 Minute"], [120, "2 Minutes"], [300, "5 Minutes"], [0, "Never"]].map(([v, l]) => (
                <Row key={v} title={l as string} check={s.autoLock === v} onClick={() => s.set({ autoLock: v as number })} />
              ))}
            </Group>
          </Sub>
        );
      case "home":
        return (
          <Sub title="Home Screen">
            <Group header="Newly Downloaded Apps" footer="Long-press the Home Screen, or use the Edit mode, to rearrange apps. Swipe past your last page for the App Library.">
              <Row title="Add to Home Screen" check />
              <Row title="App Library Only" />
            </Group>
            <Group>
              <Row title="Reset Home Screen Layout" onClick={() => { s.set({ layout: DEFAULT_LAYOUT.filter((it) => it.t !== "app" || s.installed.includes(it.id)), homePage: 0 }); s.showToast("Home Screen layout reset"); }} />
            </Group>
          </Sub>
        );
      case "access":
        return (
          <Sub title="Accessibility">
            <Group header="Vision">
              <Row title="Bold Text" right={<Toggle on={s.boldText} onChange={(v) => s.set({ boldText: v })} />} />
              <Row title="Reduce Motion" right={<Toggle on={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />} />
              <Row title="VoiceOver" value={preferences.voiceOver ? "On" : "Off"} chevron onClick={() => togglePreference("voiceOver")} />
              <Row title="Zoom" value={preferences.zoom ? "On" : "Off"} chevron onClick={() => togglePreference("zoom")} />
            </Group>
          </Sub>
        );
      case "wallpaper":
        return (
          <Sub title="Wallpaper">
            <Group header="Customize" footer="Pick a wallpaper for your Lock Screen and Home Screen. Choose separately or set both at once.">
              <Row icon={ImageIcon} iconBg="#00c7be" title="Customize Lock Screen" chevron onClick={() => useOS.getState().showToast("Long-press the Lock Screen to customize in real iOS")} />
              <Row icon={ImageIcon} iconBg="#34c759" title="Customize Home Screen" chevron onClick={() => useOS.getState().showToast("Long-press the Home Screen to enter edit mode")} />
            </Group>
            <Group header="Wallpapers">
              <div className="grid grid-cols-3 gap-3 px-1 pb-3">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() =>
                      s.showSheet({
                        title: w.name,
                        actions: [
                          { text: "Set Lock Screen", onPress: () => s.set({ lockWallpaper: w.id }) },
                          { text: "Set Home Screen", onPress: () => s.set({ wallpaper: w.id }) },
                          { text: "Set Both", onPress: () => s.set({ wallpaper: w.id, lockWallpaper: w.id }) },
                          { text: "Cancel", style: "cancel" },
                        ],
                      })
                    }
                    className="flex flex-col items-center gap-1.5 active:opacity-70"
                  >
                    <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[14px] shadow" style={{ background: w.css, outline: s.wallpaper === w.id || s.lockWallpaper === w.id ? "2px solid var(--ios-blue)" : "none", outlineOffset: 2 }}>
                      <div className="absolute inset-x-0 top-[14%] text-center text-[20px] font-semibold text-white/90">9:41</div>
                    </div>
                    <span className="text-[12px] text-ios-label2">{w.name}</span>
                  </button>
                ))}
              </div>
            </Group>
          </Sub>
        );
      case "faceid":
        return (
          <Sub title="Face ID & Passcode">
            <Group header="Use Face ID For" footer="With Face ID off, you'll need to enter your passcode to unlock the simulator.">
              <Row title="iPhone Unlock" right={<Toggle on={s.faceId} onChange={(v) => s.set({ faceId: v })} />} />
            </Group>
            <Group>
              {!s.passcode && <Row title={<span className="text-ios-blue">Turn Passcode On</span>} onClick={() => push("pass-set")} />}
              {s.passcode && <Row title={<span className="text-ios-blue">Turn Passcode Off</span>} onClick={() => push("pass-off")} />}
              {s.passcode && <Row title={<span className="text-ios-blue">Change Passcode</span>} onClick={() => push("pass-change")} />}
            </Group>
          </Sub>
        );
      case "pass-set":
      case "pass-off":
      case "pass-change":
        return (
          <Sub title={id === "pass-off" ? "Turn Passcode Off" : id === "pass-set" ? "Set Passcode" : "Change Passcode"}>
            <PasscodeFlow mode={id === "pass-set" ? "set" : id === "pass-off" ? "off" : "change"} onDone={pop} />
          </Sub>
        );
      case "battery": {
        const bars = [60, 72, 55, 40, 85, 90, 45, 30, 62, 70, 50, 65, 48, 80, 38, 55, 66, 74, 42, 58, 69, 51, 77, 33];
        return (
          <Sub title="Battery">
            <Group>
              <Row title="Low Power Mode" right={<Toggle on={s.lowPower} onChange={(v) => s.set({ lowPower: v })} />} />
              <Row title="Charging" right={<Toggle on={s.charging} onChange={(v) => { s.set({ charging: v }); if (v) sfx.charge(); }} />} />
            </Group>
            <Group header="Battery Level">
              <div className="p-4">
                <div className="text-[34px] font-semibold">
                  {s.battery}% {s.charging && <span className="text-[20px] text-ios-green">⚡ Charging</span>}
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-ios-fill2">
                  <div className="h-full rounded-full" style={{ width: `${s.battery}%`, background: s.charging ? "var(--ios-green)" : s.lowPower ? "var(--ios-yellow)" : s.battery <= 20 ? "var(--ios-red)" : "var(--ios-green)" }} />
                </div>
                <div className="mt-5 flex h-20 items-end gap-[3px]">
                  {bars.map((b, i) => (
                    <div key={i} className="flex-1 rounded-t bg-ios-green" style={{ height: `${b}%`, opacity: 0.4 + (i / bars.length) * 0.6 }} />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-ios-label2">
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>
            </Group>
            <Group header="Battery Health">
              <Row title="Maximum Capacity" value="100%" />
              <Row title="Peak Performance Capability" value="Normal" />
            </Group>
          </Sub>
        );
      }
      default:
        return <Sub title={titleOf(id)}>{null}</Sub>;
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      {stack.map((id, i) => (
        <SlideIn key={`${id}-${i}`} depth={i} back={i < stack.length - 1} leaving={leaving && i === stack.length - 1}>
          <BackCtx.Provider value={backFor(id)}>
            <div className="h-full bg-ios-grouped">{page(id)}</div>
          </BackCtx.Provider>
        </SlideIn>
      ))}
      <ScrollView className="hidden">{null}</ScrollView>
    </div>
  );
}

function About({ back, spec }: { back: ReactNode; spec: (typeof DEVICES)[number] }) {
  const name = useOS((s) => s.deviceName);
  const set = useOS((s) => s.set);
  const gb = useOS((s) => s.installed.length);
  const [showCredits, setShowCredits] = useState(false);

  // Long-press the Apple logo / version text to reveal the credits overlay.
  const applePress = useLongPress(() => {
    sfx.success();
    setShowCredits(true);
  }, 600);

  return (
    <Page title="About" large={false} left={back}>
      <div className="pt-3">
        {/* Apple logo + version — long-press for credits */}
        <div className="mb-4 flex select-none flex-col items-center pt-2 pb-1" {...applePress.handlers}>
          <svg viewBox="0 0 384 512" width="46" height="60" fill="currentColor" className="text-ios-label">
            <path d={APPLE_LOGO_PATH} />
          </svg>
          <div className="mt-2 text-[13px] text-ios-label2">iOS 17.5.1</div>
        </div>
        <Group>
          <div className="ios-row flex min-h-[44px] items-center justify-between px-4 text-[17px]">
            <span>Name</span>
            <input value={name} onChange={(e) => set({ deviceName: e.target.value })} autoCapitalize="words" enterKeyHint="done" className="w-[60%] bg-transparent text-right text-ios-label2 outline-none" />
          </div>
          <Row title="iOS Version" value="17.5.1" />
          <Row title="Model Name" value={spec.name} />
          <Row title="Model Number" value={spec.model} />
          <Row title="Serial Number" value="F2LXK0Q1PQ" />
        </Group>
        <Group>
          <Row title="Songs" value="8" />
          <Row title="Applications" value={String(gb)} />
          <Row title="Capacity" value="256 GB" />
          <Row title="Available" value="106.5 GB" />
        </Group>
        <Group>
          <Row title="Wi-Fi Address" value="A4:83:E7:2B:19:C0" />
          <Row title="Bluetooth" value="A4:83:E7:2B:19:C1" />
        </Group>
      </div>
      {showCredits && <CreditsOverlay onClose={() => setShowCredits(false)} />}
    </Page>
  );
}

const APPLE_LOGO_PATH =
  "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";

/** Apple-style About credits overlay — long-press the Apple logo in About to open. */
function CreditsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fade-in absolute inset-0 z-[120] flex flex-col items-center justify-center bg-black text-white" onClick={onClose}>
      <div className="flex flex-1 items-center justify-center">
        <svg viewBox="0 0 384 512" width="76" height="100" fill="#fff" className="drop-shadow-[0_0_24px_rgba(255,255,255,0.18)]">
          <path d={APPLE_LOGO_PATH} />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1 px-6 pb-16 text-center">
        <div className="text-[28px] font-semibold" style={{ letterSpacing: "-0.021em" }}>
          iOS Simulator
        </div>
        <div className="mt-1 text-[15px] text-white/70">Built with React, TypeScript, Tailwind, and WebAudio</div>
        <div className="mt-6 text-[13px] text-white/45">© 2026</div>
      </div>
      <div className="pb-[calc(var(--safe-bottom)+16px)] text-[13px] text-white/40">Tap to close</div>
    </div>
  );
}
