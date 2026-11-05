import { useOS } from "./store";

/** iOS 18 home screen icon appearance modes. */
export type IconMode = "default" | "tinted" | "dark";

const FILTERS: Record<IconMode, string> = {
  default: "",
  // tinted — desaturated but with extra contrast so hues pop subtly
  tinted: "grayscale(0.5) contrast(1.2)",
  // dark — high-contrast, dim grayscale like iOS 18 dark mode icons
  dark: "grayscale(1) brightness(0.3) contrast(1.5)",
};

/** Apply the CSS filter for a given icon mode to an <img> element. */
export function applyIconMode(img: HTMLImageElement, mode: IconMode) {
  img.style.filter = FILTERS[mode];
}

/** Resolve the CSS filter string for an icon mode (useful for inline styles). */
export function iconModeFilter(mode: IconMode): string {
  return FILTERS[mode];
}

/** React hook that reads the current icon mode from the OS store. */
export function useIconMode(): IconMode {
  return useOS((s) => s.iconMode);
}
