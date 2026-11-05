import { useRef, useState } from "react";
import { Calendar, Check, ChevronLeft, Flag, ListChecks, Plus, Sun, Inbox, Bell, Clock, X } from "lucide-react";
import { useData, patchData, newId, type Reminder } from "../os/data";
import { Group, NavBtn, Page, Row, Sheet, SwipeRow, Segmented, WheelPicker } from "../os/ui";
import { sameDay } from "../os/utils";
import { useAppAction } from "../os/actions";
import { useOS } from "../os/store";

const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#5856d6", "#af52de", "#ff2d55"];

function dueText(due?: number) {
  if (!due) return "";
  const d = new Date(due);
  const now = new Date();
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return `Today, ${t}`;
  if (sameDay(d, new Date(Date.now() + 86400000))) return `Tomorrow, ${t}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + t;
}

export default function RemindersApp() {
  const rlists = useData((s) => s.rlists);
  const reminders = useData((s) => s.reminders);
  const [view, setView] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [newList, setNewList] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[4]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const last = useRef<string | null>(null);
  if (view) last.current = view;

  const todayItems = reminders.filter((r) => !r.done && r.due && sameDay(new Date(r.due), new Date()));
  const smart: { id: string; title: string; color: string; icon: typeof Sun; items: Reminder[] }[] = [
    { id: "today", title: "Today", color: "#007aff", icon: Sun, items: todayItems },
    { id: "scheduled", title: "Scheduled", color: "#ff3b30", icon: Calendar, items: reminders.filter((r) => !r.done && r.due) },
    { id: "all", title: "All", color: "#1c1c1e", icon: Inbox, items: reminders.filter((r) => !r.done) },
    { id: "flagged", title: "Flagged", color: "#ff9500", icon: Flag, items: reminders.filter((r) => !r.done && r.flag) },
  ];
  const current = view ?? last.current;
  const sm = smart.find((s) => s.id === current);
  const list = rlists.find((l) => l.id === current);
  const title = sm?.title ?? list?.name ?? "";
  const accent = sm?.color ?? list?.color ?? "#007aff";
  let items = sm ? (sm.id === "all" ? reminders : sm.items) : reminders.filter((r) => r.listId === current);
  if (!showDone) items = items.filter((r) => !r.done);
  const doneCount = (sm ? reminders : reminders.filter((r) => r.listId === current)).filter((r) => r.done).length;

  const add = () => {
    const listId = list?.id ?? rlists[0].id;
    const r: Reminder = { id: newId(), listId, text: "", done: false, flag: sm?.id === "flagged", due: sm?.id === "today" ? new Date().setHours(18, 0, 0, 0) : undefined };
    patchData((s) => ({ reminders: [...s.reminders, r] }));
    setFocusId(r.id);
  };
  useAppAction("reminders", (a) => {
    if (a === "new") {
      setView(rlists[0].id);
      setTimeout(add, 350);
    }
  });

  const upd = (id: string, p: Partial<Reminder>) => patchData((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const del = (id: string) => patchData((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <div className="absolute inset-0" style={{ transform: view ? "translateX(-30%)" : "none", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", filter: view ? "brightness(.92)" : undefined }}>
        <Page
          title="Reminders"
          right={
            <button onClick={() => setNewList(true)} className="text-ios-blue">
              <Plus size={26} />
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3 px-4 pb-5">
            {smart.map((s) => (
              <button key={s.id} onClick={() => setView(s.id)} className="rounded-[12px] bg-ios-cell p-3 text-left active:opacity-70">
                <div className="flex items-start justify-between">
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-white" style={{ background: s.color }}>
                    <s.icon size={17} />
                  </div>
                  <span className="text-[30px] font-bold leading-none">{s.items.length}</span>
                </div>
                <div className="mt-2 text-[16px] font-semibold text-ios-label2">{s.title}</div>
              </button>
            ))}
          </div>
          <Group header="My Lists">
            {rlists.map((l) => (
              <Row
                key={l.id}
                leading={
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-white" style={{ background: l.color }}>
                    <ListChecks size={17} />
                  </div>
                }
                title={l.name}
                value={reminders.filter((r) => r.listId === l.id && !r.done).length}
                chevron
                onClick={() => setView(l.id)}
              />
            ))}
          </Group>
        </Page>
      </div>
      <div className="absolute inset-0" style={{ transform: view ? "none" : "translateX(100%)", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", boxShadow: "-6px 0 18px rgba(0,0,0,.12)" }}>
        <Page
          title={title}
          bg="bg-ios-bg"
          left={
            <NavBtn onClick={() => setView(null)}>
              <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
              <span className="-ml-1">Lists</span>
            </NavBtn>
          }
          right={
            doneCount > 0 ? (
              <NavBtn onClick={() => setShowDone(!showDone)}>
                <span className="text-[15px]">{showDone ? "Hide Completed" : `Completed (${doneCount})`}</span>
              </NavBtn>
            ) : undefined
          }
          footer={
            <div className="glass relative z-20 px-4 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)", borderTop: "0.5px solid var(--ios-sep)" }}>
              <button onClick={add} className="flex items-center gap-2 text-[17px] font-semibold" style={{ color: accent }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                  <Plus size={16} strokeWidth={3} />
                </span>
                New Reminder
              </button>
            </div>
          }
        >
          <style>{`.rem-title{color:${accent}}`}</style>
          <div className="px-4 pb-2" />
          {items.length === 0 && <div className="py-16 text-center text-ios-label2">No Reminders</div>}
          <div className="mx-4">
            {items.map((r) => (
              <SwipeRow key={r.id} className="bg-ios-bg" bg="var(--ios-bg)" actions={[{ label: r.flag ? "Unflag" : "Flag", color: "var(--ios-orange)", onPress: () => upd(r.id, { flag: !r.flag }) }, { label: "Delete", color: "var(--ios-red)", onPress: () => del(r.id) }]}>
                <div className="ios-row flex items-start gap-3 py-[10px]" style={{ background: "var(--ios-bg)" }}>
                  <button
                    onClick={() => upd(r.id, { done: !r.done })}
                    className="mt-0.5 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px]"
                    style={{ borderColor: r.done ? accent : "var(--ios-label3)", background: r.done ? accent : "transparent" }}
                  >
                    {r.done && <Check size={14} strokeWidth={4} className="text-white" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <input
                      value={r.text}
                      autoFocus={focusId === r.id}
                      placeholder="Reminder"
                      enterKeyHint="done"
                      onChange={(e) => upd(r.id, { text: e.target.value })}
                      onBlur={() => !useData.getState().reminders.find((x) => x.id === r.id)?.text.trim() && del(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className="w-full bg-transparent text-[17px] outline-none"
                      style={{ textDecoration: r.done ? "line-through" : "none", opacity: r.done ? 0.5 : 1 }}
                    />
                    {r.due && <button onClick={() => setEditId(r.id)} className="text-[13px]" style={{ color: r.due < Date.now() && !r.done ? "var(--ios-red)" : "var(--ios-label2)" }}>{dueText(r.due)}</button>}
                    {!r.due && <button onClick={() => setEditId(r.id)} className="mt-1 flex items-center gap-1 text-[12px] text-ios-label3">
                      <Bell size={11} /> Add date
                    </button>}
                  </div>
                  <button onClick={() => setEditId(r.id)} className="mt-0.5 px-2 text-ios-label3">
                    <Clock size={16} />
                  </button>
                  {r.flag && <Flag size={16} fill="var(--ios-orange)" className="mt-1 text-ios-orange" />}
                </div>
              </SwipeRow>
            ))}
          </div>
        </Page>
      </div>
      <Sheet open={newList} onClose={() => setNewList(false)} height="62%">
        <Page
          title="New List"
          large={false}
          left={<NavBtn onClick={() => setNewList(false)}>Cancel</NavBtn>}
          right={
            <NavBtn
              bold
              disabled={!name.trim()}
              onClick={() => {
                patchData((s) => ({ rlists: [...s.rlists, { id: newId(), name: name.trim(), color }] }));
                setName("");
                setNewList(false);
                useOS.getState().showToast("List created");
              }}
            >
              Done
            </NavBtn>
          }
        >
          <div className="px-4 pt-6">
            <div className="rounded-[14px] bg-ios-cell p-6 text-center">
              <div className="mx-auto mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-full text-white" style={{ background: color }}>
                <ListChecks size={38} />
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="List Name" enterKeyHint="done" className="w-full rounded-[10px] bg-ios-fill px-3 py-3 text-center text-[22px] font-bold outline-none" style={{ color }} />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-4 rounded-[14px] bg-ios-cell p-4">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="mx-auto h-10 w-10 rounded-full" style={{ background: c, outline: c === color ? "3px solid var(--ios-label3)" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
        </Page>
      </Sheet>

      <Sheet open={!!editId} onClose={() => setEditId(null)} height="60%">
        <EditReminder id={editId} accent={accent} onClose={() => setEditId(null)} />
      </Sheet>
    </div>
  );
}

function EditReminder({ id, accent, onClose }: { id: string | null; accent: string; onClose: () => void }) {
  const r = useData((s) => s.reminders.find((x) => x.id === id));
  if (!r) return null;

  const upd = (p: Partial<Reminder>) => patchData((s) => ({ reminders: s.reminders.map((x) => (x.id === r.id ? { ...x, ...p } : x)) }));
  const del = () => { patchData((s) => ({ reminders: s.reminders.filter((x) => x.id !== r.id) })); onClose(); };

  const dueMs = r.due ?? Date.now();
  const due = new Date(dueMs);
  const [ampm, setAmpm] = useState<"AM" | "PM">(due.getHours() >= 12 ? "PM" : "AM");
  const hours24 = due.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const setDateTime = (date: Date, h12: number, m: number, ap: "AM" | "PM") => {
    const h24 = ap === "PM" ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    date.setHours(h24, m, 0, 0);
    upd({ due: date.getTime(), notified: false });
  };

  return (
    <Page
      title="Details"
      large={false}
      left={<NavBtn onClick={onClose}>Close</NavBtn>}
      right={<NavBtn bold onClick={onClose}>Done</NavBtn>}
    >
      <Group>
        <input
          value={r.text}
          onChange={(e) => upd({ text: e.target.value })}
          placeholder="Reminder"
          className="ios-row block w-full bg-transparent px-4 text-[17px] outline-none"
        />
      </Group>
      <Group header="Date & Time">
        <div className="px-4 py-3">
          <Segmented
            options={[
              { id: "today", label: "Today" },
              { id: "tomorrow", label: "Tomorrow" },
              { id: "weekend", label: "This Weekend" },
              { id: "pick", label: "Pick Date" },
            ]}
            value={(() => {
              if (!r.due) return "pick";
              if (sameDay(new Date(r.due), new Date())) return "today";
              if (sameDay(new Date(r.due), new Date(Date.now() + 86400000))) return "tomorrow";
              return "pick";
            })()}
            onChange={(v) => {
              const d = new Date();
              if (v === "today") { d.setHours(18, 0, 0, 0); upd({ due: d.getTime(), notified: false }); }
              else if (v === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); upd({ due: d.getTime(), notified: false }); }
              else if (v === "weekend") { const day = d.getDay(); d.setDate(d.getDate() + ((6 - day + 7) % 7 || 7)); d.setHours(10, 0, 0, 0); upd({ due: d.getTime(), notified: false }); }
            }}
            className="mb-3"
          />
          {r.due ? (
            <div className="flex items-center justify-between rounded-xl bg-ios-fill p-3" style={{ background: "var(--ios-fill)" }}>
              <div className="text-[15px]">{new Date(r.due).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="flex items-center gap-2">
                <WheelPicker
                  items={Array.from({ length: 12 }, (_, i) => String(i + 1))}
                  value={hours12 - 1}
                  onChange={(v) => setDateTime(new Date(dueMs), v + 1, due.getMinutes(), ampm)}
                  width={56}
                  loop
                />
                <span className="text-[18px]">:</span>
                <WheelPicker
                  items={["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59"]}
                  value={due.getMinutes()}
                  onChange={(v) => setDateTime(new Date(dueMs), hours12, v, ampm)}
                  width={56}
                  loop
                />
                <Segmented
                  options={[{ id: "AM", label: "AM" }, { id: "PM", label: "PM" }]}
                  value={ampm}
                  onChange={(v) => { setAmpm(v as "AM" | "PM"); setDateTime(new Date(dueMs), hours12, due.getMinutes(), v as "AM" | "PM"); }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-ios-fill p-4 text-center text-[14px] text-ios-label2" style={{ background: "var(--ios-fill)" }}>
              No date set
            </div>
          )}
          {r.due && (
            <button onClick={() => upd({ due: undefined })} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ios-cell py-2.5 text-[15px] text-ios-red">
              <X size={14} /> Remove Date
            </button>
          )}
        </div>
      </Group>
      <Group>
        <Row icon={Flag} iconBg="#ff9500" title="Flag" right={<span style={{ color: r.flag ? accent : "var(--ios-label3)" }}>{r.flag ? "On" : "Off"}</span>} onClick={() => upd({ flag: !r.flag })} />
        <Row icon={Bell} iconBg="#ff3b30" title="Remind me on a day" right={<span style={{ color: r.due ? accent : "var(--ios-label3)" }}>{r.due ? "On" : "Off"}</span>} onClick={() => !r.due && upd({ due: (() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d.getTime(); })(), notified: false })} />
      </Group>
      <Group>
        <Row title={<span className="text-ios-red">Delete Reminder</span>} onClick={del} />
      </Group>
    </Page>
  );
}
