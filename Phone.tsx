import { useEffect, useRef, useState } from "react";
import { Delete, Grid3x3, Mail as MailIcon, MessageCircle, Mic, MicOff, Phone as PhoneIcon, PhoneOff, Plus, Star, Users, Video, Volume2, Clock, Voicemail, UserPlus, ChevronLeft } from "lucide-react";
import { useOS, useNow } from "../os/store";
import { useData, patchData, newId, contactName, findContactByNumber, formatPhone, type Contact } from "../os/data";
import { Avatar, Empty, Group, NavBtn, Page, Row, SearchField, Sheet, SwipeRow, TabBar, ScrollView } from "../os/ui";
import { sfx } from "../os/sound";
import { fmtClock } from "../os/utils";
import { useAppAction, sendAction } from "../os/actions";

type Tab = "favorites" | "recents" | "contacts" | "keypad" | "voicemail";
const LETTERS: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ", "0": "+" };

export function callNumber(number: string, name?: string) {
  const c = findContactByNumber(number);
  useOS.getState().startCall(name ?? (c ? contactName(c) : formatPhone(number)), c?.phone ?? formatPhone(number));
  sfx.ringback();
}

function CallScreen() {
  const call = useOS((s) => s.call);
  const set = useOS((s) => s.set);
  useNow(500);
  const [pad, setPad] = useState("");
  useEffect(() => {
    if (!call || call.state !== "calling") return;
    sfx.ringback();
    const id = setInterval(() => sfx.ringback(), 2500);
    return () => clearInterval(id);
  }, [call?.state, !!call]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!call) setPad("");
  }, [call]);
  if (!call) return null;
  const upd = (p: Partial<typeof call>) => set({ call: { ...call, ...p } });
  const secs = call.state === "connected" ? (Date.now() - call.startedAt) / 1000 : 0;
  const Btn = ({ icon: Icon, label, on, onClick }: { icon: typeof Mic; label: string; on?: boolean; onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full transition-colors" style={{ background: on ? "#fff" : "rgba(255,255,255,0.2)", color: on ? "#000" : "#fff" }}>
        <Icon size={30} />
      </div>
      <span className="text-[13px]">{label}</span>
    </button>
  );
  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col items-center text-white" style={{ background: "linear-gradient(180deg,#4a5568,#1a202c)", paddingTop: "calc(var(--safe-top) + 30px)", paddingBottom: "calc(var(--safe-bottom) + 30px)" }}>
      <div className="text-[34px] font-medium">{call.name}</div>
      <div className="mt-1 text-[18px] text-white/70 tabular-nums">{call.state === "calling" ? "calling…" : fmtClock(secs)}</div>
      {call.keypad ? (
        <div className="mt-6 flex w-full flex-1 flex-col items-center">
          <div className="h-10 text-[32px] tracking-widest">{pad}</div>
          <div className="mt-2 grid grid-cols-3 gap-x-5 gap-y-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
              <button key={k} onPointerDown={() => { sfx.dtmf(k); setPad((p) => (p + k).slice(-14)); }} className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-white/20 active:bg-white/50">
                <span className="text-[32px] leading-none">{k}</span>
              </button>
            ))}
          </div>
          <button onClick={() => upd({ keypad: false })} className="mt-4 text-[17px]">Hide</button>
        </div>
      ) : (
        <div className="mt-14 grid grid-cols-3 gap-x-8 gap-y-6">
          <Btn icon={call.muted ? MicOff : Mic} label="mute" on={call.muted} onClick={() => upd({ muted: !call.muted })} />
          <Btn icon={Grid3x3} label="keypad" onClick={() => upd({ keypad: true })} />
          <Btn icon={Volume2} label="speaker" on={call.speaker} onClick={() => upd({ speaker: !call.speaker })} />
          <Btn icon={Plus} label="add call" onClick={() => useOS.getState().showToast("Add Call isn't available in the simulator")} />
          <Btn icon={Video} label="FaceTime" onClick={() => useOS.getState().showToast("FaceTime isn't available in the simulator")} />
          <Btn icon={Users} label="contacts" onClick={() => { useOS.getState().showToast("Returned to Contacts"); }} />
        </div>
      )}
      <div className="mt-auto" />
      <button onClick={() => useOS.getState().endCall()} className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[#ff3b30] active:brightness-90">
        <PhoneOff size={32} fill="#fff" />
      </button>
    </div>
  );
}

function ContactSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const c = useData((s) => s.contacts.find((x) => x.id === id));
  const last = useRef<Contact | undefined>(undefined);
  if (c) last.current = c;
  const cc = c ?? last.current;
  return (
    <Sheet open={!!id && !!c} onClose={onClose} height="calc(100% - var(--safe-top) - 10px)">
      {cc && (
        <Page title="" large={false} left={<NavBtn onClick={onClose}><ChevronLeft size={24} className="-ml-2" />Contacts</NavBtn>} right={<NavBtn onClick={() => patchData((s) => ({ contacts: s.contacts.map((x) => (x.id === cc.id ? { ...x, fav: !x.fav } : x)) }))}><Star size={22} fill={cc.fav ? "currentColor" : "none"} /></NavBtn>}>
          <div className="flex flex-col items-center pt-2">
            <Avatar name={contactName(cc)} hue={cc.hue} size={96} />
            <div className="mt-3 text-[28px] font-semibold">{contactName(cc)}</div>
            <div className="mt-4 flex gap-3">
              {[
                { icon: MessageCircle, label: "message", run: () => { onClose(); useOS.getState().openApp("messages"); sendAction("messages", "to:" + cc.id); } },
                { icon: PhoneIcon, label: "call", run: () => { onClose(); callNumber(cc.phone, contactName(cc)); } },
                { icon: Video, label: "video", run: () => useOS.getState().showToast("FaceTime isn't available in the simulator") },
                { icon: MailIcon, label: "mail", run: () => { onClose(); useOS.getState().openApp("mail"); sendAction("mail", "to:" + cc.email); } },
              ].map((b) => (
                <button key={b.label} onClick={b.run} className="flex h-[62px] w-[74px] flex-col items-center justify-center gap-1 rounded-[12px] bg-ios-cell text-ios-blue active:opacity-60">
                  <b.icon size={22} />
                  <span className="text-[11px]">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <Group>
              <Row title={<span className="text-[13px] text-ios-label2">mobile</span>} subtitle={<span className="text-[17px] text-ios-blue">{cc.phone}</span>} onClick={() => { onClose(); callNumber(cc.phone, contactName(cc)); }} />
              {cc.email && <Row title={<span className="text-[13px] text-ios-label2">email</span>} subtitle={<span className="text-[17px] text-ios-blue">{cc.email}</span>} />}
            </Group>
            <Group>
              <Row title={<span className="text-ios-red">Delete Contact</span>} onClick={() => { patchData((s) => ({ contacts: s.contacts.filter((x) => x.id !== cc.id) })); onClose(); }} />
            </Group>
          </div>
        </Page>
      )}
    </Sheet>
  );
}

export default function PhoneApp() {
  const [tab, setTab] = useState<Tab>("keypad");
  const [num, setNum] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [newC, setNewC] = useState(false);
  const [f, setF] = useState({ first: "", last: "", phone: "", email: "" });
  const contacts = useData((s) => s.contacts);
  const calls = useData((s) => s.calls);
  const call = useOS((s) => s.call);
  const prev = useRef(call);

  useEffect(() => {
    const p = prev.current;
    if (p && !call) {
      const dur = p.state === "connected" ? Math.round((Date.now() - p.startedAt) / 1000) : 0;
      patchData((s) => ({ calls: [{ id: newId(), name: p.name, number: p.number, at: Date.now(), dir: "out" as const, dur }, ...s.calls].slice(0, 60) }));
    }
    prev.current = call;
  }, [call]);

  useAppAction("phone", (a) => {
    if (a === "keypad") setTab("keypad");
    else if (a === "recents") setTab("recents");
    else if (a.startsWith("contact:")) {
      setTab("contacts");
      setDetail(a.slice(8));
    }
  });

  const press = (k: string) => {
    sfx.dtmf(k);
    setNum((n) => (n + k).slice(0, 15));
  };
  const lp = useRef(0);
  const sorted = [...contacts].sort((a, b) => contactName(a).localeCompare(contactName(b)));
  const filtered = sorted.filter((c) => contactName(c).toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  const letters = Array.from(new Set(filtered.map((c) => contactName(c)[0].toUpperCase())));
  const dial = formatPhone(num);
  const match = findContactByNumber(num);

  const rowOfContact = (c: Contact) => (
    <Row key={c.id} leading={<Avatar name={contactName(c)} hue={c.hue} size={36} />} title={contactName(c)} onClick={() => setDetail(c.id)} />
  );

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          {tab === "keypad" && (
            <div className="flex h-full flex-col items-center bg-ios-bg" style={{ paddingTop: "calc(var(--safe-top) + 20px)" }}>
              <div className="flex h-[70px] w-full flex-col items-center justify-end px-6">
                <div className="max-w-full truncate text-[38px] font-light tracking-tight">{dial}</div>
                <div className="h-5 text-[14px] text-ios-label2">{match ? contactName(match) : num ? "Add Number" : ""}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => (
                  <button
                    key={k}
                    onPointerDown={() => {
                      if (k === "0") lp.current = window.setTimeout(() => { setNum((n) => n.slice(0, -1) + "+"); lp.current = -1; }, 500);
                      else press(k);
                    }}
                    onPointerUp={() => {
                      if (k === "0") {
                        if (lp.current === -1) { lp.current = 0; return; }
                        window.clearTimeout(lp.current);
                        press("0");
                      }
                    }}
                    onPointerLeave={() => k === "0" && window.clearTimeout(lp.current)}
                    className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-ios-fill2/60 active:bg-ios-fill2"
                    style={{ background: "var(--ios-fill)" }}
                  >
                    <span className="text-[34px] font-light leading-[34px]">{k}</span>
                    <span className="h-3 text-[10px] font-semibold tracking-[2px]">{LETTERS[k] ?? ""}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex w-[270px] items-center justify-center">
                <div className="w-[78px]" />
                <button
                  disabled={!num}
                  onClick={() => callNumber(num)}
                  className="mx-[24px] flex h-[78px] w-[78px] items-center justify-center rounded-full bg-ios-green text-white disabled:opacity-40 active:brightness-90"
                >
                  <PhoneIcon size={32} fill="#fff" />
                </button>
                <button onClick={() => setNum((n) => n.slice(0, -1))} className="flex h-[78px] w-[78px] items-center justify-center text-ios-label2" style={{ opacity: num ? 1 : 0 }}>
                  <Delete size={30} />
                </button>
              </div>
            </div>
          )}
          {tab === "favorites" && (
            <Page title="Favorites" right={<button className="text-ios-blue" onClick={() => setTab("contacts")}><Plus size={26} /></button>}>
              <Group>
                {contacts.filter((c) => c.fav).map((c) => (
                  <Row key={c.id} leading={<Avatar name={contactName(c)} hue={c.hue} size={36} />} title={contactName(c)} subtitle="mobile" right={<PhoneIcon size={20} className="text-ios-blue" />} onClick={() => callNumber(c.phone, contactName(c))} />
                ))}
                {contacts.every((c) => !c.fav) && <Empty icon={Star} title="No Favorites" text="Star a contact to add them here." />}
              </Group>
            </Page>
          )}
          {tab === "recents" && (
            <Page title="Recents">
              <Group>
                {calls.map((c) => (
                  <SwipeRow key={c.id} actions={[{ label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ calls: s.calls.filter((x) => x.id !== c.id) })) }]}>
                    <div className="ios-row flex items-center gap-3 px-4 py-2 active:bg-ios-fill" onClick={() => callNumber(c.number, c.name)}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-medium" style={{ color: c.dir === "missed" ? "var(--ios-red)" : undefined }}>{c.name}</div>
                        <div className="text-[13px] text-ios-label2">{c.dir === "missed" ? "missed" : c.dir === "in" ? "incoming" : "outgoing"}{c.dur ? ` · ${fmtClock(c.dur)}` : ""}</div>
                      </div>
                      <div className="text-[15px] text-ios-label2">{new Date(c.at).toLocaleDateString([], { month: "numeric", day: "numeric" })}</div>
                    </div>
                  </SwipeRow>
                ))}
                {calls.length === 0 && <Empty icon={Clock} title="No Recents" />}
              </Group>
            </Page>
          )}
          {tab === "contacts" && (
            <Page title="Contacts" right={<button className="text-ios-blue" onClick={() => { setF({ first: "", last: "", phone: "", email: "" }); setNewC(true); }}><UserPlus size={24} /></button>}>
              <div className="px-4 pb-3"><SearchField value={q} onChange={setQ} /></div>
              {letters.map((l) => (
                <Group key={l} header={l}>
                  {filtered.filter((c) => contactName(c)[0].toUpperCase() === l).map(rowOfContact)}
                </Group>
              ))}
              {filtered.length === 0 && <Empty icon={Users} title="No Results" />}
            </Page>
          )}
          {tab === "voicemail" && (
            <Page title="Voicemail">
              <Empty icon={Voicemail} title="No Voicemail" text="Voicemail messages will appear here." />
            </Page>
          )}
        </div>
        <TabBar
          tabs={[
            { id: "favorites", label: "Favorites", icon: Star, fill: true },
            { id: "recents", label: "Recents", icon: Clock },
            { id: "contacts", label: "Contacts", icon: Users, fill: true },
            { id: "keypad", label: "Keypad", icon: Grid3x3 },
            { id: "voicemail", label: "Voicemail", icon: Voicemail },
          ]}
          value={tab}
          onChange={setTab}
          badge={{ recents: calls.filter((c) => c.dir === "missed").length ? 1 : 0 }}
        />
      </div>
      <ContactSheet id={detail} onClose={() => setDetail(null)} />
      <Sheet open={newC} onClose={() => setNewC(false)} height="70%">
        <Page title="New Contact" large={false} left={<NavBtn onClick={() => setNewC(false)}>Cancel</NavBtn>} right={
          <NavBtn bold disabled={!f.first && !f.last} onClick={() => { patchData((s) => ({ contacts: [...s.contacts, { id: newId(), first: f.first, last: f.last, phone: formatPhone(f.phone), email: f.email, fav: false, hue: Math.floor(Math.random() * 360) }] })); setNewC(false); }}>Done</NavBtn>
        }>
          <div className="pt-4">
            <Group>
              {(["first", "last", "phone", "email"] as const).map((k) => (
                <input key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={{ first: "First name", last: "Last name", phone: "Phone", email: "Email" }[k]} type={k === "phone" ? "tel" : k === "email" ? "email" : "text"} autoCapitalize={k === "email" ? "off" : "words"} className="ios-row block w-full bg-transparent px-4 py-3 text-[17px] outline-none" />
              ))}
            </Group>
          </div>
        </Page>
      </Sheet>
      <CallScreen />
      <span className="hidden"><ScrollView>{null}</ScrollView></span>
    </div>
  );
}
