import { useEffect, useRef, useState } from "react";
import { CameraOff, Lock, Unlock, Plus, Minus, Sun, Flashlight } from "lucide-react";
import { useOS } from "../os/store";
import { sfx } from "../os/sound";

export default function MagnifierApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [zoom, setZoom] = useState(2);
  const [bright, setBright] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [sat, setSat] = useState(1);
  const [invert, setInvert] = useState(false);
  const [flash, setFlash] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hasCam, setHasCam] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const fg = useOS((s) => s.foreground);
  const power = useOS((s) => s.power);

  useEffect(() => {
    if (fg !== "magnifier" || power !== "on") return;
    let active = true;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        streamRef.current = s;
        setHasCam(true);
        setErr(null);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((e) => {
        setHasCam(false);
        setErr(e?.message || "Camera unavailable");
      });
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [fg, power]);

  const filter = `brightness(${bright}) contrast(${contrast}) saturate(${sat})${invert ? " invert(1)" : ""}`;
  const flashOn = flash || useOS.getState().flashlight;

  return (
    <div className="relative h-full overflow-hidden bg-black">
      {/* Camera view */}
      <div className="absolute inset-0 flex items-center justify-center">
        {hasCam ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: `scale(${zoom})`, filter, transition: "transform .15s ease, filter .15s ease" }}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center text-white/70"
            style={{ background: "linear-gradient(135deg,#1a1a1f,#3a3a3f)" }}
          >
            <CameraOff size={48} className="mb-3 opacity-50" />
            <div className="text-[15px]">Camera unavailable</div>
            <div className="mt-1 max-w-[260px] text-center text-[12px] text-white/50">{err ?? "Allow camera access to use the magnifier."}</div>
            <div className="mt-6 text-[12px] text-white/40">Demo mode</div>
          </div>
        )}
      </div>

      {/* Flashlight overlay */}
      {flashOn && <div className="pointer-events-none absolute inset-0 bg-[#fffbe0] opacity-15" />}

      {/* Top controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
        <button onClick={() => { setInvert((v) => !v); sfx.pop(); }} className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur ${invert ? "bg-white text-black" : "bg-black/40 text-white"}`} title="Invert colors">
          <Sun size={20} />
        </button>
        <button onClick={() => { setFlash((f) => !f); useOS.getState().set({ flashlight: !flash }); sfx.pop(); }} className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur ${flashOn ? "bg-white text-black" : "bg-black/40 text-white"}`} title="Flashlight">
          <Flashlight size={20} />
        </button>
        <button onClick={() => { setLocked((l) => !l); sfx.pop(); }} className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur ${locked ? "bg-white text-black" : "bg-black/40 text-white"}`} title="Lock zoom">
          {locked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>
      </div>

      {/* Zoom ring */}
      <div className="absolute left-1/2 top-[calc(var(--safe-top)+60px)] -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[14px] font-semibold text-white backdrop-blur">
        {zoom.toFixed(1)}×
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
        {/* Zoom slider */}
        <div className="mb-4 flex items-center gap-3">
          <Minus size={18} className="text-white" />
          <input
            type="range"
            min={1}
            max={8}
            step={0.1}
            value={zoom}
            onChange={(e) => !locked && setZoom(parseFloat(e.target.value))}
            className="ios-range flex-1"
            style={{ ["--p" as string]: `${((zoom - 1) / 7) * 100}%` }}
          />
          <Plus size={18} className="text-white" />
        </div>

        {/* Filter sliders */}
        <div className="mb-3 flex gap-2">
          <FilterSlider label="B" value={bright} min={0.5} max={2} onChange={setBright} color="#ff9500" />
          <FilterSlider label="C" value={contrast} min={0.5} max={2} onChange={setContrast} color="#0a84ff" />
          <FilterSlider label="S" value={sat} min={0} max={2} onChange={setSat} color="#ff2d55" />
        </div>

        {/* Preset chips */}
        <div className="flex justify-center gap-2">
          {[
            { label: "Auto", run: () => { setBright(1); setContrast(1); setSat(1); setInvert(false); } },
            { label: "Bright", run: () => { setBright(1.4); setContrast(1.1); setSat(1.1); } },
            { label: "High Contrast", run: () => { setBright(1); setContrast(1.6); setSat(1.2); } },
            { label: "Invert", run: () => setInvert(true) },
          ].map((p) => (
            <button key={p.label} onClick={() => { p.run(); sfx.pop(); }} className="rounded-full bg-black/40 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur active:scale-95">
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterSlider({ label, value, min, max, onChange, color }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; color: string }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-1 items-center gap-2 rounded-full bg-black/40 px-2 py-1.5 backdrop-blur">
      <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="ios-range flex-1"
        style={{ ["--p" as string]: `${p}%` }}
      />
    </div>
  );
}
