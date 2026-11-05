import { useEffect, useRef, useState } from "react";
import { Mic, SendHorizontal, X } from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { useData, patchData, contactName, newId } from "./data";
import { APPS } from "./registry";
import { sendAction } from "./actions";
import { musicPause, musicPlay, musicNext, musicResume } from "./music";
import { fmtTime, DAYS, MONTHS, toF } from "./utils";
import { fetchWeather, wmo } from "../apps/weatherData";
import { ScrollView } from "./ui";

interface Line {
  role: "me" | "siri";
  text: string;
}

const JOKES = [
  "Why did the iPhone go to therapy? It had too many unresolved issues… and a cracked screen.",
  "I told my phone I needed space. Now it's showing me the storage warning.",
  "Why don't programmers like nature? Too many bugs.",
  "I would tell you a UDP joke, but you might not get it.",
];

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60, an: 1, a: 1, half: 0.5 };
const num = (s: string) => (/^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : WORD_NUM[s]);

async function wiki(q: string): Promise<string | null> {
  try {
    const s = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`)).json();
    const title = s?.query?.search?.[0]?.title;
    if (!title) return null;
    const e = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=2&titles=${encodeURIComponent(title)}&redirects=1&format=json&origin=*`)).json();
    const page = Object.values(e.query.pages)[0] as { extract?: string };
    return page.extract ? `${page.extract.trim()}` : null;
  } catch {
    return null;
  }
}

async function handle(raw: string): Promise<string> {
  const st = useOS.getState();
  const q = raw.toLowerCase().replace(/[?!.]+$/, "").trim();
  let m: RegExpMatchArray | null;

  if (/^(hi|hello|hey)\b/.test(q)) return "Hello! How can I help?";
  if (/how are you/.test(q)) return "I'm doing great, thanks for asking!";
  if (/who are you|your name/.test(q)) return "I'm Siri, your simulated assistant, running right here in the browser.";
  if (/joke/.test(q)) return JOKES[Math.floor(Math.random() * JOKES.length)];

  if (/what('s| is)? the time|what time is it|current time/.test(q)) return `It's ${fmtTime(new Date(), st.use24h)}.`;
  if (/what('s| is)? (the )?(date|day)|today'?s date/.test(q)) {
    const d = new Date();
    return `Today is ${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}.`;
  }

  if ((m = q.match(/(?:set|start|create)(?: a| an)? timer (?:for )?(\S+)\s*(hours?|minutes?|mins?|seconds?|secs?)/))) {
    const n = num(m[1]);
    if (n) {
      const mult = /^h/.test(m[2]) ? 3600 : /^m/.test(m[2]) ? 60 : 1;
      st.startTimer(Math.round(n * mult));
      return `Okay, I set a timer for ${m[1]} ${m[2]}.`;
    }
  }
  if ((m = q.match(/(?:set|create|wake me)(?: an?)? (?:alarm )?(?:for|at) (\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/))) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3]?.replace(/\./g, "");
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h < 24 && min < 60) {
      useOS.setState({ alarms: [...st.alarms, { id: newId(), h, m: min, label: "Alarm", days: [], on: true }] });
      return `Your alarm is set for ${fmtTime(new Date(2000, 0, 1, h, min), st.use24h)}.`;
    }
  }
  if ((m = q.match(/remind me to (.+)/))) {
    const lists = useData.getState().rlists;
    patchData((s) => ({ reminders: [...s.reminders, { id: newId(), listId: lists[0].id, text: m![1], done: false, flag: false }] }));
    return `Okay, I'll remind you to ${m[1]}.`;
  }

  if ((m = q.match(/^(?:open|launch|start|go to|show me)\s+(?:the\s+)?(.+?)(?: app)?$/))) {
    const name = m[1];
    const app = Object.values(APPS).find((a) => a.name.toLowerCase() === name || a.name.toLowerCase().includes(name) || name.includes(a.name.toLowerCase()));
    if (app && st.installed.includes(app.id)) {
      setTimeout(() => useOS.getState().openApp(app.id), 500);
      return `Opening ${app.name}.`;
    }
    if (app) return `${app.name} isn't installed. You can download it from the App Store.`;
  }

  if ((m = q.match(/^(?:call|phone|dial)\s+(.+)/))) {
    const name = m[1];
    const c = useData.getState().contacts.find((c) => contactName(c).toLowerCase().includes(name));
    if (c) {
      setTimeout(() => {
        useOS.getState().set({ siri: false });
        useOS.getState().openApp("phone");
        useOS.getState().startCall(contactName(c), c.phone);
      }, 900);
      return `Calling ${contactName(c)}…`;
    }
    return `I couldn't find ${name} in your contacts.`;
  }
  if ((m = q.match(/^(?:text|message|send a message to)\s+(\w+)/))) {
    setTimeout(() => {
      useOS.getState().openApp("messages");
    }, 700);
    return `Opening Messages for ${m[1]}.`;
  }

  if (/play (some )?music|play a song|play something/.test(q)) {
    musicPlay(Math.floor(Math.random() * 8));
    return "Playing music.";
  }
  if (/^(pause|stop)( the)?( music)?$/.test(q)) {
    musicPause();
    return "Paused.";
  }
  if (/^(resume|continue)/.test(q)) {
    musicResume();
    return "Resuming.";
  }
  if (/next (song|track)|skip/.test(q)) {
    musicNext();
    return "Skipping to the next song.";
  }

  if ((m = q.match(/turn (on|off) (wi-?fi|bluetooth|airplane mode|dark mode|flashlight|do not disturb|low power mode|silent mode)/))) {
    const on = m[1] === "on";
    const what = m[2].replace("-", "");
    if (what === "wifi") st.set({ wifi: on });
    else if (what === "bluetooth") st.set({ bluetooth: on });
    else if (what === "airplane mode") st.setAirplane(on);
    else if (what === "dark mode") st.set({ appearance: on ? "dark" : "light" });
    else if (what === "flashlight") st.set({ flashlight: on });
    else if (what === "do not disturb") st.set({ dnd: on });
    else if (what === "low power mode") st.set({ lowPower: on });
    else if (what === "silent mode") st.set({ silent: on });
    return `Okay, ${what} is ${on ? "on" : "off"}.`;
  }
  if (/volume up|turn (it )?up/.test(q)) {
    st.volumeStep(0.25);
    return "Volume increased.";
  }
  if (/volume down|turn (it )?down/.test(q)) {
    st.volumeStep(-0.25);
    return "Volume decreased.";
  }

  if (/weather|temperature|forecast/.test(q)) {
    const city = useData.getState().cities[0];
    try {
      const w = await fetchWeather(city.lat, city.lon, city.tz);
      const t = (c: number) => Math.round(st.tempUnit === "f" ? toF(c) : c) + "°";
      return `It's ${t(w.current.temp)} and ${wmo(w.current.code, w.current.isDay).label.toLowerCase()} in ${city.name}. Today's high is ${t(w.daily[0].max)} and the low is ${t(w.daily[0].min)}.`;
    } catch {
      return "I couldn't reach the weather service. Check your connection.";
    }
  }

  // arithmetic
  const math = q
    .replace(/^(what('s| is)|calculate|compute)\s+/, "")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\b(times|multiplied by|x)\b/g, "*")
    .replace(/\b(divided by|over)\b/g, "/")
    .replace(/\bto the power of\b/g, "**")
    .replace(/,/g, "");
  if (/^[\d\s+\-*/().%]+$/.test(math) && /\d\s*[+\-*/%]\s*\d/.test(math)) {
    try {
      const v = Function(`"use strict"; return (${math})`)();
      if (isFinite(v)) return `${math.replace(/\*\*/g, "^")} = ${+v.toPrecision(12)}`;
    } catch {
      /* fallthrough */
    }
  }

  if ((m = q.match(/^(?:search|google|look up|search the web for|search for)\s+(.+)/))) {
    setTimeout(() => {
      useOS.getState().set({ siri: false });
      useOS.getState().openApp("safari");
      sendAction("safari", "search:" + m![1]);
    }, 700);
    return `Here's what I found on the web for “${m[1]}”.`;
  }

  const topic = q.replace(/^(who|what|where|when) (is|are|was|were)( a| an| the)?\s+/, "").replace(/^(tell me about|explain)\s+/, "");
  const ans = await wiki(topic);
  if (ans) return ans.length > 320 ? ans.slice(0, 320).replace(/\s\S*$/, "") + "…" : ans;
  return "Sorry, I didn't find anything on that. Try asking about the weather, setting a timer, or opening an app.";
}

export function Siri() {
  const open = useOS((s) => s.siri);
  const spec = useSpec();
  const set = useOS((s) => s.set);
  const kb = useOS((s) => s.kbOpen);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLines([{ role: "siri", text: "What can I help you with?" }]);
      setText("");
    } else {
      recRef.current?.stop();
      window.speechSynthesis?.cancel();
    }
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines, busy]);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setLines((l) => [...l, { role: "me", text: q }]);
    setText("");
    setBusy(true);
    const a = await handle(q);
    setBusy(false);
    setLines((l) => [...l, { role: "siri", text: a }]);
    const st = useOS.getState();
    if (!st.silent && "speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance(a.slice(0, 220));
        u.volume = Math.max(0.2, st.volume);
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    }
  };

  const mic = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!SR) {
      useOS.getState().showToast("Speech recognition isn't available here — type instead");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e: { results: { 0: { 0: { transcript: string } } } }) => ask(e.results[0][0].transcript);
    r.onend = () => {
      setListening(false);
      useOS.setState({ micActive: false });
    };
    r.onerror = () => {
      setListening(false);
      useOS.setState({ micActive: false });
    };
    recRef.current = r;
    setListening(true);
    useOS.setState({ micActive: true });
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fade-in absolute inset-0 z-[98]" onPointerDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-2xl" onClick={() => set({ siri: false })} />
      <button className="absolute right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white" style={{ top: spec.safeTop }} onClick={() => set({ siri: false })}>
        <X size={18} />
      </button>
      <ScrollView className="absolute inset-x-0 px-5" style={{ top: spec.safeTop + 36, bottom: (kb ? spec.kbH : 0) + 190 }}>
        <div className="flex min-h-full flex-col justify-end gap-3 pb-2">
          {lines.map((l, i) => (
            <div key={i} className={l.role === "me" ? "self-end" : "self-start"}>
              <div className={l.role === "me" ? "rounded-[20px] bg-white/25 px-4 py-2 text-[17px] text-white" : "max-w-[320px] rounded-[20px] bg-ios-material px-4 py-3 text-[17px] leading-[22px] text-ios-label shadow-lg backdrop-blur-xl"}>
                {l.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="self-start rounded-[20px] bg-ios-material px-4 py-3 backdrop-blur-xl">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot h-2 w-2 rounded-full bg-ios-gray" style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollView>
      {/* orb */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: (kb ? spec.kbH : 0) + 78 }}>
        <div className="relative h-[84px] w-[84px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute inset-0 rounded-full mix-blend-screen blur-[6px]" style={{ background: ["radial-gradient(circle at 30% 30%,#5ac8fa,transparent 70%)", "radial-gradient(circle at 70% 40%,#af52de,transparent 70%)", "radial-gradient(circle at 50% 75%,#ff2d55,transparent 70%)"][i], animation: `siri ${listening || busy ? 2.2 + i * 0.5 : 6 + i}s linear infinite ${i % 2 ? "reverse" : ""}` }} />
          ))}
          <div className="absolute inset-[22px] rounded-full bg-white/90 blur-[3px]" />
        </div>
      </div>
      <form
        className="absolute inset-x-4 flex items-center gap-2"
        style={{ bottom: (kb ? spec.kbH : 0) + (spec.safeBottom ? 20 : 12) }}
        onSubmit={(e) => {
          e.preventDefault();
          void ask(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Siri…"
          enterKeyHint="send"
          data-keep-focus
          className="h-11 flex-1 rounded-full bg-white/20 px-4 text-[17px] text-white outline-none placeholder:text-white/50"
        />
        <button type="button" onClick={mic} className="flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: listening ? "#ff3b30" : "rgba(255,255,255,0.2)" }}>
          <Mic size={20} />
        </button>
        <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-full bg-ios-blue text-white">
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
}
