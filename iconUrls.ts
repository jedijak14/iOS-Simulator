// Real iOS app icon URLs from iosicongallery.com (hosted on cdn.jim-nielsen.com).
// Each URL points to a 256px version of the actual iOS app icon.

const BASE = "https://cdn.jim-nielsen.com/.netlify/images?url=/icongallery/ios";
const Q = "&w=256";

function icon(slug: string): string {
  return `${BASE}/${slug}/1024.png${Q}`;
}

/** Map of simulator app id → real iOS icon URL (when available). */
export const APP_ICON_URLS: Record<string, string> = {
  phone: icon("phone-2025-10-20"),
  messages: icon("messages-2025-10-20"),
  safari: icon("safari-2025-10-20"),
  music: icon("apple-music-2025-10-20"),
  mail: icon("mail-2025-10-20"),
  clock: icon("clock-2025-10-20"),
  maps: icon("apple-maps-2025-10-20"),
  camera: icon("camera-2025-10-20"),
  reminders: icon("reminders-2025-10-20"),
  notes: icon("notes-2025-10-20"),
  stocks: icon("stocks-2025-10-31"),
  wallet: icon("apple-wallet-2025-10-20"),
  photos: icon("photos-2025-10-20"),
  weather: icon("weather-2025-10-20"),
  calendar: icon("calendar-2025-10-20"),
  contacts: icon("contacts-2025-10-20"),
  facetime: icon("facetime-2025-10-20"),
  health: icon("apple-health-2025-10-27"),
  translate: icon("translate-2025-10-27"),
  files: icon("files-2025-10-20"),
  shortcuts: icon("shortcuts-2025-10-20"),
  journal: icon("journal-2025-10-20"),
  tips: icon("tips-2026-09-23"),
  findmy: icon("find-my-2025-10-20"),
  magnifier: icon("magnifier-2025-10-20"),
  podcasts: icon("apple-podcasts-2025-10-20"),
  news: icon("apple-news-2025-10-20"),
  books: icon("apple-books-2025-10-20"),
  fitness: icon("apple-fitness-2025-10-20"),
  tv: icon("apple-tv-2025-11-04"),
  freeform: icon("freeform-2025-10-20"),
  home: icon("home-2025-10-20"),
  itunes: icon("itunes-store-2025-10-20"),
  passwords: icon("passwords-2025-10-20"),
  garageband: icon("garageband-2025-08-05"),
  imovie: icon("imovie-2025-08-05"),
  keynote: icon("keynote-2025-08-05"),
  numbers: icon("numbers-2025-08-05"),
  pages: icon("pages-2025-08-05"),
  testflight: icon("testflight-2025-11-04"),
  appstoreconnect: icon("app-store-connect-2025-10-27"),
  applestore: icon("apple-store-2026-01-06"),
  // Third-party apps (for App Store dynamic install)
  spotify: icon("spotify-music-and-podcasts-2026-05-19"),
  instagram: icon("instagram-2022-05-19"),
  youtube: icon("youtube-2013-09-05"),
  ytmusic: icon("youtube-music-2016-09-28"),
  snapchat: icon("snapchat-2026-10-04"),
  duckduckgo: icon("duckduckgo-optional-duck-ai-2026-10-04"),
};

/** Apps not on iosicongallery.com — kept as SVG. */
export const NO_REAL_ICON = new Set([
  "settings", "calculator", "compass", "voicememos", "appstore", "twenty48", "snake",
  "minesweeper", "solitaire", "memory", "tictactoe", "flappybird",
]);

/** Preload all real icon URLs into the browser cache. */
export function preloadIcons() {
  if (typeof window === "undefined") return;
  for (const url of Object.values(APP_ICON_URLS)) {
    const img = new Image();
    img.src = url;
  }
}

/** Resolve an icon URL by app id (returns undefined if not in the registry). */
export function iconUrl(id: string): string | undefined {
  if (NO_REAL_ICON.has(id)) return undefined;
  return APP_ICON_URLS[id];
}
