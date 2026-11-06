import { useState } from "react";
import { MessageSquarePlus, Search, SendHorizontal, Sparkles } from "lucide-react";
import { handleSiriRequest } from "../os/Siri";
import { useOS } from "../os/store";

type Message = { role: "user" | "assistant"; text: string };
export default function SiriApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const submit = async (text: string) => {
    if (!text.trim() || busy) return;
    setMessages((m) => [...m, { role: "user", text }]); setInput(""); setBusy(true);
    try { const reply = await handleSiriRequest(text); setMessages((m) => [...m, { role: "assistant", text: reply }]); }
    catch { setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't complete that request." }]); }
    finally { setBusy(false); }
  };
  const visible = query ? messages.filter((m) => m.text.toLowerCase().includes(query.toLowerCase())) : messages;
  return <div className="relative flex h-full flex-col bg-ios-bg text-ios-label" style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>
    <header className="px-6 pb-4 pt-5"><div className="text-[32px] font-bold tracking-tight">Siri</div><div className="text-sm text-ios-label2">Your simulated assistant</div></header>
    {search && <div className="px-5 pb-3"><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this conversation" className="w-full rounded-2xl bg-ios-fill px-4 py-3 outline-none" /></div>}
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      {messages.length === 0 && <div className="flex h-full flex-col items-center justify-center text-center"><div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-400 text-white shadow-xl"><Sparkles size={38}/></div><h2 className="text-2xl font-semibold">What can I help with?</h2><p className="mt-2 max-w-[280px] text-sm text-ios-label2">Ask about the weather, set a timer, open an app, or search the web.</p></div>}
      {visible.map((m, i) => <div key={i} className={`my-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-[22px] px-4 py-3 text-[16px] ${m.role === "user" ? "bg-ios-blue text-white" : "glass"}`}>{m.text}</div></div>)}
      {busy && <div className="text-sm text-ios-label2">Thinking…</div>}
    </div>
    <form onSubmit={(e) => { e.preventDefault(); void submit(input); }} className="flex items-center gap-2 px-4 pb-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Siri" className="glass h-12 min-w-0 flex-1 rounded-full px-4 outline-none"/><button type="submit" aria-label="Send" disabled={busy || !input.trim()} className="flex h-12 w-12 items-center justify-center rounded-full bg-ios-blue text-white disabled:opacity-40"><SendHorizontal size={20}/></button></form>
    <div className="flex items-center justify-between px-5 pb-2 pt-2"><button aria-label="Search conversation" onClick={() => { setSearch(!search); setQuery(""); }} className="glass flex h-11 w-11 items-center justify-center rounded-full"><Search size={21}/></button><button onClick={() => useOS.getState().set({ siri: true })} className="text-sm text-ios-blue">Voice assistant</button><button aria-label="New chat" onClick={() => { setMessages([]); setQuery(""); setSearch(false); }} className="glass flex h-11 w-11 items-center justify-center rounded-full"><MessageSquarePlus size={21}/></button></div>
  </div>;
}
