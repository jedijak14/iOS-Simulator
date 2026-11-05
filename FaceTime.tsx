import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Mic, MicOff, Video, VideoOff, PhoneOff, Grid3x3, Plus, Phone as PhoneIcon, Search as SearchIcon, Users } from "lucide-react";
import { useData, newId, contactName, type Contact } from "../os/data";
import { useOS, useNow } from "../os/store";
import { useAppAction } from "../os/actions";
import { Avatar, Empty, Group, NavBtn, Page, Row, SearchField, TabBar, ScrollView } from "../os/ui";
import { sfx } from "../os/sound";
import { fmtClock } from "../os/utils";

interface FTCall {
  contactId: string;
  name: string;
  state: "calling" | "connected";
  startedAt: number;
  muted: boolean;
  videoOff: boolean;
}

const RECENT_KEY = "ios-sim-ft-recents";

function loadRecents(): { id: string; name: string; at: number; dir: "in" | "out" | "missed"; video: boolean }[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveRecents(r: { id: string; name: string; at: number; dir: "in" | "out" | "missed"; video: boolean }[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 60)));
  } catch {
    /* ignore */
  }
}

export function startFaceTime(contactId: string) {
  const c = useData.getState().contacts.find((x) => x.id === contactId);
  if (!c) return;
  useOS.getState().set({ ftCall: { contactId: c.id, name: contactName(c), state: "calling", startedAt: Date.now(), muted: false, videoOff: false } });
  sfx.ringback();
}

function CallScreen() {
  const ft = useOS((s) => s.ftCall) as FTCall | null;
  const set = useOS((s) => s.set);
  useNow(500);
  const [swapped, setSwapped] = useState(false);
  const selfRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // try to access camera for the small self preview
  useEffect(() => {
    if (!ft) return;
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (selfRef.current) selfRef.current.srcObject = stream;
      })
      .catch(() => {
        /* user denied — show gradient fallback */
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ft?.contactId, !!ft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ft || ft.state !== "calling") return;
    sfx.ringback();
    const id = setInterval(() => sfx.ringback(), 2500);
    return () => clearInterval(id);
  }, [ft?.state, !!ft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ft) {
      setSwapped(false);
    }
  }, [ft]);

  if (!ft) return null;
  const upd = (p: Partial<FTCall>) => set({ ftCall: { ...ft, ...p } });
  const secs = ft.state === "connected" ? (Date.now() - ft.startedAt) / 1000 : 0;
  const contact = useData.getState().contacts.find((c) => c.id === ft.contactId);

  const end = () => {
    const dur = ft.state === "connected" ? Math.round((Date.now() - ft.startedAt) / 1000) : 0;
    if (dur > 0) {
      const r = loadRecents();
      r.unshift({ id: newId(), name: ft.name, at: Date.now(), dir: "out", video: true });
      saveRecents(r);
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    set({ ftCall: null });
  };

  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col items-center text-white" style={{ background: "linear-gradient(180deg,#1a1a1f,#000)" }}>
      {/* Remote video (gradient avatar) */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(160deg, hsl(${contact?.hue ?? 200} 50% 30%), hsl(${(contact?.hue ?? 200) + 40} 60% 18%))` }}>
        <Avatar name={ft.name} hue={contact?.hue ?? 200} size={120} />
      </div>

      {/* Self preview */}
      <div className="absolute right-3 top-3 overflow-hidden rounded-2xl border border-white/30 bg-black/50 shadow-2xl" style={{ width: swapped ? "60%" : 90, height: swapped ? "60%" : 130, top: swapped ? "20%" : "calc(var(--safe-top) + 8px)", transition: "all .25s ease" }}>
        {ft.videoOff ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-white/60">Camera Off</div>
        ) : (
          <video ref={selfRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        )}
        <button onClick={() => setSwapped((s) => !s)} className="absolute right-1 top-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">⇄</button>
      </div>

      {/* Info */}
      <div className="relative z-10 mt-[calc(var(--safe-top)+24px)] flex flex-col items-center" style={{ opacity: swapped ? 0 : 1 }}>
        <div className="text-[28px] font-medium">{ft.name}</div>
        <div className="mt-1 text-[16px] text-white/70">
          {ft.state === "calling" ? (ft.videoOff ? "FaceTime Audio…" : "FaceTime…") : fmtClock(secs)}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-auto mb-[calc(var(--safe-bottom)+30px)] flex flex-col items-center gap-6">
        <div className="grid grid-cols-3 gap-x-10 gap-y-5">
          <button onClick={() => upd({ muted: !ft.muted })} className="flex flex-col items-center gap-1.5">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full" style={{ background: ft.muted ? "#fff" : "rgba(255,255,255,0.2)", color: ft.muted ? "#000" : "#fff" }}>
              {ft.muted ? <MicOff size={26} /> : <Mic size={26} />}
            </div>
            <span className="text-[12px]">{ft.muted ? "unmute" : "mute"}</span>
          </button>
          <button onClick={() => upd({ videoOff: !ft.videoOff })} className="flex flex-col items-center gap-1.5">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full" style={{ background: ft.videoOff ? "#fff" : "rgba(255,255,255,0.2)", color: ft.videoOff ? "#000" : "#fff" }}>
              {ft.videoOff ? <VideoOff size={26} /> : <Video size={26} />}
            </div>
            <span className="text-[12px]">{ft.videoOff ? "camera off" : "camera on"}</span>
          </button>
          <button onClick={() => useOS.getState().showToast("Keypad not available in FaceTime")} className="flex flex-col items-center gap-1.5">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-white/20 text-white">
              <Grid3x3 size={24} />
            </div>
            <span className="text-[12px]">keypad</span>
          </button>
        </div>
        <button onClick={end} className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#ff3b30] active:brightness-90">
          <PhoneOff size={28} fill="#fff" />
        </button>
      </div>
    </div>
  );
}

type Tab = "recents" | "contacts";

export default function FaceTimeApp() {
  const [tab, setTab] = useState<Tab>("recents");
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState(loadRecents);
  const contacts = useData((s) => s.contacts);
  const ft = useOS((s) => s.ftCall) as FTCall | null;
  const prev = useRef(ft);

  useEffect(() => {
    const p = prev.current;
    if (p && !ft) setRecents(loadRecents());
    prev.current = ft;
  }, [ft]);

  useAppAction("facetime", (a) => {
    if (a.startsWith("to:")) {
      const id = a.slice(3);
      startFaceTime(id);
    }
  });

  // simulate the recipient picking up after a few seconds
  useEffect(() => {
    if (!ft || ft.state !== "calling") return;
    const t = setTimeout(() => {
      const cur = useOS.getState().ftCall as FTCall | null;
      if (cur && cur.state === "calling" && cur.contactId === ft.contactId) {
        useOS.getState().set({ ftCall: { ...cur, state: "connected", startedAt: Date.now() } });
        // also simulate them hanging up after 25-45s
        const t2 = setTimeout(() => {
          const c2 = useOS.getState().ftCall as FTCall | null;
          if (c2 && c2.state === "connected") {
            useOS.getState().showToast(`${ft.name} ended the call`);
            useOS.getState().set({ ftCall: null });
          }
        }, 25000 + Math.random() * 20000);
        return () => clearTimeout(t2);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [ft?.contactId, ft?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...contacts].sort((a, b) => contactName(a).localeCompare(contactName(b)));
  const filtered = sorted.filter((c) => contactName(c).toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));
  const letters = Array.from(new Set(filtered.map((c) => contactName(c)[0]?.toUpperCase() ?? "?")));

  const startFromContact = (c: Contact) => {
    startFaceTime(c.id);
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          {tab === "recents" && (
            <Page
              title="FaceTime"
              right={
                <button className="text-ios-blue" onClick={() => setTab("contacts")}>
                  <Plus size={26} />
                </button>
              }
            >
              <Group>
                {recents.length === 0 && <Empty icon={Video} title="No FaceTime Calls" text="Start a FaceTime from your contacts." />}
                {recents.map((r) => (
                  <Row
                    key={r.id}
                    leading={<Avatar name={r.name} hue={useData.getState().contacts.find((c) => contactName(c) === r.name)?.hue ?? 200} size={36} />}
                    title={r.name}
                    subtitle={r.video ? "FaceTime Video" : "FaceTime Audio"}
                    right={<Video size={20} className="text-ios-blue" />}
                    onClick={() => {
                      const c = useData.getState().contacts.find((x) => contactName(x) === r.name);
                      if (c) startFaceTime(c.id);
                    }}
                  />
                ))}
              </Group>
            </Page>
          )}
          {tab === "contacts" && (
            <Page title="Contacts" left={<NavBtn onClick={() => setTab("recents")}><ChevronLeft size={24} className="-ml-2" />Back</NavBtn>}>
              <div className="px-4 pb-3">
                <SearchField value={q} onChange={setQ} />
              </div>
              {filtered.length === 0 && <Empty icon={SearchIcon} title="No Results" />}
              {letters.map((l) => (
                <Group key={l} header={l}>
                  {filtered
                    .filter((c) => (contactName(c)[0]?.toUpperCase() ?? "?") === l)
                    .map((c) => (
                      <Row
                        key={c.id}
                        leading={<Avatar name={contactName(c)} hue={c.hue} size={36} />}
                        title={contactName(c)}
                        right={
                          <button onClick={(e) => { e.stopPropagation(); startFromContact(c); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-green text-white">
                            <Video size={18} />
                          </button>
                        }
                        onClick={() => startFromContact(c)}
                      />
                    ))}
                </Group>
              ))}
            </Page>
          )}
        </div>
        <TabBar
          tabs={[
            { id: "recents", label: "Recents", icon: PhoneIcon },
            { id: "contacts", label: "Contacts", icon: Users, fill: true },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <CallScreen />
      <span className="hidden"><ScrollView>{null}</ScrollView></span>
    </div>
  );
}
