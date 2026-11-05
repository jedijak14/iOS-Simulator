import { useState } from "react";
import { Gamepad2, LayoutGrid, Newspaper, Search, User } from "lucide-react";
import { useOS } from "../os/store";
import { APPS } from "../os/registry";
import { AppIcon } from "../os/icons";
import { Page, SearchField, TabBar } from "../os/ui";

type Tab = "today" | "games" | "apps" | "search";

const BLURB: Record<string, string> = {
  phone: "Make calls, manage contacts and keep your recents handy.",
  messages: "Keep in touch with iMessage and SMS.",
  safari: "Browse the web with a fast, private browser.",
  music: "Stream your music with a beautiful player.",
  mail: "Everything email, in one place.",
  clock: "Alarms, timers, stopwatch and world clocks.",
  maps: "Find your way with detailed maps.",
  camera: "Take photos and record video.",
  reminders: "Never forget a thing with smart lists.",
  notes: "Capture thoughts, lists and ideas.",
  stocks: "Track markets and business news.",
  wallet: "Cards, passes and Apple Pay.",
  photos: "Your memories, beautifully organized.",
  weather: "Hourly and 7-day forecasts for any city.",
  calendar: "Plan your days with events and agendas.",
  appstore: "Discover great apps and games.",
  settings: "Customize your iPhone.",
  calculator: "A simple, powerful calculator.",
  compass: "Find your heading.",
  voicememos: "Record and replay audio.",
};

function Ring({ p }: { p: number }) {
  const r = 12;
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--ios-fill2)" strokeWidth="3" />
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--ios-blue)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${p * 2 * Math.PI * r} 999`} />
    </svg>
  );
}

export default function AppStoreApp() {
  const installed = useOS((s) => s.installed);
  const [tab, setTab] = useState<Tab>("today");
  const [q, setQ] = useState("");
  const [prog, setProg] = useState<Record<string, number>>({});

  const get = (id: string) => {
    setProg((p) => ({ ...p, [id]: 0.02 }));
    const t0 = Date.now();
    const dur = 1500 + Math.random() * 1500;
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      setProg((s) => ({ ...s, [id]: p }));
      if (p >= 1) {
        clearInterval(iv);
        useOS.getState().install(id);
        setProg((s) => {
          const n = { ...s };
          delete n[id];
          return n;
        });
        useOS.getState().showToast(`${APPS[id].name} installed`);
      }
    }, 80);
  };

  const Action = ({ id }: { id: string }) => {
    if (prog[id] !== undefined) return <Ring p={prog[id]} />;
    const has = installed.includes(id);
    return (
      <button
        onClick={() => (has ? useOS.getState().openApp(id) : get(id))}
        className="rounded-full bg-ios-fill px-4 py-1 text-[15px] font-bold uppercase text-ios-blue active:opacity-60"
      >
        {has ? "Open" : "Get"}
      </button>
    );
  };

  const row = (id: string) => (
    <div key={id} className="ios-row flex items-center gap-3 py-2.5" style={{ ["--sep-left" as string]: "72px" }}>
      <AppIcon id={id} size={60} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px]">{APPS[id].name}</div>
        <div className="truncate text-[13px] text-ios-label2">{APPS[id].blurb ?? BLURB[id] ?? APPS[id].category}</div>
      </div>
      <Action id={id} />
    </div>
  );

  const all = Object.keys(APPS);
  const games = all.filter((id) => APPS[id].category === "Entertainment" && !APPS[id].system);
  const thirdParty = ["spotify", "youtube", "instagram", "snapchat", "duckduckgo"];
  const featured = "twenty48";

  return (
    <div className="flex h-full flex-col bg-ios-bg">
      <div className="relative min-h-0 flex-1">
        {tab === "today" && (
          <Page title="Today" bg="bg-ios-bg" right={<button onClick={() => useOS.getState().showToast("Signed in as Alex Appleseed")} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-b from-[#9aa0aa] to-[#6c727d] text-white"><User size={18} /></button>}>
            <div className="px-4">
              <div className="mb-1 text-[13px] font-semibold uppercase text-ios-label2">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
              <div className="relative h-[380px] overflow-hidden rounded-[20px] shadow-xl" style={{ background: "linear-gradient(160deg,#fbbf24,#f97316 55%,#dc2626)" }}>
                <div className="absolute right-[-30px] top-[-30px] h-48 w-48 rounded-full bg-white/20" />
                <div className="absolute left-5 top-5 text-white">
                  <div className="text-[13px] font-semibold uppercase opacity-90">Game of the Day</div>
                  <div className="mt-1 max-w-[230px] text-[32px] font-bold leading-tight">Join the numbers.</div>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-black/35 p-3 backdrop-blur-xl">
                  <AppIcon id={featured} size={54} />
                  <div className="min-w-0 flex-1 text-white">
                    <div className="truncate text-[16px] font-semibold">{APPS[featured].name}</div>
                    <div className="truncate text-[13px] opacity-80">{APPS[featured].blurb}</div>
                  </div>
                  <Action id={featured} />
                </div>
              </div>
              <div className="mb-1 mt-7 flex items-end justify-between">
                <div className="text-[22px] font-bold">Must-Have Apps</div>
              </div>
              {all.slice(0, 7).map(row)}
              <div className="mb-1 mt-7 text-[22px] font-bold">More to Explore</div>
              {thirdParty.map(row)}
            </div>
          </Page>
        )}
        {tab === "games" && (
          <Page title="Games" bg="bg-ios-bg">
            <div className="px-4">
              <div className="mb-1 text-[22px] font-bold">Popular Games</div>
              {games.map(row)}
              <div className="mb-1 mt-6 text-[22px] font-bold">Made by Apple</div>
              {all.filter((id) => APPS[id].system && APPS[id].category === "Entertainment").map(row)}
              <div className="mt-4 text-[13px] text-ios-label2">More games are available in the full App Store.</div>
            </div>
          </Page>
        )}
        {tab === "apps" && (
          <Page title="Apps" bg="bg-ios-bg">
            <div className="px-4">
              <div className="mb-1 text-[22px] font-bold">Top Free Apps</div>
              {thirdParty.map(row)}
              <div className="mb-1 mt-6 text-[22px] font-bold">Apple Apps</div>
              {all.filter((id) => APPS[id].system).map(row)}
            </div>
          </Page>
        )}
        {tab === "search" && (
          <Page title="Search" bg="bg-ios-bg">
            <div className="px-4">
              <SearchField value={q} onChange={setQ} placeholder="Games, Apps, Stories and More" />
              <div className="mt-3">{all.filter((id) => q && APPS[id].name.toLowerCase().includes(q.toLowerCase())).map(row)}</div>
              {!q && (
                <div className="mt-2">
                  <div className="mb-1 text-[20px] font-bold">Trending</div>
                  {["calculator", "weather", "snake", "twenty48"].map((id) => (
                    <button key={id} onClick={() => setQ(APPS[id].name)} className="ios-row flex w-full items-center gap-3 py-3 text-left" style={{ ["--sep-left" as string]: "0px" }}>
                      <Search size={16} className="text-ios-label2" /> {APPS[id].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Page>
        )}
      </div>
      <TabBar
        tabs={[
          { id: "today", label: "Today", icon: Newspaper },
          { id: "games", label: "Games", icon: Gamepad2 },
          { id: "apps", label: "Apps", icon: LayoutGrid },
          { id: "search", label: "Search", icon: Search },
        ]}
        value={tab}
        onChange={setTab}
      />
    </div>
  );
}
