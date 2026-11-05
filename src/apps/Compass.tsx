import { useEffect, useRef, useState } from "react";
import { useOS } from "../os/store";
import { useData } from "../os/data";
import { useScale } from "../os/ui";

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export default function CompassApp() {
  const [heading, setHeading] = useState(32);
  const [sensor, setSensor] = useState(false);
  const [lock, setLock] = useState<number | null>(null);
  const city = useData((s) => s.cities[0]);
  const fg = useOS((s) => s.foreground) === "compass";
  const scale = useScale();
  const drag = useRef<{ a: number; h: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fg) return;
    const fn = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
      if (h != null) {
        setSensor(true);
        setHeading((h + 360) % 360);
      }
    };
    window.addEventListener("deviceorientationabsolute", fn as EventListener);
    window.addEventListener("deviceorientation", fn as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", fn as EventListener);
      window.removeEventListener("deviceorientation", fn as EventListener);
    };
  }, [fg]);

  // gentle simulated drift when there is no sensor and the user isn't dragging
  useEffect(() => {
    if (!fg || sensor) return;
    const id = setInterval(() => {
      if (!drag.current) setHeading((h) => (h + (Math.sin(Date.now() / 3000) * 0.6) + 360) % 360);
    }, 60);
    return () => clearInterval(id);
  }, [fg, sensor]);

  const angleOf = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const h = Math.round(heading) % 360;
  const card = DIRS[Math.round(h / 45) % 8];

  return (
    <div className="flex h-full flex-col items-center bg-black text-white" style={{ paddingTop: "calc(var(--safe-top) + 24px)" }}>
      <div className="text-center">
        <div className="text-[56px] font-light tabular-nums leading-none">
          {h}° {card}
        </div>
      </div>
      <div
        ref={box}
        className="relative mt-10 h-[300px] w-[300px] touch-none"
        onPointerDown={(e) => {
          drag.current = { a: angleOf(e), h: heading };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current && !sensor) setHeading((drag.current.h - (angleOf(e) - drag.current.a) + 720) % 360);
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <div className="absolute inset-0" style={{ transform: `rotate(${-heading}deg)`, transition: drag.current ? "none" : "transform .1s linear" }}>
          <svg viewBox="-150 -150 300 300" className="h-full w-full">
            <circle r="148" fill="#111" stroke="#333" strokeWidth="1" />
            {Array.from({ length: 72 }).map((_, i) => (
              <line key={i} y1="-140" y2={i % 6 === 0 ? "-122" : i % 2 === 0 ? "-130" : "-134"} stroke={i === 0 ? "#ff3b30" : "#fff"} strokeWidth={i % 6 === 0 ? 2 : 1} transform={`rotate(${i * 5})`} />
            ))}
            {[0, 90, 180, 270].map((a, i) => (
              <text key={a} y="-98" textAnchor="middle" fontSize="26" fontWeight="500" fill={i === 0 ? "#ff3b30" : "#fff"} transform={`rotate(${a}) `}>
                {["N", "E", "S", "W"][i]}
              </text>
            ))}
            {[30, 60, 120, 150, 210, 240, 300, 330].map((a) => (
              <text key={a} y="-98" textAnchor="middle" fontSize="12" fill="#aaa" transform={`rotate(${a})`}>
                {a}
              </text>
            ))}
          </svg>
        </div>
        <svg viewBox="-150 -150 300 300" className="pointer-events-none absolute inset-0">
          <polygon points="0,-150 -7,-138 7,-138" fill="#fff" />
          <line y1="-70" y2="70" stroke="#fff" strokeWidth="1.2" opacity=".5" />
          <line x1="-70" x2="70" stroke="#fff" strokeWidth="1.2" opacity=".5" />
          <circle r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
          {lock !== null && (
            <g transform={`rotate(${lock - heading})`}>
              <polygon points="0,-152 -6,-142 6,-142" fill="#ffd60a" />
            </g>
          )}
        </svg>
      </div>
      <button className="mt-6 rounded-full bg-white/15 px-5 py-2 text-[15px] font-medium active:bg-white/25" onClick={() => setLock(lock === null ? heading : null)}>
        {lock === null ? "Tap to lock this heading" : `Locked at ${Math.round(lock)}° — tap to unlock`}
      </button>
      <div className="mt-auto pb-10 text-center" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
        <div className="text-[13px] text-white/50">{city?.name ?? "Cupertino"}</div>
        <div className="text-[17px] font-medium tabular-nums">
          {Math.abs(city?.lat ?? 37.32).toFixed(4)}° {(city?.lat ?? 1) >= 0 ? "N" : "S"} {Math.abs(city?.lon ?? -122.03).toFixed(4)}° {(city?.lon ?? 1) >= 0 ? "E" : "W"}
        </div>
        <div className="mt-2 text-[12px] text-white/35">{sensor ? "Using device magnetometer" : "No sensor detected — drag the dial to rotate"}</div>
      </div>
      <span className="hidden">{scale}</span>
    </div>
  );
}
