import { useEffect, useRef, useState } from "react";
import { sfx } from "./sound";

const APPLE = "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";

const INTRO_KEY = "ios-sim-intro-seen";

/**
 * Apple-style intro animation shown once on first load.
 * Plays: black → Apple logo fades in (with boot chord) → "iOS Simulator" text reveal → fade out.
 */
export function IntroAnimation() {
  const [phase, setPhase] = useState<"idle" | "logo" | "text" | "done">("idle");
  const [show, setShow] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-invoke
    if (startedRef.current) return;
    startedRef.current = true;

    // Only play the intro once per browser (per origin)
    let seen = false;
    try { seen = localStorage.getItem(INTRO_KEY) === "1"; } catch { /* ignore */ }
    if (seen) {
      setPhase("done");
      return;
    }
    setShow(true);
    // Mark as seen immediately so a refresh doesn't replay it
    try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }

    // Sequence: 0ms black, 400ms logo fades in + boot sound, 1700ms text fades in, 3400ms fade out
    setTimeout(() => setPhase("logo"), 400);
    setTimeout(() => setPhase("text"), 1700);
    setTimeout(() => setPhase("done"), 3400);

    // Play boot sound on logo appear
    setTimeout(() => {
      try { sfx.boot(); } catch { /* ignore */ }
    }, 450);

    // NOTE: No cleanup — Strict Mode would clear the timers before they fire
  }, []);

  if (!show) return null;
  const done = phase === "done";
  if (done) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black"
      style={{
        opacity: done ? 0 : 1,
        transition: "opacity 0.6s ease-out",
        pointerEvents: "none",
      }}
    >
      {/* Apple logo */}
      <svg
        viewBox="0 0 384 512"
        width="84"
        height="108"
        fill="#fff"
        style={{
          opacity: phase === "logo" || phase === "text" ? 1 : 0,
          transform: phase === "text" ? "translateY(-30px) scale(0.85)" : "translateY(0) scale(1)",
          transition: "opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1), transform 1.1s cubic-bezier(0.34, 1.2, 0.4, 1)",
          filter: "drop-shadow(0 0 24px rgba(255,255,255,0.18))",
        }}
      >
        <path d={APPLE} />
      </svg>

      {/* "iOS Simulator" text reveal */}
      <div
        style={{
          opacity: phase === "text" ? 1 : 0,
          transform: phase === "text" ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 1.0s cubic-bezier(0.4, 0, 0.2, 1) 0.2s, transform 1.0s cubic-bezier(0.34, 1.2, 0.4, 1) 0.2s",
          marginTop: "32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: "30px",
            fontWeight: 600,
            letterSpacing: "-0.022em",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Tight", Inter, system-ui, sans-serif',
          }}
        >
          iOS Simulator
        </div>
        <div
          style={{
            marginTop: "6px",
            color: "rgba(255,255,255,0.5)",
            fontSize: "13px",
            fontWeight: 400,
            letterSpacing: "-0.006em",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif',
          }}
        >
          Designed by Apple in California
        </div>
      </div>

      {/* Subtle radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 50%, rgba(120,180,255,0.06) 0%, transparent 50%)",
          opacity: phase === "logo" || phase === "text" ? 1 : 0,
          transition: "opacity 1.2s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
