import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pin, PinOff, Share, SquarePen, StickyNote, Trash2 } from "lucide-react";
import { useData, patchData, newId, type Note } from "../os/data";
import { Empty, Group, NavBtn, Page, SearchField, SwipeRow } from "../os/ui";
import { useAppAction } from "../os/actions";
import { useOS } from "../os/store";

function groupLabel(at: number) {
  const d = (Date.now() - at) / 86400000;
  return d < 1 ? "Today" : d < 2 ? "Yesterday" : d < 7 ? "Previous 7 Days" : d < 30 ? "Previous 30 Days" : "Older";
}
function when(at: number) {
  const d = new Date(at);
  const diff = (Date.now() - at) / 86400000;
  if (diff < 1) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
}

function Editor({ note, onBack }: { note: Note; onBack: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 480) + "px";
  };
  useEffect(fit, [note.text]);
  useEffect(() => {
    if (!note.text) setTimeout(() => ref.current?.focus(), 380);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (text: string) => patchData((s) => ({ notes: s.notes.map((n) => (n.id === note.id ? { ...n, text, at: Date.now() } : n)) }));
  const del = () => {
    patchData((s) => ({ notes: s.notes.filter((n) => n.id !== note.id) }));
    onBack();
  };
  return (
    <Page
      title={note.text.split("\n")[0] || "New Note"}
      large={false}
      left={
        <NavBtn onClick={onBack}>
          <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
          <span className="-ml-1">Notes</span>
        </NavBtn>
      }
      right={
        focused ? (
          <NavBtn bold onClick={() => ref.current?.blur()}>
            Done
          </NavBtn>
        ) : (
          <>
            <button
              className="text-ios-blue"
              onClick={() => {
                void navigator.clipboard?.writeText(note.text).catch(() => undefined);
                useOS.getState().showToast("Note copied to clipboard");
              }}
            >
              <Share size={22} />
            </button>
            <button className="text-ios-blue" onClick={del}>
              <Trash2 size={22} />
            </button>
          </>
        )
      }
      bg="bg-ios-bg"
    >
      <div className="px-5 pb-6 pt-2">
        <div className="mb-2 text-center text-[12px] text-ios-label2">{new Date(note.at).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}</div>
        <textarea
          ref={ref}
          value={note.text}
          onChange={(e) => update(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (!ref.current?.value.trim()) del();
          }}
          placeholder="Start typing…"
          className="block w-full resize-none overflow-hidden bg-transparent text-[17px] leading-[24px] outline-none"
        />
      </div>
    </Page>
  );
}

export default function NotesApp() {
  const notes = useData((s) => s.notes);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const create = () => {
    const n: Note = { id: newId(), text: "", at: Date.now(), pinned: false, folder: "Notes" };
    patchData((s) => ({ notes: [n, ...s.notes] }));
    setOpenId(n.id);
  };
  useAppAction("notes", (a) => {
    if (a === "new") create();
    else if (a.startsWith("open:")) setOpenId(a.slice(5));
  });

  const filtered = notes.filter((n) => n.text.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.at - a.at);
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);
  const groups: Record<string, Note[]> = {};
  rest.forEach((n) => (groups[groupLabel(n.at)] ||= []).push(n));
  const cur = notes.find((n) => n.id === openId);

  const row = (n: Note) => {
    const [title, ...body] = n.text.split("\n");
    return (
      <SwipeRow
        key={n.id}
        actions={[
          { label: n.pinned ? "Unpin" : "Pin", color: "var(--ios-orange)", onPress: () => patchData((s) => ({ notes: s.notes.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)) })) },
          { label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ notes: s.notes.filter((x) => x.id !== n.id) })) },
        ]}
      >
        <div className="ios-row px-4 py-2.5 active:bg-ios-fill" onClick={() => setOpenId(n.id)}>
          <div className="truncate text-[17px] font-semibold">{title || "New Note"}</div>
          <div className="flex gap-2 text-[15px] text-ios-label2">
            <span className="shrink-0">{when(n.at)}</span>
            <span className="truncate">{body.join(" ").trim() || "No additional text"}</span>
          </div>
        </div>
      </SwipeRow>
    );
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <div className="absolute inset-0" style={{ transform: cur ? "translateX(-30%)" : "none", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", filter: cur ? "brightness(.92)" : undefined }}>
        <Page
          title="Notes"
          right={<span className="text-[15px] text-ios-label2">{notes.length}</span>}
          footer={
            <div className="glass relative z-20 flex items-center justify-between px-5 pt-2.5" style={{ borderTop: "0.5px solid var(--ios-sep)", paddingBottom: "calc(var(--safe-bottom) + 6px)" }}>
              <span className="w-8" />
              <span className="text-[11px] text-ios-label2">{notes.length} Note{notes.length === 1 ? "" : "s"}</span>
              <button onClick={create} className="text-ios-orange">
                <SquarePen size={24} />
              </button>
            </div>
          }
        >
          <div className="px-4 pb-3">
            <SearchField value={q} onChange={setQ} />
          </div>
          {notes.length === 0 && <Empty icon={StickyNote} title="No Notes" text="Tap the compose button to create a note." />}
          {pinned.length > 0 && (
            <Group header={<span className="flex items-center gap-1"><Pin size={12} /> Pinned</span>}>{pinned.map(row)}</Group>
          )}
          {Object.entries(groups).map(([g, list]) => (
            <Group key={g} header={g}>
              {list.map(row)}
            </Group>
          ))}
          <span className="hidden"><PinOff size={1} /></span>
        </Page>
      </div>
      <div className="absolute inset-0" style={{ transform: cur ? "none" : "translateX(100%)", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", boxShadow: "-6px 0 18px rgba(0,0,0,.12)" }}>
        {cur && <Editor key={cur.id} note={cur} onBack={() => setOpenId(null)} />}
      </div>
    </div>
  );
}
