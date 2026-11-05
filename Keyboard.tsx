import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowBigUp, ArrowBigUpDash, Delete, Smile, Delete as Del } from "lucide-react";
import { useOS } from "./store";
import { sfx } from "./sound";
import { ScrollView } from "./ui";
import type { DeviceSpec } from "./devices";

type TextEl = HTMLInputElement | HTMLTextAreaElement;

const WORDS = (
  "the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been being am has had did does done said went made got gave told asked felt tried left called needed seemed keep let begin help talk turn start might show hear play run move live believe hold bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain hello hi hey thanks thank please sorry yes yeah okay ok sure maybe tonight today tomorrow yesterday morning evening weekend friend friends family mom dad home house school office lunch dinner breakfast coffee call text message phone meeting soon later great awesome amazing beautiful wonderful happy sad tired busy ready late early really very much many more less little big small long short best better worse love like miss need want going coming doing looking working thinking everything something anything nothing everyone someone anyone where why while whenever whatever however though although together tomorrow tonight message messages photo photos music weather calendar reminder reminders notes safari settings camera maps clock calculator wallet stocks mail"
)
  .split(/\s+/)
  .filter(Boolean);
const WORD_SET = Array.from(new Set(WORDS));

const NEXT: Record<string, string[]> = {
  i: ["am", "will", "think"],
  "i'm": ["going", "on", "not"],
  the: ["best", "same", "first"],
  how: ["are", "is", "about"],
  are: ["you", "we", "they"],
  what: ["is", "are", "time"],
  thank: ["you", "you!", "u"],
  see: ["you", "it", "the"],
  hello: ["there", "!", "world"],
  hi: ["there", "!", "how"],
  good: ["morning", "night", "luck"],
  see_you: ["soon", "later", "tomorrow"],
  you: ["are", "can", "too"],
  to: ["be", "the", "do"],
  will: ["be", "do", "you"],
  can: ["you", "we", "I"],
  let: ["me", "us", "you"],
  on: ["my", "the", "our"],
  at: ["the", "home", "work"],
};

const EMOJI: { icon: string; list: string }[] = [
  {
    icon: "😀",
    list: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 🫠 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👻 💀 👽 🤖 💩",
  },
  {
    icon: "🐶",
    list: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦒 🦘 🐪 🐫 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍁 🍂 🍃 🌺 🌻 🌹 🌷 🌼 🌸",
  },
  {
    icon: "🍎",
    list: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🧀 🥚 🍳 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍮 🍯 ☕ 🍵 🧃 🥤 🧋 🍺 🍷 🥂 🍸 🍹",
  },
  {
    icon: "⚽",
    list: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🥊 🥋 🎽 🛹 🛼 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤸 🤺 ⛹️ 🏌️ 🏇 🧘 🏄 🏊 🚣 🧗 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎫 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 🎯 🎳 🎮 🎰 🧩",
  },
  {
    icon: "🚗",
    list: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🚀 🛸 🚁 🛶 ⛵ 🚤 🛳️ ⛴️ 🚢 ⚓ 🚧 ⛽ 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏠 🏡 🏢 🏬 🏥 🏦 🏨 🌃 🌆 🌇 🌉 🌌 🌠 🎆 🎇",
  },
  {
    icon: "💡",
    list: "⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 💽 💾 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙️ ⏰ ⌛ 🔋 🔌 💡 🔦 🕯️ 💸 💵 💴 💶 💷 💰 💳 💎 ⚖️ 🔧 🔨 ⚒️ 🛠️ ⛏️ 🔩 ⚙️ 🧱 🔫 💣 🔪 🛡️ 🚬 🔮 📿 🔭 🔬 💊 💉 🩸 🧬 🌡️ 🧹 🧺 🧻 🚽 🛁 🔑 🗝️ 🚪 🛋️ 🛏️ 🎁 🎈 🎉 🎊 ✉️ 📦 📝 📁 📅 📌 📎 ✏️ 📖 📚",
  },
  {
    icon: "❤️",
    list: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ ✅ ❌ ❎ ⭕ ❗ ❓ ‼️ ⁉️ 💯 🔥 ⭐ 🌟 ✨ ⚡ 💥 💫 💦 💨 👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👏 🙌 👐 🤝 🙏 💪 👀 👋 🤚 ✋ 🖖",
  },
];

const L1 = "qwertyuiop".split("");
const L2 = "asdfghjkl".split("");
const L3 = "zxcvbnm".split("");
const N1 = "1234567890".split("");
const N2 = ["-", "/", ":", ";", "(", ")", "$", "&", "@", '"'];
const N3 = [".", ",", "?", "!", "'"];
const S1 = ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="];
const S2 = ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"];

function setNativeValue(el: TextEl, v: string, caret: number) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, v);
  try {
    el.setSelectionRange(caret, caret);
  } catch {
    /* some input types do not support selection */
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const isTextEl = (el: Element | null): el is TextEl => {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return ["text", "search", "email", "url", "tel", "number", "password", ""].includes(el.type) && !el.readOnly && !el.disabled;
  }
  return false;
};

export function Keyboard({ rootRef, dark, spec }: { rootRef: React.RefObject<HTMLDivElement | null>; dark: boolean; spec: DeviceSpec }) {
  const [target, setTarget] = useState<TextEl | null>(null);
  const [mode, setMode] = useState<"letters" | "numbers" | "symbols" | "emoji">("letters");
  const [shift, setShift] = useState<"off" | "on" | "caps">("off");
  const [pressed, setPressed] = useState<string | null>(null);
  const [emojiCat, setEmojiCat] = useState(0);
  const [, force] = useState(0);
  const lastShiftTap = useRef(0);
  const lastSpace = useRef(0);
  const repeat = useRef<{ t?: number; i?: number }>({});
  const targetRef = useRef<TextEl | null>(null);
  targetRef.current = target;
  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  const kind: "pad" | "text" = target && (target.type === "tel" || target.type === "number" || ["numeric", "tel", "decimal"].includes(target.inputMode)) ? "pad" : "text";

  const autoCapOk = (el: TextEl | null) => {
    if (!el) return false;
    const ac = el.getAttribute("autocapitalize");
    if (ac === "off" || ac === "none") return false;
    return !["email", "url", "password", "search"].includes(el.type);
  };

  const refresh = useCallback(() => {
    const el = targetRef.current;
    force((n) => n + 1);
    if (!el || shiftRef.current === "caps") return;
    if (!autoCapOk(el)) {
      setShift("off");
      return;
    }
    const s = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, s);
    const need = before.trim() === "" || /[.!?]\s+$/.test(before) || /\n$/.test(before);
    setShift(need ? "on" : "off");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onIn = (e: Event) => {
      const t = e.target as Element;
      if (isTextEl(t)) {
        setTarget(t);
        setMode("letters");
        setTimeout(refresh, 0);
      }
    };
    const onOut = () => {
      setTimeout(() => {
        const a = document.activeElement;
        if (!(isTextEl(a) && root.contains(a))) setTarget(null);
      }, 0);
    };
    root.addEventListener("focusin", onIn);
    root.addEventListener("focusout", onOut);
    const iv = setInterval(() => {
      const t = targetRef.current;
      if (t && !t.isConnected) setTarget(null);
    }, 250);
    const onInput = (e: Event) => {
      if (e.target === targetRef.current) refresh();
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("selectionchange", refresh);
    return () => {
      root.removeEventListener("focusin", onIn);
      root.removeEventListener("focusout", onOut);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("selectionchange", refresh);
      clearInterval(iv);
    };
  }, [rootRef, refresh]);

  useEffect(() => {
    useOS.setState({ kbOpen: !!target });
  }, [target]);

  const insert = (text: string) => {
    const el = targetRef.current;
    if (!el) return;
    const v = el.value;
    const s = el.selectionStart ?? v.length;
    const e = el.selectionEnd ?? v.length;
    if (el.maxLength > 0 && v.length - (e - s) + text.length > el.maxLength) return;
    setNativeValue(el, v.slice(0, s) + text + v.slice(e), s + text.length);
  };

  const backspace = () => {
    const el = targetRef.current;
    if (!el) return;
    const v = el.value;
    const s = el.selectionStart ?? v.length;
    const e = el.selectionEnd ?? v.length;
    if (s !== e) return setNativeValue(el, v.slice(0, s) + v.slice(e), s);
    if (s === 0) return;
    let n = 1;
    const c = v.charCodeAt(s - 1);
    if (c >= 0xdc00 && c <= 0xdfff) n = 2;
    if (v.slice(s - 3, s - 2) === "\u200d") n = 3;
    setNativeValue(el, v.slice(0, s - n) + v.slice(e), s - n);
  };

  const enter = () => {
    const el = targetRef.current;
    if (!el) return;
    if (el instanceof HTMLTextAreaElement) return insert("\n");
    const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    const down = new KeyboardEvent("keydown", opts);
    el.dispatchEvent(down);
    el.dispatchEvent(new KeyboardEvent("keyup", opts));
    if (!down.defaultPrevented && el.form) el.form.requestSubmit();
    if (!el.hasAttribute("data-keep-focus")) el.blur();
  };

  const typeChar = (ch: string) => {
    sfx.tick();
    const upper = mode === "letters" && shift !== "off";
    insert(upper ? ch.toUpperCase() : ch);
    if (shift === "on") setShift("off");
    if (mode === "letters") setTimeout(refresh, 0);
    else if (mode !== "emoji" && /[a-z]/i.test(ch)) setMode("letters");
  };

  const space = () => {
    sfx.tock();
    const el = targetRef.current;
    if (!el) return;
    const now = Date.now();
    const s = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, s);
    if (now - lastSpace.current < 700 && /[A-Za-z0-9] $/.test(before) && el.type !== "password" && el.type !== "email" && el.type !== "url") {
      const e = el.selectionEnd ?? s;
      setNativeValue(el, before.slice(0, -1) + ". " + el.value.slice(e), s + 1);
      lastSpace.current = 0;
    } else {
      insert(" ");
      lastSpace.current = now;
    }
    if (mode === "numbers" || mode === "symbols") setMode("letters");
    setTimeout(refresh, 0);
  };

  const pickSuggestion = (w: string, cur: string) => {
    const el = targetRef.current;
    if (!el) return;
    sfx.tick();
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? s;
    const start = s - cur.length;
    const rest = el.value.slice(e);
    const add = rest.startsWith(" ") ? "" : " ";
    setNativeValue(el, el.value.slice(0, start) + w + add + rest, start + w.length + add.length + (rest.startsWith(" ") ? 1 : 0));
  };

  const stopRepeat = () => {
    window.clearTimeout(repeat.current.t);
    window.clearInterval(repeat.current.i);
  };
  const startBackspace = () => {
    sfx.tock();
    backspace();
    stopRepeat();
    repeat.current.t = window.setTimeout(() => {
      repeat.current.i = window.setInterval(() => {
        backspace();
      }, 70);
    }, 420);
  };
  useEffect(() => stopRepeat, []);

  /* ---------- suggestions ---------- */
  let suggestions: string[] = [];
  let cur = "";
  if (target && kind === "text" && target.type !== "password" && target.type !== "email" && target.type !== "url") {
    const s = target.selectionStart ?? target.value.length;
    const before = target.value.slice(0, s);
    const m = /([A-Za-z']+)$/.exec(before);
    cur = m ? m[1] : "";
    const cap = (w: string) => (cur && cur[0] === cur[0].toUpperCase() && /[A-Z]/.test(cur[0]) ? w[0].toUpperCase() + w.slice(1) : w);
    if (cur) {
      const lc = cur.toLowerCase();
      const cands = WORD_SET.filter((w) => w.startsWith(lc) && w !== lc).slice(0, 2);
      const exact = WORD_SET.includes(lc);
      suggestions = [`"${cur}"`, ...cands.map(cap)];
      if (exact && cands.length < 2) suggestions = [`"${cur}"`, cap(lc), ...cands.map(cap)].slice(0, 3);
    } else {
      const prev = /([A-Za-z']+)\s*$/.exec(before)?.[1]?.toLowerCase();
      const startOfSentence = before.trim() === "" || /[.!?]\s*$/.test(before);
      suggestions = startOfSentence ? ["I", "The", "I'm"] : (prev && NEXT[prev]) || ["I", "the", "to"];
    }
  }

  /* ---------- styling ---------- */
  const bg = dark ? "rgba(36,36,38,0.97)" : "rgba(209,212,218,0.98)";
  const keyBg = dark ? "#6b6b6e" : "#ffffff";
  const fnBg = dark ? "#464649" : "#abb1bb";
  const txt = dark ? "#fff" : "#000";
  const bottomPad = spec.safeBottom > 0 ? 34 : 6;
  const avail = spec.kbH - 44 - bottomPad - 8;
  const rowH = Math.floor((avail - 33) / 4);

  const key = (
    label: React.ReactNode,
    onDown: () => void,
    opts?: { flex?: number; fn?: boolean; id?: string; blue?: boolean; w?: number; fontSize?: number; keep?: boolean },
  ) => {
    const id = opts?.id ?? (typeof label === "string" ? label : "");
    return (
      <button
        key={id || Math.random()}
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault();
          if (opts?.id !== "delete") onDown();
          else startBackspace();
          if (!opts?.fn && id) setPressed(id);
        }}
        onPointerUp={() => {
          setPressed(null);
          if (opts?.id === "delete") stopRepeat();
        }}
        onPointerLeave={() => {
          setPressed(null);
          if (opts?.id === "delete") stopRepeat();
        }}
        onPointerCancel={() => stopRepeat()}
        className="relative flex items-center justify-center rounded-[5px] shadow-[0_1px_0_rgba(0,0,0,0.3)] active:brightness-90"
        style={{
          flex: opts?.w ? undefined : (opts?.flex ?? 1),
          width: opts?.w,
          height: rowH,
          background: opts?.blue ? "#007aff" : opts?.fn ? fnBg : keyBg,
          color: opts?.blue ? "#fff" : txt,
          fontSize: opts?.fontSize ?? 22,
          touchAction: "none",
        }}
      >
        {label}
        {pressed === id && !opts?.fn && id && id !== " " && (
          <span
            className="pointer-events-none absolute -top-[52px] left-1/2 z-50 flex h-[60px] w-[54px] -translate-x-1/2 items-start justify-center rounded-[10px] pt-1.5 text-[34px] shadow-xl"
            style={{ background: keyBg, color: txt }}
          >
            {label}
          </span>
        )}
      </button>
    );
  };

  const hint = target?.enterKeyHint || (target instanceof HTMLTextAreaElement ? "enter" : "enter");
  const retLabel: Record<string, string> = { enter: "return", go: "go", search: "search", send: "send", done: "done", next: "next" };
  const retBlue = ["go", "search", "send", "done"].includes(hint);

  const rowStyle = "flex gap-[6px] px-[3px]";

  let body: React.ReactNode = null;
  if (kind === "pad") {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", target?.type === "tel" ? "+" : ".", "0", "⌫"];
    body = (
      <div className="grid grid-cols-3 gap-[6px] px-[6px] pt-2" style={{ paddingBottom: bottomPad }}>
        {keys.map((k) => (
          <button
            key={k}
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault();
              if (k === "⌫") startBackspace();
              else typeChar(k);
            }}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            className="flex items-center justify-center rounded-[6px] text-[26px] shadow-[0_1px_0_rgba(0,0,0,0.3)] active:brightness-90"
            style={{ height: Math.floor((spec.kbH - 44 - bottomPad - 8 - 18) / 4), background: k === "⌫" ? fnBg : keyBg, color: txt }}
          >
            {k === "⌫" ? <Delete size={26} /> : k}
          </button>
        ))}
      </div>
    );
  } else if (mode === "emoji") {
    body = (
      <div className="flex flex-col" style={{ height: spec.kbH - 44 }}>
        <ScrollView className="flex-1 px-1.5 pt-1">
          <div className="grid grid-cols-8 gap-y-1 pb-3">
            {EMOJI[emojiCat].list.split(" ").map((e, i) => (
              <button
                key={i}
                tabIndex={-1}
                onPointerDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  sfx.tick();
                  insert(e);
                }}
                className="flex h-10 items-center justify-center text-[28px] active:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        </ScrollView>
        <div className="flex items-center gap-1 px-2" style={{ height: 44, paddingBottom: spec.safeBottom > 0 ? 0 : 0, marginBottom: Math.max(0, bottomPad - 6) }}>
          <button
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault();
              sfx.tock();
              setMode("letters");
            }}
            className="rounded-md px-3 py-1.5 text-[15px] font-medium"
            style={{ color: txt }}
          >
            ABC
          </button>
          <div className="flex flex-1 justify-between px-1">
            {EMOJI.map((c, i) => (
              <button
                key={i}
                tabIndex={-1}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setEmojiCat(i);
                }}
                className="rounded-md px-1 text-[19px]"
                style={{ opacity: i === emojiCat ? 1 : 0.45, background: i === emojiCat ? "rgba(128,128,128,0.25)" : "transparent" }}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <button
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault();
              startBackspace();
            }}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            className="px-2"
            style={{ color: txt }}
          >
            <Del size={24} />
          </button>
        </div>
      </div>
    );
  } else {
    const r1 = mode === "letters" ? L1 : mode === "numbers" ? N1 : S1;
    const r2 = mode === "letters" ? L2 : mode === "numbers" ? N2 : S2;
    const r3 = mode === "letters" ? L3 : N3;
    const up = mode === "letters" && shift !== "off";
    const show = (c: string) => (up ? c.toUpperCase() : c);
    body = (
      <div className="flex flex-col gap-[11px] pt-2" style={{ paddingBottom: bottomPad }}>
        <div className={rowStyle}>{r1.map((c) => key(show(c), () => typeChar(c), { fontSize: 22 }))}</div>
        <div className={rowStyle} style={mode === "letters" ? { paddingLeft: 21, paddingRight: 21 } : undefined}>
          {r2.map((c) => key(show(c), () => typeChar(c), { fontSize: 22 }))}
        </div>
        <div className={rowStyle}>
          {mode === "letters"
            ? key(
                shift === "caps" ? <ArrowBigUpDash size={22} fill="currentColor" /> : <ArrowBigUp size={22} fill={shift === "on" ? "currentColor" : "none"} />,
                () => {
                  sfx.tock();
                  const t = Date.now();
                  if (t - lastShiftTap.current < 350) setShift("caps");
                  else setShift(shift === "off" ? "on" : "off");
                  lastShiftTap.current = t;
                },
                { fn: true, w: 44, id: "shift" },
              )
            : key(
                <span className="text-[15px]">{mode === "numbers" ? "#+=" : "123"}</span>,
                () => {
                  sfx.tock();
                  setMode(mode === "numbers" ? "symbols" : "numbers");
                },
                { fn: true, w: 44, id: "alt" },
              )}
          <div className="flex flex-1 gap-[6px]" style={{ padding: mode === "letters" ? "0 4px" : "0 6px" }}>
            {r3.map((c) => key(show(c), () => typeChar(c), { fontSize: mode === "letters" ? 22 : 24 }))}
          </div>
          {key(<Delete size={22} />, () => undefined, { fn: true, w: 44, id: "delete" })}
        </div>
        <div className={rowStyle}>
          {key(
            <span className="text-[16px]">{mode === "letters" ? "123" : "ABC"}</span>,
            () => {
              sfx.tock();
              setMode(mode === "letters" ? "numbers" : "letters");
            },
            { fn: true, w: 82, id: "mode" },
          )}
          {key(<Smile size={22} />, () => {
            sfx.tock();
            setMode("emoji");
          }, { fn: true, w: 44, id: "emoji" })}
          {key(<span className="text-[16px]">space</span>, space, { id: " ", flex: 1 })}
          {key(
            <span className="text-[16px]">{retLabel[hint] ?? "return"}</span>,
            () => {
              sfx.tock();
              enter();
            },
            { fn: !retBlue, blue: retBlue, w: 96, id: "return" },
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="absolute inset-x-0 bottom-0 z-[99] select-none backdrop-blur-xl"
      style={{
        height: spec.kbH,
        background: bg,
        transform: `translateY(${target ? 0 : 100}%)`,
        transition: "transform 0.32s cubic-bezier(0.2,0.8,0.2,1)",
        color: txt,
      }}
    >
      <div className="flex h-[44px] items-center" style={{ borderBottom: "0.5px solid rgba(128,128,128,0.2)" }}>
        {kind === "pad" ? (
          <div className="flex w-full justify-end px-4">
            <button
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault();
                target?.blur();
              }}
              className="text-[17px] font-semibold text-[#007aff]"
            >
              Done
            </button>
          </div>
        ) : (
          suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault();
                const w = s.startsWith('"') ? cur : s;
                pickSuggestion(w, cur);
              }}
              className="flex h-full flex-1 items-center justify-center truncate px-1 text-[17px] active:bg-black/10"
              style={{ borderLeft: i ? "0.5px solid rgba(128,128,128,0.3)" : "none", color: txt }}
            >
              {s}
            </button>
          ))
        )}
      </div>
      {body}
    </div>
  );
}
