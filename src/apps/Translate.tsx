import { useMemo, useState } from "react";
import { ChevronDown, ArrowLeftRight, Volume2, Star, Globe } from "lucide-react";
import { Group, Page, Row, Sheet, NavBtn, Segmented } from "../os/ui";
import { useOS } from "../os/store";
import { sfx } from "../os/sound";

interface PhraseBook {
  [src: string]: { [dst: string]: { [key: string]: string } };
}

// Built-in mini dictionary for common phrases and word lookups.
const PHRASES: PhraseBook = {
  en: {
    es: {
      hello: "Hola",
      "good morning": "Buenos días",
      "good night": "Buenas noches",
      "thank you": "Gracias",
      "please": "Por favor",
      "goodbye": "Adiós",
      "yes": "Sí",
      "no": "No",
      "how are you": "¿Cómo estás?",
      "what is your name": "¿Cómo te llamas?",
      "my name is": "Me llamo",
      "where is the bathroom": "¿Dónde está el baño?",
      "how much does it cost": "¿Cuánto cuesta?",
      "i would like": "Me gustaría",
      "the bill, please": "La cuenta, por favor",
      "i love you": "Te quiero",
      "see you later": "Hasta luego",
      "i don't understand": "No entiendo",
      "can you help me": "¿Puedes ayudarme?",
      "where is the train station": "¿Dónde está la estación de tren?",
      "apple": "manzana",
      "water": "agua",
      "coffee": "café",
      "food": "comida",
      "friend": "amigo",
      "house": "casa",
      "good": "bueno",
      "bad": "malo",
      "today": "hoy",
      "tomorrow": "mañana",
      "yesterday": "ayer",
    },
    fr: {
      hello: "Bonjour",
      "good morning": "Bonjour",
      "good night": "Bonne nuit",
      "thank you": "Merci",
      "please": "S'il vous plaît",
      "goodbye": "Au revoir",
      "yes": "Oui",
      "no": "Non",
      "how are you": "Comment allez-vous?",
      "what is your name": "Comment vous appelez-vous?",
      "my name is": "Je m'appelle",
      "where is the bathroom": "Où sont les toilettes?",
      "how much does it cost": "Combien ça coûte?",
      "i would like": "Je voudrais",
      "the bill, please": "L'addition, s'il vous plaît",
      "i love you": "Je t'aime",
      "see you later": "À plus tard",
      "i don't understand": "Je ne comprends pas",
      "can you help me": "Pouvez-vous m'aider?",
      "apple": "pomme",
      "water": "eau",
      "coffee": "café",
      "food": "nourriture",
      "friend": "ami",
      "house": "maison",
      "good": "bon",
      "bad": "mauvais",
      "today": "aujourd'hui",
      "tomorrow": "demain",
      "yesterday": "hier",
    },
    ja: {
      hello: "こんにちは",
      "good morning": "おはようございます",
      "good night": "おやすみなさい",
      "thank you": "ありがとう",
      "please": "お願いします",
      "goodbye": "さようなら",
      "yes": "はい",
      "no": "いいえ",
      "how are you": "お元気ですか",
      "what is your name": "お名前は何ですか",
      "my name is": "私の名前は",
      "where is the bathroom": "トイレはどこですか",
      "how much does it cost": "いくらですか",
      "i would like": "〜をください",
      "the bill, please": "お会計お願いします",
      "i love you": "愛してる",
      "see you later": "また後で",
      "i don't understand": "わかりません",
      "can you help me": "助けてくれますか",
      "apple": "りんご",
      "water": "水",
      "coffee": "コーヒー",
      "food": "食べ物",
      "friend": "友達",
      "house": "家",
      "good": "良い",
      "bad": "悪い",
      "today": "今日",
      "tomorrow": "明日",
      "yesterday": "昨日",
    },
    zh: {
      hello: "你好",
      "good morning": "早上好",
      "good night": "晚安",
      "thank you": "谢谢",
      "please": "请",
      "goodbye": "再见",
      "yes": "是",
      "no": "不",
      "how are you": "你好吗",
      "what is your name": "你叫什么名字",
      "my name is": "我叫",
      "where is the bathroom": "洗手间在哪里",
      "how much does it cost": "多少钱",
      "i would like": "我想要",
      "the bill, please": "请结账",
      "i love you": "我爱你",
      "see you later": "回头见",
      "i don't understand": "我不明白",
      "can you help me": "你能帮我吗",
      "apple": "苹果",
      "water": "水",
      "coffee": "咖啡",
      "food": "食物",
      "friend": "朋友",
      "house": "房子",
      "good": "好",
      "bad": "坏",
      "today": "今天",
      "tomorrow": "明天",
      "yesterday": "昨天",
    },
    de: {
      hello: "Hallo",
      "good morning": "Guten Morgen",
      "good night": "Gute Nacht",
      "thank you": "Danke",
      "please": "Bitte",
      "goodbye": "Auf Wiedersehen",
      "yes": "Ja",
      "no": "Nein",
      "how are you": "Wie geht es dir?",
      "what is your name": "Wie heißt du?",
      "my name is": "Ich heiße",
      "where is the bathroom": "Wo ist die Toilette?",
      "how much does it cost": "Wie viel kostet das?",
      "i would like": "Ich möchte",
      "the bill, please": "Die Rechnung, bitte",
      "i love you": "Ich liebe dich",
      "see you later": "Bis später",
      "i don't understand": "Ich verstehe nicht",
      "can you help me": "Kannst du mir helfen?",
      "apple": "Apfel",
      "water": "Wasser",
      "coffee": "Kaffee",
      "food": "Essen",
      "friend": "Freund",
      "house": "Haus",
      "good": "gut",
      "bad": "schlecht",
      "today": "heute",
      "tomorrow": "morgen",
      "yesterday": "gestern",
    },
  },
};

// Reverse direction by swapping src/dst
function lookup(src: string, dst: string, text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]/g, "");
  if (!t) return null;
  const direct = PHRASES[src]?.[dst]?.[t];
  if (direct) return direct;
  // try compound: translate word by word if multi-word
  if (t.includes(" ")) {
    const words = t.split(/\s+/);
    const translated = words.map((w) => PHRASES[src]?.[dst]?.[w] ?? w);
    // if any word matched, return joined
    if (translated.some((w, i) => w !== words[i])) return translated.join(" ");
  }
  // single word fallback
  const word = PHRASES[src]?.[dst]?.[t];
  if (word) return word;
  return null;
}

const LANGS: { id: string; name: string; flag: string; native: string }[] = [
  { id: "en", name: "English", flag: "🇺🇸", native: "English" },
  { id: "es", name: "Spanish", flag: "🇪🇸", native: "Español" },
  { id: "fr", name: "French", flag: "🇫🇷", native: "Français" },
  { id: "de", name: "German", flag: "🇩🇪", native: "Deutsch" },
  { id: "ja", name: "Japanese", flag: "🇯🇵", native: "日本語" },
  { id: "zh", name: "Chinese", flag: "🇨🇳", native: "中文" },
];

const PHRASE_CATEGORIES = [
  { id: "greet", label: "Greetings", phrases: ["hello", "good morning", "good night", "goodbye", "see you later"] },
  { id: "basics", label: "Basics", phrases: ["yes", "no", "thank you", "please", "i don't understand"] },
  { id: "travel", label: "Travel", phrases: ["where is the bathroom", "where is the train station", "how much does it cost", "the bill, please"] },
  { id: "social", label: "Social", phrases: ["how are you", "what is your name", "my name is", "i love you", "can you help me"] },
];

export default function TranslateApp() {
  const [src, setSrc] = useState("en");
  const [dst, setDst] = useState("es");
  const [text, setText] = useState("");
  const [picker, setPicker] = useState<"src" | "dst" | null>(null);
  const [tab, setTab] = useState<"translate" | "phrasebook">("translate");
  const [history, setHistory] = useState<{ src: string; dst: string; from: string; to: string; at: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ios-sim-translate-history") || "[]");
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ios-sim-translate-favs") || "[]");
    } catch {
      return [];
    }
  });
  const set2 = useOS((s) => s.set);
  void set2;

  const result = useMemo(() => lookup(src, dst, text), [src, dst, text]);
  const srcLang = LANGS.find((l) => l.id === src)!;
  const dstLang = LANGS.find((l) => l.id === dst)!;

  const swap = () => {
    setSrc(dst);
    setDst(src);
    setText(result ?? "");
  };

  const speak = (s: string, lang: string) => {
    sfx.pop();
    try {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : lang === "ja" ? "ja-JP" : "zh-CN";
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(u);
    } catch {
      /* ignore */
    }
  };

  const saveHistory = (h: typeof history) => {
    setHistory(h);
    try {
      localStorage.setItem("ios-sim-translate-history", JSON.stringify(h.slice(0, 30)));
    } catch {
      /* ignore */
    }
  };

  const submit = () => {
    if (!text.trim() || !result) return;
    saveHistory([{ src, dst, from: text, to: result, at: Date.now() }, ...history.filter((h) => h.from !== text || h.to !== result)].slice(0, 30));
  };

  const toggleFav = (key: string) => {
    const next = favorites.includes(key) ? favorites.filter((k) => k !== key) : [...favorites, key];
    setFavorites(next);
    try {
      localStorage.setItem("ios-sim-translate-favs", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page
        title="Translate"
        right={
          <Segmented
            options={[
              { id: "translate", label: "Translate" },
              { id: "phrasebook", label: "Phrasebook" },
            ]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
          />
        }
        noPad
      >
        {tab === "translate" ? (
          <>
            {/* Language picker */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button onClick={() => setPicker("src")} className="flex flex-1 items-center justify-between rounded-xl bg-ios-cell px-4 py-3 text-[17px] font-medium">
                <span className="flex items-center gap-2"><span className="text-[22px]">{srcLang.flag}</span> {srcLang.name}</span>
                <ChevronDown size={18} className="text-ios-label2" />
              </button>
              <button onClick={swap} className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-cell text-ios-blue active:scale-90">
                <ArrowLeftRight size={18} />
              </button>
              <button onClick={() => setPicker("dst")} className="flex flex-1 items-center justify-between rounded-xl bg-ios-cell px-4 py-3 text-[17px] font-medium">
                <span className="flex items-center gap-2"><span className="text-[22px]">{dstLang.flag}</span> {dstLang.name}</span>
                <ChevronDown size={18} className="text-ios-label2" />
              </button>
            </div>

            {/* Source input */}
            <div className="px-4">
              <div className="rounded-2xl bg-ios-cell p-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter text…"
                  rows={3}
                  className="w-full resize-none bg-transparent text-[22px] font-medium outline-none placeholder:text-ios-label2"
                />
                {text && (
                  <div className="flex items-center justify-between border-t border-ios-sep pt-2">
                    <button onClick={() => setText("")} className="text-ios-blue text-[15px]">Clear</button>
                    <button onClick={() => speak(text, src)} className="text-ios-blue"><Volume2 size={20} /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Translation result */}
            <div className="mt-3 px-4">
              <div className="rounded-2xl bg-white p-4 dark:bg-[#1c1c1e]" style={{ background: "var(--ios-cell-elev, var(--ios-cell))", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div className="mb-1 text-[12px] uppercase tracking-wider text-ios-label2">{dstLang.native}</div>
                <div className="min-h-[40px] text-[24px] font-medium leading-tight">
                  {result ?? (text ? <span className="text-ios-label2">No translation found</span> : <span className="text-ios-label2">Translation appears here</span>)}
                </div>
                {result && (
                  <div className="mt-3 flex items-center gap-4 border-t border-ios-sep pt-2">
                    <button onClick={() => speak(result, dst)} className="text-ios-blue"><Volume2 size={20} /></button>
                    <button onClick={() => toggleFav(`${text}|${result}`)} className="text-ios-blue"><Star size={20} fill={favorites.includes(`${text}|${result}`) ? "currentColor" : "none"} /></button>
                    <button
                      onClick={submit}
                      className="ml-auto rounded-lg bg-ios-blue px-3 py-1.5 text-[14px] font-semibold text-white"
                      style={{ background: "var(--ios-blue)" }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <Group header="History">
                {history.map((h, i) => (
                  <Row
                    key={i}
                    title={<span className="text-[15px]">{h.from}</span>}
                    subtitle={<span className="text-[14px] text-ios-label2">{h.to}</span>}
                    onClick={() => { setSrc(h.src); setDst(h.dst); setText(h.from); }}
                  />
                ))}
                <Row title={<span className="text-ios-red text-center w-full block">Clear History</span>} onClick={() => saveHistory([])} />
              </Group>
            )}

            <Group footer="Translate works offline with a built-in phrase dictionary. Try common phrases like 'where is the bathroom' or 'how much does it cost'.">
              <Row icon={Globe} iconBg="#5ac8fa" title="Available Languages" value={`${LANGS.length}`} />
              <Row icon={Star} iconBg="#ff9500" title="Favorites" value={`${favorites.length}`} />
            </Group>
          </>
        ) : (
          <>
            {PHRASE_CATEGORIES.map((cat) => (
              <Group key={cat.id} header={cat.label}>
                {cat.phrases.map((p) => {
                  const t = lookup(src, dst, p);
                  return (
                    <Row
                      key={p}
                      title={<span className="text-[15px]">{p}</span>}
                      subtitle={<span className="text-[15px] text-ios-blue">{t ?? "—"}</span>}
                      right={<button onClick={(e) => { e.stopPropagation(); if (t) speak(t, dst); }} className="text-ios-blue"><Volume2 size={18} /></button>}
                      onClick={() => { setText(p); setTab("translate"); }}
                    />
                  );
                })}
              </Group>
            ))}
            {favorites.length > 0 && (
              <Group header="Favorites">
                {favorites.map((key) => {
                  const [from, to] = key.split("|");
                  return (
                    <Row
                      key={key}
                      title={<span className="text-[15px]">{from}</span>}
                      subtitle={<span className="text-[15px] text-ios-blue">{to}</span>}
                      onClick={() => toggleFav(key)}
                    />
                  );
                })}
              </Group>
            )}
          </>
        )}
      </Page>

      <Sheet open={!!picker} onClose={() => setPicker(null)} height="55%">
        <Page title="Choose Language" large={false} left={<NavBtn onClick={() => setPicker(null)}>Close</NavBtn>}>
          <Group>
            {LANGS.map((l) => (
              <Row
                key={l.id}
                leading={<span className="text-[28px]">{l.flag}</span>}
                title={l.name}
                subtitle={l.native}
                check={(picker === "src" && src === l.id) || (picker === "dst" && dst === l.id)}
                onClick={() => {
                  if (picker === "src") setSrc(l.id);
                  else setDst(l.id);
                  setPicker(null);
                }}
              />
            ))}
          </Group>
        </Page>
      </Sheet>
    </div>
  );
}
