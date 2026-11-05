import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  Compass,
  Flame,
  Globe2,
  Heart,
  Home,
  Library,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  SkipForward,
  Sparkles,
  User,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Empty, NavBtn, Page, SearchField, TabBar } from "../os/ui";
import { useOS } from "../os/store";
import { TRACKS, musicNext, musicPlay, musicToggle } from "../os/music";

const color = (hue: number, lightness = 38) => `linear-gradient(135deg, hsl(${hue} 72% ${lightness + 14}%), hsl(${hue + 48} 72% ${lightness}%))`;
const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/* ------------------------------------------------------------------ */
/* Spotify                                                             */
/* ------------------------------------------------------------------ */

const PLAYLISTS = [
  { id: "liked", name: "Liked Songs", detail: "Your favorite tracks", hue: 260, tracks: [0, 1, 3, 4, 7] },
  { id: "discover", name: "Discover Weekly", detail: "New music for you", hue: 210, tracks: [2, 5, 6, 7] },
  { id: "daily", name: "Daily Mix 1", detail: "Midnight Circuit and more", hue: 335, tracks: [0, 4, 7] },
  { id: "chill", name: "Chill Vibes", detail: "Take it easy", hue: 185, tracks: [1, 3, 6] },
  { id: "rock", name: "Rock Classics", detail: "Turn it up", hue: 25, tracks: [0, 2, 5] },
  { id: "focus", name: "Focus Flow", detail: "Stay in the zone", hue: 145, tracks: [3, 6, 7] },
];

function SpotifyTrackRow({ index, playing, onPlay }: { index: number; playing: boolean; onPlay: () => void }) {
  const track = TRACKS[index];
  return (
    <button onClick={onPlay} className="ios-row flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-white/5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded" style={{ background: color(track.hue) }}>
        {playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" className="ml-0.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-[15px] font-medium ${playing ? "text-[#1ed760]" : "text-white"}`}>{track.title}</div>
        <div className="truncate text-[12px] text-white/50">{track.artist} · {track.album}</div>
      </div>
      <span className="text-[12px] tabular-nums text-white/40">{duration(track.dur)}</span>
    </button>
  );
}

export function SpotifyApp() {
  const os = useOS();
  const [tab, setTab] = useState<"home" | "search" | "library">("home");
  const [query, setQuery] = useState("");
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>(["liked", "chill"]);
  const playlist = PLAYLISTS.find((p) => p.id === playlistId) ?? null;
  const results = TRACKS.map((track, index) => ({ track, index })).filter(({ track }) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.toLowerCase()));
  const current = TRACKS[os.music.idx];

  const play = (index: number) => {
    if (os.music.active && os.music.idx === index) musicToggle();
    else musicPlay(index);
  };

  return (
    <div className="force-dark relative flex h-full flex-col overflow-hidden bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {tab === "home" && (
          <Page title="Spotify" bg="bg-black" large={false} noPad>
            <div className="px-4 pb-5">
              <div className="mb-4 text-[28px] font-bold tracking-tight">Good evening</div>
              <div className="grid grid-cols-2 gap-2">
                {PLAYLISTS.map((p) => (
                  <button key={p.id} onClick={() => setPlaylistId(p.id)} className="flex items-center gap-2 overflow-hidden rounded-md bg-white/10 text-left active:bg-white/20">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center" style={{ background: color(p.hue) }}>
                      {p.id === "liked" ? <Heart size={22} fill="#fff" /> : <Play size={21} fill="#fff" />}
                    </div>
                    <div className="min-w-0 flex-1 pr-2 text-[13px] font-semibold leading-tight">{p.name}</div>
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-6 text-[20px] font-bold">Made for you</div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scroll">
                {PLAYLISTS.slice(1).map((p) => (
                  <button key={p.id} onClick={() => setPlaylistId(p.id)} className="w-[130px] shrink-0 text-left active:opacity-70">
                    <div className="flex h-[130px] w-full items-center justify-center rounded-md shadow-lg" style={{ background: color(p.hue) }}><Play size={34} fill="#fff" /></div>
                    <div className="mt-1 truncate text-[13px] font-semibold">{p.name}</div>
                    <div className="truncate text-[11px] text-white/60">{p.detail}</div>
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-5 text-[20px] font-bold">Popular artists</div>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scroll">
                {[...new Set(TRACKS.map((track) => track.artist))].map((artist, i) => (
                  <button key={artist} onClick={() => { setQuery(artist); setTab("search"); }} className="w-[100px] shrink-0 text-center active:opacity-70">
                    <div className="mx-auto flex h-[96px] w-[96px] items-center justify-center rounded-full text-[28px] font-bold" style={{ background: color(i * 55 + 20) }}>{artist.charAt(0)}</div>
                    <div className="mt-1 truncate text-[12px] font-semibold">{artist}</div>
                  </button>
                ))}
              </div>
            </div>
          </Page>
        )}

        {tab === "search" && (
          <Page title="Search" bg="bg-black" noPad>
            <div className="px-4 pb-2"><SearchField dark value={query} onChange={setQuery} placeholder="Songs, artists, or albums" /></div>
            {results.length ? results.map(({ index }) => <SpotifyTrackRow key={index} index={index} playing={os.music.active && os.music.idx === index && os.music.playing} onPlay={() => play(index)} />) : <Empty icon={Search} title="No results" text={`Nothing found for “${query}”.`} />}
          </Page>
        )}

        {tab === "library" && (
          <Page title="Your Library" bg="bg-black" noPad>
            <div className="px-4 pb-2 text-[13px] text-white/50">{saved.length} saved playlists</div>
            {PLAYLISTS.map((p) => {
              const isSaved = saved.includes(p.id);
              return (
                <div key={p.id} className="ios-row flex items-center gap-3 px-4 py-2.5">
                  <button onClick={() => setPlaylistId(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded" style={{ background: color(p.hue) }}>{p.id === "liked" ? <Heart size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}</div>
                    <div className="min-w-0"><div className="truncate text-[15px] font-medium">{p.name}</div><div className="truncate text-[12px] text-white/50">Playlist · {p.tracks.length} songs</div></div>
                  </button>
                  <button aria-label={`${isSaved ? "Remove" : "Save"} ${p.name}`} onClick={() => setSaved((items) => isSaved ? items.filter((id) => id !== p.id) : [...items, p.id])} className={isSaved ? "text-[#1ed760]" : "text-white/40"}><Check size={21} /></button>
                </div>
              );
            })}
          </Page>
        )}

        {playlist && (
          <div className="absolute inset-0 z-30 bg-black">
            <Page title={playlist.name} bg="bg-black" large={false} left={<NavBtn onClick={() => setPlaylistId(null)}><ChevronLeft size={24} /> Back</NavBtn>} noPad>
              <div className="flex flex-col items-center px-5 pb-5 pt-2">
                <div className="flex h-40 w-40 items-center justify-center rounded-lg shadow-2xl" style={{ background: color(playlist.hue) }}><Heart size={56} fill="#fff" /></div>
                <div className="mt-4 text-[25px] font-bold">{playlist.name}</div>
                <div className="mt-1 text-[13px] text-white/50">{playlist.detail} · {playlist.tracks.length} songs</div>
                <button onClick={() => play(playlist.tracks[0])} className="mt-4 flex items-center gap-2 rounded-full bg-[#1ed760] px-7 py-2.5 font-semibold text-black active:scale-95"><Play size={19} fill="#000" /> Play</button>
              </div>
              {playlist.tracks.map((index) => <SpotifyTrackRow key={index} index={index} playing={os.music.active && os.music.idx === index && os.music.playing} onPlay={() => play(index)} />)}
            </Page>
          </div>
        )}
      </div>

      {os.music.active && (
        <div className="flex h-[58px] shrink-0 items-center gap-3 border-t border-white/10 bg-[#181818] px-3">
          <div className="h-10 w-10 rounded" style={{ background: color(current.hue) }} />
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{current.title}</div><div className="truncate text-[11px] text-white/50">{current.artist}</div></div>
          <button aria-label={os.music.playing ? "Pause" : "Play"} onClick={musicToggle} className="p-2">{os.music.playing ? <Pause size={23} fill="#fff" /> : <Play size={23} fill="#fff" />}</button>
          <button aria-label="Next song" onClick={() => musicNext()} className="p-2"><SkipForward size={22} fill="#fff" /></button>
        </div>
      )}
      <TabBar dark tabs={[{ id: "home", label: "Home", icon: Home }, { id: "search", label: "Search", icon: Search }, { id: "library", label: "Your Library", icon: Library }]} value={tab} onChange={(next) => { setTab(next); setPlaylistId(null); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* YouTube                                                             */
/* ------------------------------------------------------------------ */

interface VideoItem { id: string; title: string; channel: string; views: string; time: string; length: string; hue: number }
const VIDEOS: VideoItem[] = [
  { id: "v1", title: "iOS 27 — What's New", channel: "Apple Explained", views: "2.1M views", time: "3 days ago", length: "12:34", hue: 210 },
  { id: "v2", title: "Building a Full iOS Simulator in React", channel: "Code Lab", views: "847K views", time: "1 week ago", length: "8:42", hue: 15 },
  { id: "v3", title: "Lo-fi Hip Hop Radio — Beats to Relax/Study", channel: "Lofi Girl", views: "12M views", time: "Streaming now", length: "LIVE", hue: 275 },
  { id: "v4", title: "How Apple's M5 Chip Was Made", channel: "Tech Review", views: "5.4M views", time: "2 weeks ago", length: "15:21", hue: 220 },
  { id: "v5", title: "Tesla Roadster — First Drive Review", channel: "Top Gear", views: "1.8M views", time: "5 days ago", length: "10:12", hue: 0 },
  { id: "v6", title: "Mountain Sunrise 4K Drone Footage", channel: "Nature 4K", views: "320K views", time: "1 month ago", length: "5:47", hue: 145 },
];

function VideoCard({ video, onOpen }: { video: VideoItem; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="mb-4 block w-full text-left active:opacity-75">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl" style={{ background: color(video.hue) }}>
        <div className="absolute inset-0 flex items-center justify-center"><Play size={38} fill="#fff" className="opacity-80" /></div>
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">{video.length}</div>
      </div>
      <div className="mt-2 flex gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: color(video.hue + 30, 48) }}>{video.channel.charAt(0)}</div>
        <div className="min-w-0 flex-1"><div className="line-clamp-2 text-[14px] font-semibold leading-tight">{video.title}</div><div className="mt-0.5 text-[12px] text-white/60">{video.channel} · {video.views} · {video.time}</div></div>
      </div>
    </button>
  );
}

export function YouTubeApp() {
  const [tab, setTab] = useState<"home" | "subscriptions" | "library">("home");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!playing || !selected) return;
    const timer = window.setInterval(() => setProgress((value) => value >= 100 ? 0 : value + 0.5), 500);
    return () => window.clearInterval(timer);
  }, [playing, selected]);

  const openVideo = (video: VideoItem) => {
    setSelected(video);
    setPlaying(true);
    setProgress(0);
    setHistory((items) => [video.id, ...items.filter((id) => id !== video.id)]);
  };
  const filtered = VIDEOS.filter((video) => `${video.title} ${video.channel}`.toLowerCase().includes(query.toLowerCase()));
  const shown = tab === "subscriptions" ? filtered.filter((_, i) => i % 2 === 0) : filtered;
  const historyVideos = history.map((id) => VIDEOS.find((video) => video.id === id)).filter((video): video is VideoItem => !!video);

  return (
    <div className="force-dark relative flex h-full flex-col overflow-hidden bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {tab !== "library" ? (
          <Page title={tab === "home" ? "YouTube" : "Subscriptions"} bg="bg-black" large={false} noPad>
            <div className="px-3 pb-3"><SearchField dark value={query} onChange={setQuery} placeholder="Search YouTube" /></div>
            <div className="px-3">{shown.length ? shown.map((video) => <VideoCard key={video.id} video={video} onOpen={() => openVideo(video)} />) : <Empty icon={Video} title="No videos" text="Try another search." />}</div>
          </Page>
        ) : (
          <Page title="Library" bg="bg-black" large={false} noPad>
            <div className="px-4 pb-3 text-[20px] font-bold">History</div>
            <div className="px-3">{historyVideos.length ? historyVideos.map((video) => <VideoCard key={video.id} video={video} onOpen={() => openVideo(video)} />) : <Empty icon={Clock} title="No watch history" text="Videos you watch will appear here." />}</div>
          </Page>
        )}

        {selected && (
          <div className="absolute inset-0 z-30 bg-black">
            <Page title="Now Playing" bg="bg-black" large={false} left={<NavBtn onClick={() => { setSelected(null); setPlaying(false); }}><ChevronLeft size={24} /> Back</NavBtn>} noPad>
              <button onClick={() => setPlaying((value) => !value)} className="relative mt-2 flex aspect-video w-full items-center justify-center" style={{ background: color(selected.hue) }}>
                {playing ? <Pause size={52} fill="#fff" /> : <Play size={52} fill="#fff" />}
                <span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-[12px]">{selected.length}</span>
              </button>
              <div className="px-4 py-2"><input aria-label="Video progress" type="range" min="0" max="100" step="0.1" value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-[#ff0000]" /></div>
              <div className="px-4"><div className="text-[19px] font-semibold leading-snug">{selected.title}</div><div className="mt-1 text-[12px] text-white/55">{selected.views} · {selected.time}</div></div>
              <div className="mt-3 flex items-center gap-3 border-y border-white/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold" style={{ background: color(selected.hue + 30) }}>{selected.channel.charAt(0)}</div>
                <div className="flex-1 text-[14px] font-medium">{selected.channel}</div>
                <button onClick={() => setLiked((items) => items.includes(selected.id) ? items.filter((id) => id !== selected.id) : [...items, selected.id])} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] ${liked.includes(selected.id) ? "bg-white text-black" : "bg-white/10"}`}><Heart size={16} fill={liked.includes(selected.id) ? "currentColor" : "none"} /> Like</button>
              </div>
              <div className="m-4 rounded-xl bg-white/10 p-3 text-[13px] leading-5 text-white/75">A simulated video player for this offline demo. Press play, scrub the timeline, or explore another video.</div>
            </Page>
          </div>
        )}
      </div>
      <TabBar dark tabs={[{ id: "home", label: "Home", icon: Home, fill: true }, { id: "subscriptions", label: "Subscriptions", icon: Video }, { id: "library", label: "Library", icon: Library }]} value={tab} onChange={(next) => { setTab(next); setSelected(null); setPlaying(false); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instagram                                                           */
/* ------------------------------------------------------------------ */

interface InstaPost { id: string; user: string; caption: string; likes: number; time: string; hue: number }
const INITIAL_POSTS: InstaPost[] = [
  { id: "p1", user: "alex.rivera", caption: "Hiking the Eagle Point trail this weekend 🥾", likes: 234, time: "2 hours ago", hue: 210 },
  { id: "p2", user: "taylor.kim", caption: "Ramen from the new spot downtown 🍜", likes: 412, time: "5 hours ago", hue: 15 },
  { id: "p3", user: "sam.patel", caption: "Coffee and code. Best combination ☕", likes: 89, time: "8 hours ago", hue: 100 },
];
const STORIES = ["Your story", "alex.rivera", "taylor.kim", "sam.patel", "jordan.lee", "priya.shah"];

export function InstagramApp() {
  const [tab, setTab] = useState<"home" | "explore" | "reels" | "activity" | "profile">("home");
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [story, setStory] = useState<number | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<Record<string, string[]>>({});
  const [composer, setComposer] = useState(false);
  const [caption, setCaption] = useState("");
  const [reelPlaying, setReelPlaying] = useState(true);

  const toggle = (items: string[], id: string) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
  const addComment = (event: FormEvent, id: string) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setComments((all) => ({ ...all, [id]: [...(all[id] ?? []), draft.trim()] }));
    setDraft("");
  };
  const publish = (event: FormEvent) => {
    event.preventDefault();
    if (!caption.trim()) return;
    setPosts((items) => [{ id: `mine-${Date.now()}`, user: "you", caption: caption.trim(), likes: 0, time: "Just now", hue: 315 }, ...items]);
    setCaption("");
    setComposer(false);
    setTab("home");
  };

  const postCard = (post: InstaPost) => {
    const isLiked = liked.includes(post.id);
    return (
      <article key={post.id} className="mb-5">
        <div className="flex items-center gap-2 px-4 py-2"><div className="h-8 w-8 rounded-full" style={{ background: color(post.hue, 50) }} /><span className="flex-1 text-[13px] font-semibold">{post.user}</span><MoreHorizontal size={20} className="text-white/60" /></div>
        <button aria-label={`Like ${post.user}'s post`} onClick={() => setLiked((items) => toggle(items, post.id))} className="block aspect-square w-full" style={{ background: color(post.hue) }} />
        <div className="flex items-center gap-4 px-4 pt-2">
          <button aria-label="Like post" onClick={() => setLiked((items) => toggle(items, post.id))} className={isLiked ? "text-[#ff3040]" : ""}><Heart size={25} fill={isLiked ? "currentColor" : "none"} /></button>
          <button aria-label="Comment" onClick={() => setCommentFor(commentFor === post.id ? null : post.id)}><MessageCircle size={24} /></button>
          <button aria-label="Save post" onClick={() => setSaved((items) => toggle(items, post.id))} className="ml-auto"><Bookmark size={24} fill={saved.includes(post.id) ? "currentColor" : "none"} /></button>
        </div>
        <div className="px-4 pt-1 text-[13px] font-semibold">{post.likes + (isLiked ? 1 : 0)} likes</div>
        <div className="px-4 pt-1 text-[13px] leading-[18px]"><b>{post.user}</b> {post.caption}</div>
        {(comments[post.id] ?? []).map((comment, i) => <div key={i} className="px-4 pt-1 text-[13px]"><b>you</b> {comment}</div>)}
        {commentFor === post.id && <form onSubmit={(event) => addComment(event, post.id)} className="mt-2 flex gap-2 px-4"><input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-full bg-white/10 px-3 py-2 text-[13px] outline-none" /><button aria-label="Post comment" type="submit" className="text-ios-blue"><Send size={20} /></button></form>}
        <div className="px-4 pt-1 text-[11px] text-white/40">{post.time}</div>
      </article>
    );
  };

  return (
    <div className="force-dark relative flex h-full flex-col overflow-hidden bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {tab === "home" && <Page title="Instagram" bg="bg-black" large={false} right={<div className="flex gap-3"><button aria-label="New post" onClick={() => setComposer(true)}><Plus size={23} /></button><button aria-label="Activity" onClick={() => setTab("activity")}><Heart size={23} /></button></div>} noPad>
          <div className="flex gap-3 overflow-x-auto border-b border-white/10 px-3 py-3 hide-scroll">{STORIES.map((name, i) => <button key={name} onClick={() => setStory(i)} className="flex w-[64px] shrink-0 flex-col items-center gap-1"><div className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]" style={{ background: i === 0 ? "#444" : "linear-gradient(135deg,#ff8a00,#e52e71,#7028e4)" }}><div className="flex h-full w-full items-center justify-center rounded-full border-2 border-black font-bold" style={{ background: color(i * 45, 48) }}>{i === 0 ? <Plus size={20} /> : name.charAt(0).toUpperCase()}</div></div><span className="w-full truncate text-center text-[11px]">{name}</span></button>)}</div>
          <div className="pt-3">{posts.map(postCard)}</div>
        </Page>}
        {tab === "explore" && <Page title="Explore" bg="bg-black" large={false} noPad><div className="grid grid-cols-3 gap-[2px]">{Array.from({ length: 18 }, (_, i) => <button key={i} onClick={() => { setTab("home"); setStory((i % 5) + 1); }} className="aspect-square" style={{ background: color(i * 27) }} />)}</div></Page>}
        {tab === "reels" && <div className="relative h-full"><button onClick={() => setReelPlaying((value) => !value)} className="flex h-full w-full items-center justify-center" style={{ background: color(280) }}>{reelPlaying ? <Pause size={60} fill="#fff" /> : <Play size={60} fill="#fff" />}</button><div className="pointer-events-none absolute inset-x-5 bottom-6"><div className="text-[18px] font-bold">@alex.rivera</div><div className="mt-1 text-[14px]">Weekend adventures · #reels</div></div></div>}
        {tab === "activity" && <Page title="Activity" bg="bg-black" large={false}>{["alex.rivera liked your photo", "taylor.kim started following you", "sam.patel mentioned you in a comment"].map((text, i) => <div key={text} className="ios-row flex items-center gap-3 px-4 py-3"><div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: color(i * 90) }}><Heart size={19} /></div><div className="flex-1 text-[13px]">{text}<div className="text-[11px] text-white/40">{i + 1}h</div></div></div>)}</Page>}
        {tab === "profile" && <Page title="you" bg="bg-black" large={false} noPad><div className="flex items-center gap-7 px-5 py-4"><div className="flex h-20 w-20 items-center justify-center rounded-full text-[28px] font-bold" style={{ background: color(315) }}>Y</div><div className="flex flex-1 justify-around text-center"><div><b>{posts.filter((p) => p.user === "you").length}</b><div className="text-[12px] text-white/55">posts</div></div><div><b>328</b><div className="text-[12px] text-white/55">followers</div></div><div><b>291</b><div className="text-[12px] text-white/55">following</div></div></div></div><div className="px-5 pb-4"><div className="font-semibold">Your Name</div><div className="text-[13px] text-white/60">iOS Simulator explorer</div><button onClick={() => setComposer(true)} className="mt-3 w-full rounded-lg bg-white/10 py-1.5 text-[13px] font-semibold">Create post</button></div><div className="grid grid-cols-3 gap-[2px]">{posts.filter((p) => p.user === "you").map((post) => <div key={post.id} className="aspect-square" style={{ background: color(post.hue) }} />)}{saved.map((id) => { const post = posts.find((p) => p.id === id); return post ? <div key={`saved-${id}`} className="relative aspect-square" style={{ background: color(post.hue) }}><Bookmark size={18} fill="#fff" className="absolute right-2 top-2" /></div> : null; })}</div></Page>}

        {story !== null && <div className="absolute inset-0 z-40 flex flex-col" style={{ background: color(story * 45) }}><div className="flex items-center gap-3 px-4" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}><div className="h-9 w-9 rounded-full bg-white/25" /><div className="flex-1 font-semibold">{STORIES[story]}</div><button aria-label="Close story" onClick={() => setStory(null)}><X size={25} /></button></div><div className="flex flex-1 items-center justify-center text-center"><div><Sparkles size={70} className="mx-auto" /><div className="mt-4 text-[22px] font-bold">{story === 0 ? "Share your first story" : `${STORIES[story]}'s story`}</div></div></div><div className="flex justify-between p-5"><button onClick={() => setStory((value) => value === null ? null : (value + STORIES.length - 1) % STORIES.length)}>Previous</button><button onClick={() => setStory((value) => value === null || value === STORIES.length - 1 ? null : value + 1)}>Next</button></div></div>}

        {composer && <div className="absolute inset-0 z-40 bg-black"><Page title="New Post" bg="bg-black" large={false} left={<NavBtn onClick={() => setComposer(false)}>Cancel</NavBtn>}><form onSubmit={publish} className="p-4"><div className="aspect-square w-full rounded-xl" style={{ background: color(315) }} /><textarea autoFocus value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption…" className="mt-4 h-24 w-full resize-none rounded-xl bg-white/10 p-3 outline-none" /><button type="submit" disabled={!caption.trim()} className="mt-3 w-full rounded-xl bg-ios-blue py-3 font-semibold disabled:opacity-40">Share Post</button></form></Page></div>}
      </div>
      <TabBar dark tabs={[{ id: "home", label: "Home", icon: Home, fill: true }, { id: "explore", label: "Explore", icon: Compass }, { id: "reels", label: "Reels", icon: Video }, { id: "activity", label: "Activity", icon: Heart }, { id: "profile", label: "Profile", icon: User }]} value={tab} onChange={(next) => { setTab(next); setStory(null); setComposer(false); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Snapchat                                                            */
/* ------------------------------------------------------------------ */

const FRIENDS = ["Alex Rivera", "Taylor Kim", "Sam Patel", "Jordan Lee"];

export function SnapchatApp() {
  const [tab, setTab] = useState<"chat" | "camera" | "stories" | "map">("camera");
  const [flash, setFlash] = useState(false);
  const [front, setFront] = useState(true);
  const [lens, setLens] = useState(0);
  const [captures, setCaptures] = useState<string[]>([]);
  const [chat, setChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string[]>>({ "Alex Rivera": ["Are we still on for today?"] });
  const [draft, setDraft] = useState("");
  const [story, setStory] = useState<string | null>(null);
  const [friend, setFriend] = useState<string | null>(null);

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!chat || !draft.trim()) return;
    setMessages((all) => ({ ...all, [chat]: [...(all[chat] ?? []), draft.trim()] }));
    setDraft("");
  };

  return (
    <div className="force-dark relative flex h-full flex-col overflow-hidden bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {tab === "camera" && <div className="relative h-full" style={{ background: color(front ? 195 + lens * 25 : 35 + lens * 25, 30) }}>
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}><button aria-label="Profile" onClick={() => setTab("chat")} className="rounded-full bg-black/25 p-2"><User size={22} /></button><div className="rounded-full bg-black/25 px-4 py-1.5 text-[14px] font-semibold">Snapchat</div><button aria-label="Toggle flash" onClick={() => setFlash((value) => !value)} className={`rounded-full bg-black/25 p-2 ${flash ? "text-yellow-300" : ""}`}><Zap size={22} fill={flash ? "currentColor" : "none"} /></button></div>
          <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col gap-4"><button aria-label="Flip camera" onClick={() => setFront((value) => !value)} className="rounded-full bg-black/25 p-2"><RefreshCw size={21} /></button><button aria-label="Open Memories" onClick={() => useOS.getState().showToast(`${captures.length} ${captures.length === 1 ? "snap" : "snaps"} in Memories`)} className="rounded-full bg-black/25 p-2"><Bookmark size={21} /></button></div>
          {flash && <div className="pointer-events-none absolute inset-0 bg-yellow-100/10" />}
          <div className="absolute inset-x-0 bottom-5 flex flex-col items-center"><div className="mb-4 flex gap-3">{["Original", "Bright", "Dream"].map((name, i) => <button key={name} onClick={() => setLens(i)} className={`rounded-full border-2 px-3 py-2 text-[11px] ${lens === i ? "border-yellow-300 bg-yellow-300/20" : "border-white/60 bg-black/20"}`}>{name}</button>)}</div><button aria-label="Take a snap" onClick={() => { const id = `snap-${Date.now()}`; setCaptures((items) => [id, ...items]); useOS.getState().showToast("Snap saved to Memories"); }} className="h-[74px] w-[74px] rounded-full border-[5px] border-white bg-white/10 active:scale-90" /><div className="mt-2 text-[12px] text-white/75">Tap to capture · {front ? "Front" : "Rear"} camera</div></div>
        </div>}
        {tab === "chat" && <Page title="Chat" bg="bg-black" large={false} noPad>{FRIENDS.map((name, i) => <button key={name} onClick={() => setChat(name)} className="ios-row flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5"><div className="flex h-11 w-11 items-center justify-center rounded-full font-bold" style={{ background: color(i * 70 + 20, 48) }}>{name.charAt(0)}</div><div className="min-w-0 flex-1"><div className="font-semibold">{name}</div><div className="truncate text-[12px] text-white/50">{messages[name]?.at(-1) ?? "Tap to start a chat"}</div></div><MessageCircle size={20} className="text-[#0a84ff]" /></button>)}</Page>}
        {tab === "stories" && <Page title="Stories" bg="bg-black" large={false} noPad><div className="px-4 pb-2 text-[13px] font-semibold text-white/50">Friends</div><div className="grid grid-cols-2 gap-3 px-4">{FRIENDS.map((name, i) => <button key={name} onClick={() => setStory(name)} className="relative h-56 overflow-hidden rounded-xl text-left" style={{ background: color(i * 70 + 30) }}><div className="absolute inset-x-3 bottom-3"><div className="font-semibold">{name}</div><div className="text-[11px] text-white/65">{i + 1}h ago</div></div></button>)}</div></Page>}
        {tab === "map" && <div className="relative h-full bg-[#dbe9d4] text-black"><div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#7fa58a 1px,transparent 1px),linear-gradient(90deg,#7fa58a 1px,transparent 1px)", backgroundSize: "54px 54px" }} /><div className="absolute left-[8%] top-[38%] h-2 w-[90%] rotate-12 bg-white/80" /><div className="absolute left-[42%] top-0 h-full w-3 -rotate-12 bg-white/70" /><div className="absolute inset-x-0 top-0 text-center" style={{ paddingTop: "calc(var(--safe-top) + 14px)" }}><span className="rounded-full bg-white/90 px-5 py-2 font-semibold shadow">Snap Map</span></div>{FRIENDS.map((name, i) => <button key={name} onClick={() => setFriend(name)} className="absolute flex flex-col items-center" style={{ left: `${18 + (i % 2) * 48}%`, top: `${28 + Math.floor(i / 2) * 35}%` }}><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white font-bold text-white shadow-lg" style={{ background: color(i * 70 + 20, 48) }}>{name.charAt(0)}</div><span className="mt-1 rounded bg-white/85 px-1.5 text-[10px] font-medium">{name.split(" ")[0]}</span></button>)}{friend && <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white p-4 shadow-xl"><div className="font-bold">{friend}</div><div className="text-[13px] text-black/55">San Diego · Just now</div><button onClick={() => { setChat(friend); setTab("chat"); }} className="mt-3 w-full rounded-xl bg-[#0a84ff] py-2 font-semibold text-white">Message</button></div>}</div>}

        {chat && <div className="absolute inset-0 z-30 bg-black"><Page title={chat} bg="bg-black" large={false} left={<NavBtn onClick={() => setChat(null)}><ChevronLeft size={24} /> Chat</NavBtn>} noPad><div className="space-y-2 p-4">{(messages[chat] ?? []).map((message, i) => <div key={i} className={`max-w-[80%] rounded-2xl px-3 py-2 text-[14px] ${i % 2 === 0 && message.includes("?") ? "bg-[#0a84ff]" : "ml-auto bg-[#ff2d55]"}`}>{message}</div>)}{!(messages[chat]?.length) && <div className="py-16 text-center text-white/45">Send a message to {chat.split(" ")[0]}.</div>}</div></Page><form onSubmit={send} className="absolute inset-x-0 bottom-0 z-40 flex gap-2 border-t border-white/10 bg-black p-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 10px)" }}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a chat" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 outline-none" /><button aria-label="Send chat" type="submit" className="text-[#0a84ff]"><Send size={23} /></button></form></div>}
        {story && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center" style={{ background: color(FRIENDS.indexOf(story) * 70 + 30) }}><button aria-label="Close story" onClick={() => setStory(null)} className="absolute right-4 top-4 z-10" style={{ top: "calc(var(--safe-top) + 12px)" }}><X size={26} /></button><Camera size={65} /><div className="mt-4 text-[25px] font-bold">{story}</div><div className="text-white/65">Story preview</div></div>}
      </div>
      <TabBar dark tabs={[{ id: "chat", label: "Chat", icon: MessageCircle }, { id: "camera", label: "Camera", icon: Camera }, { id: "stories", label: "Stories", icon: Users }, { id: "map", label: "Map", icon: MapPin }]} value={tab} onChange={(next) => { setTab(next); setChat(null); setStory(null); setFriend(null); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DuckDuckGo                                                          */
/* ------------------------------------------------------------------ */

interface WebResult { id: string; title: string; url: string; description: string; body: string; tags: string }
const WEB_RESULTS: WebResult[] = [
  { id: "duck", title: "DuckDuckGo — Privacy, simplified.", url: "https://duckduckgo.com", description: "Search privately with tracker blocking and no search history profiling.", body: "DuckDuckGo helps protect your privacy online. This simulator keeps searches local and never sends your queries to a server.", tags: "privacy search browser duckduckgo" },
  { id: "apple", title: "Apple — iPhone and iOS", url: "https://www.apple.com/iphone", description: "Explore iPhone features, iOS apps, privacy, and accessories.", body: "iPhone brings together powerful hardware and intuitive software. This local result is provided as part of the offline simulator.", tags: "apple iphone ios technology" },
  { id: "react", title: "React — The library for web and native interfaces", url: "https://react.dev", description: "Build user interfaces out of components with React.", body: "React lets you build user interfaces from components. This simulator itself is built with React, TypeScript, and Vite.", tags: "react javascript code development web" },
  { id: "mdn", title: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Resources for developers, by developers, documenting web technologies.", body: "MDN documents HTML, CSS, JavaScript, and web APIs with guides, examples, and reference material.", tags: "web development html css javascript code" },
  { id: "sandiego", title: "San Diego travel guide", url: "https://www.sandiego.org", description: "Beaches, neighborhoods, attractions, and things to do in San Diego.", body: "Explore San Diego's beaches, Balboa Park, local food, and coastal neighborhoods in this sample offline travel guide.", tags: "san diego california travel beaches weather" },
];
interface BrowserTab { id: number; title: string; query: string; pageId: string | null }

export function DuckDuckGoApp() {
  const [tabs, setTabs] = useState<BrowserTab[]>([{ id: 1, title: "New Tab", query: "", pageId: null }]);
  const [activeId, setActiveId] = useState(1);
  const [address, setAddress] = useState("");
  const [showTabs, setShowTabs] = useState(false);
  const [protection, setProtection] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const page = WEB_RESULTS.find((result) => result.id === active.pageId) ?? null;
  const results = useMemo(() => {
    const terms = active.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return WEB_RESULTS.filter((result) => terms.some((term) => `${result.title} ${result.description} ${result.tags}`.toLowerCase().includes(term)));
  }, [active.query]);

  const updateActive = (patch: Partial<BrowserTab>) => setTabs((items) => items.map((tab) => tab.id === activeId ? { ...tab, ...patch } : tab));
  const search = (event?: FormEvent) => {
    event?.preventDefault();
    const query = address.trim();
    if (!query) return;
    updateActive({ query, pageId: null, title: query });
    setHistory((items) => [query, ...items.filter((item) => item !== query)].slice(0, 12));
    setShowTabs(false);
  };
  const openResult = (result: WebResult) => {
    updateActive({ pageId: result.id, title: result.title });
    setAddress(result.url);
  };
  const newTab = () => {
    const id = Date.now();
    setTabs((items) => [...items, { id, title: "New Tab", query: "", pageId: null }]);
    setActiveId(id);
    setAddress("");
    setShowTabs(false);
  };
  const closeTab = (id: number) => {
    const remaining = tabs.filter((tab) => tab.id !== id);
    if (!remaining.length) {
      const id = Date.now();
      setTabs([{ id, title: "New Tab", query: "", pageId: null }]);
      setActiveId(id);
      setAddress("");
      return;
    }
    setTabs(remaining);
    if (activeId === id) { setActiveId(remaining[0].id); setAddress(remaining[0].pageId ? WEB_RESULTS.find((r) => r.id === remaining[0].pageId)?.url ?? "" : remaining[0].query); }
  };
  const clearAll = () => {
    const id = Date.now();
    setTabs([{ id, title: "New Tab", query: "", pageId: null }]);
    setActiveId(id);
    setAddress("");
    setHistory([]);
    setShowTabs(false);
    useOS.getState().showToast("Tabs and browsing data cleared");
  };

  return (
    <div className="force-dark relative flex h-full flex-col overflow-hidden bg-[#1c1c1e] text-white">
      <div className="shrink-0 border-b border-white/10 bg-[#2c2c2e] px-3 pb-3" style={{ paddingTop: "calc(var(--safe-top) + 10px)" }}>
        <form onSubmit={search} className="flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/35 px-3"><ShieldCheck size={17} className={protection ? "text-[#58d68d]" : "text-white/40"} /><input aria-label="Search or enter address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Search privately" className="min-w-0 flex-1 bg-transparent py-2.5 text-[14px] outline-none" />{address && <button aria-label="Clear address" type="button" onClick={() => setAddress("")}><X size={16} /></button>}</div><button aria-label="Clear browsing data" type="button" onClick={clearAll} className="p-2 text-[#de5833]"><Flame size={23} /></button></form>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!active.query && !page && <div className="flex min-h-full flex-col items-center px-6 py-10"><div className="mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-white text-[42px] font-black text-[#de5833] shadow-xl">D</div><div className="mt-5 text-[30px] font-semibold">DuckDuckGo</div><div className="mt-1 text-[14px] text-white/50">Privacy, simplified.</div><form onSubmit={search} className="mt-7 flex w-full gap-2"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Search without being tracked" className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-black outline-none" /><button type="submit" aria-label="Search" className="rounded-xl bg-[#de5833] px-4"><Search size={22} /></button></form>{history.length > 0 && <div className="mt-8 w-full"><div className="mb-2 text-[13px] font-semibold text-white/50">Recent local searches</div>{history.slice(0, 4).map((item) => <button key={item} onClick={() => { setAddress(item); updateActive({ query: item, pageId: null, title: item }); }} className="flex w-full items-center gap-2 border-b border-white/10 py-2.5 text-left text-[14px]"><Clock size={16} className="text-white/40" />{item}</button>)}</div>}<div className="mt-auto pt-10 text-center text-[12px] leading-5 text-white/35">Searches stay on this simulated device.<br />No real web requests are made.</div></div>}
        {active.query && !page && <div className="p-4"><div className="mb-4 flex items-center justify-between"><div><div className="text-[20px] font-semibold">{active.query}</div><div className="text-[12px] text-white/45">Private results · stored locally</div></div><button onClick={() => setProtection((value) => !value)} className={`rounded-full px-3 py-1.5 text-[11px] ${protection ? "bg-[#58d68d]/20 text-[#58d68d]" : "bg-white/10 text-white/50"}`}>{protection ? "Protected" : "Unprotected"}</button></div>{results.length ? results.map((result) => <button key={result.id} onClick={() => openResult(result)} className="mb-5 block w-full text-left active:opacity-70"><div className="text-[12px] text-[#8dcc9b]">{result.url}</div><div className="mt-0.5 text-[18px] leading-snug text-[#8ab4f8]">{result.title}</div><div className="mt-1 text-[13px] leading-[19px] text-white/60">{result.description}</div></button>) : <Empty icon={Globe2} title="No local results" text="Try privacy, iPhone, React, web development, or San Diego." />}</div>}
        {page && <article className="p-5"><div className="text-[12px] text-[#58d68d]">{page.url}</div><h1 className="mt-2 text-[28px] font-bold leading-tight">{page.title}</h1><p className="mt-4 text-[16px] leading-7 text-white/75">{page.body}</p><div className="mt-6 rounded-xl bg-white/10 p-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="text-[#58d68d]" size={20} /> Privacy report</div><div className="mt-2 text-[13px] leading-5 text-white/55">{protection ? "Tracker blocking is on. This sample page made no network requests." : "Tracker blocking is paused for this simulated session."}</div></div></article>}
      </div>
      <div className="flex h-[52px] shrink-0 items-center justify-around border-t border-white/10 bg-[#2c2c2e]" style={{ paddingBottom: "var(--safe-bottom)" }}><button aria-label="Back" disabled={!active.query && !page} onClick={() => { if (page) { updateActive({ pageId: null, title: active.query }); setAddress(active.query); } else { updateActive({ query: "", title: "New Tab" }); setAddress(""); } }} className="p-2 disabled:opacity-30"><ArrowLeft size={22} /></button><button aria-label="Refresh" onClick={() => useOS.getState().showToast("Page refreshed")} className="p-2"><RotateCw size={21} /></button><button aria-label="New tab" onClick={newTab} className="p-2"><Plus size={23} /></button><button aria-label="Show tabs" onClick={() => setShowTabs(true)} className="relative p-2"><Globe2 size={22} /><span className="absolute -right-1 -top-1 rounded-full bg-[#de5833] px-1.5 text-[10px]">{tabs.length}</span></button></div>
      {showTabs && <div className="absolute inset-0 z-40 bg-[#1c1c1e]"><Page title="Tabs" bg="bg-[#1c1c1e]" large={false} left={<NavBtn onClick={() => setShowTabs(false)}>Done</NavBtn>} right={<button aria-label="Add tab" onClick={newTab}><Plus size={24} /></button>}><div className="grid grid-cols-2 gap-3 p-4">{tabs.map((tab) => <div key={tab.id} className={`relative overflow-hidden rounded-xl border ${tab.id === activeId ? "border-[#de5833]" : "border-white/15"} bg-[#2c2c2e]`}><button onClick={() => { setActiveId(tab.id); setAddress(tab.pageId ? WEB_RESULTS.find((r) => r.id === tab.pageId)?.url ?? "" : tab.query); setShowTabs(false); }} className="block h-36 w-full p-3 text-left"><Globe2 size={28} className="mb-8 text-white/35" /><div className="truncate text-[14px] font-medium">{tab.title}</div><div className="truncate text-[11px] text-white/40">{tab.query || "New Tab"}</div></button><button aria-label={`Close ${tab.title}`} onClick={() => closeTab(tab.id)} className="absolute right-2 top-2 rounded-full bg-black/30 p-1"><X size={16} /></button></div>)}</div><button onClick={clearAll} className="mx-4 mt-2 w-[calc(100%-2rem)] rounded-xl bg-white/10 py-3 font-medium text-[#de5833]">Close All Tabs & Clear Data</button></Page></div>}
    </div>
  );
}
