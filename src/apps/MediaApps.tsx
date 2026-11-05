import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Library,
  Mic,
  Minus,
  Newspaper,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { Empty, NavBtn, Page, Row, ScrollView, SearchField, TabBar } from "../os/ui";
import { useOS } from "../os/store";
import { sfx } from "../os/sound";
import { fmtClock } from "../os/utils";

/* ================================================================== */
/* Podcasts                                                            */
/* ================================================================== */

interface PodEpisode {
  id: string;
  showId: string;
  title: string;
  duration: number;
  daysAgo: number;
  summary: string;
}
interface PodShow {
  id: string;
  title: string;
  author: string;
  category: string;
  gradient: string;
  episodes: PodEpisode[];
}

const POD_SHOWS: PodShow[] = [
  {
    id: "p1",
    title: "The Daily Dispatch",
    author: "Alex Rivera",
    category: "News & Politics",
    gradient: "linear-gradient(135deg, #ff6b6b, #c92a2a)",
    episodes: [
      { id: "p1e1", showId: "p1", title: "Morning Briefing: The Week Ahead", duration: 1840, daysAgo: 0, summary: "A look at the top stories shaping the week." },
      { id: "p1e2", showId: "p1", title: "Inside the Capital: An Interview", duration: 3120, daysAgo: 2, summary: "A conversation with a veteran policy advisor." },
      { id: "p1e3", showId: "p1", title: "Election Watch: Updates and Analysis", duration: 2450, daysAgo: 5, summary: "Polling, projections, and what to watch." },
    ],
  },
  {
    id: "p2",
    title: "Tech Talk Weekly",
    author: "Priya Sharma",
    category: "Technology",
    gradient: "linear-gradient(135deg, #4dabf7, #1864ab)",
    episodes: [
      { id: "p2e1", showId: "p2", title: "The AI Revolution: Hype vs Reality", duration: 2780, daysAgo: 1, summary: "Separating signal from noise in the AI boom." },
      { id: "p2e2", showId: "p2", title: "Smartphone Wars: The Next Decade", duration: 3240, daysAgo: 4, summary: "Foldables, AI assistants, and beyond." },
      { id: "p2e3", showId: "p2", title: "Open Source Wins the Cloud", duration: 1980, daysAgo: 8, summary: "How foundations are reshaping infrastructure." },
    ],
  },
  {
    id: "p3",
    title: "Mind & Matter",
    author: "Dr. James Okoro",
    category: "Science",
    gradient: "linear-gradient(135deg, #9775fa, #5f3dc4)",
    episodes: [
      { id: "p3e1", showId: "p3", title: "The Neuroscience of Memory", duration: 3520, daysAgo: 0, summary: "How memories form, store, and fade." },
      { id: "p3e2", showId: "p3", title: "Quantum Entanglement Explained", duration: 2890, daysAgo: 3, summary: "Spooky action, made simple." },
    ],
  },
  {
    id: "p4",
    title: "The Film Room",
    author: "Maya Chen",
    category: "Entertainment",
    gradient: "linear-gradient(135deg, #ffa94d, #d9480f)",
    episodes: [
      { id: "p4e1", showId: "p4", title: "Summer Blockbusters: A Postmortem", duration: 2640, daysAgo: 1, summary: "What worked, what didn't, and why." },
      { id: "p4e2", showId: "p4", title: "The Return of the Mid-Budget Drama", duration: 3110, daysAgo: 6, summary: "Streaming's impact on adult storytelling." },
    ],
  },
  {
    id: "p5",
    title: "Hidden History",
    author: "Sam Whitfield",
    category: "Society & Culture",
    gradient: "linear-gradient(135deg, #f783ac, #c2255c)",
    episodes: [
      { id: "p5e1", showId: "p5", title: "The Library of Alexandria, Reconsidered", duration: 2980, daysAgo: 2, summary: "New scholarship on an ancient loss." },
      { id: "p5e2", showId: "p5", title: "Cartographers Who Shaped the World", duration: 3320, daysAgo: 7, summary: "Maps that changed history." },
    ],
  },
  {
    id: "p6",
    title: "The Startup Lab",
    author: "Jordan Blake",
    category: "Business",
    gradient: "linear-gradient(135deg, #51cf66, #2b8a3e)",
    episodes: [
      { id: "p6e1", showId: "p6", title: "From Garage to Series A in 18 Months", duration: 2840, daysAgo: 0, summary: "A founder's unfiltered journey." },
      { id: "p6e2", showId: "p6", title: "When to Pivot, When to Persevere", duration: 3120, daysAgo: 5, summary: "Frameworks for hard decisions." },
    ],
  },
];

function fmtAgo(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function PodCover({ show, size, className = "" }: { show: PodShow; size: number | string; className?: string }) {
  const px = typeof size === "number" ? size : 40;
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size, background: show.gradient, borderRadius: 8 }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white/85">
        <Mic size={px * 0.36} />
      </div>
      <div className="absolute -bottom-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-white/15" />
    </div>
  );
}

export function PodcastsApp() {
  const [tab, setTab] = useState<"listen" | "library" | "search">("listen");
  const [q, setQ] = useState("");
  const [episode, setEpisode] = useState<PodEpisode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [showDetail, setShowDetail] = useState<PodShow | null>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  const show = POD_SHOWS.find((s) => s.id === episode?.showId) ?? null;

  // tick position every second while playing
  useEffect(() => {
    if (!playing || !episode) return;
    const id = setInterval(() => {
      setPosition((p) => (p + 1 >= episode.duration ? episode.duration : p + 1));
    }, 1000);
    return () => clearInterval(id);
  }, [playing, episode]);

  // stop when reaching the end
  useEffect(() => {
    if (episode && position >= episode.duration && playing) setPlaying(false);
  }, [position, episode, playing]);

  const playEpisode = (ep: PodEpisode) => {
    sfx.pop();
    if (episode?.id === ep.id) {
      if (position >= ep.duration) {
        setPosition(0);
        setPlaying(true);
      } else {
        setPlaying((p) => !p);
      }
    } else {
      setEpisode(ep);
      setPosition(0);
      setPlaying(true);
    }
  };

  const skip = (delta: number) => {
    if (!episode) return;
    setPosition((p) => Math.max(0, Math.min(episode.duration, p + delta)));
    sfx.tick();
  };

  const toggleDownload = (epId: string) => {
    sfx.pop();
    setDownloaded((prev) => {
      const next = new Set(prev);
      if (next.has(epId)) next.delete(epId);
      else {
        next.add(epId);
        useOS.getState().showToast("Episode downloaded");
      }
      return next;
    });
  };

  const featured = POD_SHOWS[0];
  const recent = [POD_SHOWS[0].episodes[0], POD_SHOWS[1].episodes[0], POD_SHOWS[3].episodes[0]];
  const allEps = POD_SHOWS.flatMap((s) => s.episodes.map((e) => ({ ep: e, show: s })));
  const searchResults = q
    ? allEps.filter(({ ep, show }) => (ep.title + show.title + show.author).toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div className="relative flex h-full flex-col bg-ios-bg">
      <div className="relative min-h-0 flex-1">
        {tab === "listen" && (
          <Page title="Listen Now" bg="bg-ios-bg">
            <div className="px-4">
              <div className="mb-1 text-[13px] font-semibold uppercase text-ios-label2">Featured</div>
              <button
                onClick={() => playEpisode(featured.episodes[0])}
                className="relative block h-[260px] w-full overflow-hidden rounded-[16px] text-left text-white shadow-lg active:scale-[0.99]"
                style={{ background: featured.gradient }}
              >
                <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-20">
                  <div className="text-[12px] font-semibold uppercase opacity-80">New Episode</div>
                  <div className="text-[24px] font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
                    {featured.title}
                  </div>
                  <div className="mt-1 truncate text-[14px] opacity-85">{featured.episodes[0].title}</div>
                </div>
                <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                  <Play size={22} fill="#fff" className="ml-0.5" />
                </div>
              </button>
            </div>

            <div className="mb-1 mt-6 px-4 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
              Recently Played
            </div>
            {recent.map((ep) => {
              const s = POD_SHOWS.find((x) => x.id === ep.showId)!;
              return (
                <button
                  key={ep.id}
                  onClick={() => playEpisode(ep)}
                  className="ios-row flex w-full items-center gap-3 px-4 py-2 text-left active:bg-ios-fill"
                  style={{ ["--sep-left" as string]: "76px" }}
                >
                  <PodCover show={s} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-medium">{ep.title}</div>
                    <div className="truncate text-[13px] text-ios-label2">{s.title}</div>
                  </div>
                  <span className="px-2 text-[14px] tabular-nums text-ios-label2">{fmtClock(ep.duration)}</span>
                </button>
              );
            })}

            <div className="mb-1 mt-4 px-4 text-[22px] font-bold" style={{ letterSpacing: "-0.02em" }}>
              New & Noteworthy
            </div>
            <ScrollView axis="x" className="px-4 pb-2">
              <div className="flex gap-3">
                {POD_SHOWS.map((s) => (
                  <button key={s.id} onClick={() => playEpisode(s.episodes[0])} className="w-[150px] shrink-0 text-left active:opacity-70">
                    <PodCover show={s} size={150} className="!rounded-[10px]" />
                    <div className="mt-1.5 truncate text-[15px] font-medium">{s.title}</div>
                    <div className="truncate text-[13px] text-ios-label2">{s.author}</div>
                  </button>
                ))}
              </div>
            </ScrollView>
          </Page>
        )}

        {tab === "library" && (
          <Page title="Library" bg="bg-ios-bg">
            <div className="px-4 pb-1 text-[15px] text-ios-label2">{POD_SHOWS.length} Shows</div>
            {POD_SHOWS.map((s) => (
              <Row
                key={s.id}
                leading={<PodCover show={s} size={44} />}
                title={s.title}
                subtitle={`${s.author} · Latest ${fmtAgo(s.episodes[0].daysAgo)}`}
                chevron
                onClick={() => { sfx.pop(); setShowDetail(s); }}
              />
            ))}
          </Page>
        )}

        {tab === "search" && (
          <Page title="Search" bg="bg-ios-bg">
            <div className="px-4 pb-2">
              <SearchField value={q} onChange={setQ} placeholder="Shows, Episodes, Hosts" />
            </div>
            {q ? (
              searchResults.length ? (
                searchResults.map(({ ep, show: s }) => (
                  <button
                    key={ep.id}
                    onClick={() => playEpisode(ep)}
                    className="ios-row flex w-full items-center gap-3 px-4 py-2 text-left active:bg-ios-fill"
                    style={{ ["--sep-left" as string]: "76px" }}
                  >
                    <PodCover show={s} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{ep.title}</div>
                      <div className="truncate text-[13px] text-ios-label2">{s.title}</div>
                    </div>
                    <span className="px-2 text-[14px] tabular-nums text-ios-label2">{fmtClock(ep.duration)}</span>
                  </button>
                ))
              ) : (
                <Empty icon={Search} title="No Results" text={`No episodes match "${q}".`} />
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pt-2">
                {["News", "Technology", "Science", "Business", "Culture", "Comedy"].map((g, i) => (
                  <button
                    key={g}
                    onClick={() => setQ(g.slice(0, 2).toLowerCase())}
                    className="h-[90px] rounded-[10px] p-3 text-left text-[18px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${i * 55 + 10} 75% 58%), hsl(${i * 55 + 50} 70% 42%))` }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </Page>
        )}
      </div>

      {/* mini player */}
      {episode && show && (
        <div
          className="glass relative z-20 mx-2 mb-1 shrink-0 rounded-[14px] p-2 shadow-lg"
          style={{ borderTop: "0.5px solid var(--ios-sep)" }}
        >
          <div className="flex items-center gap-3">
            <PodCover show={show} size={42} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{episode.title}</div>
              <div className="truncate text-[12px] text-ios-label2">{show.title}</div>
            </div>
            <button onClick={() => skip(-15)} className="px-1.5 text-ios-label active:opacity-50">
              <RotateCcw size={22} />
            </button>
            <button
              onClick={() => {
                sfx.tick();
                setPlaying((p) => !p);
              }}
              className="px-1.5 text-ios-label active:opacity-50"
            >
              {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
            </button>
            <button onClick={() => skip(15)} className="px-1.5 text-ios-label active:opacity-50">
              <RotateCw size={22} />
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-2 px-1">
            <span className="text-[11px] tabular-nums text-ios-label2">{fmtClock(position)}</span>
            <input
              data-nodrag
              type="range"
              min={0}
              max={episode.duration}
              step={1}
              value={position}
              onChange={(e) => setPosition(parseFloat(e.target.value))}
              className="ios-range !h-[5px]"
              style={{ ["--p" as string]: `${(position / episode.duration) * 100}%` }}
            />
            <span className="text-[11px] tabular-nums text-ios-label2">{fmtClock(episode.duration)}</span>
          </div>
        </div>
      )}

      <TabBar
        tabs={[
          { id: "listen", label: "Listen Now", icon: Play, fill: true },
          { id: "library", label: "Library", icon: Library },
          { id: "search", label: "Search", icon: Search },
        ]}
        value={tab}
        onChange={setTab}
      />

      {showDetail && (
        <PodShowDetail
          show={showDetail}
          currentId={episode?.id ?? null}
          playing={playing}
          downloaded={downloaded}
          onClose={() => setShowDetail(null)}
          onPlay={playEpisode}
          onDownload={toggleDownload}
        />
      )}
    </div>
  );
}

function PodShowDetail({
  show,
  currentId,
  playing,
  downloaded,
  onClose,
  onPlay,
  onDownload,
}: {
  show: PodShow;
  currentId: string | null;
  playing: boolean;
  downloaded: Set<string>;
  onClose: () => void;
  onPlay: (ep: PodEpisode) => void;
  onDownload: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ios-bg">
      <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <div className="glass absolute inset-0" style={{ borderBottom: "0.5px solid var(--ios-sep)" }} />
        <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
          <NavBtn onClick={onClose}>
            <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
            <span className="-ml-1">Library</span>
          </NavBtn>
        </div>
      </div>
      <ScrollView className="min-h-0 flex-1">
        <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
        <div className="flex gap-4 px-4 pt-2">
          <PodCover show={show} size={120} className="!rounded-[12px]" />
          <div className="min-w-0 flex-1 pt-1">
            <div className="text-[13px] font-medium text-ios-label2">{show.category}</div>
            <h1 className="mt-0.5 text-[24px] font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
              {show.title}
            </h1>
            <div className="mt-1 text-[15px] text-ios-label2">{show.author}</div>
            <button
              onClick={() => onPlay(show.episodes[0])}
              className="mt-3 flex items-center gap-2 rounded-full bg-ios-red px-5 py-2 text-[15px] font-semibold text-white active:opacity-80"
            >
              <Play size={16} fill="#fff" /> Play
            </button>
          </div>
        </div>
        <div className="mb-2 mt-5 px-4 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>
          Episodes
        </div>
        <div className="mx-4 overflow-hidden rounded-[12px] bg-ios-cell">
          {show.episodes.map((ep) => {
            const isCur = currentId === ep.id;
            const isDl = downloaded.has(ep.id);
            return (
              <div
                key={ep.id}
                className="ios-row flex items-center gap-3 px-4 py-2.5"
                style={{ ["--sep-left" as string]: "60px" }}
              >
                <button onClick={() => onPlay(ep)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-fill text-ios-blue active:opacity-60">
                  {isCur && playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-medium" style={{ color: isCur ? "var(--ios-blue)" : undefined }}>
                    {ep.title}
                  </div>
                  <div className="truncate text-[13px] text-ios-label2">{ep.summary}</div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-ios-label2">
                    {fmtAgo(ep.daysAgo)} · {fmtClock(ep.duration)}
                  </div>
                </div>
                <button onClick={() => onDownload(ep.id)} className={`shrink-0 px-2 ${isDl ? "text-ios-blue" : "text-ios-label2"} active:opacity-60`} title={isDl ? "Downloaded" : "Download"}>
                  <Download size={20} fill={isDl ? "currentColor" : "none"} />
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />
      </ScrollView>
    </div>
  );
}

/* ================================================================== */
/* News                                                                */
/* ================================================================== */

type NewsCategory = "Technology" | "Sports" | "Politics" | "Entertainment" | "Health" | "Science" | "Business" | "World";

interface Article {
  id: string;
  category: NewsCategory;
  title: string;
  byline: string;
  source: string;
  imageId: number;
  publishedAt: number;
}

const NEWS_IMAGE = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

const ARTICLES: Article[] = [
  { id: "a1", category: "Technology", title: "Apple Unveils Next-Generation Chip With On-Device AI", byline: "By Sarah Chen", source: "TechWire", imageId: 1037979, publishedAt: Date.now() - 2 * 3600_000 },
  { id: "a2", category: "Sports", title: "Underdogs Stun Champions in Overtime Thriller", byline: "By Marcus Lee", source: "Sports Daily", imageId: 255379, publishedAt: Date.now() - 5 * 3600_000 },
  { id: "a3", category: "Politics", title: "Landmark Bill Passes After Late-Night Session", byline: "By Helena Park", source: "Capital Brief", imageId: 327540, publishedAt: Date.now() - 8 * 3600_000 },
  { id: "a4", category: "Entertainment", title: "Surprise Album Drop Breaks Streaming Records", byline: "By Devon Hayes", source: "Pop Pulse", imageId: 189349, publishedAt: Date.now() - 12 * 3600_000 },
  { id: "a5", category: "Health", title: "New Study Links Sleep Quality to Long-Term Health", byline: "By Dr. Anita Roy", source: "Health Matters", imageId: 417074, publishedAt: Date.now() - 18 * 3600_000 },
  { id: "a6", category: "Science", title: "Telescope Captures Sharpest Image of Distant Galaxy", byline: "By Kenji Tanaka", source: "Science Today", imageId: 1037979, publishedAt: Date.now() - 26 * 3600_000 },
  { id: "a7", category: "Business", title: "Markets Rally as Inflation Cools for Third Month", byline: "By Olivia Brooks", source: "Market Watch", imageId: 327540, publishedAt: Date.now() - 30 * 3600_000 },
  { id: "a8", category: "World", title: "Historic Climate Accord Signed at Global Summit", byline: "By Ravi Mehta", source: "World Desk", imageId: 189349, publishedAt: Date.now() - 36 * 3600_000 },
];

const CHANNELS = ["TechWire", "Sports Daily", "Capital Brief", "Pop Pulse", "Health Matters", "Science Today", "Market Watch", "World Desk"];

function articleBody(cat: NewsCategory): string {
  return [
    `In a development that has captured attention across the ${cat.toLowerCase()} world, observers are taking note of significant shifts that could reshape the landscape in the months ahead. Early indicators suggest the impact will be felt widely, though the full extent remains uncertain.`,
    `Analysts who have followed the story closely point to a confluence of factors: changing consumer behavior, technological advancement, and a regulatory environment that continues to evolve. "What we're seeing is not a flash in the pan," one expert said, "but a structural change that will play out over years, not weeks."`,
    `For now, stakeholders are watching closely. The coming weeks will bring more clarity, but the trajectory appears set. Whether the consequences will match the anticipation remains to be seen, but few doubt that the topic will remain at the center of conversation for some time to come.`,
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.`,
  ].join("\n\n");
}

function ArticleReader({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ios-bg">
      <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <div className="glass absolute inset-0" style={{ borderBottom: "0.5px solid var(--ios-sep)" }} />
        <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
          <NavBtn onClick={onClose}>
            <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
            <span className="-ml-1">News</span>
          </NavBtn>
          <button onClick={() => useOS.getState().showToast("Saved to Reading List")} className="text-ios-blue">
            <Star size={20} />
          </button>
        </div>
      </div>
      <ScrollView className="min-h-0 flex-1">
        <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
        <img src={NEWS_IMAGE(article.imageId)} alt="" className="h-[220px] w-full object-cover" />
        <div className="px-4 py-4">
          <div className="mb-2 text-[13px] font-semibold uppercase text-ios-red">{article.source}</div>
          <h1 className="text-[28px] font-bold leading-[34px]" style={{ letterSpacing: "-0.02em" }}>
            {article.title}
          </h1>
          <div className="mt-3 text-[15px] text-ios-label2">{article.byline}</div>
          <div className="mt-1 text-[13px] text-ios-label3">
            {new Date(article.publishedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
          <div className="mt-5 space-y-4 text-[18px] leading-[27px]">
            {articleBody(article.category).split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />
      </ScrollView>
    </div>
  );
}

export function NewsApp() {
  const [tab, setTab] = useState<"today" | "following" | "search">("today");
  const [q, setQ] = useState("");
  const [reading, setReading] = useState<Article | null>(null);

  const topStories = ARTICLES.slice(0, 5);
  const newsPlus = ARTICLES.slice(5);
  const filtered = q
    ? ARTICLES.filter((a) => (a.title + a.category + a.source).toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div className="relative flex h-full flex-col bg-ios-grouped">
      <div className="relative min-h-0 flex-1">
        {tab === "today" && (
          <Page title="Today" bg="bg-ios-grouped">
            <div className="mb-1 px-4 text-[13px] font-semibold uppercase text-ios-label2">Top Stories</div>
            <div className="mx-4 overflow-hidden rounded-[12px] bg-ios-cell">
              {topStories.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => {
                    sfx.pop();
                    setReading(a);
                  }}
                  className="ios-row block w-full px-4 py-3 text-left active:bg-ios-fill"
                  style={{ ["--sep-left" as string]: "16px" }}
                >
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ios-red">{a.source}</div>
                      <div className="text-[17px] font-semibold leading-[21px]" style={{ letterSpacing: "-0.012em" }}>
                        {a.title}
                      </div>
                      <div className="mt-1 text-[13px] text-ios-label2">{a.byline}</div>
                    </div>
                    <img src={NEWS_IMAGE(a.imageId)} alt="" className="h-[70px] w-[70px] shrink-0 rounded-[8px] object-cover" />
                  </div>
                  {i === 1 && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-ios-fill px-2 py-[2px] text-[10px] font-semibold uppercase text-ios-label2">
                      <Sparkles size={9} /> Sponsored
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mb-1 mt-5 flex items-center gap-2 px-4 text-[13px] font-semibold uppercase text-ios-label2">
              <Sparkles size={13} /> Apple News+
            </div>
            <ScrollView axis="x" className="px-4 pb-2">
              <div className="flex gap-3">
                {newsPlus.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      sfx.pop();
                      setReading(a);
                    }}
                    className="w-[220px] shrink-0 overflow-hidden rounded-[12px] bg-ios-cell text-left active:opacity-70"
                  >
                    <img src={NEWS_IMAGE(a.imageId)} alt="" className="h-[120px] w-full object-cover" />
                    <div className="p-2.5">
                      <div className="text-[11px] font-semibold uppercase text-ios-label2">{a.source}</div>
                      <div className="mt-0.5 text-[15px] font-semibold leading-[18px]" style={{ letterSpacing: "-0.01em" }}>
                        {a.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollView>
          </Page>
        )}

        {tab === "following" && (
          <Page title="Following" bg="bg-ios-grouped">
            <div className="mb-1 px-4 text-[13px] font-semibold uppercase text-ios-label2">Channels</div>
            <div className="mx-4 overflow-hidden rounded-[12px] bg-ios-cell">
              {CHANNELS.map((c, i) => (
                <Row
                  key={c}
                  leading={
                    <div
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-[14px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, hsl(${i * 45} 70% 55%), hsl(${i * 45 + 30} 65% 40%))` }}
                    >
                      {c[0]}
                    </div>
                  }
                  title={c}
                  subtitle={`${Math.floor(Math.random() * 20) + 3} new stories`}
                  onClick={() => useOS.getState().showToast(`Following ${c}`)}
                />
              ))}
            </div>
          </Page>
        )}

        {tab === "search" && (
          <Page title="Search" bg="bg-ios-grouped">
            <div className="px-4 pb-2">
              <SearchField value={q} onChange={setQ} placeholder="Topics, Channels, Stories" />
            </div>
            {q ? (
              filtered.length ? (
                <div className="mx-4 overflow-hidden rounded-[12px] bg-ios-cell">
                  {filtered.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        sfx.pop();
                        setReading(a);
                      }}
                      className="ios-row block w-full px-4 py-3 text-left active:bg-ios-fill"
                      style={{ ["--sep-left" as string]: "16px" }}
                    >
                      <div className="flex gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 text-[11px] font-semibold uppercase text-ios-red">{a.source}</div>
                          <div className="text-[16px] font-semibold leading-[20px]">{a.title}</div>
                          <div className="mt-1 text-[12px] text-ios-label2">{a.category}</div>
                        </div>
                        <img src={NEWS_IMAGE(a.imageId)} alt="" className="h-[60px] w-[60px] shrink-0 rounded-[8px] object-cover" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty icon={Search} title="No Results" text={`No stories match "${q}".`} />
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pt-2">
                {(["Technology", "Sports", "Politics", "Entertainment", "Health", "Science", "Business", "World"] as NewsCategory[]).map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => setQ(cat.toLowerCase())}
                    className="h-[88px] rounded-[10px] p-3 text-left text-[16px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${i * 45 + 10} 70% 55%), hsl(${i * 45 + 50} 60% 38%))` }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </Page>
        )}
      </div>

      <TabBar
        tabs={[
          { id: "today", label: "Today", icon: Newspaper },
          { id: "following", label: "Following", icon: Star, fill: true },
          { id: "search", label: "Search", icon: Search },
        ]}
        value={tab}
        onChange={setTab}
      />

      {reading && <ArticleReader article={reading} onClose={() => setReading(null)} />}
    </div>
  );
}

/* ================================================================== */
/* Books                                                               */
/* ================================================================== */

interface Book {
  id: string;
  title: string;
  author: string;
  gradient: string;
  pages: number;
}

const BOOKS: Book[] = [
  { id: "b1", title: "The Silent Tide", author: "E. Whitfield", gradient: "linear-gradient(160deg, #1864ab, #0b3d6b)", pages: 12 },
  { id: "b2", title: "Beneath Crimson Skies", author: "M. Vale", gradient: "linear-gradient(160deg, #c92a2a, #7e1414)", pages: 12 },
  { id: "b3", title: "The Glass Garden", author: "P. Anand", gradient: "linear-gradient(160deg, #2b8a3e, #14532d)", pages: 12 },
  { id: "b4", title: "Echoes of Tomorrow", author: "J. Okoro", gradient: "linear-gradient(160deg, #5f3dc4, #3c1e96)", pages: 12 },
  { id: "b5", title: "A Map of Lost Things", author: "H. Park", gradient: "linear-gradient(160deg, #d9480f, #8b2900)", pages: 12 },
  { id: "b6", title: "The Last Lighthouse", author: "S. Whitfield", gradient: "linear-gradient(160deg, #5f3dc4, #1864ab)", pages: 12 },
];

const PAGE_TEXTS = [
  "The morning light filtered through the curtains, casting long shadows across the room. She had been awake for hours, listening to the quiet sounds of the house settling around her. Today was the day. Everything she had worked for would either come together or fall apart, and there was nothing more she could do to influence the outcome.",
  "Outside, the city was already in motion. Cars hummed along the wet streets, their headlights cutting through the lingering mist. A delivery truck idled at the corner, its driver consulting a phone. Somewhere, a door slammed, and a dog barked twice before falling silent.",
  "She poured herself a second cup of coffee and watched the steam curl upward. The ritual was a comfort—the weight of the ceramic mug, the bitter warmth of the first sip, the way the world seemed to slow for just a moment before accelerating again into the rush of the day.",
  "There was a notebook on the counter, open to a page filled with her handwriting. She had read it so many times the words had begun to lose meaning, becoming shapes instead of instructions. But she knew what it said. She had memorized it weeks ago, and the memory surfaced now unbidden, line by line.",
  "The phone buzzed. She didn't look at it. Whoever it was could wait. The next few hours belonged to her, and she intended to hold on to them for as long as she could before the world came rushing in with its demands and its noise.",
];

function pageContent(page: number): string {
  const a = PAGE_TEXTS[page % PAGE_TEXTS.length];
  const b = PAGE_TEXTS[(page + 1) % PAGE_TEXTS.length];
  return a + "\n\n" + b;
}

export function BooksApp() {
  const [book, setBook] = useState<Book | null>(null);
  const [page, setPage] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const openBook = (b: Book) => {
    sfx.pop();
    setBook(b);
    setPage(0);
  };
  const closeBook = () => {
    sfx.tick();
    setBook(null);
  };
  const next = () => {
    if (book && page < book.pages - 1) {
      setPage(page + 1);
      sfx.tick();
    }
  };
  const prev = () => {
    if (page > 0) {
      setPage(page - 1);
      sfx.tick();
    }
  };

  if (book) {
    return (
      <div className="flex h-full flex-col bg-ios-bg">
        <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
          <div className="glass absolute inset-0" style={{ borderBottom: "0.5px solid var(--ios-sep)" }} />
          <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
            <NavBtn onClick={closeBook}>
              <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
              <span className="-ml-1">Library</span>
            </NavBtn>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFontSize((f) => Math.max(14, f - 2))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-fill text-ios-label active:opacity-60"
              >
                <Minus size={16} />
              </button>
              <span className="text-[14px] font-medium tabular-nums">A</span>
              <button
                onClick={() => setFontSize((f) => Math.min(28, f + 2))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-fill text-ios-label active:opacity-60"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 flex-col px-6"
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            if (!swipe.current) return;
            const dx = e.clientX - swipe.current.x;
            const dy = e.clientY - swipe.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              if (dx < 0) next();
              else prev();
            }
            swipe.current = null;
          }}
        >
          <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
          <div className="flex-1 overflow-y-auto pt-4">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-ios-label2">{book.title}</div>
            <div className="mt-4 space-y-4" style={{ fontSize, lineHeight: 1.6 }}>
              {pageContent(page)
                .split("\n\n")
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
          <div className="pb-6 pt-4 text-center text-[13px] tabular-nums text-ios-label2">
            Page {page + 1} of {book.pages}
          </div>
        </div>

        <div
          className="pointer-events-none absolute left-0 flex items-center"
          style={{ top: "calc(var(--safe-top) + 44px)", bottom: "calc(var(--safe-bottom) + 60px)" }}
        >
          <button
            onClick={prev}
            disabled={page === 0}
            className="pointer-events-auto flex h-12 w-10 items-center justify-center text-ios-label3 disabled:opacity-30"
          >
            <ChevronLeft size={28} />
          </button>
        </div>
        <div
          className="pointer-events-none absolute right-0 flex items-center"
          style={{ top: "calc(var(--safe-top) + 44px)", bottom: "calc(var(--safe-bottom) + 60px)" }}
        >
          <button
            onClick={next}
            disabled={page >= book.pages - 1}
            className="pointer-events-auto flex h-12 w-10 items-center justify-center text-ios-label3 disabled:opacity-30"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ios-bg">
      <Page title="Library" bg="bg-ios-bg">
        <div className="grid grid-cols-3 gap-4 px-4">
          {BOOKS.map((b) => (
            <button key={b.id} onClick={() => openBook(b)} className="text-left active:opacity-70">
              <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] shadow-md" style={{ background: b.gradient }}>
                <div className="absolute inset-0 flex flex-col justify-between p-2.5 text-white">
                  <div className="text-[13px] font-bold leading-tight" style={{ letterSpacing: "-0.01em" }}>
                    {b.title}
                  </div>
                  <div className="text-[9px] uppercase opacity-80">{b.author}</div>
                </div>
                <div className="absolute left-0 top-0 h-full w-[3px] bg-black/20" />
              </div>
              <div className="mt-1.5 truncate text-[12px] font-medium">{b.title}</div>
              <div className="truncate text-[11px] text-ios-label2">{b.author}</div>
            </button>
          ))}
        </div>
      </Page>
    </div>
  );
}

/* ================================================================== */
/* TV                                                                  */
/* ================================================================== */

interface TVEp {
  id: string;
  title: string;
  duration: number;
  description: string;
}
interface TVShow {
  id: string;
  title: string;
  subtitle: string;
  gradient: string;
  description: string;
  seasons: number;
  episodes: TVEp[];
}

const TV_SHOWS: TVShow[] = [
  {
    id: "t1",
    title: "The Last Frontier",
    subtitle: "Season 1",
    gradient: "linear-gradient(160deg, #1864ab, #0b3d6b)",
    description: "A gripping drama about a family struggling to hold onto their homestead on the edge of the known world.",
    seasons: 1,
    episodes: [
      { id: "t1e1", title: "Pilot: Arrival", duration: 3240, description: "The family arrives at their new land." },
      { id: "t1e2", title: "The First Winter", duration: 2880, description: "Survival tested as cold sets in." },
      { id: "t1e3", title: "The Crossing", duration: 3120, description: "A perilous journey for supplies." },
      { id: "t1e4", title: "New Neighbors", duration: 2700, description: "Tensions rise with a neighboring settlement." },
    ],
  },
  {
    id: "t2",
    title: "Quantum Bay",
    subtitle: "Season 2",
    gradient: "linear-gradient(160deg, #5f3dc4, #3c1e96)",
    description: "In a near-future coastal city, a physicist uncovers a conspiracy that bends reality itself.",
    seasons: 2,
    episodes: [
      { id: "t2e1", title: "The Anomaly", duration: 2940, description: "A signal from the deep." },
      { id: "t2e2", title: "Phase Shift", duration: 3060, description: "Reality begins to slip." },
      { id: "t2e3", title: "The Observer", duration: 2820, description: "A stranger knows too much." },
    ],
  },
  {
    id: "t3",
    title: "The Heist Club",
    subtitle: "Season 1",
    gradient: "linear-gradient(160deg, #c2255c, #7e1448)",
    description: "Four strangers are recruited for the crime of a century — if they can trust each other.",
    seasons: 1,
    episodes: [
      { id: "t3e1", title: "The Recruitment", duration: 3180, description: "A mysterious benefactor assembles the crew." },
      { id: "t3e2", title: "The Blueprint", duration: 2700, description: "Scouting the target." },
      { id: "t3e3", title: "Practice Run", duration: 2880, description: "A rehearsal goes sideways." },
    ],
  },
  {
    id: "t4",
    title: "Midnight Diner",
    subtitle: "Season 3",
    gradient: "linear-gradient(160deg, #d9480f, #8b2900)",
    description: "A late-night Tokyo diner serves up stories, secrets, and the best ramen in town.",
    seasons: 3,
    episodes: [
      { id: "t4e1", title: "The Regular", duration: 2520, description: "A familiar face returns." },
      { id: "t4e2", title: "Special Order", duration: 2640, description: "A dish off the menu." },
    ],
  },
  {
    id: "t5",
    title: "Empire Falls",
    subtitle: "Season 1",
    gradient: "linear-gradient(160deg, #2b8a3e, #14532d)",
    description: "Three generations of a family grapple with the legacy of a fallen business empire.",
    seasons: 1,
    episodes: [
      { id: "t5e1", title: "Inheritance", duration: 3360, description: "The patriarch passes." },
      { id: "t5e2", title: "The Will", duration: 2940, description: "Surprises in the reading." },
      { id: "t5e3", title: "Hostile Takeover", duration: 3120, description: "A rival makes a move." },
    ],
  },
  {
    id: "t6",
    title: "The Code",
    subtitle: "Season 2",
    gradient: "linear-gradient(160deg, #1864ab, #5f3dc4)",
    description: "A brilliant cryptographer races to stop a cyber-weapon before it's unleashed.",
    seasons: 2,
    episodes: [
      { id: "t6e1", title: "Breach", duration: 2820, description: "The firewall falls." },
      { id: "t6e2", title: "Zero Day", duration: 2940, description: "A countdown begins." },
    ],
  },
  {
    id: "t7",
    title: "Wild Coast",
    subtitle: "Season 1",
    gradient: "linear-gradient(160deg, #0b7285, #084c54)",
    description: "A breathtaking documentary series exploring life along the world's most remote shorelines.",
    seasons: 1,
    episodes: [
      { id: "t7e1", title: "Patagonia", duration: 3300, description: "Whales and wind at land's end." },
      { id: "t7e2", title: "The Faroes", duration: 3120, description: "Cliffs and seabird cities." },
      { id: "t7e3", title: "Alaska", duration: 3240, description: "Bears, salmon, and ice." },
    ],
  },
  {
    id: "t8",
    title: "Echoes",
    subtitle: "Season 1",
    gradient: "linear-gradient(160deg, #5f3dc4, #c2255c)",
    description: "A woman discovers she can hear the past — but the past can hear her too.",
    seasons: 1,
    episodes: [
      { id: "t8e1", title: "The First Voice", duration: 2880, description: "A whisper from the walls." },
      { id: "t8e2", title: "Answers", duration: 3000, description: "A name surfaces." },
      { id: "t8e3", title: "The Reply", duration: 2940, description: "Someone answers back." },
    ],
  },
];

const UP_NEXT = [
  { id: "u1", showId: "t1", episodeIndex: 2, progress: 0.65 },
  { id: "u2", showId: "t2", episodeIndex: 0, progress: 0.22 },
  { id: "u3", showId: "t4", episodeIndex: 1, progress: 0.88 },
  { id: "u4", showId: "t6", episodeIndex: 0, progress: 0.40 },
  { id: "u5", showId: "t7", episodeIndex: 2, progress: 0.10 },
];

const CHANNELS_TV = ["Apple TV+", "HBO Max", "Disney+", "Hulu", "Paramount+", "Peacock"];

function TVThumb({ show, className = "", children }: { show: TVShow; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: show.gradient }}>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
      {children}
    </div>
  );
}

function ShowDetail({ show, onClose }: { show: TVShow; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(30px) saturate(180%)" }} />
        <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
          <button onClick={onClose} className="flex items-center text-white active:opacity-60">
            <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
            <span className="-ml-1">TV</span>
          </button>
        </div>
      </div>
      <ScrollView className="min-h-0 flex-1">
        <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
        <TVThumb show={show} className="relative h-[260px] w-full">
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 pt-20">
            <div className="text-[28px] font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
              {show.title}
            </div>
            <div className="text-[14px] text-white/70">
              {show.subtitle} · {show.seasons} Season{show.seasons > 1 ? "s" : ""}
            </div>
          </div>
        </TVThumb>
        <div className="px-4 py-4">
          <button
            onClick={() => useOS.getState().showToast(`Playing: ${show.episodes[0].title}`)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-white py-2.5 text-[17px] font-semibold text-black active:opacity-80"
          >
            <Play size={20} fill="#000" /> Play
          </button>
          <p className="text-[16px] leading-[24px] text-white/85">{show.description}</p>
          <div className="mb-2 mt-5 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>
            Episodes
          </div>
          {show.episodes.map((ep, i) => (
            <button
              key={ep.id}
              onClick={() => useOS.getState().showToast(`Playing: ${ep.title}`)}
              className="ios-row flex w-full items-center gap-3 py-2.5 text-left active:bg-white/5"
              style={{ ["--sep-left" as string]: "16px" }}
            >
              <div className="w-6 text-center text-[20px] font-bold text-white/40 tabular-nums">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium">{ep.title}</div>
                <div className="truncate text-[13px] text-white/55">{ep.description}</div>
              </div>
              <span className="text-[13px] tabular-nums text-white/45">{Math.floor(ep.duration / 60)}m</span>
            </button>
          ))}
        </div>
        <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />
      </ScrollView>
    </div>
  );
}

export function TVApp() {
  const [tab, setTab] = useState<"watch" | "originals" | "search">("watch");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<TVShow | null>(null);

  const featured = TV_SHOWS[0];
  const searchResults = q
    ? TV_SHOWS.filter((s) => (s.title + s.subtitle + s.description).toLowerCase().includes(q.toLowerCase()))
    : [];

  const openDetail = (s: TVShow) => {
    sfx.pop();
    setDetail(s);
  };

  return (
    <div className="force-dark relative flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        {tab === "watch" && (
          <Page title="Watch Now" bg="bg-ios-bg">
            <div className="px-4">
              <button
                onClick={() => openDetail(featured)}
                className="relative block h-[400px] w-full overflow-hidden rounded-[16px] text-left text-white active:scale-[0.99]"
                style={{ background: featured.gradient }}
              >
                <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-24">
                  <div className="text-[12px] font-semibold uppercase opacity-80">Featured Series</div>
                  <div className="text-[30px] font-bold leading-tight" style={{ letterSpacing: "-0.02em" }}>
                    {featured.title}
                  </div>
                  <div className="mt-1 text-[14px] opacity-85">{featured.subtitle}</div>
                </div>
                <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white">
                  <Play size={20} fill="#000" className="ml-0.5" />
                </div>
              </button>
            </div>

            <div className="mb-1 mt-5 px-4 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>
              Up Next
            </div>
            {UP_NEXT.map((u) => {
              const s = TV_SHOWS.find((x) => x.id === u.showId)!;
              const ep = s.episodes[u.episodeIndex];
              return (
                <button
                  key={u.id}
                  onClick={() => openDetail(s)}
                  className="ios-row flex w-full items-center gap-3 px-4 py-2 text-left active:bg-white/5"
                  style={{ ["--sep-left" as string]: "120px" }}
                >
                  <TVThumb show={s} className="relative h-[68px] w-[108px] shrink-0 rounded-[8px]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={20} fill="rgba(255,255,255,0.9)" />
                    </div>
                    <div className="absolute bottom-0 left-0 h-[3px] bg-ios-red" style={{ width: `${u.progress * 100}%` }} />
                  </TVThumb>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{ep.title}</div>
                    <div className="truncate text-[13px] text-white/55">{s.title}</div>
                    <div className="mt-0.5 text-[12px] text-white/45">{Math.round(u.progress * 100)}% watched</div>
                  </div>
                </button>
              );
            })}

            <div className="mb-1 mt-5 px-4 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>
              Channels
            </div>
            <ScrollView axis="x" className="px-4 pb-2">
              <div className="flex gap-3">
                {CHANNELS_TV.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => useOS.getState().showToast(`${c} — coming soon`)}
                    className="flex h-[80px] w-[160px] shrink-0 items-center justify-center rounded-[12px] text-[16px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${i * 45} 65% 45%), hsl(${i * 45 + 30} 55% 30%))` }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </ScrollView>
          </Page>
        )}

        {tab === "originals" && (
          <Page title="Originals" bg="bg-ios-bg">
            <div className="mb-2 flex items-center gap-2 px-4 text-[13px] font-semibold uppercase text-white/60">
              <Sparkles size={13} /> Apple TV+ Originals
            </div>
            <div className="grid grid-cols-2 gap-3 px-4">
              {TV_SHOWS.map((s) => (
                <button key={s.id} onClick={() => openDetail(s)} className="text-left active:opacity-70">
                  <TVThumb show={s} className="aspect-video w-full rounded-[10px]">
                    <div className="absolute bottom-1.5 left-2 right-2 truncate text-[13px] font-semibold text-white">
                      {s.title}
                    </div>
                  </TVThumb>
                  <div className="mt-1 truncate text-[12px] text-white/55">{s.subtitle}</div>
                </button>
              ))}
            </div>
          </Page>
        )}

        {tab === "search" && (
          <Page title="Search" bg="bg-ios-bg">
            <div className="px-4 pb-2">
              <SearchField value={q} onChange={setQ} placeholder="Shows, Movies, More" dark />
            </div>
            {q ? (
              searchResults.length ? (
                <div className="grid grid-cols-2 gap-3 px-4">
                  {searchResults.map((s) => (
                    <button key={s.id} onClick={() => openDetail(s)} className="text-left active:opacity-70">
                      <TVThumb show={s} className="aspect-video w-full rounded-[10px]">
                        <div className="absolute bottom-1.5 left-2 right-2 truncate text-[13px] font-semibold text-white">
                          {s.title}
                        </div>
                      </TVThumb>
                      <div className="mt-1 truncate text-[12px] text-white/55">{s.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty icon={Search} title="No Results" text={`No shows match "${q}".`} />
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4 pt-2">
                {["Drama", "Comedy", "Thriller", "Documentary", "Sci-Fi", "Mystery"].map((g, i) => (
                  <button
                    key={g}
                    onClick={() => setQ(g.slice(0, 3).toLowerCase())}
                    className="h-[90px] rounded-[10px] p-3 text-left text-[18px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${i * 55 + 10} 60% 50%), hsl(${i * 55 + 50} 55% 32%))` }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </Page>
        )}
      </div>

      <TabBar
        dark
        tabs={[
          { id: "watch", label: "Watch Now", icon: Tv, fill: true },
          { id: "originals", label: "Originals", icon: Clapperboard },
          { id: "search", label: "Search", icon: Search },
        ]}
        value={tab}
        onChange={setTab}
      />

      {detail && <ShowDetail show={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
