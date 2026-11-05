// App icon artwork from iosicongallery.com (hosted on cdn.jim-nielsen.com).
// Every registered simulator app has a gallery-backed icon. SVG art is only
// retained as an offline/error fallback in the AppIcon component.

const BASE = "https://cdn.jim-nielsen.com/.netlify/images?url=/icongallery/ios";
const Q = "&w=256";

function icon(slug: string, sourceSize: 512 | 1024 = 1024): string {
  return `${BASE}/${slug}/${sourceSize}.png${Q}`;
}

/** Map of simulator app id → iOS Icon Gallery artwork. */
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
  // The gallery does not list every built-in Apple utility separately.
  // Use the closest available Apple/gallery artwork for those utilities.
  appstore: icon("app-store-connect-2025-10-27"),
  settings: icon("apple-configurator-2021-12-07"),
  calculator: icon("calculator-2017-10-10"),
  compass: icon("anchor-pointer-compass-gps-2019-02-12"),
  voicememos: icon("music-memos-2016-01-22", 512),
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
  // Built-in games also use gallery artwork rather than SVG-first icons.
  twenty48: icon("slide-puzzle-classic-widget-2026-07-10"),
  snake: icon("cibby-game-collection-2026-09-18"),
  podcasts: icon("apple-podcasts-2025-10-20"),
  news: icon("apple-news-2025-10-20"),
  books: icon("apple-books-2025-10-20"),
  fitness: icon("apple-fitness-2025-10-20"),
  tv: icon("apple-tv-2025-11-04"),
  freeform: icon("freeform-2025-10-20"),
  home: icon("home-2025-10-20"),
  itunes: icon("itunes-store-2025-10-20"),
  passwords: icon("passwords-2025-10-20"),
  minesweeper: icon("minesweeper-classic-widget-2026-07-10"),
  solitaire: icon("solitaire-2022-02-03"),
  memory: icon("mandalas-memory-trainer-2013-01-28", 512),
  tictactoe: icon("tic-tac-toe-classic-widget-2026-07-10"),
  flappybird: icon("flappy-golf-2-2021-03-02"),
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

/** Preload all gallery icons into the browser cache. */
export function preloadIcons() {
  if (typeof window === "undefined") return;
  for (const url of Object.values(APP_ICON_URLS)) {
    const img = new Image();
    img.src = url;
  }
}

/** Resolve gallery artwork by app id. */
export function iconUrl(id: string): string | undefined {
  return APP_ICON_URLS[id];
}
