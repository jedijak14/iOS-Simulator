import { useEffect, useMemo, useState } from "react";
import { Globe, StickyNote, Calculator as CalcIcon, Sparkles, Terminal } from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { useData, contactName } from "./data";
import { APPS } from "./registry";
import { AppIcon } from "./icons";
import { Avatar, ScrollView, SearchField } from "./ui";
import { sendAction } from "./actions";

function safeEval(q: string): number | null {
  if (!/^[\d\s+\-*/().%^x×÷,]+$/.test(q) || !/[+\-*/%^x×÷]/.test(q.replace(/^\s*-/, ""))) return null;
  try {
    const expr = q.replace(/[x×]/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/,/g, "");
    const v = Function(`"use strict"; return (${expr})`)();
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

const HELP_FEATURES = [
  { icon: "🔍", name: "Spotlight Search", desc: "Find apps, contacts, notes, and search the web" },
  { icon: "🎙️", name: "Siri", desc: "Ask about the weather, set timers, open apps, call contacts" },
  { icon: "🎵", name: "Music", desc: "Play generated tracks with synced lyrics" },
  { icon: "✍️", name: "Writing Tools", desc: "Proofread, rewrite, or summarize selected text" },
  { icon: "🔦", name: "Control Center", desc: "Toggles, brightness, volume, Now Playing" },
  { icon: "🌙", name: "Focus", desc: "DND, Personal, Work, and Sleep modes" },
  { icon: "🔔", name: "Notifications", desc: "Banners, Notification Center, and shade" },
  { icon: "🔐", name: "Face ID & Passcode", desc: "Lock and unlock with a 6-digit passcode" },
  { icon: "🎨", name: "Icon Modes", desc: "Default, tinted, and dark home screen icons (iOS 18)" },
];

const HELP_SHORTCUTS: { key: string; label: string }[] = [
  { key: "H", label: "Home" },
  { key: "L", label: "Lock / Side button" },
  { key: "D", label: "Toggle Dark Mode" },
  { key: "S", label: "App Switcher" },
  { key: "C", label: "Control Center" },
  { key: "N", label: "Notifications shade" },
  { key: "I", label: "Siri" },
  { key: "/", label: "Spotlight Search" },
  { key: "Esc", label: "Dismiss / go back" },
  { key: "⌘Z", label: "Undo (shake to undo)" },
];

export function Spotlight() {
  const spec = useSpec();
  const installed = useOS((s) => s.installed);
  const running = useOS((s) => s.running);
  const set = useOS((s) => s.set);
  const contacts = useData((s) => s.contacts);
  const notes = useData((s) => s.notes);
  const reminders = useData((s) => s.reminders);
  const [q, setQ] = useState("");
  const [confetti, setConfetti] = useState(false);
  const kb = useOS((s) => s.kbOpen);
  const ql = q.trim().toLowerCase();

  // Konami easter egg — confetti + cheat mode toast
  useEffect(() => {
    if (ql !== "konami") return;
    setConfetti(true);
    useOS.getState().showToast(" cheat mode activated");
    const t = setTimeout(() => setConfetti(false), 4500);
    return () => clearTimeout(t);
  }, [ql]);

  const close = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    set({ spotlight: false });
  };
  const open = (id: string) => {
    set({ spotlight: false });
    useOS.getState().openApp(id);
  };

  const res = useMemo(() => {
    if (!ql) return null;
    return {
      apps: installed.filter((id) => APPS[id]?.name.toLowerCase().includes(ql)),
      contacts: contacts.filter((c) => contactName(c).toLowerCase().includes(ql) || c.phone.includes(ql)),
      notes: notes.filter((n) => n.text.toLowerCase().includes(ql)),
      reminders: reminders.filter((r) => r.text.toLowerCase().includes(ql)),
    };
  }, [ql, installed, contacts, notes, reminders]);
  const calc = ql ? safeEval(ql) : null;
  const sugg = [...running, "messages", "safari", "music", "camera", "notes", "maps"].filter((v, i, a) => installed.includes(v) && a.indexOf(v) === i).slice(0, 4);

  const section = (title: string, children: React.ReactNode) => (
    <div className="mb-4">
      <div className="px-4 pb-1.5 text-[13px] font-semibold uppercase text-white/70">{title}</div>
      <div className="overflow-hidden rounded-[14px] bg-ios-material backdrop-blur-xl">{children}</div>
    </div>
  );
  const row = (key: string, left: React.ReactNode, title: string, sub: string | undefined, onClick: () => void) => (
    <button key={key} onClick={onClick} className="ios-row flex w-full items-center gap-3 px-3 py-2 text-left text-ios-label active:bg-ios-fill" style={{ ["--sep-left" as string]: "64px" }}>
      {left}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px]">{title}</div>
        {sub && <div className="truncate text-[13px] text-ios-label2">{sub}</div>}
      </div>
    </button>
  );

  return (
    <div className="fade-in absolute inset-0 z-[45]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-2xl" onClick={close} />
      <div className="absolute inset-x-0 flex items-center gap-3 px-4" style={{ top: spec.safeTop + 4 }}>
        <SearchField value={q} onChange={setQ} placeholder="Search" autoFocus className="flex-1 !bg-ios-material" hint="search" />
        <button className="text-[17px] text-white" onClick={close}>
          Cancel
        </button>
      </div>
      <ScrollView className="absolute inset-x-0 px-4" style={{ top: spec.safeTop + 56, bottom: kb ? spec.kbH : 0 }}>
        {!res && ql !== "help" && ql !== "konami" && (
          <div className="mt-2">
            <div className="px-1 pb-2 text-[13px] font-semibold uppercase text-white/70">Siri Suggestions</div>
            <div className="flex justify-between rounded-[18px] bg-ios-material px-4 py-3 backdrop-blur-xl">
              {sugg.map((id) => (
                <button key={id} onClick={() => open(id)} className="flex w-[64px] flex-col items-center gap-1 text-ios-label active:opacity-60">
                  <AppIcon id={id} size={56} />
                  <span className="w-full truncate text-center text-[11px]">{APPS[id].name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {ql === "help" && (
          <div className="mt-1">
            {section(
              "Help — Features & Shortcuts",
              <div className="px-4 py-3 text-ios-label">
                <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
                  <Sparkles size={16} className="text-ios-purple" />
                  Available Features
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {HELP_FEATURES.map((f) => (
                    <div key={f.name} className="flex items-start gap-2">
                      <span className="text-[18px] leading-[22px]">{f.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold leading-[18px]">{f.name}</div>
                        <div className="text-[12px] leading-[16px] text-ios-label2">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-2 mt-4 flex items-center gap-2 text-[15px] font-semibold">
                  <Terminal size={16} className="text-ios-blue" />
                  Keyboard Shortcuts
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {HELP_SHORTCUTS.map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <kbd className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[5px] bg-ios-fill2 px-1.5 text-[12px] font-semibold text-ios-label">{s.key}</kbd>
                      <span className="truncate text-[13px] text-ios-label2">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>,
            )}
          </div>
        )}
        {ql === "konami" && (
          <div className="mt-1">
            {section(
              "Cheat Mode",
              <div className="px-4 py-4 text-center text-ios-label">
                <div className="text-[44px]">🎮</div>
                <div className="mt-2 text-[17px] font-semibold">Konami Code Activated</div>
                <div className="mt-1 text-[13px] text-ios-label2">↑ ↑ ↓ ↓ ← → ← → B A — cheat mode unlocked.</div>
              </div>,
            )}
          </div>
        )}
        {res && ql !== "help" && ql !== "konami" && (
          <div className="mt-1">
            {calc !== null && section("Calculator", row("calc", <AppIcon id="calculator" size={40} />, String(+calc.toPrecision(12)), q.trim() + " =", () => open("calculator")))}
            {res.apps.length > 0 && section("Applications", res.apps.map((id) => row(id, <AppIcon id={id} size={40} />, APPS[id].name, "Application", () => open(id))))}
            {res.contacts.length > 0 &&
              section(
                "Contacts",
                res.contacts.map((c) =>
                  row(c.id, <Avatar name={contactName(c)} hue={c.hue} size={40} />, contactName(c), c.phone, () => {
                    set({ spotlight: false });
                    useOS.getState().openApp("phone");
                    sendAction("phone", "contact:" + c.id);
                  }),
                ),
              )}
            {res.notes.length > 0 &&
              section(
                "Notes",
                res.notes.slice(0, 4).map((n) =>
                  row(n.id, <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-[#ffcc00] text-white"><StickyNote size={22} /></div>, n.text.split("\n")[0] || "New Note", n.text.split("\n")[1], () => {
                    set({ spotlight: false });
                    useOS.getState().openApp("notes");
                    sendAction("notes", "open:" + n.id);
                  }),
                ),
              )}
            {res.reminders.length > 0 && section("Reminders", res.reminders.slice(0, 3).map((r) => row(r.id, <AppIcon id="reminders" size={40} />, r.text, r.done ? "Completed" : "Reminder", () => open("reminders"))))}
            {section(
              "Search the Web",
              <>
                {row("sf", <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-ios-blue text-white"><Globe size={22} /></div>, `Search “${q.trim()}”`, "Search in Safari", () => {
                  set({ spotlight: false });
                  useOS.getState().openApp("safari");
                  sendAction("safari", "search:" + q.trim());
                })}
                {row("wk", <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-ios-fill2 text-ios-label"><CalcIcon size={0} />W</div>, `${q.trim()} – Wikipedia`, "Open article", () => {
                  set({ spotlight: false });
                  useOS.getState().openApp("safari");
                  sendAction("safari", "wiki:" + q.trim());
                })}
              </>,
            )}
          </div>
        )}
        <div className="h-10" />
      </ScrollView>
      {confetti && <Confetti />}
    </div>
  );
}

/** Simple CSS confetti — a swarm of colored squares falling from the top. */
function Confetti() {
  const colors = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#af52de", "#ff2d55"];
  const pieces = Array.from({ length: 80 });
  return (
    <div className="pointer-events-none absolute inset-0 z-[50] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const dur = 2.4 + Math.random() * 1.6;
        const size = 6 + Math.random() * 6;
        const color = colors[i % colors.length];
        const rotate = Math.random() * 360;
        return (
          <div
            key={i}
            className="absolute top-[-12px] block"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.6,
              background: color,
              transform: `rotate(${rotate}deg)`,
              borderRadius: 1.5,
              animation: `confettiFall ${dur}s linear ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(640px) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}
