import { useEffect, useState } from "react";
import { Check, RefreshCw, Sparkles, Type, Wand2, X } from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { sfx } from "./sound";

type Tool = "proofread" | "rewrite" | "summarize";

interface WritingState {
  open: boolean;
  text: string;
  onResult: ((newText: string) => void) | null;
  result: string | null;
  tool: Tool | null;
  busy: boolean;
}

let state: WritingState = { open: false, text: "", onResult: null, result: null, tool: null, busy: false };
const subs = new Set<() => void>();

function set(p: Partial<WritingState>) {
  state = { ...state, ...p };
  subs.forEach((fn) => fn());
}

/** Open the Writing Tools overlay for the given text. The callback fires when the user replaces the text. */
export function showWritingTools(text: string, onResult: (newText: string) => void) {
  set({ open: true, text, onResult, result: null, tool: null, busy: false });
}

/* ------------------------------------------------------------------ */
/* Text transformations                                                  */
/* ------------------------------------------------------------------ */

function proofread(s: string): string {
  // Fix common typos (lowercase "i", "teh", "dont", etc.)
  let out = s
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bu\b/g, "you")
    .replace(/\bur\b/gi, "your")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize the first letter of each sentence and ensure periods.
  const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
  out = sentences
    .map((sentence) => {
      const trimmed = sentence.trim();
      if (!trimmed) return "";
      let body = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      // Add a trailing period if missing punctuation.
      if (!/[.!?]$/.test(body)) body += ".";
      return body;
    })
    .join(" ")
    .trim();
  return out || s;
}

function rewrite(s: string): string {
  const sentences = s
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (sentences.length < 2) {
    // Nothing to reverse — try a simple rephrase by swapping first/last words of each sentence.
    return sentences
      .map((sentence) => {
        const words = sentence.split(/\s+/);
        if (words.length < 3) return sentence;
        const tail = words[words.length - 1];
        const head = words[0];
        const middle = words.slice(1, -1).join(" ");
        const cleanedTail = tail.replace(/[.!?]+$/, "");
        const cleanedHead = head;
        return `${cleanedTail.charAt(0).toUpperCase()}${cleanedTail.slice(1)} ${middle} ${cleanedHead.toLowerCase()}.`;
      })
      .join(" ");
  }
  return [...sentences].reverse().join(" ");
}

function summarize(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  if (firstSentence.length <= 100) return firstSentence;
  return `${firstSentence.slice(0, 100).replace(/\s+\S*$/, "")}…`;
}

function runTool(tool: Tool, text: string): string {
  switch (tool) {
    case "proofread":
      return proofread(text);
    case "rewrite":
      return rewrite(text);
    case "summarize":
      return summarize(text);
  }
}

/* ------------------------------------------------------------------ */
/* Overlay component                                                     */
/* ------------------------------------------------------------------ */

const TOOLS: { id: Tool; label: string; icon: typeof Wand2; bg: string }[] = [
  { id: "proofread", label: "Proofread", icon: Check, bg: "#34c759" },
  { id: "rewrite", label: "Rewrite", icon: RefreshCw, bg: "#007aff" },
  { id: "summarize", label: "Summarize", icon: Type, bg: "#af52de" },
];

export function WritingToolsOverlay() {
  const spec = useSpec();
  // Subscribe to module-level state so the component re-renders when shown/hidden.
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  const close = () => {
    sfx.sheetClose();
    set({ open: false, text: "", onResult: null, result: null, tool: null, busy: false });
  };

  const applyTool = (tool: Tool) => {
    sfx.pop();
    set({ busy: true, tool, result: null });
    // simulate brief processing time so the UI feels alive
    setTimeout(() => {
      const out = runTool(tool, state.text);
      set({ busy: false, result: out });
    }, 420);
  };

  const replace = () => {
    sfx.success();
    const r = state.result;
    const cb = state.onResult;
    set({ open: false, text: "", onResult: null, result: null, tool: null, busy: false });
    if (r != null) cb?.(r);
    useOS.getState().showToast("Replaced with Writing Tools");
  };

  if (!state.open) return null;

  return (
    <div className="absolute inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-2 pb-[calc(var(--safe-bottom)+8px)]"
        style={{ animation: "ios-sheet-up 0.32s cubic-bezier(0.32,0.72,0,1)" }}
      >
        {/* Header */}
        <div className="flex w-full max-w-[360px] items-center gap-2 px-2 pt-1 text-ios-label2">
          <Sparkles size={16} className="text-ios-purple" />
          <span className="text-[13px] font-semibold uppercase">Writing Tools</span>
        </div>

        {/* Original text preview */}
        <div className="w-full max-w-[360px] rounded-2xl bg-ios-cell p-3 shadow-xl">
          <div className="text-[11px] font-semibold uppercase text-ios-label2">Original</div>
          <div className="mt-1 max-h-[88px] overflow-auto text-[14px] leading-[18px] text-ios-label">
            {state.text || <span className="text-ios-label3">No text selected</span>}
          </div>
        </div>

        {/* Tool buttons */}
        <div className="w-full max-w-[360px] rounded-2xl bg-ios-cell p-3 shadow-xl">
          <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = state.tool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTool(t.id)}
                  disabled={state.busy}
                  className="flex w-[88px] shrink-0 flex-col items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <div
                    className="flex h-[58px] w-[58px] items-center justify-center rounded-[14px] text-white shadow-sm"
                    style={{ background: t.bg, opacity: active ? 1 : 0.92 }}
                  >
                    {state.busy && active ? (
                      <Wand2 size={24} className="spin" style={{ animationDuration: "1.6s" }} />
                    ) : (
                      <Icon size={24} />
                    )}
                  </div>
                  <span className="text-[12px] text-ios-label">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result preview */}
        {state.result != null && (
          <div className="w-full max-w-[360px] rounded-2xl bg-ios-cell p-3 shadow-xl" style={{ animation: "fadeIn 0.25s ease-out both" }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase text-ios-label2">Preview</div>
              <button
                onClick={() => set({ result: null, tool: null })}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-ios-fill2 text-ios-label2"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="mt-1 max-h-[110px] overflow-auto text-[15px] leading-[20px] text-ios-label">{state.result}</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={close}
                className="flex-1 rounded-full bg-ios-fill2 py-2.5 text-[15px] font-semibold text-ios-label active:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={replace}
                className="flex-1 rounded-full py-2.5 text-[15px] font-semibold text-white active:opacity-80"
                style={{ background: "var(--ios-blue)" }}
              >
                Replace
              </button>
            </div>
          </div>
        )}

        {!state.result && (
          <button
            onClick={close}
            className="w-full max-w-[360px] rounded-2xl bg-ios-cell py-3.5 text-[17px] font-semibold text-ios-blue shadow-xl active:opacity-60"
          >
            Close
          </button>
        )}

        {/* spacing so the sheet sits above the home indicator on devices without safe-bottom */}
        <div style={{ height: spec.safeBottom ? 0 : 4 }} />
        <style>{`@keyframes ios-sheet-up{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    </div>
  );
}
