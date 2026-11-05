import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { preloadIcons } from "./os/iconUrls";
import { preloadSounds } from "./os/sound";

// Preload real iOS app icons + system sounds into the browser cache.
// (These are no-ops if the network is unavailable — the app still works
// with SVG icon fallbacks and synthesized sounds.)
try {
  preloadIcons();
} catch {
  /* ignore — icons are optional */
}
try {
  preloadSounds();
} catch {
  /* ignore — sounds are optional */
}

// Render the app
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // Hide the boot loader once React has mounted
  requestAnimationFrame(() => {
    const boot = document.getElementById("boot");
    if (boot && rootEl.children.length > 0) {
      boot.style.opacity = "0";
      boot.style.transition = "opacity 0.3s ease";
      setTimeout(() => { boot.style.display = "none"; }, 350);
    }
  });
}
