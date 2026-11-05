import { useMemo, useState } from "react";
import { Plus, Sparkles, Bookmark, Filter, Star } from "lucide-react";
import { Group, Page, Row, Sheet, NavBtn, Empty, Segmented } from "../os/ui";
import { sfx } from "../os/sound";

interface JournalEntry {
  id: string;
  date: number;
  mood: "great" | "good" | "ok" | "down";
  text: string;
  tags: string[];
  prompt?: string;
}

const MOODS: { id: JournalEntry["mood"]; label: string; emoji: string; color: string }[] = [
  { id: "great", label: "Great", emoji: "😄", color: "#34c759" },
  { id: "good", label: "Good", emoji: "🙂", color: "#0a84ff" },
  { id: "ok", label: "OK", emoji: "😐", color: "#ff9500" },
  { id: "down", label: "Down", emoji: "😔", color: "#8e8e93" },
];

const PROMPTS = [
  "What's something you're grateful for today?",
  "Describe a moment when you felt truly happy.",
  "What did you learn this week?",
  "Write about a person who inspires you.",
  "What's a goal you're working toward?",
  "What's a small thing that brought you joy recently?",
  "Describe a place that feels like home.",
  "What's on your mind right now?",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

const SAMPLE: JournalEntry[] = [
  {
    id: "j1",
    date: Date.now() - 86400_000,
    mood: "good",
    text: "Had an amazing hike with Alex today. The trail up to Eagle Point was steeper than expected but the views from the top were worth every step. We talked about plans for the summer and grabbed ramen on the way back.",
    tags: ["hike", "friends", "weekend"],
    prompt: "Describe a moment when you felt truly happy.",
  },
  {
    id: "j2",
    date: Date.now() - 3 * 86400_000,
    mood: "great",
    text: "Got the design review approved! Three weeks of work finally paid off. The team's feedback was genuinely positive and now we can move to implementation.",
    tags: ["work", "milestone"],
  },
  {
    id: "j3",
    date: Date.now() - 5 * 86400_000,
    mood: "ok",
    text: "Slow Sunday. Did laundry, read a bit, took a long walk in the park. Sometimes uneventful days are exactly what you need.",
    tags: ["rest"],
  },
];

function fmtDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export default function JournalApp() {
  const [tab, setTab] = useState<"journal" | "prompts">("journal");
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const raw = localStorage.getItem("ios-sim-journal");
      return raw ? JSON.parse(raw) : SAMPLE;
    } catch {
      return SAMPLE;
    }
  });
  const [filter, setFilter] = useState<JournalEntry["mood"] | "all">("all");
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sorted = useMemo(() => [...entries].sort((a, b) => b.date - a.date), [entries]);
  const filtered = filter === "all" ? sorted : sorted.filter((e) => e.mood === filter);

  const save = (e: JournalEntry) => {
    const exists = entries.some((x) => x.id === e.id);
    const next = exists ? entries.map((x) => (x.id === e.id ? e : x)) : [e, ...entries];
    setEntries(next);
    try {
      localStorage.setItem("ios-sim-journal", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    sfx.pop();
    setEditing(null);
    setIsNew(false);
  };

  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    try {
      localStorage.setItem("ios-sim-journal", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setEditing(null);
  };

  const newEntry = (prompt?: string) => {
    setEditing({ id: uid(), date: Date.now(), mood: "good", text: "", tags: [], prompt });
    setIsNew(true);
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page
        title="Journal"
        right={
          <button className="text-ios-blue" onClick={() => newEntry()}>
            <Plus size={26} />
          </button>
        }
      >
        <div className="px-4 pb-2">
          <Segmented
            options={[{ id: "journal", label: "Journal" }, { id: "prompts", label: "Reflection Prompts" }]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            className="mb-3"
          />
        </div>

        {tab === "journal" ? (
          <>
            {/* Stats banner */}
            <div className="px-4 pb-1">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#5e5ce6] to-[#8e9bff] p-4 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium uppercase tracking-wider text-white/70">Writing Streak</div>
                    <div className="text-[28px] font-bold leading-tight">{Math.min(entries.length, 12)} days</div>
                  </div>
                  <Sparkles size={48} strokeWidth={1.4} className="opacity-60" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/20 pt-3">
                  <div>
                    <div className="text-[10px] uppercase text-white/60">Entries</div>
                    <div className="text-[15px] font-semibold">{entries.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-white/60">This Week</div>
                    <div className="text-[15px] font-semibold">{entries.filter((e) => Date.now() - e.date < 7 * 86400_000).length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-white/60">Avg Mood</div>
                    <div className="text-[15px] font-semibold">{(() => {
                      if (!entries.length) return "—";
                      const m = { great: 4, good: 3, ok: 2, down: 1 };
                      const avg = entries.reduce((a, e) => a + m[e.mood], 0) / entries.length;
                      return avg >= 3.5 ? "😄" : avg >= 2.5 ? "🙂" : avg >= 1.5 ? "😐" : "😔";
                    })()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mood filter */}
            <div className="flex items-center gap-2 px-4 py-2">
              <Filter size={14} className="text-ios-label2" />
              <Segmented
                options={[
                  { id: "all", label: "All" },
                  { id: "great", label: "😄" },
                  { id: "good", label: "🙂" },
                  { id: "ok", label: "😐" },
                  { id: "down", label: "😔" },
                ]}
                value={filter}
                onChange={(v) => setFilter(v as typeof filter)}
              />
            </div>

            {filtered.length === 0 ? (
              <Empty icon={Sparkles} title="No Entries Yet" text="Tap + to write your first reflection." />
            ) : (
              <Group>
                {filtered.map((e) => {
                  const mood = MOODS.find((m) => m.id === e.mood)!;
                  return (
                    <Row
                      key={e.id}
                      leading={<div className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]" style={{ background: mood.color + "22" }}>{mood.emoji}</div>}
                      title={<span className="text-[15px] font-medium">{e.prompt ?? fmtDate(e.date)}</span>}
                      subtitle={<span className="text-[13px] text-ios-label2 line-clamp-2">{e.text || "(empty)"}</span>}
                      value={fmtDate(e.date)}
                      chevron
                      onClick={() => { setEditing(e); setIsNew(false); }}
                    />
                  );
                })}
              </Group>
            )}
          </>
        ) : (
          <>
            <Group header="Today's Reflection Prompt">
              <div className="rounded-xl bg-ios-cell p-4">
                <div className="text-[16px] font-medium leading-snug">{PROMPTS[new Date().getDate() % PROMPTS.length]}</div>
                <button onClick={() => newEntry(PROMPTS[new Date().getDate() % PROMPTS.length])} className="mt-3 rounded-lg bg-ios-blue px-3 py-1.5 text-[14px] font-semibold text-white" style={{ background: "var(--ios-blue)" }}>
                  Write about this
                </button>
              </div>
            </Group>

            <Group header="All Prompts">
              {PROMPTS.map((p, i) => (
                <Row
                  key={i}
                  icon={Sparkles}
                  iconBg="#5e5ce6"
                  title={<span className="text-[15px] leading-snug">{p}</span>}
                  chevron
                  onClick={() => newEntry(p)}
                />
              ))}
            </Group>

            <Group header="Saved Prompts">
              <Row icon={Bookmark} iconBg="#ff9500" title="No saved prompts yet" subtitle="Bookmark prompts you love" />
            </Group>
          </>
        )}
      </Page>

      <Sheet open={!!editing} onClose={() => setEditing(null)} full>
        {editing && <Editor entry={editing} isNew={isNew} onSave={save} onDelete={remove} />}
      </Sheet>
    </div>
  );
}

function Editor({ entry, isNew, onSave, onDelete }: { entry: JournalEntry; isNew: boolean; onSave: (e: JournalEntry) => void; onDelete: (id: string) => void }) {
  const [e, setE] = useState<JournalEntry>(entry);
  const [tagInput, setTagInput] = useState("");

  return (
    <Page
      title={isNew ? "New Entry" : "Edit Entry"}
      large={false}
      left={<NavBtn onClick={() => onSave(e)}>Cancel</NavBtn>}
      right={<NavBtn bold onClick={() => onSave(e)}>Done</NavBtn>}
    >
      <div className="px-4">
        <div className="rounded-xl bg-ios-cell p-4">
          <div className="text-[12px] uppercase tracking-wider text-ios-label2">{fmtDate(e.date)}</div>
          <div className="mt-2 text-[15px] text-ios-label2">How are you feeling?</div>
          <div className="mt-2 flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setE({ ...e, mood: m.id })}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 active:scale-95"
                style={{ background: e.mood === m.id ? m.color + "33" : "transparent", border: e.mood === m.id ? `1.5px solid ${m.color}` : "1.5px solid transparent" }}
              >
                <span className="text-[26px]">{m.emoji}</span>
                <span className="text-[11px]" style={{ color: e.mood === m.id ? m.color : "var(--ios-label2)" }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {e.prompt && (
        <Group header="Prompt">
          <div className="rounded-xl bg-ios-cell p-4">
            <div className="text-[15px] italic leading-snug text-ios-label2">"{e.prompt}"</div>
          </div>
        </Group>
      )}

      <Group header="Your Reflection">
        <div className="rounded-xl bg-ios-cell p-3">
          <textarea
            value={e.text}
            onChange={(ev) => setE({ ...e, text: ev.target.value })}
            placeholder="Write freely…"
            rows={8}
            autoFocus={isNew}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-ios-label2"
          />
          <div className="flex flex-wrap items-center gap-1.5 border-t border-ios-sep pt-2">
            {e.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-ios-fill2 px-2 py-0.5 text-[12px] text-ios-label2" style={{ background: "var(--ios-fill)" }}>
                #{t}
                <button onClick={() => setE({ ...e, tags: e.tags.filter((x) => x !== t) })} className="opacity-60">×</button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(ev) => setTagInput(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && tagInput.trim()) {
                  setE({ ...e, tags: [...new Set([...e.tags, tagInput.trim().replace(/^#/, "")])] });
                  setTagInput("");
                }
              }}
              placeholder="#add"
              className="min-w-[60px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-ios-label2"
            />
          </div>
        </div>
      </Group>

      <Group>
        <Row icon={Star} iconBg="#ff9500" title="Bookmark this entry" right={<span className="text-ios-label2">Off</span>} />
        {!isNew && <Row title={<span className="text-ios-red">Delete Entry</span>} onClick={() => onDelete(e.id)} />}
      </Group>
    </Page>
  );
}
