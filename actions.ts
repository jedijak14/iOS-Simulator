import { useEffect } from "react";

// Lightweight bus so the OS can send "quick actions" to apps (mounted or not yet mounted).
let pending: { app: string; action: string } | null = null;

export function sendAction(app: string, action: string) {
  pending = { app, action };
  window.dispatchEvent(new CustomEvent("app-action", { detail: { app, action } }));
}

export function useAppAction(app: string, handler: (action: string) => void) {
  useEffect(() => {
    if (pending && pending.app === app) {
      const a = pending.action;
      pending = null;
      setTimeout(() => handler(a), 50);
    }
    const fn = (e: Event) => {
      const d = (e as CustomEvent).detail as { app: string; action: string };
      if (d.app === app) {
        pending = null;
        handler(d.action);
      }
    };
    window.addEventListener("app-action", fn);
    return () => window.removeEventListener("app-action", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);
}
