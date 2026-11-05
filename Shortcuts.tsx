import { useState } from "react";
import { ChevronLeft, Plus, Play, Search as SearchIcon, Zap, Sun, Moon, Volume2, Coffee, Footprints, Star, Clock, X, Pencil, Settings as SettingsIcon } from "lucide-react";
import { Group, Page, Row, SearchField, Sheet, NavBtn, Empty, Segmented } from "../os/ui";
import { useOS } from "../os/store";
import { musicPlay } from "../os/music";
import { sfx } from "../os/sound";

interface Shortcut {
  id: string;
  name: string;
  icon: typeof Zap;
  color: string;
  description: string;
  steps: ShortcutStep[];
  builtin?: boolean;
}

type ShortcutStep =
  | { kind: "action"; label: string; detail: string }
  | { kind: "set"; label: string; detail: string }
  | { kind: "if"; label: string; detail: string }
  | { kind: "output"; label: string; detail: string };

const BUILTIN: Shortcut[] = [
  {
    id: "morning",
    name: "Morning Routine",
    icon: Sun,
    color: "#ff9500",
    description: "Get ready for your day",
    builtin: true,
    steps: [
      { kind: "action", label: "Get Current Weather", detail: "For Current Location" },
      { kind: "set", label: "Set Appearance", detail: "Light Mode" },
      { kind: "set", label: "Set Volume", detail: "50%" },
      { kind: "action", label: "Play Playlist", detail: "Good Morning" },
      { kind: "output", label: "Show Result", detail: "Have a great day ☀️" },
    ],
  },
  {
    id: "evening",
    name: "Evening Wind Down",
    icon: Moon,
    color: "#5e5ce6",
    description: "Relax and prepare for sleep",
    builtin: true,
    steps: [
      { kind: "set", label: "Set Appearance", detail: "Dark Mode" },
      { kind: "set", label: "Turn On Do Not Disturb" , detail: "Until 7:00 AM" },
      { kind: "set", label: "Set Brightness", detail: "20%" },
      { kind: "action", label: "Play Playlist", detail: "Sleep Sounds" },
    ],
  },
  {
    id: "caffeine",
    name: "Order Coffee",
    icon: Coffee,
    color: "#a86b00",
    description: "Place your usual order",
    builtin: true,
    steps: [
      { kind: "action", label: "Get Contents of URL", detail: "cafeverde.com/order" },
      { kind: "action", label: "Show Notification", detail: "Order placed ☕" },
    ],
  },
  {
    id: "walk",
    name: "Start Walk",
    icon: Footprints,
    color: "#ff2d55",
    description: "Begin a walking workout",
    builtin: true,
    steps: [
      { kind: "action", label: "Start Workout", detail: "Walking" },
      { kind: "set", label: "Set Volume", detail: "70%" },
      { kind: "action", label: "Play Playlist", detail: "Walk Mix" },
    ],
  },
  {
    id: "mute",
    name: "Silence Everything",
    icon: Volume2,
    color: "#8e8e93",
    description: "Mute all sounds",
    builtin: true,
    steps: [
      { kind: "set", label: "Set Silent Mode", detail: "On" },
      { kind: "set", label: "Set Volume", detail: "0%" },
      { kind: "set", label: "Turn Off Flashlight", detail: "" },
    ],
  },
];

function runShortcut(s: Shortcut) {
  sfx.pop();
  const os = useOS.getState();
  for (const step of s.steps) {
    if (step.kind === "set") {
      const d = step.detail.toLowerCase();
      if (d.includes("dark")) os.set({ appearance: "dark" });
      else if (d.includes("light")) os.set({ appearance: "light" });
      else if (d.includes("do not disturb")) os.set({ dnd: true, focus: "dnd" });
      else if (d.includes("silent")) os.set({ silent: true });
      else if (d.includes("brightness")) {
        const m = d.match(/(\d+)/);
        if (m) os.set({ brightness: parseInt(m[1]) / 100 });
      } else if (d.includes("volume")) {
        const m = d.match(/(\d+)/);
        if (m) os.set({ volume: parseInt(m[1]) / 100 });
      } else if (d.includes("flashlight")) os.set({ flashlight: false });
    } else if (step.kind === "output") {
      os.showToast(step.detail);
    } else if (step.kind === "action") {
      if (step.label.includes("Weather")) os.showToast("Sunny, 72°F");
      else if (step.label.includes("Notification")) os.showToast(step.detail);
      else if (step.label.includes("Workout")) {
        os.set({ liveActivity: { kind: "workout", title: "Walking", subtitle: "Outdoor Walk", progress: 0, color: "#ff2d55", startedAt: Date.now() } });
      } else if (step.label.includes("Playlist")) {
        os.openApp("music");
        setTimeout(() => {
          const ms = useOS.getState().music;
          if (!ms.active || !ms.playing) {
            musicPlay(ms.idx || 0);
          }
        }, 200);
      }
    }
  }
  os.showToast(`✓ ${s.name}`);
}

export default function ShortcutsApp() {
  const [tab, setTab] = useState<"shortcuts" | "automation">("shortcuts");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState<Shortcut[]>(() => {
    try {
      const raw = localStorage.getItem("ios-sim-shortcuts");
      return raw ? JSON.parse(raw).map((s: Shortcut) => ({ ...s, icon: Zap })) : [];
    } catch {
      return [];
    }
  });

  const all = [...BUILTIN, ...custom];
  const filtered = all.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase()));
  const cur = sel ? all.find((s) => s.id === sel) : null;

  const saveCustom = (sc: Shortcut[]) => {
    setCustom(sc);
    try {
      localStorage.setItem("ios-sim-shortcuts", JSON.stringify(sc.map(({ icon, ...rest }) => ({ ...rest, _icon: "Zap" }))));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page title="Shortcuts" right={<button className="text-ios-blue" onClick={() => useOS.getState().showToast("Use the editor to create shortcuts")}><Plus size={26} /></button>}>
        <div className="px-4 pb-2">
          <Segmented
            options={[{ id: "shortcuts", label: "Shortcuts" }, { id: "automation", label: "Automation" }]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            className="mb-3"
          />
          <SearchField value={q} onChange={setQ} placeholder="Search Shortcuts" />
        </div>

        {tab === "shortcuts" ? (
          <>
            <Group header="My Shortcuts">
              {filtered.length === 0 && <Empty icon={SearchIcon} title="No Shortcuts" text="Tap + to create a new shortcut." />}
              <div className="grid grid-cols-2 gap-3 p-1">
                {filtered.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSel(s.id)}
                      className="flex flex-col items-start gap-2 rounded-2xl bg-ios-cell p-3 text-left active:opacity-60"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: s.color }}>
                          <Icon size={26} />
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); runShortcut(s); }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill2 text-ios-blue active:scale-90"
                          style={{ background: "var(--ios-fill)" }}
                        >
                          <Play size={18} fill="currentColor" />
                        </button>
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold leading-tight">{s.name}</div>
                        <div className="mt-0.5 text-[12px] text-ios-label2 line-clamp-2">{s.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Group>

            <Group header="Gallery">
              <Row icon={Star} iconBg="#ff9500" title="Shortcut of the Day" subtitle="Commute Assistant" chevron onClick={() => useOS.getState().showToast("Added from Gallery")} />
              <Row icon={Clock} iconBg="#5e5ce6" title="Time-based Automations" subtitle="Run shortcuts at specific times" chevron onClick={() => setTab("automation")} />
              <Row icon={Zap} iconBg="#34c759" title="Explore Gallery" subtitle="Hundreds of prebuilt shortcuts" chevron onClick={() => useOS.getState().showToast("Gallery coming soon")} />
            </Group>
          </>
        ) : (
          <>
            <Group header="Personal Automation">
              <Row icon={Clock} iconBg="#5e5ce6" title="Time of Day" subtitle="Run at 7:00 AM" chevron onClick={() => useOS.getState().showToast("Time automation added")} />
              <Row icon={Sun} iconBg="#ff9500" title="Sunrise" subtitle="Run at sunrise" chevron onClick={() => useOS.getState().showToast("Sunrise automation added")} />
              <Row icon={Moon} iconBg="#0a84ff" title="Sunset" subtitle="Run at sunset" chevron onClick={() => useOS.getState().showToast("Sunset automation added")} />
              <Row icon={SettingsIcon} iconBg="#8e8e93" title="Battery Level" subtitle="Below 20%" chevron onClick={() => useOS.getState().showToast("Battery automation added")} />
            </Group>
            <Group footer="Automations run your shortcuts automatically based on time, location, or events.">
              <Row icon={Plus} iconBg="#34c759" title={<span className="text-ios-blue">Create Personal Automation</span>} onClick={() => useOS.getState().showToast("Pick a trigger above")} />
            </Group>
          </>
        )}
      </Page>

      {/* Detail / editor */}
      <Sheet open={!!sel} onClose={() => { setSel(null); setEditing(false); }} full>
        {cur && (
          <Page
            title={cur.name}
            large={false}
            left={<NavBtn onClick={() => { setSel(null); setEditing(false); }}><ChevronLeft size={24} className="-mr-1" /> Shortcuts</NavBtn>}
            right={
              <div className="flex gap-3">
                <button onClick={() => runShortcut(cur)} className="flex items-center gap-1 rounded-full bg-ios-blue px-3 py-1 text-[14px] font-semibold text-white" style={{ background: "var(--ios-blue)" }}>
                  <Play size={14} fill="#fff" /> Run
                </button>
              </div>
            }
          >
            <div className="flex flex-col items-center pt-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-[18px] text-white shadow" style={{ background: cur.color }}>
                <cur.icon size={42} />
              </div>
              <div className="mt-2 text-[22px] font-semibold">{cur.name}</div>
              <div className="text-[14px] text-ios-label2">{cur.description}</div>
            </div>

            <Group header={editing ? "Actions" : "Actions"}>
              {cur.steps.map((step, i) => (
                <div key={i} className="ios-row flex items-start gap-3 px-4 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ios-fill2 text-[12px] font-semibold text-ios-label2" style={{ background: "var(--ios-fill)" }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium">{step.label}</div>
                    {step.detail && <div className="truncate text-[13px] text-ios-label2">{step.detail}</div>}
                  </div>
                  {editing && <button className="text-ios-label2"><X size={16} /></button>}
                </div>
              ))}
              {editing && (
                <div className="px-4 py-3 text-center text-[14px] text-ios-blue">+ Add Action</div>
              )}
            </Group>

            <Group>
              <Row icon={Pencil} iconBg="#0a84ff" title={editing ? "Done Editing" : "Edit Shortcut"} onClick={() => setEditing((e) => !e)} />
              <Row icon={SettingsIcon} iconBg="#8e8e93" title="Shortcut Details" subtitle={`${cur.steps.length} actions`} chevron />
              {!cur.builtin && (
                <Row title={<span className="text-ios-red">Delete Shortcut</span>} onClick={() => { saveCustom(custom.filter((s) => s.id !== cur.id)); setSel(null); }} />
              )}
            </Group>
          </Page>
        )}
      </Sheet>
    </div>
  );
}
