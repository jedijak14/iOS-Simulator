import { useEffect, useRef } from "react";
import { useOS } from "./store";

/**
 * Shake-to-Undo — listens for the keyboard shortcut Ctrl/⌘+Z and (when
 * available) a real device shake via the DeviceMotion API. When triggered,
 * shows the standard "Undo" toast.
 *
 * Mount this component once near the root of the simulator (see `Screen.tsx`).
 * It renders nothing.
 */
export function ShakeToUndo() {
  const lastTrigger = useRef(0);
  const lastShake = useRef(0);

  useEffect(() => {
    const trigger = () => {
      const now = Date.now();
      // 800ms cooldown so a single shake doesn't fire multiple toasts.
      if (now - lastTrigger.current < 800) return;
      lastTrigger.current = now;
      useOS.getState().showToast("Undo");
    };

    // --- Keyboard shortcut: Ctrl+Z or Cmd+Z ---
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        trigger();
      }
    };
    window.addEventListener("keydown", onKey);

    // --- DeviceMotion shake detection (mobile / supported browsers) ---
    let mounted = true;
    const SHAKE_THRESHOLD = 18; // m/s^2 — high enough to ignore normal handling
    const onMotion = (e: DeviceMotionEvent) => {
      if (!mounted) return;
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (mag > SHAKE_THRESHOLD) {
        const now = Date.now();
        // require a short gap between individual shake peaks
        if (now - lastShake.current > 350) {
          lastShake.current = now;
          trigger();
        }
      }
    };

    // Some browsers (iOS Safari 13+) require permission via a user gesture.
    const DME = typeof window !== "undefined" ? (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent : undefined;
    const tryAttach = () => {
      try {
        window.addEventListener("devicemotion", onMotion);
      } catch {
        /* ignore */
      }
    };
    if (DME && typeof DME.requestPermission === "function") {
      // Defer permission request until the first user gesture; the listener
      // simply won't fire before permission is granted. We still attach a
      // best-effort listener in case the browser doesn't actually require
      // permission despite advertising the API.
      tryAttach();
      const onFirstGesture = () => {
        DME.requestPermission?.().then(() => tryAttach()).catch(() => undefined);
        window.removeEventListener("pointerdown", onFirstGesture);
        window.removeEventListener("keydown", onFirstGesture);
      };
      window.addEventListener("pointerdown", onFirstGesture, { once: true });
      window.addEventListener("keydown", onFirstGesture, { once: true });
    } else if (typeof window !== "undefined" && "DeviceMotionEvent" in window) {
      tryAttach();
    }

    return () => {
      mounted = false;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devicemotion", onMotion);
    };
  }, []);

  return null;
}

export default ShakeToUndo;
