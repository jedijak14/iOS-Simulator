import { useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, Plus, SquarePen, Camera, Settings2 } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData, newId, contactName, type Thread, type Msg } from "../os/data";
import { Avatar, Group, NavBtn, Page, SearchField, SwipeRow, ScrollView } from "../os/ui";
import { sfx } from "../os/sound";
import { useAppAction } from "../os/actions";
import { relTime } from "../os/utils";

const REPLIES: [RegExp, string[]][] = [
  [/\b(hi|hello|hey|yo)\b/i, ["Hey! 👋", "Hi there!", "Hello! How's it going?"]],
  [/how are you|how's it going|what's up|sup/i, ["Doing great, thanks! You?", "All good here 😊", "Can't complain! You?"]],
  [/lunch|dinner|eat|food|pizza|coffee|ramen/i, ["Yes please, I'm starving 😋", "Sounds good! What time?", "Ooh, I'm in 🍕"]],
  [/thank|thx/i, ["Anytime!", "You got it 🙌", "No problem!"]],
  [/love|miss you/i, ["❤️", "Love you too!", "Aw 🥰"]],
  [/\b(ok|okay|sure|yes|yep|yeah)\b/i, ["Perfect 👍", "Great!", "Awesome, see you then"]],
  [/\b(when|what time)\b/i, ["How about 7?", "Around 6:30 works for me", "Whenever you're free!"]],
  [/\?/, ["Hmm, good question. Let me think 🤔", "Not sure yet, will let you know", "Probably! I'll check and get back to you"]],
  [/lol|haha|😂/i, ["😂😂", "Haha right?!", "I can't 😭"]],
];
const FALLBACK = ["Sounds good!", "Haha nice", "Got it 👍", "Talk soon!", "Okay!", "For sure 🙌", "Interesting…"];

function pick<T>(a: T[]) {
  return a[Math.floor(Math.random() * a.length)];
}
function reply(text: string) {
  for (const [re, opts] of REPLIES) if (re.test(text)) return pick(opts);
  return pick(FALLBACK);
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

function ThreadView({ id, onBack }: { id: string; onBack: () => void }) {
  const t = useData((s) => s.threads.find((x) => x.id === id));
  const contacts = useData((s) => s.contacts);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [aiSettings, setAiSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiUrl, setAiUrl] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiKey, setAiKey] = useState("");
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
  const mem = t.members.map((m) => contacts.find((c) => c.id === m)).filter(Boolean);
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
    const from = t.members[Math.floor(Math.random() * t.members.length)];
    if (!from) return;
    const deliver = (answer: string) => {
      setTyping(false);
      const r: Msg = { id: newId(), from, text: answer, at: Date.now(), sms: t.sms };
      const viewing = useOS.getState().foreground === "messages" && document.querySelector(`[data-thread="${id}"]`) !== null;
      patchData((s) => ({ threads: s.threads.map((x) => (x.id === id ? { ...x, msgs: [...x.msgs, r], unread: viewing ? 0 : x.unread + 1 } : x)) }));
      if (viewing) sfx.receive(); else useOS.getState().notify({ app: "messages", title: t.name ?? nameOf(from), body: r.text });
    };
    if (aiEnabled) {
      let url: URL;
      try { url = new URL(aiUrl); if (url.protocol !== "https:") throw new Error("HTTPS required"); }
      catch { useOS.getState().showToast("AI endpoint must be an HTTPS URL"); return; }
      if (!aiModel.trim()) { useOS.getState().showToast("Set an AI model in conversation settings"); return; }
      setTyping(true);
      const controller = new AbortController(); aiAbort.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 25000);
      const history = [...t.msgs, m].slice(-12).map((item) => ({ role: item.from === "me" ? "user" : "assistant", content: item.text.slice(0, 2000) }));
      void fetch(url.toString(), { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...(aiKey ? { Authorization: `Bearer ${aiKey}` } : {}) }, body: JSON.stringify({ model: aiModel.trim(), messages: [{ role: "system", content: `You are a fictional messaging contact named ${title}. Reply naturally and briefly. Do not claim to be the real person.` }, ...history], max_tokens: 150 }) })
        .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then((data) => { const answer = data?.choices?.[0]?.message?.content; if (typeof answer !== "string" || !answer.trim()) throw new Error("Empty response"); deliver(answer.trim().slice(0, 2000)); })
        .catch(() => { setTyping(false); useOS.getState().showToast("AI reply failed. Check endpoint, model, CORS and credentials."); })
        .finally(() => { clearTimeout(timeout); if (aiAbort.current === controller) aiAbort.current = null; });
    } else {
      timers.current.push(window.setTimeout(() => setTyping(true), 900), window.setTimeout(() => deliver(reply(v)), 2400 + Math.random() * 1500));
    }
  };

  const lastMine = [...t.msgs].reverse().find((m) => m.from === "me");
  return (
    <div className="relative flex h-full flex-col bg-ios-bg" data-thread={id}>
      <div className="glass absolute inset-x-0 top-0 z-20 flex items-end justify-between px-2 pb-1.5" style={{ height: "calc(var(--safe-top) + 62px)", borderBottom: "0.5px solid var(--ios-sep)" }}>
        <NavBtn onClick={() => { aiAbort.current?.abort(); setAiKey(""); setAiUrl(""); setAiModel(""); setAiEnabled(false); onBack(); }}>
          <ChevronLeft size={28} strokeWidth={2.4} className="-ml-1" />
        </NavBtn>
        <div className="flex flex-col items-center pb-0.5">
          <Avatar name={title} hue={mem[0]?.hue ?? 210} size={36} />
          <div className="mt-0.5 flex items-center text-[11px]">{title} · simulated <ChevronLeft size={10} className="rotate-180 text-ios-label3" /></div>
        </div>
        <NavBtn onClick={() => setAiSettings(true)}><Settings2 size={22} /></NavBtn>
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
                {mine && lastMine?.id === m.id && <div className="mr-1 mt-0.5 text-right text-[11px] font-medium text-ios-label2">Delivered</div>}
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
      {aiSettings && <div className="absolute inset-0 z-40 flex items-end bg-black/45" onClick={() => setAiSettings(false)}><div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[28px] bg-ios-bg p-5 text-ios-label" style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}>
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-bold">Simulated replies</h2><button onClick={() => setAiSettings(false)} className="text-ios-blue">Done</button></div>
        <p className="mb-3 text-sm text-ios-label2">No messages reach real people. AI sends recent conversation text to your chosen provider. Endpoint and key stay in memory until this conversation closes.</p>
        <label className="mb-3 flex items-center gap-3"><input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)}/> Use an AI provider for replies</label>
        {aiEnabled && <div className="space-y-2"><input value={aiUrl} onChange={(e) => setAiUrl(e.target.value)} placeholder="HTTPS chat completions endpoint" className="w-full rounded-xl bg-ios-fill p-3 outline-none"/><input value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="Model name" className="w-full rounded-xl bg-ios-fill p-3 outline-none"/><input type="password" autoComplete="off" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="API key (optional)" className="w-full rounded-xl bg-ios-fill p-3 outline-none"/><p className="text-xs text-ios-label2">Requires a browser-accessible OpenAI-compatible endpoint with CORS enabled. Use a limited-scope key.</p></div>}
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
        {lastId.current && threads.some((t) => t.id === lastId.current) && <ThreadView key={lastId.current} id={lastId.current} onBack={() => setOpenId(null)} />}
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
