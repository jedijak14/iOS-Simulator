import { useState } from "react";
import { ChevronDown, Library, ListMusic, Music2, Pause, Play, Repeat, Repeat1, Search, Shuffle, SkipBack, SkipForward, Volume1, Volume2, Radio } from "lucide-react";
import { useOS, useNow } from "../os/store";
import { TRACKS, artGradient, musicNext, musicPlay, musicPos, musicPrev, musicSeek, musicToggle, type Track } from "../os/music";
import { Page, SearchField, Sheet, TabBar, ScrollView, Segmented } from "../os/ui";
import { fmtClock } from "../os/utils";

type Tab = "now" | "library" | "search";

function Art({ t, size, className = "" }: { t: Track; size: number | string; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size, background: artGradient(t), borderRadius: 8 }}>
      <div className="absolute inset-0 flex items-center justify-center text-white/80">
        <Music2 size={typeof size === "number" ? size * 0.4 : 40} />
      </div>
      <div className="absolute -bottom-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-white/15" />
    </div>
  );
}

function TrackRow({ t, i }: { t: Track; i?: number }) {
  const music = useOS((s) => s.music);
  const cur = music.active && music.idx === t.id;
  return (
    <button onClick={() => musicPlay(t.id)} className="ios-row flex w-full items-center gap-3 px-4 py-2 text-left active:bg-ios-fill" style={{ ["--sep-left" as string]: "76px" }}>
      <Art t={t} size={50} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px]" style={{ color: cur ? "var(--ios-pink)" : undefined }}>{t.title}</div>
        <div className="truncate text-[14px] text-ios-label2">{t.artist}</div>
      </div>
      {cur && music.playing ? (
        <div className="flex h-4 items-end gap-[2px]">
          {[0, 1, 2].map((k) => (
            <div key={k} className="eq-bar w-[3px] rounded-full bg-ios-pink" style={{ height: 16, animationDelay: `${k * 0.15}s` }} />
          ))}
        </div>
      ) : (
        <span className="text-[14px] tabular-nums text-ios-label2">{fmtClock(t.dur)}{i === undefined ? "" : ""}</span>
      )}
    </button>
  );
}

function NowPlaying({ open, onClose }: { open: boolean; onClose: () => void }) {
  const music = useOS((s) => s.music);
  const volume = useOS((s) => s.volume);
  const set = useOS((s) => s.set);
  useNow(250);
  const t = TRACKS[music.idx];
  const pos = musicPos();
  return (
    <Sheet open={open} onClose={onClose} bg="bg-black" height="calc(100% - var(--safe-top) - 10px)">
      <div className="relative flex h-full flex-col px-7 pb-8 pt-10 text-white" style={{ background: `linear-gradient(180deg, hsl(${t.hue} 60% 28%), #0a0a0c 80%)` }}>
        <button onClick={onClose} className="absolute left-1/2 top-3 -translate-x-1/2 text-white/60">
          <ChevronDown size={26} />
        </button>
        <div className="mt-5 flex flex-1 items-center justify-center">
          <div className="transition-transform duration-500" style={{ transform: music.playing ? "scale(1)" : "scale(0.84)", width: "100%", maxWidth: 330 }}>
            <Art t={t} size="100%" className="aspect-square !rounded-[14px] shadow-2xl" />
          </div>
        </div>
        <div className="mt-6">
          <div className="truncate text-[22px] font-semibold">{t.title}</div>
          <div className="truncate text-[18px] text-white/60">{t.artist} — {t.album}</div>
        </div>
        <div className="mt-5">
          <input
            data-nodrag
            type="range"
            min={0}
            max={t.dur}
            step={1}
            value={pos}
            onChange={(e) => musicSeek(parseFloat(e.target.value))}
            className="ios-range !h-[5px]"
            style={{ ["--p" as string]: `${(pos / t.dur) * 100}%`, background: `linear-gradient(to right, #fff var(--p), rgba(255,255,255,.25) var(--p))` }}
          />
          <div className="mt-1 flex justify-between text-[12px] tabular-nums text-white/55">
            <span>{fmtClock(pos)}</span>
            <span>-{fmtClock(t.dur - pos)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-9">
          <button onClick={musicPrev}><SkipBack size={38} fill="#fff" /></button>
          <button onClick={musicToggle} className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/15">
            {music.playing ? <Pause size={40} fill="#fff" /> : <Play size={40} fill="#fff" className="ml-1" />}
          </button>
          <button onClick={() => musicNext()}><SkipForward size={38} fill="#fff" /></button>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Volume1 size={18} className="text-white/60" />
          <input data-nodrag type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => set({ volume: parseFloat(e.target.value) })} className="ios-range !h-[5px]" style={{ ["--p" as string]: `${volume * 100}%`, background: `linear-gradient(to right, #fff var(--p), rgba(255,255,255,.25) var(--p))` }} />
          <Volume2 size={18} className="text-white/60" />
        </div>
        <div className="mt-4 flex justify-around text-white/50">
          <button onClick={() => set({ music: { ...music, shuffle: !music.shuffle } })} className="rounded-lg p-2" style={{ color: music.shuffle ? "#fff" : undefined, background: music.shuffle ? "rgba(255,255,255,.18)" : undefined }}>
            <Shuffle size={22} />
          </button>
          <button
            onClick={() => set({ music: { ...music, repeat: music.repeat === "off" ? "all" : music.repeat === "all" ? "one" : "off" } })}
            className="rounded-lg p-2"
            style={{ color: music.repeat !== "off" ? "#fff" : undefined, background: music.repeat !== "off" ? "rgba(255,255,255,.18)" : undefined }}
          >
            {music.repeat === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>
          <button className="rounded-lg p-2" onClick={() => useOS.getState().showToast("Queue: " + TRACKS.map((x) => x.title).join(", "))}>
            <ListMusic size={22} />
          </button>
        </div>
      </div>
    </Sheet>
  );
}

export default function MusicApp() {
  const [tab, setTab] = useState<Tab>("now");
  const [lib, setLib] = useState<"songs" | "albums">("songs");
  const [q, setQ] = useState("");
  const [full, setFull] = useState(false);
  const music = useOS((s) => s.music);
  const t = TRACKS[music.idx];
  const albums = Array.from(new Set(TRACKS.map((x) => x.album)));

  return (
    <div className="relative flex h-full flex-col bg-ios-bg">
      <div className="relative min-h-0 flex-1">
        {tab === "now" && (
          <Page title="Listen Now" bg="bg-ios-bg">
            <div className="px-4">
              <div className="mb-2 text-[13px] font-semibold uppercase text-ios-label2">Made For You</div>
              <button onClick={() => musicPlay(Math.floor(Math.random() * TRACKS.length))} className="relative block h-[300px] w-full overflow-hidden rounded-[16px] text-left text-white shadow-lg active:scale-[0.99]" style={{ background: artGradient(TRACKS[(new Date().getDate()) % 8]) }}>
                <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/15" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 pt-20">
                  <div className="text-[12px] font-semibold uppercase opacity-80">Daily Mix</div>
                  <div className="text-[28px] font-bold leading-tight">Your Favorites Mix</div>
                  <div className="mt-1 text-[14px] opacity-80">Tap to shuffle play</div>
                </div>
                <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur"><Play size={22} fill="#fff" className="ml-0.5" /></div>
              </button>
              <div className="mb-2 mt-7 text-[22px] font-bold">Top Picks</div>
            </div>
            <ScrollView axis="x" className="px-4 pb-2">
              <div className="flex gap-3">
                {TRACKS.map((x) => (
                  <button key={x.id} onClick={() => musicPlay(x.id)} className="w-[150px] shrink-0 text-left active:opacity-70">
                    <Art t={x} size={150} className="!rounded-[10px]" />
                    <div className="mt-1.5 truncate text-[15px]">{x.title}</div>
                    <div className="truncate text-[13px] text-ios-label2">{x.artist}</div>
                  </button>
                ))}
              </div>
            </ScrollView>
            <div className="mb-1 mt-6 px-4 text-[22px] font-bold">Recently Played</div>
            {TRACKS.slice(0, 4).map((x) => (
              <TrackRow key={x.id} t={x} />
            ))}
          </Page>
        )}
        {tab === "library" && (
          <Page title="Library" bg="bg-ios-bg">
            <div className="px-4 pb-3">
              <Segmented options={[{ id: "songs", label: "Songs" }, { id: "albums", label: "Albums" }]} value={lib} onChange={setLib} />
            </div>
            {lib === "songs" ? (
              TRACKS.map((x) => <TrackRow key={x.id} t={x} />)
            ) : (
              <div className="grid grid-cols-2 gap-4 px-4">
                {albums.map((a) => {
                  const first = TRACKS.find((x) => x.album === a)!;
                  return (
                    <button key={a} onClick={() => musicPlay(first.id)} className="text-left active:opacity-70">
                      <Art t={first} size="100%" className="aspect-square !rounded-[10px]" />
                      <div className="mt-1 truncate text-[15px]">{a}</div>
                      <div className="truncate text-[13px] text-ios-label2">{first.artist}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </Page>
        )}
        {tab === "search" && (
          <Page title="Search" bg="bg-ios-bg">
            <div className="px-4 pb-2">
              <SearchField value={q} onChange={setQ} placeholder="Artists, Songs, Lyrics, and More" />
            </div>
            {q ? (
              TRACKS.filter((x) => (x.title + x.artist + x.album).toLowerCase().includes(q.toLowerCase())).map((x) => <TrackRow key={x.id} t={x} />)
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pt-2">
                {["Pop", "Electronic", "Chill", "Focus", "Workout", "Night Drive"].map((g, i) => (
                  <button key={g} onClick={() => setQ(["a", "e", "o", "s", "r", "n"][i])} className="h-[90px] rounded-[10px] p-3 text-left text-[18px] font-bold text-white" style={{ background: `linear-gradient(135deg, hsl(${i * 55 + 10} 80% 55%), hsl(${i * 55 + 60} 70% 40%))` }}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </Page>
        )}
      </div>

      {/* mini player */}
      {music.active && (
        <button onClick={() => setFull(true)} className="glass relative z-20 mx-2 mb-1 flex shrink-0 items-center gap-3 rounded-[14px] p-2 text-left shadow-lg" style={{ borderTop: "0.5px solid var(--ios-sep)" }}>
          <Art t={t} size={42} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px]">{t.title}</div>
            <div className="truncate text-[12px] text-ios-label2">{t.artist}</div>
          </div>
          <span onClick={(e) => { e.stopPropagation(); musicToggle(); }} className="px-2">
            {music.playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </span>
          <span onClick={(e) => { e.stopPropagation(); musicNext(); }} className="pr-2">
            <SkipForward size={24} fill="currentColor" />
          </span>
        </button>
      )}
      <TabBar
        tabs={[
          { id: "now", label: "Listen Now", icon: Play, fill: true },
          { id: "library", label: "Library", icon: Library },
          { id: "search", label: "Search", icon: Search },
        ]}
        value={tab}
        onChange={setTab}
      />
      <NowPlaying open={full} onClose={() => setFull(false)} />
      <span className="hidden"><Radio size={1} /></span>
    </div>
  );
}
