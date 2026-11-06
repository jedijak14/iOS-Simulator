import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, Plus, SquarePen, Camera, Settings2 } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData, newId, contactName, type Thread, type Msg, type Contact } from "../os/data";
import { Avatar, Group, NavBtn, Page, SearchField, SwipeRow, ScrollView } from "../os/ui";
import { sfx } from "../os/sound";
import { useAppAction } from "../os/actions";
import { relTime } from "../os/utils";
import { getLocalAIState, subscribeLocalAI, loadLocalAI, localAIReply, isLocalAIEnabled, setLocalAIEnabled } from "../os/localAI";

type AIConfig = { enabled: boolean };
const DEFAULT_PERSONALITIES: Record<string, string> = {
  c1: "Warm, caring and supportive. Checks in on family, speaks affectionately, and occasionally uses a heart emoji.",
  c2: "Upbeat, adventurous and reliable. Loves hiking and making plans; replies casually and with enthusiasm.",
  c3: "Witty, creative and sociable. Enjoys trying new restaurants, lighthearted jokes and thoughtful questions.",
  c4: "Thoughtful, concise and detail-oriented. A friendly designer who likes clear plans and practical feedback.",
  c5: "Curious, optimistic and thoughtful. Enjoys learning new things and encourages friends.",
  c6: "Easygoing, playful and outgoing. Loves food, weekend adventures and friendly banter.",
  c7: "Professional, kind and clear. Offers practical scheduling help without giving medical advice.",
  c8: "Friendly and enthusiastic about pizza. Helps with food-related questions in a welcoming tone.",
};
const GENERIC_PERSONALITIES = [
  "Friendly, cheerful and curious. Likes getting to know people and asks thoughtful follow-up questions.",
  "Calm, considerate and supportive. Listens carefully and replies with warmth.",
  "Playful, witty and sociable. Keeps replies light, natural and encouraging.",
  "Practical, thoughtful and dependable. Prefers clear and concise replies.",
];
function personalityOf(c: Contact): string {
  const hash = [...c.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return c.personality?.trim() || DEFAULT_PERSONALITIES[c.id] || GENERIC_PERSONALITIES[hash % GENERIC_PERSONALITIES.length];
}
// Offline replies are scripted and clearly identified as such, not represented as AI.
function scriptedReply(text: string, contact: Contact): string {
  const variants = [
    [/\b(hi|hello|hey|yo)\b/i, ["Hey! How's your day going?", "Hi there! It's good to hear from you.", "Hey you! What's new?", "Hello! How can I help?"]],
    [/thank|thx/i, ["Of course! Anytime 😊", "You're very welcome.", "Anytime, friend!", "Happy to help."]],
    [/\?/, ["Good question! What do you think?", "Let me think about that. What matters most to you?", "Ooh, good question! Tell me more.", "I'm not sure yet. What are the details?"]],
  ] as const;
  const hash = [...contact.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const style = contact.id === "c1" ? 1 : contact.id === "c2" ? 0 : contact.id === "c3" ? 2 : contact.id === "c4" ? 3 : hash % 4;
  for (const [re, opts] of variants) if (re.test(text)) return opts[style];
  return ["That sounds great! Tell me more 😊", "I'm here for you. Tell me more.", "I love that! What happened next?", "Got it. Thanks for letting me know."][style];
}

function Bubble({ m, mine, name, showName, tailless }: { m: Msg; mine: boolean; name?: string; showName: boolean; tailless?: boolean }) {
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      {showName && !mine && <div className="mb-0.5 ml-3 text-[11px] text-ios-label2">{name}</div>}
      <div
        className="max-w-[75%] whitespace-pre-wrap break-words px-[13px] py-[7px] text-[17px] leading-[22px]"
        style={{
          background: mine ? (m.sms ? "var(--ios-green)" : "var(--ios-blue)") : "var(--ios-fill2)",
          color: mine ? "#fff" : "var(--ios-label)",
          borderRadius: 18,
          borderBottomRightRadius: mine && !tailless ? 5 : 18,
          borderBottomLeftRadius: !mine && !tailless ? 5 : 18,
        }}
      >
        {m.text}
      </div>
    </div>
  );
}

function ThreadView({ id, onBack, ai, setAI }: { id: string; onBack: () => void; ai: AIConfig; setAI: React.Dispatch<React.SetStateAction<AIConfig>> }) {
  const t = useData((s) => s.threads.find((x) => x.id === id));
  const contacts = useData((s) => s.contacts);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [aiSettings, setAiSettings] = useState(false);
  const [selectedContact, setSelectedContact] = useState("");
  const [aiStatus, setAIStatus] = useState(getLocalAIState);
  useEffect(() => subscribeLocalAI(setAIStatus), []);
  const aiAbort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); aiAbort.current?.abort(); }, []);
  useEffect(() => {
    patchData((s) => ({ threads: s.threads.map((x) => (x.id === id ? { ...x, unread: 0 } : x)) }));
  }, [id, t?.msgs.length]);
  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ block: "end" }), 30);
  }, [t?.msgs.length, typing]);
  if (!t) return null;
  const mem = t.members.map((m) => contacts.find((c) => c.id === m)).filter((c): c is Contact => Boolean(c));
  const title = t.name ?? (mem.length ? contactName(mem[0]) : "New Message");
  const nameOf = (id: string) => contactName(contacts.find((c) => c.id === id));

  const send = () => {
    const v = text.trim();
    if (!v || typing) return;
    sfx.send();
    const m: Msg = { id: newId(), from: "me", text: v, at: Date.now(), sms: t.sms };
    patchData((s) => ({ threads: s.threads.map((x) => (x.id === id ? { ...x, msgs: [...x.msgs, m] } : x)) }));
    setText("");
    // Messages are local simulations, never sent to the contact. AI is explicitly opt-in.
    const members = t.members.filter((member) => contacts.some((c) => c.id === member));
    const priorReplies = t.msgs.filter((message) => members.includes(message.from)).length;
    const from = members[priorReplies % members.length];
    const responder = contacts.find((c) => c.id === from);
    if (!responder) return;
    const deliver = (answer: string) => {
      setTyping(false);
      const r: Msg = { id: newId(), from, text: answer, at: Date.now(), sms: t.sms };
      const viewing = useOS.getState().foreground === "messages" && document.querySelector(`[data-thread="${id}"]`) !== null;
      patchData((s) => ({ threads: s.threads.map((x) => (x.id === id ? { ...x, msgs: [...x.msgs, r], unread: viewing ? 0 : x.unread + 1 } : x)) }));
      if (viewing) sfx.receive(); else useOS.getState().notify({ app: "messages", title: t.name ?? nameOf(from), body: r.text });
    };
    if (ai.enabled) {
      setTyping(true);
      const controller = new AbortController(); aiAbort.current = controller;
      const history = [...t.msgs, m].slice(-8).map((item) => ({ role: item.from === "me" ? "user" as const : "assistant" as const, content: item.from === "me" ? item.text.slice(0, 400) : `${nameOf(item.from)}: ${item.text.slice(0, 400)}` }));
      const system = `You are a fictional simulated messaging contact named ${contactName(responder)} in ${t.members.length > 1 ? `a group conversation called ${title}` : "a private conversation"}. Your personality: ${personalityOf(responder)}. Respond only as ${contactName(responder)}, naturally and briefly, without a name prefix. Do not claim to be a real person. Other participants in the history are identified by name.`;
      void localAIReply([{ role: "system", content: system }, ...history], controller.signal)
        .then(deliver)
        .catch((error: Error) => { setTyping(false); if (!controller.signal.aborted) useOS.getState().showToast(error.message === "AI is busy" ? "AI is busy with another reply" : "AI reply failed. Check the model in conversation settings."); })
        .finally(() => { if (aiAbort.current === controller) aiAbort.current = null; });
    } else {
      setTyping(true);
      timers.current.push(window.setTimeout(() => deliver(scriptedReply(v, responder)), 1800));
    }
  };

  const lastMine = [...t.msgs].reverse().find((m) => m.from === "me");
  return (
    <div className="relative flex h-full flex-col bg-ios-bg" data-thread={id}>
      <div className="glass absolute inset-x-0 top-0 z-20 flex items-end justify-between px-2 pb-1.5" style={{ height: "calc(var(--safe-top) + 62px)", borderBottom: "0.5px solid var(--ios-sep)" }}>
        <NavBtn onClick={() => { aiAbort.current?.abort(); onBack(); }}>
          <ChevronLeft size={28} strokeWidth={2.4} className="-ml-1" />
        </NavBtn>
        <div className="flex flex-col items-center pb-0.5">
          <Avatar name={title} hue={mem[0]?.hue ?? 210} size={36} />
          <div className="mt-0.5 flex items-center text-[11px]">{title} · {ai.enabled ? "AI" : "scripted"} <ChevronLeft size={10} className="rotate-180 text-ios-label3" /></div>
        </div>
        <NavBtn onClick={() => { setSelectedContact(t.members[0] || ""); setAiSettings(true); }}><Settings2 size={22} /></NavBtn>
      </div>
      <ScrollView ref={scroller} className="min-h-0 flex-1 px-3">
        <div style={{ height: "calc(var(--safe-top) + 70px)" }} />
        <div className="space-y-[3px] pb-2">
          {t.msgs.map((m, i) => {
            const prev = t.msgs[i - 1];
            const next = t.msgs[i + 1];
            const gap = !prev || m.at - prev.at > 3600_000;
            const mine = m.from === "me";
            const lastOfRun = !next || next.from !== m.from || next.at - m.at > 3600_000;
            return (
              <div key={m.id}>
                {gap && (
                  <div className="py-2 text-center text-[11px] font-medium text-ios-label2">
                    {new Date(m.at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                  </div>
                )}
                <Bubble m={m} mine={mine} name={nameOf(m.from)} showName={t.members.length > 1 && (!prev || prev.from !== m.from || gap)} tailless={!lastOfRun} />
                {mine && lastMine?.id === m.id && <div className="mr-1 mt-0.5 text-right text-[11px] font-medium text-ios-label2">Saved locally</div>}
              </div>
            );
          })}
          {typing && (
            <div className="flex">
              <div className="flex gap-1 rounded-[18px] bg-ios-fill2 px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot h-[8px] w-[8px] rounded-full bg-ios-gray" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollView>
      {aiSettings && <div className="absolute inset-0 z-40 flex items-end bg-black/45" onClick={() => setAiSettings(false)}><div onClick={(e) => e.stopPropagation()} className="max-h-[85%] w-full overflow-y-auto rounded-t-[28px] bg-ios-bg p-5 text-ios-label" style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-bold">Conversation personalities</h2><button onClick={() => setAiSettings(false)} className="text-ios-blue">Done</button></div>
        <p className="mb-3 text-sm text-ios-label2">These are fictional conversations, not messages from real people. Personalities stay on this browser.</p>
        {mem.length > 0 && <><label className="mb-1 block text-sm font-semibold" htmlFor="persona-contact">Contact</label><select id="persona-contact" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)} className="mb-3 w-full rounded-xl bg-ios-fill p-3">{mem.map((c) => <option key={c.id} value={c.id}>{contactName(c)}</option>)}</select>{mem.filter((c) => c.id === selectedContact).map((c) => <div key={c.id}><label htmlFor="persona-description" className="mb-1 block text-sm font-semibold">Personality for {contactName(c)}</label><textarea id="persona-description" aria-label="Personality" maxLength={600} value={c.personality ?? personalityOf(c)} onChange={(e) => { const personality = e.target.value; patchData((s) => ({ contacts: s.contacts.map((x) => x.id === c.id ? { ...x, personality } : x) })); }} rows={3} className="mb-2 w-full resize-none rounded-xl bg-ios-fill p-3 text-sm outline-none"/><button onClick={() => patchData((s) => ({ contacts: s.contacts.map((x) => x.id === c.id ? { ...x, personality: undefined } : x) }))} className="mb-4 text-sm text-ios-blue">Reset personality</button></div>)}</>}
        <div className="border-t border-ios-sep pt-3"><div className="font-semibold">On-device AI replies</div><p className="my-2 text-xs text-ios-label2">No account or API key needed. The first download is several hundred MB and requires WebGPU, sufficient memory, and network access to the model host. Conversation text stays on your device. Without the model, replies are scripted.</p>
          {aiStatus.status === "loading" ? <div role="status" className="rounded-xl bg-ios-fill p-3 text-sm"><div>Downloading AI · {Math.round(aiStatus.progress * 100)}%</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ios-fill2"><div className="h-full bg-ios-blue" style={{ width: `${aiStatus.progress * 100}%` }} /></div></div> : aiStatus.status === "ready" ? <label className="flex items-center gap-3 py-2 text-sm"><input type="checkbox" checked={ai.enabled} onChange={(e) => { setLocalAIEnabled(e.target.checked); setAI({ enabled: e.target.checked }); }}/> Use on-device AI for all conversations</label> : <button onClick={() => { void loadLocalAI().then(() => { setLocalAIEnabled(true); setAI({ enabled: true }); }).catch(() => setAI({ enabled: false })); }} className="w-full rounded-xl bg-ios-blue py-3 font-semibold text-white">{aiStatus.status === "error" ? "Retry AI download" : "Download and enable AI"}</button>}
          {aiStatus.status === "error" && <p role="alert" className="mt-2 text-xs text-ios-red">{aiStatus.message}</p>}
        </div>
      </div></div>}

      <div className="flex shrink-0 items-end gap-2 px-3 pb-2 pt-1.5" style={{ paddingBottom: "calc(var(--safe-bottom) + 6px)" }}>
        <button onClick={() => useOS.getState().showToast("Photos & apps aren't available here")} className="mb-0.5 flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-ios-fill2 text-ios-label2">
          <Plus size={20} strokeWidth={2.6} />
        </button>
        <div className="flex min-h-[36px] flex-1 items-center rounded-[18px] border border-ios-sep py-[3px] pl-3 pr-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            enterKeyHint="send"
            data-keep-focus
            placeholder={t.sms ? "Text Message · SMS" : "iMessage"}
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
          />
          <button onClick={send} className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-white transition-opacity" style={{ background: t.sms ? "var(--ios-green)" : "var(--ios-blue)", opacity: text.trim() ? 1 : 0, pointerEvents: text.trim() ? "auto" : "none" }}>
            <ArrowUp size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesApp() {
  const threads = useData((s) => s.threads);
  const contacts = useData((s) => s.contacts);
  const [ai, setAI] = useState<AIConfig>({ enabled: isLocalAIEnabled() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const lastId = useRef<string | null>(null);
  if (openId) lastId.current = openId;

  const startTo = (cid: string) => {
    const ex = useData.getState().threads.find((t) => t.members.length === 1 && t.members[0] === cid);
    if (ex) setOpenId(ex.id);
    else {
      const t: Thread = { id: newId(), members: [cid], msgs: [], unread: 0 };
      patchData((s) => ({ threads: [t, ...s.threads] }));
      setOpenId(t.id);
    }
    setComposing(false);
    setTo("");
  };
  useAppAction("messages", (a) => {
    if (a === "new") setComposing(true);
    else if (a.startsWith("to:")) startTo(a.slice(3));
  });

  const sorted = [...threads].filter((t) => t.msgs.length > 0 || t.id === openId).sort((a, b) => (b.msgs[b.msgs.length - 1]?.at ?? 0) - (a.msgs[a.msgs.length - 1]?.at ?? 0));
  const nameOf = (t: Thread) => t.name ?? t.members.map((m) => contactName(contacts.find((c) => c.id === m)).split(" ")[0]).join(", ");
  const list = sorted.filter((t) => nameOf(t).toLowerCase().includes(q.toLowerCase()) || t.msgs.some((m) => m.text.toLowerCase().includes(q.toLowerCase())));
  const unread = threads.reduce((a, t) => a + t.unread, 0);

  return (
    <div className="relative h-full overflow-hidden bg-ios-bg">
      <div className="absolute inset-0" style={{ transform: openId ? "translateX(-30%)" : "none", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", filter: openId ? "brightness(.92)" : undefined }}>
        <Page
          title="Messages"
          bg="bg-ios-bg"
          left={<NavBtn>Edit</NavBtn>}
          right={
            <button onClick={() => setComposing(true)} className="text-ios-blue">
              <SquarePen size={24} />
            </button>
          }
        >
          <div className="px-4 pb-2">
            <SearchField value={q} onChange={setQ} />
          </div>
          <div>
            {list.map((t) => {
              const last = t.msgs[t.msgs.length - 1];
              const first = contacts.find((c) => c.id === t.members[0]);
              return (
                <SwipeRow key={t.id} actions={[{ label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ threads: s.threads.filter((x) => x.id !== t.id) })) }]} className="bg-ios-bg" bg="var(--ios-bg)">
                  <div className="flex items-center gap-3 py-2 pl-9 pr-4 active:bg-ios-fill" style={{ background: "var(--ios-bg)", position: "relative" }} onClick={() => setOpenId(t.id)}>
                    {t.unread > 0 && <span className="absolute left-3 top-1/2 h-[12px] w-[12px] -translate-y-1/2 rounded-full bg-ios-blue" />}
                    <Avatar name={nameOf(t)} hue={first?.hue ?? 200} size={50} />
                    <div className="ios-row min-w-0 flex-1 pb-1" style={{ ["--sep-left" as string]: "0px" }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[17px] font-semibold">{nameOf(t)}</span>
                        <span className="shrink-0 text-[15px] text-ios-label2">{last ? relTime(last.at) : ""}</span>
                      </div>
                      <div className="line-clamp-2 text-[15px] leading-[20px] text-ios-label2">{last?.text ?? "No messages"}</div>
                    </div>
                  </div>
                </SwipeRow>
              );
            })}
            {list.length === 0 && <div className="py-20 text-center text-ios-label2">No Messages</div>}
          </div>
        </Page>
      </div>
      <div className="absolute inset-0" style={{ transform: openId ? "none" : "translateX(100%)", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", boxShadow: "-6px 0 18px rgba(0,0,0,.12)" }}>
        {lastId.current && threads.some((t) => t.id === lastId.current) && <ThreadView key={lastId.current} id={lastId.current} onBack={() => setOpenId(null)} ai={ai} setAI={setAI} />}
      </div>

      {composing && (
        <div className="fade-in absolute inset-0 z-40 bg-ios-bg">
          <Page title="New Message" large={false} bg="bg-ios-bg" left={<NavBtn onClick={() => { setComposing(false); setTo(""); }}>Cancel</NavBtn>}>
            <div className="flex items-center gap-2 px-4 py-2 text-[17px]" style={{ borderBottom: "0.5px solid var(--ios-sep)" }}>
              <span className="text-ios-label2">To:</span>
              <input autoFocus value={to} onChange={(e) => setTo(e.target.value)} placeholder="Name or number" className="flex-1 bg-transparent outline-none" />
            </div>
            <Group flat>
              {contacts
                .filter((c) => contactName(c).toLowerCase().includes(to.toLowerCase()) || c.phone.includes(to))
                .map((c) => (
                  <div key={c.id} className="ios-row flex items-center gap-3 px-4 py-2 active:bg-ios-fill" onClick={() => startTo(c.id)} style={{ ["--sep-left" as string]: "68px" }}>
                    <Avatar name={contactName(c)} hue={c.hue} size={38} />
                    <div>
                      <div className="text-[17px]">{contactName(c)}</div>
                      <div className="text-[13px] text-ios-label2">{c.phone}</div>
                    </div>
                  </div>
                ))}
            </Group>
          </Page>
        </div>
      )}
      <span className="hidden">{unread}<Camera size={1} /></span>
    </div>
  );
}
