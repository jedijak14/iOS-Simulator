import { useEffect, useRef, useState, useCallback } from "react";
import { Briefcase, Home as HomeIcon, Locate, MapPin, Minus, Navigation, Plus, Search, WifiOff, X, Clock, Navigation2 } from "lucide-react";
import { useOS, isOnline } from "../os/store";
import { useData, patchData } from "../os/data";
import { Spinner, ScrollView } from "../os/ui";
import { sfx } from "../os/sound";

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

// Web Mercator math
const TILE = 256;
function lonToX(lon: number, z: number) {
  return ((lon + 180) / 360) * TILE * Math.pow(2, z);
}
function latToY(lat: number, z: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * Math.pow(2, z);
}
function xToLon(x: number, z: number) {
  return (x / (TILE * Math.pow(2, z))) * 360 - 180;
}
function yToLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * Math.pow(2, z));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function fmtDist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (d < 1) return `${Math.round(d * 1000)} m`;
  return d < 10 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
}

export default function MapsApp() {
  const online = useOS((s) => isOnline(s));
  const recents = useData((s) => s.mapRecents);
  const [place, setPlace] = useState<Place>({ name: "Cupertino", lat: 37.323, lon: -122.0322 });
  const [zoom, setZoom] = useState(13);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // pan offsets in world pixels at current zoom
  const [center, setCenter] = useState<{ lat: number; lon: number }>({ lat: 37.323, lon: -122.0322 });
  const [myLoc, setMyLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [following, setFollowing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // search via Nominatim
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

  const choose = useCallback((p: Place) => {
    setPlace(p);
    setCenter({ lat: p.lat, lon: p.lon });
    setZoom(14);
    setQ("");
    setResults([]);
    setOpen(false);
    setFollowing(false);
    (document.activeElement as HTMLElement | null)?.blur();
    sfx.pop();
    patchData((s) => ({ mapRecents: [p.name, ...s.mapRecents.filter((x) => x !== p.name)].slice(0, 5) }));
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return useOS.getState().showToast("Location unavailable");
    sfx.toggleOn();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMyLoc(loc);
        setCenter(loc);
        setFollowing(true);
        useOS.getState().showToast("Located you");
      },
      () => useOS.getState().showToast("Location permission denied"),
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  // draw the map
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cv = canvas;
    const ct = container;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ctx = cv.getContext("2d")!;
    const imgCache = new Map<string, HTMLImageElement>();

    function measure() {
      const width = ct.clientWidth, height = ct.clientHeight;
      if (width < 2 || height < 2) return false;
      sizeRef.current = { w: width, h: height };
      if (cv.width !== Math.floor(width * dpr)) cv.width = Math.floor(width * dpr);
      if (cv.height !== Math.floor(height * dpr)) cv.height = Math.floor(height * dpr);
      cv.style.width = `${width}px`;
      cv.style.height = `${height}px`;
      return true;
    }

    const ro = new ResizeObserver(() => {
      if (measure()) draw();
    });
    ro.observe(ct);

    function draw() {
      // always re-measure synchronously to handle app-launch animation
      if (!measure()) return;
      const { w, h } = sizeRef.current;
      ctx.save();
      ctx.scale(dpr, dpr);
      // background
      ctx.fillStyle = online ? "#e8eaed" : "#1c1c1e";
      ctx.fillRect(0, 0, w, h);

      if (!online) {
        ctx.fillStyle = "#8e8e93";
        ctx.font = "600 14px -apple-system, system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Maps is offline", w / 2, h / 2 - 10);
        ctx.font = "400 13px -apple-system, system-ui";
        ctx.fillText("Connect to Wi-Fi or cellular", w / 2, h / 2 + 12);
        ctx.restore();
        return;
      }

      // tile math
      const z = Math.max(0, Math.min(19, Math.round(zoom)));
      const cx = lonToX(center.lon, z);
      const cy = latToY(center.lat, z);
      const halfW = w / 2;
      const halfH = h / 2;
      const minTileX = Math.floor((cx - halfW) / TILE);
      const maxTileX = Math.floor((cx + halfW) / TILE);
      const minTileY = Math.floor((cy - halfH) / TILE);
      const maxTileY = Math.floor((cy + halfH) / TILE);

      // draw tiles
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          if (ty < 0 || ty >= Math.pow(2, z)) continue;
          const wrappedTx = ((tx % Math.pow(2, z)) + Math.pow(2, z)) % Math.pow(2, z);
          const key = `${z}/${wrappedTx}/${ty}`;
          // shift so that the canvas is centered on `center`
          const screenX = (tx * TILE - cx + halfW);
          const screenY = (ty * TILE - cy + halfH);
          let img = imgCache.get(key);
          if (!img) {
            img = new Image();
            // OSM tiles don't return CORS headers — don't set crossOrigin
            // (canvas will be tainted but we never call getImageData)
            img.src = `https://tile.openstreetmap.org/${key}.png`;
            img.onload = () => draw();
            img.onerror = () => { img!.dataset.failed = "1"; draw(); };
            imgCache.set(key, img);
          }
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, screenX, screenY, TILE, TILE);
          } else if (img.dataset.failed) {
            ctx.fillStyle = "#dde1e6";
            ctx.fillRect(screenX, screenY, TILE, TILE);
          } else {
            // light placeholder
            ctx.fillStyle = "#e8eaed";
            ctx.fillRect(screenX, screenY, TILE, TILE);
          }
        }
      }

      // my location dot
      if (myLoc) {
        const mx = lonToX(myLoc.lon, z) - cx + halfW;
        const my = latToY(myLoc.lat, z) - cy + halfH;
        if (mx > -50 && mx < w + 50 && my > -50 && my < h + 50) {
          // pulsing ring
          const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 28);
          grad.addColorStop(0, "rgba(0,122,255,0.35)");
          grad.addColorStop(1, "rgba(0,122,255,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(mx, my, 28, 0, Math.PI * 2);
          ctx.fill();
          // dot
          ctx.fillStyle = "#007aff";
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mx, my, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // selected place marker
      const px = lonToX(place.lon, z) - cx + halfW;
      const py = latToY(place.lat, z) - cy + halfH;
      if (px > -50 && px < w + 50 && py > -50 && py < h + 50) {
        // teardrop pin
        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle = "#ff3b30";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-14, -34, -14, -12, 0, -12);
        ctx.bezierCurveTo(14, -12, 14, -34, 0, 0);
        ctx.fill();
        ctx.stroke();
        // white circle
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, -22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // scale bar
      const metersPerPx = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, z);
      const scalePx = 80;
      const scaleM = scalePx * metersPerPx;
      const scaleLabel = scaleM < 1000 ? `${Math.round(scaleM)} m` : `${(scaleM / 1000).toFixed(1)} km`;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, h - 24);
      ctx.lineTo(16 + scalePx, h - 24);
      ctx.moveTo(16, h - 28);
      ctx.lineTo(16, h - 20);
      ctx.moveTo(16 + scalePx, h - 28);
      ctx.lineTo(16 + scalePx, h - 20);
      ctx.stroke();
      ctx.font = "600 11px -apple-system, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(scaleLabel, 18, h - 30);

      ctx.restore();
    }
    draw();
    // redraw periodically for tile loads
    const id = setInterval(draw, 250);
    return () => {
      ro.disconnect();
      clearInterval(id);
    };
  }, [center, zoom, place, online, myLoc]);

  // pan + zoom handlers
  const onPointerDown = (e: React.PointerEvent) => {
    sfx.swipe();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const z = Math.round(zoom);
    dragRef.current = { x: e.clientX, y: e.clientY, cx: lonToX(center.lon, z), cy: latToY(center.lat, z) };
    setFollowing(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const scale = useOS.getState().scale || 1;
    const z = Math.round(zoom);
    const dx = (e.clientX - d.x) / scale;
    const dy = (e.clientY - d.y) / scale;
    const nx = d.cx - dx;
    const ny = d.cy - dy;
    setCenter({ lat: yToLat(ny, z), lon: xToLon(nx, z) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    const d = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => Math.max(2, Math.min(19, z + d)));
    sfx.tick();
  };

  const zoomIn = () => { setZoom((z) => Math.min(19, z + 1)); sfx.toggleOn(); };
  const zoomOut = () => { setZoom((z) => Math.max(2, z - 1)); sfx.toggleOff(); };

  const distance = myLoc ? fmtDist(myLoc.lat, myLoc.lon, place.lat, place.lon) : null;

  return (
    <div className="relative h-full overflow-hidden bg-[#e8eaed] text-ios-label" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />

      {/* offline overlay */}
      {!online && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1c1e] text-center text-white/60">
          <WifiOff size={44} className="mb-2" />
          <div className="text-[18px] font-semibold">Maps is offline</div>
          <div className="text-[14px]">Connect to Wi-Fi or cellular to load the map.</div>
        </div>
      )}

      {/* map controls */}
      <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ top: "calc(var(--safe-top) + 8px)" }}>
        <div className="glass overflow-hidden rounded-[12px] shadow-lg">
          <button onClick={zoomIn} className="flex h-10 w-10 items-center justify-center active:bg-black/10"><Plus size={20} /></button>
          <div style={{ borderTop: "0.5px solid var(--ios-sep)" }} />
          <button onClick={zoomOut} className="flex h-10 w-10 items-center justify-center active:bg-black/10"><Minus size={20} /></button>
        </div>
        <button onClick={locate} className="glass flex h-10 w-10 items-center justify-center rounded-[12px] shadow-lg active:bg-black/10 text-ios-blue">
          <Locate size={20} fill={following ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => { setCenter({ lat: place.lat, lon: place.lon }); setFollowing(false); }}
          className="glass flex h-10 w-10 items-center justify-center rounded-[12px] shadow-lg active:bg-black/10 text-ios-red"
          title="Recenter on selected place"
        >
          <Navigation2 size={18} fill="currentColor" />
        </button>
      </div>

      {/* compass / zoom indicator */}
      <div className="absolute left-3 z-10 rounded-full bg-ios-material px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ios-label2 backdrop-blur" style={{ top: "calc(var(--safe-top) + 8px)" }}>
        Z{Math.round(zoom)}
      </div>

      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-[134px] right-2 z-10 rounded bg-white/80 px-1 text-[10px] text-black">© OpenStreetMap contributors</a>
      {/* bottom card */}
      <div className="glass absolute inset-x-0 bottom-0 z-20 rounded-t-[16px] shadow-[0_-4px_24px_rgba(0,0,0,.15)]" style={{ height: open ? "calc(100% - var(--safe-top) - 8px)" : undefined, paddingBottom: "var(--safe-bottom)", transition: "height .35s cubic-bezier(.3,.8,.2,1)" }}>
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
              style={{ letterSpacing: "-0.011em" }}
            />
            {loading && <Spinner className="h-4 w-4" />}
            {q && <button onClick={() => setQ("")}><X size={16} className="text-ios-label3" /></button>}
          </div>
          {open && <button className="text-[17px] text-ios-blue" onClick={() => { setOpen(false); (document.activeElement as HTMLElement | null)?.blur(); }}>Cancel</button>}
        </div>

        {!open ? (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 rounded-[12px] bg-ios-fill p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-red text-white"><MapPin size={20} fill="#fff" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{place.name}</div>
                <div className="truncate text-[13px] text-ios-label2">
                  {place.sub ?? `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`}
                  {distance ? ` · ${distance} away` : ""}
                </div>
              </div>
              <button
                onClick={() => { sfx.pop(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`, "_blank", "noopener,noreferrer"); }}
                className="flex items-center gap-1 rounded-full bg-ios-blue px-3 py-1.5 text-[14px] font-semibold text-white"
                style={{ background: "var(--ios-blue)" }}
              >
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
                <div className="pb-1 pt-2 text-[20px] font-bold" style={{ letterSpacing: "-0.018em" }}>Favorites</div>
                <div className="grid grid-cols-4 gap-2 pb-3">
                  {FAV.map((f) => (
                    <button key={f.label} onClick={() => choose(f)} className="flex flex-col items-center gap-1 active:opacity-60">
                      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-white" style={{ background: f.color }}><f.icon size={24} fill="#fff" /></div>
                      <span className="w-full truncate text-center text-[12px]">{f.label}</span>
                    </button>
                  ))}
                </div>
                {recents.length > 0 && <div className="pb-1 text-[20px] font-bold" style={{ letterSpacing: "-0.018em" }}>Recents</div>}
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
