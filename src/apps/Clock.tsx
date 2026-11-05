import { useEffect, useRef, useState } from "react";
import { AlarmClock, Globe, Hourglass, Minus, Plus, Timer as TimerIcon } from "lucide-react";
import { useOS, useNow } from "../os/store";
import { useData, patchData, newId, type City } from "../os/data";
import { Group, NavBtn, Page, Row, SearchField, Sheet, SwipeRow, TabBar, Toggle, WheelPicker, ScrollView } from "../os/ui";
import { DAYS_SHORT, DAYS, fmtClock, pad } from "../os/utils";
import { useAppAction } from "../os/actions";

type Tab = "world" | "alarm" | "stopwatch" | "timer";

const CITIES: { name: string; tz: string }[] = [
  ["Cupertino", "America/Los_Angeles"], ["San Francisco", "America/Los_Angeles"], ["Los Angeles", "America/Los_Angeles"], ["Denver", "America/Denver"], ["Chicago", "America/Chicago"],
  ["New York", "America/New_York"], ["Toronto", "America/Toronto"], ["Mexico City", "America/Mexico_City"], ["São Paulo", "America/Sao_Paulo"], ["Buenos Aires", "America/Argentina/Buenos_Aires"],
  ["London", "Europe/London"], ["Dublin", "Europe/Dublin"], ["Paris", "Europe/Paris"], ["Berlin", "Europe/Berlin"], ["Madrid", "Europe/Madrid"], ["Rome", "Europe/Rome"], ["Stockholm", "Europe/Stockholm"], ["Athens", "Europe/Athens"], ["Istanbul", "Europe/Istanbul"], ["Moscow", "Europe/Moscow"],
  ["Cairo", "Africa/Cairo"], ["Lagos", "Africa/Lagos"], ["Nairobi", "Africa/Nairobi"], ["Johannesburg", "Africa/Johannesburg"],
  ["Dubai", "Asia/Dubai"], ["Mumbai", "Asia/Kolkata"], ["Dhaka", "Asia/Dhaka"], ["Bangkok", "Asia/Bangkok"], ["Singapore", "Asia/Singapore"], ["Hong Kong", "Asia/Hong_Kong"], ["Shanghai", "Asia/Shanghai"], ["Seoul", "Asia/Seoul"], ["Tokyo", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"], ["Auckland", "Pacific/Auckland"], ["Honolulu", "Pacific/Honolulu"],
].map(([name, tz]) => ({ name, tz }));

function tzInfo(tz: string, use24: boolean, now: Date) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: !use24 }).format(now);
  const day = (d: Date, z?: string) => new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const a = new Date(day(now, tz) + "T00:00:00Z").getTime();
  const b = new Date(day(now) + "T00:00:00Z").getTime();
  const diffDays = Math.round((a - b) / 86400000);
  const offset = (z: string) => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: z, timeZoneName: "longOffset" }).formatToParts(now).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
    const m = p.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + parseInt(m[3] ?? "0", 10) / 60) : 0;
  };
  const hrs = offset(tz) - offset(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [t, ap] = time.split(" ");
  return { t, ap: use24 ? "" : ap, label: `${diffDays === 0 ? "Today" : diffDays > 0 ? "Tomorrow" : "Yesterday"}, ${hrs >= 0 ? "+" : ""}${hrs}HRS`.replace(".5HRS", ".5HRS") };
}

/* ---------------------------- World clock ---------------------------- */
function World() {
  const clocks = useData((s) => s.clocks);
  const use24 = useOS((s) => s.use24h);
  const now = useNow(5000);
  const [edit, setEdit] = useState(false);
  const [add, setAdd] = useState(false);
  const [q, setQ] = useState("");
  return (
    <Page
      title="World Clock"
      left={<NavBtn onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</NavBtn>}
      right={
        <button onClick={() => setAdd(true)} className="text-ios-blue">
          <Plus size={26} />
        </button>
      }
    >
      <div className="mx-4 overflow-hidden rounded-[10px] bg-ios-cell">
        {clocks.map((c) => {
          const i = tzInfo(c.tz, use24, now);
          return (
            <SwipeRow key={c.id} actions={[{ label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ clocks: s.clocks.filter((x) => x.id !== c.id) })) }]}>
              <div className="ios-row flex items-center gap-3 px-4 py-3">
                {edit && (
                  <button onClick={() => patchData((s) => ({ clocks: s.clocks.filter((x) => x.id !== c.id) }))} className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ios-red text-white">
                    <Minus size={14} strokeWidth={4} />
                  </button>
                )}
                <div className="flex-1">
                  <div className="text-[13px] text-ios-label2">{i.label}</div>
                  <div className="text-[24px] font-normal leading-7">{c.name}</div>
                </div>
                <div className="text-[48px] font-extralight tabular-nums leading-none">
                  {i.t}
                  <span className="ml-1 text-[22px]">{i.ap}</span>
                </div>
              </div>
            </SwipeRow>
          );
        })}
        {clocks.length === 0 && <div className="py-10 text-center text-ios-label2">No World Clocks</div>}
      </div>
      <Sheet open={add} onClose={() => setAdd(false)}>
        <Page title="Choose a City" large={false} left={<NavBtn onClick={() => setAdd(false)}>Cancel</NavBtn>}>
          <div className="px-4 py-2">
            <SearchField value={q} onChange={setQ} />
          </div>
          <Group>
            {CITIES.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).map((c) => (
              <Row
                key={c.name}
                title={c.name}
                value={c.tz.split("/")[0]}
                onClick={() => {
                  const city: City = { id: newId(), name: c.name, lat: 0, lon: 0, tz: c.tz };
                  patchData((s) => ({ clocks: [...s.clocks, city] }));
                  setAdd(false);
                  setQ("");
                }}
              />
            ))}
          </Group>
        </Page>
      </Sheet>
    </Page>
  );
}

/* ------------------------------- Alarms ------------------------------- */
function Alarms() {
  const alarms = useOS((s) => s.alarms);
  const use24 = useOS((s) => s.use24h);
  const set = useOS((s) => s.set);
  const [edit, setEdit] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [h, setH] = useState(7);
  const [m, setM] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [label, setLabel] = useState("Alarm");
  const [sheet, setSheet] = useState(false);

  const openNew = () => {
    const d = new Date();
    setH(d.getHours());
    setM(d.getMinutes());
    setDays([]);
    setLabel("Alarm");
    setEditing(null);
    setSheet(true);
  };
  const openEdit = (id: string) => {
    const a = alarms.find((x) => x.id === id)!;
    setH(a.h);
    setM(a.m);
    setDays(a.days);
    setLabel(a.label);
    setEditing(id);
    setSheet(true);
  };
  const save = () => {
    if (editing) set({ alarms: alarms.map((a) => (a.id === editing ? { ...a, h, m, days, label, on: true } : a)) });
    else set({ alarms: [...alarms, { id: newId(), h, m, days, label, on: true }] });
    setSheet(false);
  };
  useAppAction("clock", (a) => a === "alarm" && openNew());

  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sorted = [...alarms].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  const dayText = (d: number[]) => (d.length === 0 ? "Never" : d.length === 7 ? "Every day" : d.length === 5 && !d.includes(0) && !d.includes(6) ? "Weekdays" : d.map((x) => DAYS_SHORT[x]).join(" "));

  return (
    <Page
      title="Alarm"
      left={<NavBtn onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</NavBtn>}
      right={
        <button onClick={openNew} className="text-ios-blue">
          <Plus size={26} />
        </button>
      }
    >
      <div className="mx-4 overflow-hidden rounded-[10px] bg-ios-cell">
        {sorted.map((a) => {
          const hh = a.h % 12 === 0 ? 12 : a.h % 12;
          return (
            <SwipeRow key={a.id} actions={[{ label: "Delete", color: "var(--ios-red)", onPress: () => set({ alarms: alarms.filter((x) => x.id !== a.id) }) }]}>
              <div className="ios-row flex items-center gap-3 px-4 py-2.5" onClick={() => openEdit(a.id)}>
                {edit && (
                  <button onClick={(e) => { e.stopPropagation(); set({ alarms: alarms.filter((x) => x.id !== a.id) }); }} className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ios-red text-white">
                    <Minus size={14} strokeWidth={4} />
                  </button>
                )}
                <div className="flex-1" style={{ opacity: a.on ? 1 : 0.45 }}>
                  <div className="text-[52px] font-extralight tabular-nums leading-[56px]">
                    {use24 ? `${pad(a.h)}:${pad(a.m)}` : `${hh}:${pad(a.m)}`}
                    {!use24 && <span className="ml-1 text-[26px] font-normal">{a.h >= 12 ? "PM" : "AM"}</span>}
                  </div>
                  <div className="text-[15px]">
                    {a.label}, {dayText(a.days)}
                  </div>
                </div>
                {!edit && <Toggle on={a.on} onChange={(v) => set({ alarms: alarms.map((x) => (x.id === a.id ? { ...x, on: v } : x)) })} />}
              </div>
            </SwipeRow>
          );
        })}
        {alarms.length === 0 && <div className="py-10 text-center text-ios-label2">No Alarms</div>}
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} height="78%">
        <Page
          title={editing ? "Edit Alarm" : "Add Alarm"}
          large={false}
          left={<NavBtn onClick={() => setSheet(false)}>Cancel</NavBtn>}
          right={
            <NavBtn bold onClick={save}>
              Save
            </NavBtn>
          }
        >
          <div className="flex justify-center pt-3">
            <div className="flex rounded-2xl bg-ios-cell px-4">
              <WheelPicker items={Array.from({ length: 12 }, (_, i) => String(i + 1))} value={h12 - 1} loop width={70} align="right" onChange={(v) => setH(((v + 1) % 12) + (h >= 12 ? 12 : 0))} />
              <WheelPicker items={Array.from({ length: 60 }, (_, i) => pad(i))} value={m} loop width={70} align="left" onChange={setM} />
              <WheelPicker items={["AM", "PM"]} value={h >= 12 ? 1 : 0} width={64} onChange={(v) => setH((h % 12) + (v ? 12 : 0))} />
            </div>
          </div>
          <div className="mt-5">
            <Group>
              <div className="px-4 py-3">
                <div className="mb-2 text-[15px]">Repeat</div>
                <div className="flex justify-between">
                  {DAYS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                      className="h-9 w-9 rounded-full text-[13px] font-semibold"
                      style={{ background: days.includes(i) ? "var(--ios-orange)" : "var(--ios-fill)", color: days.includes(i) ? "#fff" : "var(--ios-label)" }}
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ios-row flex items-center justify-between px-4 py-2.5 text-[17px]">
                <span>Label</span>
                <input value={label} onChange={(e) => setLabel(e.target.value)} enterKeyHint="done" className="w-[60%] bg-transparent text-right text-ios-label2 outline-none" />
              </div>
            </Group>
            {editing && (
              <Group>
                <Row
                  title={<span className="block text-center text-ios-red">Delete Alarm</span>}
                  onClick={() => {
                    set({ alarms: alarms.filter((a) => a.id !== editing) });
                    setSheet(false);
                  }}
                />
              </Group>
            )}
          </div>
        </Page>
      </Sheet>
    </Page>
  );
}

/* ----------------------------- Stopwatch ----------------------------- */
let swState = { running: false, startAt: 0, base: 0, laps: [] as number[] };
function Stopwatch() {
  const [, tick] = useState(0);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 33);
    return () => clearInterval(id);
  }, []);
  const el = swState.running ? swState.base + (Date.now() - swState.startAt) / 1000 : swState.base;
  const lapTimes = swState.laps.map((t, i) => t - (swState.laps[i - 1] ?? 0));
  const min = lapTimes.length > 1 ? Math.min(...lapTimes) : -1;
  const max = lapTimes.length > 1 ? Math.max(...lapTimes) : -1;
  useAppAction("clock", (a) => {
    if (a === "stopwatch" && !swState.running) {
      swState = { ...swState, running: true, startAt: Date.now() };
      force((n) => n + 1);
    }
  });
  const toggle = () => {
    if (swState.running) swState = { ...swState, running: false, base: swState.base + (Date.now() - swState.startAt) / 1000 };
    else swState = { ...swState, running: true, startAt: Date.now() };
    force((n) => n + 1);
  };
  const lapReset = () => {
    if (swState.running) swState = { ...swState, laps: [...swState.laps, el] };
    else swState = { running: false, startAt: 0, base: 0, laps: [] };
    force((n) => n + 1);
  };
  return (
    <div className="flex h-full flex-col bg-ios-bg" style={{ paddingTop: "calc(var(--safe-top) + 30px)" }}>
      <div className="text-center text-[88px] font-thin tabular-nums leading-[100px]">{fmtClock(el, true)}</div>
      <div className="mt-10 flex justify-between px-8">
        <button onClick={lapReset} disabled={!swState.running && swState.base === 0} className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-ios-fill2 text-[17px] disabled:opacity-40">
          {swState.running ? "Lap" : "Reset"}
        </button>
        <button onClick={toggle} className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[17px]" style={{ background: swState.running ? "rgba(255,69,58,.25)" : "rgba(48,209,88,.25)", color: swState.running ? "var(--ios-red)" : "var(--ios-green)" }}>
          {swState.running ? "Stop" : "Start"}
        </button>
      </div>
      <ScrollView className="mt-6 flex-1 px-6 pb-4">
        {[...lapTimes].map((t, i) => ({ t, n: i + 1 })).reverse().map(({ t, n }) => (
          <div key={n} className="flex justify-between py-2.5 text-[17px] tabular-nums" style={{ borderTop: "0.5px solid var(--ios-sep)", color: t === min ? "var(--ios-green)" : t === max ? "var(--ios-red)" : undefined }}>
            <span>Lap {n}</span>
            <span>{fmtClock(t, true)}</span>
          </div>
        ))}
      </ScrollView>
    </div>
  );
}

/* ------------------------------- Timer ------------------------------- */
function TimerTab() {
  const timer = useOS((s) => s.timer);
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [s, setS] = useState(0);
  useNow(100);
  useAppAction("clock", (a) => a === "timer" && void 0);
  const left = timer.status === "running" ? Math.max(0, (timer.endAt - Date.now()) / 1000) : timer.left;
  const frac = timer.total > 0 ? left / timer.total : 0;
  const total = h * 3600 + m * 60 + s;
  const R = 130;
  const ends = timer.status === "running" ? new Date(timer.endAt) : null;
  const use24 = useOS((st) => st.use24h);
  return (
    <div className="flex h-full flex-col items-center bg-ios-bg" style={{ paddingTop: "calc(var(--safe-top) + 40px)" }}>
      {timer.status === "idle" ? (
        <>
          <div className="flex items-center rounded-2xl">
            <WheelPicker items={Array.from({ length: 24 }, (_, i) => String(i))} value={h} onChange={setH} width={72} align="right" />
            <span className="-ml-2 w-12 text-[15px] font-semibold">hours</span>
            <WheelPicker items={Array.from({ length: 60 }, (_, i) => String(i))} value={m} onChange={setM} width={60} align="right" />
            <span className="-ml-1 w-8 text-[15px] font-semibold">min</span>
            <WheelPicker items={Array.from({ length: 60 }, (_, i) => String(i))} value={s} onChange={setS} width={60} align="right" />
            <span className="-ml-1 w-8 text-[15px] font-semibold">sec</span>
          </div>
          <div className="mt-10 flex w-full justify-between px-8">
            <button className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-ios-fill2 text-[17px] opacity-50">Cancel</button>
            <button
              disabled={total === 0}
              onClick={() => useOS.getState().startTimer(total)}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[17px] disabled:opacity-40"
              style={{ background: "rgba(48,209,88,.25)", color: "var(--ios-green)" }}
            >
              Start
            </button>
          </div>
          <div className="mt-8 w-full px-4">
            <Group header="Quick Timers">
              {[60, 300, 600, 900].map((t) => (
                <Row key={t} title={`${t / 60} min`} onClick={() => useOS.getState().startTimer(t)} chevron />
              ))}
            </Group>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex h-[290px] w-[290px] items-center justify-center">
            <svg viewBox="-150 -150 300 300" className="absolute inset-0 -rotate-90">
              <circle r={R} fill="none" stroke="var(--ios-fill2)" strokeWidth="9" />
              <circle r={R} fill="none" stroke="var(--ios-orange)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${frac * 2 * Math.PI * R} 9999`} />
            </svg>
            <div className="text-center">
              <div className="text-[70px] font-thin tabular-nums leading-none">{fmtClock(Math.ceil(left))}</div>
              {ends && <div className="mt-1 text-[15px] text-ios-label2">🔔 {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: !use24 }).format(ends)}</div>}
            </div>
          </div>
          <div className="mt-10 flex w-full justify-between px-8">
            <button onClick={() => useOS.getState().cancelTimer()} className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-ios-fill2 text-[17px]">
              Cancel
            </button>
            <button
              onClick={() => (timer.status === "running" ? useOS.getState().pauseTimer() : useOS.getState().resumeTimer())}
              className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[17px]"
              style={{ background: "rgba(255,159,10,.25)", color: "var(--ios-orange)" }}
            >
              {timer.status === "running" ? "Pause" : "Resume"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClockApp() {
  const [tab, setTab] = useState<Tab>("world");
  const timerRunning = useOS((s) => s.timer.status !== "idle");
  const prevTimer = useRef(timerRunning);
  useAppAction("clock", (a) => {
    if (a === "alarm") setTab("alarm");
    else if (a === "timer") setTab("timer");
    else if (a === "stopwatch") setTab("stopwatch");
  });
  useEffect(() => {
    prevTimer.current = timerRunning;
  }, [timerRunning]);
  return (
    <div className="force-dark flex h-full flex-col bg-ios-bg text-ios-label">
      <div className="relative min-h-0 flex-1">
        {tab === "world" && <World />}
        {tab === "alarm" && <Alarms />}
        {tab === "stopwatch" && <Stopwatch />}
        {tab === "timer" && <TimerTab />}
      </div>
      <TabBar
        tabs={[
          { id: "world", label: "World Clock", icon: Globe },
          { id: "alarm", label: "Alarm", icon: AlarmClock },
          { id: "stopwatch", label: "Stopwatch", icon: TimerIcon },
          { id: "timer", label: "Timer", icon: Hourglass },
        ]}
        value={tab}
        onChange={setTab}
      />
    </div>
  );
}
