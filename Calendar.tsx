import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { useData, patchData, newId, type CalEvent } from "../os/data";
import { useOS } from "../os/store";
import { Group, NavBtn, Page, Segmented, Sheet, Toggle, WheelPicker, ScrollView } from "../os/ui";
import { DAYS, DAYS_SHORT, MONTHS, fmtTime, pad, sameDay } from "../os/utils";

const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#5856d6", "#af52de", "#ff2d55"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export default function CalendarApp() {
  const events = useData((s) => s.events);
  const use24 = useOS((s) => s.use24h);
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [view, setView] = useState<"month" | "agenda">("month");
  const [sheet, setSheet] = useState(false);
  const [edit, setEdit] = useState<CalEvent | null>(null);
  const [title, setTitle] = useState("");
  const [loc, setLoc] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [h, setH] = useState(9);
  const [m, setM] = useState(0);
  const [dur, setDur] = useState(60);
  const [color, setColor] = useState(COLORS[4]);
  const [day, setDay] = useState(sel);

  const cells = useMemo(() => {
    const first = month.getDay();
    const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const prevDim = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
    return Array.from({ length: 42 }, (_, i) => {
      const n = i - first + 1;
      if (n < 1) return new Date(month.getFullYear(), month.getMonth() - 1, prevDim + n);
      if (n > dim) return new Date(month.getFullYear(), month.getMonth() + 1, n - dim);
      return new Date(month.getFullYear(), month.getMonth(), n);
    });
  }, [month]);

  const forDay = (d: Date) => events.filter((e) => startOfDay(d) < e.end && startOfDay(d) + 86400000 > e.start).sort((a, b) => a.start - b.start);
  const selEvents = forDay(sel);

  const openNew = () => {
    setEdit(null);
    setTitle("");
    setLoc("");
    setAllDay(false);
    setH(sameDay(sel, today) ? Math.min(23, today.getHours() + 1) : 9);
    setM(0);
    setDur(60);
    setColor(COLORS[4]);
    setDay(sel);
    setSheet(true);
  };
  const openEdit = (e: CalEvent) => {
    const s = new Date(e.start);
    setEdit(e);
    setTitle(e.title);
    setLoc(e.location ?? "");
    setAllDay(!!e.allDay);
    setH(s.getHours());
    setM(s.getMinutes());
    setDur(Math.max(30, Math.round((e.end - e.start) / 60000)));
    setColor(e.color);
    setDay(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
    setSheet(true);
  };
  const save = () => {
    const base = startOfDay(day);
    const ev: CalEvent = {
      id: edit?.id ?? newId(),
      title: title.trim() || "New Event",
      location: loc.trim() || undefined,
      allDay,
      color,
      start: allDay ? base : base + (h * 60 + m) * 60000,
      end: allDay ? base + 86400000 : base + (h * 60 + m + dur) * 60000,
    };
    patchData((s) => ({ events: edit ? s.events.map((x) => (x.id === edit.id ? ev : x)) : [...s.events, ev] }));
    setSheet(false);
  };

  const eventRow = (e: CalEvent, showDate = false) => (
    <button key={e.id} onClick={() => openEdit(e)} className="ios-row flex w-full items-stretch gap-3 px-4 py-2.5 text-left active:bg-ios-fill">
      <div className="w-[62px] shrink-0 text-right text-[13px] leading-[17px]">
        {e.allDay ? (
          <div className="font-medium">all-day</div>
        ) : (
          <>
            <div className="font-medium">{showDate ? "" : fmtTime(new Date(e.start), use24)}</div>
            <div className="text-ios-label2">{fmtTime(new Date(e.end), use24)}</div>
          </>
        )}
      </div>
      <div className="w-[4px] shrink-0 rounded-full" style={{ background: e.color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-semibold">{e.title}</div>
        {e.location && (
          <div className="flex items-center gap-1 truncate text-[13px] text-ios-label2">
            <MapPin size={12} /> {e.location}
          </div>
        )}
      </div>
    </button>
  );

  const agenda = useMemo(() => {
    const out: { d: Date; list: CalEvent[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startOfDay(today) + i * 86400000);
      const list = forDay(d);
      if (list.length) out.push({ d, list });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  return (
    <>
      <Page
        title={`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}
        large={false}
        left={
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="text-ios-red">
              <ChevronLeft size={26} />
            </button>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="text-ios-red">
              <ChevronRight size={26} />
            </button>
          </div>
        }
        right={
          <>
            <NavBtn color="var(--ios-red)" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSel(new Date(today.getFullYear(), today.getMonth(), today.getDate())); }}>
              Today
            </NavBtn>
            <button onClick={openNew} className="text-ios-red">
              <Plus size={26} />
            </button>
          </>
        }
        bg="bg-ios-bg"
      >
        <div className="px-4 pb-2 pt-1">
          <Segmented options={[{ id: "month", label: "Month" }, { id: "agenda", label: "Agenda" }]} value={view} onChange={setView} />
        </div>
        {view === "month" ? (
          <>
            <div className="grid grid-cols-7 px-2 pb-1 text-center text-[11px] font-semibold text-ios-label2">
              {DAYS_SHORT.map((d) => (
                <div key={d}>{d.toUpperCase()}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 px-2" style={{ borderTop: "0.5px solid var(--ios-sep)" }}>
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === month.getMonth();
                const isToday = sameDay(d, today);
                const isSel = sameDay(d, sel);
                const evs = forDay(d);
                return (
                  <button key={i} onClick={() => { setSel(d); if (!inMonth) setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="flex h-[52px] flex-col items-center pt-1.5" style={{ borderBottom: "0.5px solid var(--ios-sep)" }}>
                    <div
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[18px]"
                      style={{ background: isToday ? "var(--ios-red)" : isSel ? "var(--ios-label)" : "transparent", color: isToday ? "#fff" : isSel ? "var(--ios-bg)" : inMonth ? "var(--ios-label)" : "var(--ios-label3)", fontWeight: isToday || isSel ? 600 : 400 }}
                    >
                      {d.getDate()}
                    </div>
                    <div className="mt-0.5 flex h-[6px] gap-[3px]">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className="h-[5px] w-[5px] rounded-full" style={{ background: e.color }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 px-4 pb-1 text-[13px] font-semibold uppercase text-ios-label2">
              {DAYS[sel.getDay()]}, {MONTHS[sel.getMonth()]} {sel.getDate()}
            </div>
            <div className="mx-4 overflow-hidden rounded-[10px] bg-ios-cell">
              {selEvents.map((e) => eventRow(e))}
              {selEvents.length === 0 && <div className="py-8 text-center text-[17px] text-ios-label2">No Events</div>}
            </div>
          </>
        ) : (
          <div className="px-4">
            {agenda.map(({ d, list }) => (
              <div key={d.getTime()} className="mb-4">
                <div className="px-1 pb-1 text-[13px] font-semibold uppercase text-ios-label2">
                  {sameDay(d, today) ? "Today" : `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`}
                </div>
                <div className="overflow-hidden rounded-[10px] bg-ios-cell">{list.map((e) => eventRow(e))}</div>
              </div>
            ))}
            {agenda.length === 0 && <div className="py-16 text-center text-ios-label2">No upcoming events</div>}
          </div>
        )}
      </Page>

      <Sheet open={sheet} onClose={() => setSheet(false)} height="88%">
        <Page
          title={edit ? "Edit Event" : "New Event"}
          large={false}
          left={<NavBtn onClick={() => setSheet(false)}>Cancel</NavBtn>}
          right={<NavBtn bold onClick={save}>{edit ? "Save" : "Add"}</NavBtn>}
        >
          <div className="pt-3">
            <Group>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" autoCapitalize="sentences" className="ios-row block w-full bg-transparent px-4 py-3 text-[17px] outline-none" />
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location" className="block w-full bg-transparent px-4 py-3 text-[17px] outline-none" />
            </Group>
            <Group>
              <div className="ios-row flex items-center justify-between px-4 py-2.5 text-[17px]">
                <span>All-day</span>
                <Toggle on={allDay} onChange={setAllDay} />
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-[17px]">
                <span>Date</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDay(new Date(day.getTime() - 86400000))} className="text-ios-red">
                    <ChevronLeft size={22} />
                  </button>
                  <span className="rounded-md bg-ios-fill px-2 py-1 text-[15px]">
                    {DAYS_SHORT[day.getDay()]}, {MONTHS[day.getMonth()].slice(0, 3)} {day.getDate()}
                  </span>
                  <button onClick={() => setDay(new Date(day.getTime() + 86400000 + (day.getHours() === 23 ? 3600000 : 0)))} className="text-ios-red">
                    <ChevronRight size={22} />
                  </button>
                </div>
              </div>
            </Group>
            {!allDay && (
              <Group header="Starts">
                <div className="flex justify-center">
                  <WheelPicker items={Array.from({ length: 12 }, (_, i) => String(i + 1))} value={(h % 12 === 0 ? 12 : h % 12) - 1} loop width={70} align="right" onChange={(v) => setH(((v + 1) % 12) + (h >= 12 ? 12 : 0))} />
                  <WheelPicker items={Array.from({ length: 12 }, (_, i) => pad(i * 5))} value={Math.round(m / 5) % 12} loop width={70} align="left" onChange={(v) => setM(v * 5)} />
                  <WheelPicker items={["AM", "PM"]} value={h >= 12 ? 1 : 0} width={60} onChange={(v) => setH((h % 12) + (v ? 12 : 0))} />
                </div>
                <div className="px-4 pb-3">
                  <div className="mb-1.5 text-[13px] text-ios-label2">Duration</div>
                  <Segmented options={[{ id: 30, label: "30m" }, { id: 60, label: "1h" }, { id: 120, label: "2h" }, { id: 180, label: "3h" }]} value={dur} onChange={setDur} />
                </div>
              </Group>
            )}
            <Group header="Calendar color">
              <div className="flex justify-between px-4 py-3">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="h-8 w-8 rounded-full" style={{ background: c, outline: c === color ? "3px solid var(--ios-label3)" : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </Group>
            {edit && (
              <Group>
                <button
                  className="block w-full py-3 text-center text-[17px] text-ios-red"
                  onClick={() => {
                    patchData((s) => ({ events: s.events.filter((x) => x.id !== edit.id) }));
                    setSheet(false);
                  }}
                >
                  Delete Event
                </button>
              </Group>
            )}
          </div>
        </Page>
      </Sheet>
      <span className="hidden"><ScrollView>{null}</ScrollView></span>
    </>
  );
}
