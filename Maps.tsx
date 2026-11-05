import { useEffect, useState } from "react";
import { Briefcase, Home as HomeIcon, Locate, MapPin, Minus, Navigation, Plus, Search, WifiOff, X, Clock } from "lucide-react";
import { useOS, isOnline } from "../os/store";
import { useData, patchData } from "../os/data";
import { Spinner, ScrollView } from "../os/ui";

interface Place {
  name: string;
  sub?: string;
  lat: number;
  lon: number;
}

const FAV: (Place & { icon: typeof HomeIcon; color: string; label: string })[] = [
  { label: "Home", name: "Cupertino, CA", lat: 37.323, lon: -122.0322, icon: HomeIcon, color: "#007aff" },
  { label: "Work", name: "Apple Park", sub: "One Apple Park Way", lat: 37.3349, lon: -122.009, icon: Briefcase, color: "#ff9500" },
  { label: "Golden Gate", name: "Golden Gate Bridge", lat: 37.8199, lon: -122.4783, icon: MapPin, color: "#ff3b30" },
  { label: "Times Square", name: "Times Square, New York", lat: 40.758, lon: -73.9855, icon: MapPin, color: "#af52de" },
];

export default function MapsApp() {
  const online = useOS((s) => isOnline(s));
  const recents = useData((s) => s.mapRecents);
  const [place, setPlace] = useState<Place>({ name: "Cupertino", lat: 37.323, lon: -122.0322 });
  const [zoom, setZoom] = useState(0.03); // half-width in degrees
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (!q.trim() || !online) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j: { display_name: string; lat: string; lon: string }[]) =>
          setResults(j.map((x) => ({ name: x.display_name.split(",")[0], sub: x.display_name.split(",").slice(1, 4).join(",").trim(), lat: parseFloat(x.lat), lon: parseFloat(x.lon) }))),
        )
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 450);
    return () => clearTimeout(t);
  }, [q, online]);

  const choose = (p: Place) => {
    setPlace(p);
    setZoom(0.015);
    setRev((r) => r + 1);
    setQ("");
    setResults([]);
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
    patchData((s) => ({ mapRecents: [p.name, ...s.mapRecents.filter((x) => x !== p.name)].slice(0, 5) }));
  };
  const locate = () => {
    if (!navigator.geolocation) return useOS.getState().showToast("Location unavailable");
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({ name: "My Location", sub: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => useOS.getState().showToast("Location permission denied"),
      { timeout: 8000 },
    );
  };
  const aspect = 1.1;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${place.lon - zoom * aspect},${place.lat - zoom},${place.lon + zoom * aspect},${place.lat + zoom}&layer=mapnik&marker=${place.lat},${place.lon}`;

  return (
    <div className="relative h-full overflow-hidden bg-[#e8eef2] text-ios-label">
      {online ? (
        <iframe key={src + rev} src={src} title="map" className="absolute inset-0 h-full w-full border-0" style={{ top: 0 }} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#e8eef2] text-center text-black/60" style={{ backgroundImage: "linear-gradient(#d5dde3 1px,transparent 1px),linear-gradient(90deg,#d5dde3 1px,transparent 1px)", backgroundSize: "40px 40px" }}>
          <WifiOff size={44} className="mb-2" />
          <div className="text-[18px] font-semibold">Maps is offline</div>
          <div className="text-[14px]">Connect to Wi-Fi or cellular to load the map.</div>
        </div>
      )}

      {/* map controls */}
      <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ top: "calc(var(--safe-top) + 8px)" }}>
        <div className="glass overflow-hidden rounded-[12px] shadow-lg">
          <button onClick={() => { setZoom((z) => Math.max(0.002, z / 2)); setRev((r) => r + 1); }} className="flex h-10 w-10 items-center justify-center active:bg-black/10"><Plus size={20} /></button>
          <div style={{ borderTop: "0.5px solid var(--ios-sep)" }} />
          <button onClick={() => { setZoom((z) => Math.min(20, z * 2)); setRev((r) => r + 1); }} className="flex h-10 w-10 items-center justify-center active:bg-black/10"><Minus size={20} /></button>
        </div>
        <button onClick={locate} className="glass flex h-10 w-10 items-center justify-center rounded-[12px] shadow-lg active:bg-black/10 text-ios-blue"><Locate size={20} /></button>
      </div>

      {/* bottom card */}
      <div className="glass absolute inset-x-0 bottom-0 z-20 rounded-t-[16px] shadow-[0_-4px_24px_rgba(0,0,0,.15)]" style={{ height: open ? "calc(100% - var(--safe-top) - 8px)" : undefined, paddingBottom: "var(--safe-bottom)", transition: "height .3s cubic-bezier(.3,.8,.2,1)" }}>
        <button className="mx-auto mt-1.5 block h-[5px] w-9 rounded-full bg-ios-label3" onClick={() => setOpen(!open)} />
        <div className="flex items-center gap-2 px-4 pb-2 pt-2">
          <div className="flex h-[38px] flex-1 items-center gap-2 rounded-[10px] bg-ios-fill px-2.5">
            <Search size={17} className="text-ios-label2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => e.key === "Enter" && results[0] && choose(results[0])}
              enterKeyHint="search"
              placeholder="Search Maps"
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
            />
            {loading && <Spinner className="h-4 w-4" />}
            {q && <button onClick={() => setQ("")}><X size={16} className="text-ios-label3" /></button>}
          </div>
          {open && <button className="text-[17px] text-ios-blue" onClick={() => { setOpen(false); (document.activeElement as HTMLElement | null)?.blur(); }}>Cancel</button>}
        </div>

        {!open ? (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 rounded-[12px] bg-ios-fill p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-red text-white"><MapPin size={20} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{place.name}</div>
                <div className="truncate text-[13px] text-ios-label2">{place.sub ?? `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`}</div>
              </div>
              <button onClick={() => window.open(`https://www.openstreetmap.org/directions?to=${place.lat},${place.lon}`, "_blank")} className="flex items-center gap-1 rounded-full bg-ios-blue px-3 py-1.5 text-[14px] font-semibold text-white">
                <Navigation size={14} fill="#fff" /> Go
              </button>
            </div>
          </div>
        ) : (
          <ScrollView className="px-4" style={{ height: "calc(100% - 80px)" }}>
            {results.map((p, i) => (
              <button key={i} onClick={() => choose(p)} className="ios-row flex w-full items-center gap-3 py-2.5 text-left" style={{ ["--sep-left" as string]: "52px" }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-fill2"><MapPin size={18} className="text-ios-red" /></div>
                <div className="min-w-0">
                  <div className="truncate text-[16px]">{p.name}</div>
                  <div className="truncate text-[13px] text-ios-label2">{p.sub}</div>
                </div>
              </button>
            ))}
            {!q && (
              <>
                <div className="pb-1 pt-2 text-[20px] font-bold">Favorites</div>
                <div className="grid grid-cols-4 gap-2 pb-3">
                  {FAV.map((f) => (
                    <button key={f.label} onClick={() => choose(f)} className="flex flex-col items-center gap-1 active:opacity-60">
                      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-white" style={{ background: f.color }}><f.icon size={24} /></div>
                      <span className="w-full truncate text-center text-[12px]">{f.label}</span>
                    </button>
                  ))}
                </div>
                {recents.length > 0 && <div className="pb-1 text-[20px] font-bold">Recents</div>}
                {recents.map((r) => (
                  <button key={r} onClick={() => setQ(r)} className="ios-row flex w-full items-center gap-3 py-2.5 text-left" style={{ ["--sep-left" as string]: "52px" }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-fill2"><Clock size={17} className="text-ios-label2" /></div>
                    <span className="text-[16px]">{r}</span>
                  </button>
                ))}
              </>
            )}
            {q && !loading && results.length === 0 && <div className="py-10 text-center text-ios-label2">{online ? "No results" : "You're offline"}</div>}
          </ScrollView>
        )}
      </div>
    </div>
  );
}
