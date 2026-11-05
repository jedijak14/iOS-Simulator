import { useRef, useState } from "react";
import { Calendar, Check, ChevronLeft, Flag, ListChecks, Plus, Sun, Inbox } from "lucide-react";
import { useData, patchData, newId, type Reminder } from "../os/data";
import { Group, NavBtn, Page, Row, Sheet, SwipeRow } from "../os/ui";
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
                    {r.due && <div className="text-[13px]" style={{ color: r.due < Date.now() && !r.done ? "var(--ios-red)" : "var(--ios-label2)" }}>{dueText(r.due)}</div>}
                  </div>
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
    </div>
  );
}
