import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Zap, ZapOff, Timer } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData, newId } from "../os/data";
import { useSpec } from "../os/device-context";
import { sfx } from "../os/sound";
import { fmtClock } from "../os/utils";
import { videoUrls } from "./media";

type Mode = "VIDEO" | "PHOTO" | "SQUARE";
const MODES: Mode[] = ["VIDEO", "PHOTO", "SQUARE"];

export default function CameraApp() {
  const fg = useOS((s) => s.foreground) === "camera";
  const spec = useSpec();
  const photos = useData((s) => s.photos);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("user");
  const [mode, setMode] = useState<Mode>("PHOTO");
  const [flash, setFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [timer, setTimer] = useState(0);
  const [count, setCount] = useState(0);
  const [white, setWhite] = useState(false);
  const [rec, setRec] = useState(false);
  const [recT, setRecT] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recStart = useRef(0);
  const [tick, setTick] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    useOS.setState({ camActive: false });
  }, []);

  useEffect(() => {
    if (!fg) {
      stop();
      return;
    }
    let dead = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        if (dead) return s.getTracks().forEach((t) => t.stop());
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play().catch(() => undefined);
        }
        setOk(true);
        useOS.setState({ camActive: true });
      } catch {
        if (!dead) setOk(false);
      }
    })();
    return () => {
      dead = true;
      stop();
    };
  }, [fg, facing, stop]);

  useEffect(() => {
    if (ok !== false) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [ok]);

  const snapshot = (): string => {
    const c = document.createElement("canvas");
    const v = videoRef.current;
    const sq = mode === "SQUARE";
    if (ok && v && v.videoWidth) {
      const vw = v.videoWidth;
      const vh = v.videoHeight;
      const side = Math.min(vw, vh);
      const cw = (sq ? side : vw) / zoom;
      const ch = (sq ? side : vh) / zoom;
      c.width = Math.min(900, cw);
      c.height = (c.width * ch) / cw;
      const ctx = c.getContext("2d")!;
      if (facing === "user") {
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, c.width, c.height);
    } else {
      // simulated scene
      c.width = sq ? 720 : 720;
      c.height = sq ? 720 : 960;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, `hsl(${(tick * 3) % 360},70%,55%)`);
      g.addColorStop(1, `hsl(${(tick * 3 + 90) % 360},70%,30%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = "220px serif";
      ctx.textAlign = "center";
      ctx.fillText(["🌅", "🏔️", "🌊", "🌲"][tick % 4], c.width / 2, c.height / 2 + 80);
    }
    return c.toDataURL("image/jpeg", 0.8);
  };

  const shoot = () => {
    if (mode === "VIDEO") return toggleRec();
    const run = () => {
      sfx.shutter();
      if (flash) {
        setWhite(true);
        setTimeout(() => setWhite(false), 160);
      }
      const src = snapshot();
      patchData((s) => ({ photos: [{ id: newId(), src, at: Date.now(), fav: false, kind: "photo" as const }, ...s.photos] }));
    };
    if (timer > 0) {
      let n = timer;
      setCount(n);
      const id = setInterval(() => {
        n--;
        setCount(n);
        if (n <= 0) {
          clearInterval(id);
          run();
        }
      }, 1000);
    } else run();
  };

  const toggleRec = () => {
    if (!rec) {
      recStart.current = Date.now();
      setRecT(0);
      setRec(true);
      sfx.tock();
      const s = streamRef.current;
      if (s && typeof MediaRecorder !== "undefined") {
        chunks.current = [];
        const r = new MediaRecorder(s);
        r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        mr.current = r;
        r.start();
      }
    } else {
      setRec(false);
      sfx.tock();
      const dur = Math.max(1, Math.round((Date.now() - recStart.current) / 1000));
      const poster = snapshot();
      const id = newId();
      const save = (url?: string) => {
        if (url) videoUrls.set(id, url);
        patchData((s) => ({ photos: [{ id, src: poster, at: Date.now(), fav: false, kind: "video" as const, dur }, ...s.photos] }));
      };
      if (mr.current && mr.current.state !== "inactive") {
        mr.current.onstop = () => save(URL.createObjectURL(new Blob(chunks.current, { type: mr.current?.mimeType || "video/webm" })));
        mr.current.stop();
      } else save();
    }
  };
  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => setRecT((Date.now() - recStart.current) / 1000), 250);
    return () => clearInterval(id);
  }, [rec]);

  const last = photos[0];
  const viewH = spec.h - 150 - spec.safeTop - (spec.safeBottom ? 20 : 0);
  const sq = mode === "SQUARE";

  return (
    <div className="relative flex h-full flex-col bg-black text-white">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5" style={{ top: "calc(var(--safe-top) - 6px)", height: 44 }}>
        <button onClick={() => setFlash(!flash)} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40" style={{ color: flash ? "#ffd60a" : "#fff" }}>
          {flash ? <Zap size={19} fill="#ffd60a" /> : <ZapOff size={19} />}
        </button>
        {rec && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#ff3b30] px-3 py-0.5 text-[15px] font-semibold tabular-nums">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {fmtClock(recT)}
          </div>
        )}
        <button onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)} className="flex h-9 items-center gap-1 rounded-full bg-black/40 px-3 text-[13px]" style={{ color: timer ? "#ffd60a" : "#fff" }}>
          <Timer size={17} /> {timer ? `${timer}s` : ""}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden" style={{ paddingTop: "calc(var(--safe-top) + 38px)", paddingBottom: 10 }}>
        <div className="relative w-full overflow-hidden rounded-[10px] bg-[#111]" style={{ aspectRatio: sq ? "1 / 1" : "3 / 4", maxHeight: viewH }}>
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ transform: `${facing === "user" ? "scaleX(-1)" : ""} scale(${zoom})`, transition: "transform .25s", opacity: ok ? 1 : 0 }} />
          {ok === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: `linear-gradient(135deg,hsl(${(tick * 3) % 360},70%,50%),hsl(${(tick * 3 + 90) % 360},70%,28%))` }}>
              <div className="text-[96px]">{["🌅", "🏔️", "🌊", "🌲"][Math.floor(tick / 40) % 4]}</div>
              <div className="mt-2 rounded-full bg-black/40 px-3 py-1 text-[12px]">Camera unavailable — simulated viewfinder</div>
            </div>
          )}
          {/* grid */}
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />
          {count > 0 && <div className="absolute inset-0 flex items-center justify-center text-[120px] font-thin">{count}</div>}
          {white && <div className="absolute inset-0 bg-white" />}
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
            {[1, 2].map((z) => (
              <button key={z} onClick={() => setZoom(z)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-[12px] font-semibold" style={{ color: zoom === z ? "#ffd60a" : "#fff" }}>
                {z}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 pb-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 6px)" }}>
        <div className="mb-3 flex justify-center gap-6 text-[13px] font-semibold tracking-wider">
          {MODES.map((m) => (
            <button key={m} onClick={() => !rec && setMode(m)} style={{ color: m === mode ? "#ffd60a" : "rgba(255,255,255,.75)" }}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-9">
          <div className="h-[52px] w-[52px] overflow-hidden rounded-[10px] bg-white/10" onClick={() => useOS.getState().openApp("photos")}>
            {last && <img src={last.src} alt="" className="h-full w-full object-cover" draggable={false} />}
          </div>
          <button onClick={shoot} className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white active:scale-95">
            {mode === "VIDEO" ? (
              <div className="bg-[#ff3b30] transition-all" style={{ width: rec ? 30 : 60, height: rec ? 30 : 60, borderRadius: rec ? 7 : 30 }} />
            ) : (
              <div className="h-[62px] w-[62px] rounded-full bg-white active:bg-white/80" />
            )}
          </button>
          <button onClick={() => setFacing(facing === "user" ? "environment" : "user")} className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/15 active:bg-white/30">
            <RefreshCw size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
