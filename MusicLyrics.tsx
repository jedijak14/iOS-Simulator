import { useEffect, useMemo, useRef } from "react";
import { useNow, useOS } from "../os/store";
import { TRACKS, musicPos } from "../os/music";

interface LyricLine {
  t: number; // seconds — when the line should be highlighted
  text: string;
}

/**
 * Mock synced lyrics for a track. Each track gets a deterministic stream of
 * "La la la"-style placeholder lines spaced evenly across its duration.
 */
function mockLyrics(t: { id: number; dur: number; title: string }): LyricLine[] {
  const variants = [
    `${t.title}, ${t.title}…`,
    "La la la, la la la",
    "Da da dum, da da dum",
    "Ooh, ooh, ooh",
    "Na na na na na",
    "Hmm hmm hmm",
    "Yeah, yeah, yeah",
    "Oh, oh, oh",
    "La la la, la la la",
    "Da da dum, da da dum",
    `${t.title}…`,
    "La la la, la la la",
    "Da da dum, da da dum",
    "Ooh, ooh, ooh",
    "Na na na na na",
    "Hmm hmm hmm",
  ];
  const count = Math.max(8, Math.floor(t.dur / 12));
  const lines: LyricLine[] = [];
  for (let i = 0; i < count; i++) {
    lines.push({
      t: Math.min(t.dur - 1.5, i * (t.dur / count) + 0.4),
      text: variants[(i + t.id) % variants.length],
    });
  }
  return lines;
}

/**
 * Renders time-synced lyrics for the currently playing track. Lines highlight
 * and auto-scroll as the song progresses. Designed to be dropped into the
 * Music app's Now Playing view (or shown standalone).
 */
export function LyricsView({ className = "" }: { className?: string }) {
  // Re-render every 250ms so the active line updates as the song progresses.
  useNow(250);
  const idx = useOS((s) => s.music.idx);
  const t = TRACKS[idx] ?? TRACKS[0];
  const pos = musicPos();
  const lines = useMemo(() => mockLyrics(t), [t]);
  const activeIdx = useMemo(() => {
    let a = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].t <= pos) a = i;
      else break;
    }
    return a;
  }, [lines, pos]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const node = el.querySelector<HTMLElement>(`[data-line="${activeIdx}"]`);
    if (node) {
      const target = node.offsetTop - el.clientHeight / 2 + node.clientHeight / 2;
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [activeIdx]);

  return (
    <div ref={scrollRef} className={`hide-scroll relative overflow-y-auto px-4 py-6 text-center ${className}`}>
      <div className="mx-auto max-w-[340px]">
        {lines.map((l, i) => {
          const active = i === activeIdx;
          const past = i < activeIdx;
          return (
            <div
              key={i}
              data-line={i}
              className="py-1.5 text-[22px] font-bold leading-[28px] transition-all duration-300"
              style={{
                opacity: active ? 1 : past ? 0.35 : 0.55,
                transform: active ? "scale(1.02)" : "scale(1)",
                color: active ? "#fff" : "rgba(255,255,255,0.7)",
                textShadow: active ? "0 1px 8px rgba(0,0,0,0.18)" : undefined,
              }}
            >
              {l.text}
            </div>
          );
        })}
        <div className="h-10" />
      </div>
    </div>
  );
}

export default LyricsView;
