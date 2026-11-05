import { useState } from "react";
import { ChevronLeft, ChevronRight, FolderHeart, Heart, Image as ImageIcon, Info, Play, Share, Trash2, Video as VideoIcon, Camera as CameraIcon, Images } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData } from "../os/data";
import { NavBtn, Page, TabBar } from "../os/ui";
import { fmtClock, photoUrl } from "../os/utils";
import { STOCK, videoUrls } from "./media";

interface Item {
  key: string;
  src: string;
  thumb: string;
  at: number;
  fav: boolean;
  kind: "photo" | "video";
  dur?: number;
  title: string;
  hue: number;
  stock: boolean;
  id: string | number;
}

function Thumb({ it, onClick }: { it: Item; onClick: () => void }) {
  const [ok, setOk] = useState(true);
  return (
    <button onClick={onClick} className="relative aspect-square overflow-hidden active:opacity-70" style={{ background: `linear-gradient(135deg,hsl(${it.hue} 60% 55%),hsl(${it.hue + 40} 60% 35%))` }}>
      {ok && <img src={it.thumb} alt="" draggable={false} loading="lazy" onError={() => setOk(false)} className="h-full w-full object-cover" />}
      {it.fav && <Heart size={13} fill="#fff" className="absolute bottom-1 left-1 text-white drop-shadow" />}
      {it.kind === "video" && <span className="absolute bottom-1 right-1.5 text-[11px] font-semibold text-white drop-shadow">{fmtClock(it.dur ?? 0)}</span>}
    </button>
  );
}

function Viewer({ items, index, onClose, setIndex }: { items: Item[]; index: number; onClose: () => void; setIndex: (n: number) => void }) {
  const it = items[index];
  const favPhotos = useData((s) => s.favPhotos);
  const [ok, setOk] = useState(true);
  const [info, setInfo] = useState(false);
  const [dx, setDx] = useState(0);
  const start = useState({ x: 0, down: false })[0];
  const scale = useOS((s) => s.scale);
  if (!it) return null;
  const fav = it.stock ? favPhotos.includes(it.id as number) : it.fav;
  const toggleFav = () => {
    if (it.stock) patchData((s) => ({ favPhotos: fav ? s.favPhotos.filter((x) => x !== it.id) : [...s.favPhotos, it.id as number] }));
    else patchData((s) => ({ photos: s.photos.map((p) => (p.id === it.id ? { ...p, fav: !p.fav } : p)) }));
  };
  const del = () => {
    if (it.stock) return useOS.getState().showToast("Sample photos can't be deleted");
    useOS.getState().showSheet({
      actions: [
        { text: "Delete Photo", style: "destructive", onPress: () => { patchData((s) => ({ photos: s.photos.filter((p) => p.id !== it.id) })); if (items.length <= 1) onClose(); else setIndex(Math.max(0, index - 1)); } },
        { text: "Cancel", style: "cancel" },
      ],
    });
  };
  const vurl = it.kind === "video" ? videoUrls.get(String(it.id)) : undefined;
  return (
    <div className="fade-in absolute inset-0 z-30 flex flex-col bg-black text-white">
      <div className="glass-dark flex items-end justify-between px-3 pb-2" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <NavBtn onClick={onClose}><ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" /><span className="-ml-1">Back</span></NavBtn>
        <div className="pb-2 text-center">
          <div className="text-[15px] font-semibold leading-tight">{new Date(it.at).toLocaleDateString([], { month: "long", day: "numeric" })}</div>
          <div className="text-[11px] opacity-60">{new Date(it.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <span className="w-16" />
      </div>
      <div
        className="relative flex-1 touch-pan-y overflow-hidden"
        onPointerDown={(e) => { start.x = e.clientX; start.down = true; }}
        onPointerMove={(e) => start.down && setDx((e.clientX - start.x) / scale)}
        onPointerUp={() => {
          start.down = false;
          if (dx < -70 && index < items.length - 1) setIndex(index + 1);
          else if (dx > 70 && index > 0) setIndex(index - 1);
          setDx(0);
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? "transform .25s" : "none" }}>
          {vurl ? (
            <video src={vurl} controls autoPlay playsInline className="max-h-full max-w-full" />
          ) : (
            <>
              {ok && <img key={String(it.id)} src={it.src} alt={it.title} draggable={false} onError={() => setOk(false)} className="max-h-full max-w-full object-contain" />}
              {!ok && <div className="flex h-[70%] w-[90%] items-center justify-center rounded-xl text-white/70" style={{ background: `linear-gradient(135deg,hsl(${it.hue} 60% 55%),hsl(${it.hue + 40} 60% 35%))` }}>{it.title}</div>}
              {it.kind === "video" && <div className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/50"><Play size={30} fill="#fff" /></div>}
            </>
          )}
        </div>
        {index > 0 && <button onClick={() => setIndex(index - 1)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5"><ChevronLeft size={22} /></button>}
        {index < items.length - 1 && <button onClick={() => setIndex(index + 1)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5"><ChevronRight size={22} /></button>}
        {info && (
          <div className="fade-in absolute inset-x-3 bottom-3 rounded-2xl bg-ios-material p-4 text-ios-label backdrop-blur-xl">
            <div className="text-[17px] font-semibold">{it.title}</div>
            <div className="text-[13px] text-ios-label2">{new Date(it.at).toLocaleString()}</div>
            <div className="mt-1 text-[13px] text-ios-label2">{it.stock ? "Sample photo · Pexels" : it.kind === "video" ? `Video · ${fmtClock(it.dur ?? 0)}` : "Captured with Camera"}</div>
          </div>
        )}
      </div>
      <div className="glass-dark flex items-center justify-around px-4 pt-3 text-ios-blue" style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}>
        <button onClick={() => useOS.getState().showToast("Sharing isn't available in the simulator")}><Share size={24} /></button>
        <button onClick={toggleFav}><Heart size={24} fill={fav ? "currentColor" : "none"} /></button>
        <button onClick={() => setInfo(!info)}><Info size={24} /></button>
        <button onClick={del}><Trash2 size={24} /></button>
      </div>
    </div>
  );
}

export default function PhotosApp() {
  const photos = useData((s) => s.photos);
  const favPhotos = useData((s) => s.favPhotos);
  const [tab, setTab] = useState<"library" | "albums">("library");
  const [album, setAlbum] = useState<string | null>(null);
  const [view, setView] = useState<{ items: Item[]; i: number } | null>(null);

  const now = Date.now();
  const all: Item[] = [
    ...photos.map<Item>((p) => ({ key: String(p.id), id: p.id, src: p.src, thumb: p.src, at: p.at, fav: p.fav, kind: p.kind, dur: p.dur, title: p.kind === "video" ? "Video" : "Photo", hue: 200, stock: false })),
    ...STOCK.map<Item>((s) => ({ key: "s" + s.id, id: s.id, src: photoUrl(s.id, 900, 1200), thumb: photoUrl(s.id, 300, 300), at: now - s.daysAgo * 86400000, fav: favPhotos.includes(s.id), kind: "photo", title: s.title, hue: s.hue, stock: true })),
  ].sort((a, b) => b.at - a.at);

  const albums: { id: string; name: string; items: Item[]; icon: typeof ImageIcon }[] = [
    { id: "recents", name: "Recents", items: all, icon: Images },
    { id: "favorites", name: "Favorites", items: all.filter((x) => x.fav), icon: Heart },
    { id: "videos", name: "Videos", items: all.filter((x) => x.kind === "video"), icon: VideoIcon },
    { id: "camera", name: "From Camera", items: all.filter((x) => !x.stock), icon: CameraIcon },
    { id: "nature", name: "Nature", items: all.filter((x) => STOCK.find((s) => "s" + s.id === x.key)?.cat === "Nature"), icon: FolderHeart },
    { id: "cities", name: "Cities", items: all.filter((x) => STOCK.find((s) => "s" + s.id === x.key)?.cat === "Cities"), icon: FolderHeart },
    { id: "pets", name: "Pets", items: all.filter((x) => STOCK.find((s) => "s" + s.id === x.key)?.cat === "Pets"), icon: FolderHeart },
  ];
  const cur = albums.find((a) => a.id === album);

  const grid = (items: Item[]) => (
    <div className="grid grid-cols-3 gap-[2px]">
      {items.map((it, i) => (
        <Thumb key={it.key} it={it} onClick={() => setView({ items, i })} />
      ))}
    </div>
  );

  return (
    <div className="relative flex h-full flex-col bg-ios-bg">
      <div className="relative min-h-0 flex-1">
        {tab === "library" && (
          <Page title="Library" bg="bg-ios-bg" right={<span className="text-[13px] text-ios-label2">{all.length} Items</span>}>
            {grid(all)}
            <div className="py-6 text-center text-[17px] font-semibold">{all.length} Photos, {all.filter((x) => x.kind === "video").length} Videos</div>
          </Page>
        )}
        {tab === "albums" && !cur && (
          <Page title="Albums" bg="bg-ios-bg">
            <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-4">
              {albums.map((a) => (
                <button key={a.id} onClick={() => setAlbum(a.id)} className="text-left active:opacity-70">
                  <div className="relative aspect-square overflow-hidden rounded-[10px] bg-ios-fill">
                    {a.items[0] ? <img src={a.items[0].thumb} alt="" draggable={false} className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <div className="flex h-full items-center justify-center text-ios-label3"><a.icon size={36} /></div>}
                  </div>
                  <div className="mt-1 text-[15px]">{a.name}</div>
                  <div className="text-[13px] text-ios-label2">{a.items.length}</div>
                </button>
              ))}
            </div>
          </Page>
        )}
        {tab === "albums" && cur && (
          <Page title={cur.name} bg="bg-ios-bg" left={<NavBtn onClick={() => setAlbum(null)}><ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" /><span className="-ml-1">Albums</span></NavBtn>}>
            {cur.items.length ? grid(cur.items) : <div className="py-24 text-center text-ios-label2">No Photos or Videos</div>}
          </Page>
        )}
      </div>
      <TabBar tabs={[{ id: "library", label: "Library", icon: ImageIcon }, { id: "albums", label: "Albums", icon: FolderHeart }]} value={tab} onChange={(t) => { setTab(t); setAlbum(null); }} />
      {view && <Viewer items={view.items} index={view.i} onClose={() => setView(null)} setIndex={(i) => setView({ ...view, i })} />}
    </div>
  );
}
