import type { ComponentType } from "react";
import PhoneApp from "../apps/Phone";
import MessagesApp from "../apps/Messages";
import SafariApp from "../apps/Safari";
import MusicApp from "../apps/Music";
import MailApp from "../apps/Mail";
import ClockApp from "../apps/Clock";
import MapsApp from "../apps/Maps";
import SiriApp from "../apps/SiriApp";
import CameraApp from "../apps/Camera";
import RemindersApp from "../apps/Reminders";
import NotesApp from "../apps/Notes";
import StocksApp from "../apps/Stocks";
import WalletApp from "../apps/Wallet";
import PhotosApp from "../apps/Photos";
import WeatherApp from "../apps/Weather";
import CalendarApp from "../apps/Calendar";
import AppStoreApp from "../apps/AppStore";
import SettingsApp from "../apps/Settings";
import CalculatorApp from "../apps/Calculator";
import CompassApp from "../apps/Compass";
import VoiceMemosApp from "../apps/VoiceMemos";
import ContactsApp from "../apps/Contacts";
import FaceTimeApp from "../apps/FaceTime";
import HealthApp from "../apps/Health";
import TranslateApp from "../apps/Translate";
import FilesApp from "../apps/Files";
import ShortcutsApp from "../apps/Shortcuts";
import JournalApp from "../apps/Journal";
import TipsApp from "../apps/Tips";
import FindMyApp from "../apps/FindMy";
import MagnifierApp from "../apps/Magnifier";
import { Twenty48App, SnakeApp } from "../apps/Games";
import { MinesweeperApp, SolitaireApp, MemoryApp, TicTacToeApp, FlappyBirdApp } from "../apps/MoreGames";
import { SpotifyApp, YouTubeApp, InstagramApp, SnapchatApp, DuckDuckGoApp } from "../apps/ThirdParty";
import { PodcastsApp, NewsApp, BooksApp, TVApp } from "../apps/MediaApps";
import { FitnessApp, FreeformApp, HomeApp, PasswordsApp } from "../apps/UtilityApps";
import { sendAction } from "./actions";

export interface AppDef {
  id: string;
  name: string;
  Comp: ComponentType;
  /** status bar always light (dark app background) */
  light?: boolean;
  category: string;
  system: boolean;
  actions?: { label: string; action: string }[];
  blurb?: string;
}

export const APPS: Record<string, AppDef> = {
  phone: {
    id: "phone",
    name: "Phone",
    Comp: PhoneApp,
    category: "Social",
    system: true,
    actions: [
      { label: "Keypad", action: "keypad" },
      { label: "Recents", action: "recents" },
    ],
  },
  messages: {
    id: "messages",
    name: "Messages",
    Comp: MessagesApp,
    category: "Social",
    system: true,
    actions: [{ label: "New Message", action: "new" }],
  },
  safari: {
    id: "safari",
    name: "Safari",
    Comp: SafariApp,
    category: "Information & Reading",
    system: true,
    actions: [{ label: "New Tab", action: "newtab" }],
  },
  music: { id: "music", name: "Music", Comp: MusicApp, category: "Entertainment", system: true },
  mail: { id: "mail", name: "Mail", Comp: MailApp, category: "Social", system: true, actions: [{ label: "New Message", action: "new" }] },
  clock: {
    id: "clock",
    name: "Clock",
    Comp: ClockApp,
    light: true,
    category: "Utilities",
    system: true,
    actions: [
      { label: "Create Alarm", action: "alarm" },
      { label: "Start Timer", action: "timer" },
      { label: "Start Stopwatch", action: "stopwatch" },
    ],
  },
  siriapp: { id: "siriapp", name: "Siri", Comp: SiriApp, category: "Utilities", system: true },
  maps: { id: "maps", name: "Maps", Comp: MapsApp, category: "Information & Reading", system: true },
  camera: { id: "camera", name: "Camera", Comp: CameraApp, light: true, category: "Creativity", system: true },
  reminders: { id: "reminders", name: "Reminders", Comp: RemindersApp, category: "Productivity & Finance", system: true, actions: [{ label: "New Reminder", action: "new" }] },
  notes: { id: "notes", name: "Notes", Comp: NotesApp, category: "Productivity & Finance", system: true, actions: [{ label: "New Note", action: "new" }] },
  stocks: { id: "stocks", name: "Stocks", Comp: StocksApp, light: true, category: "Productivity & Finance", system: true },
  wallet: { id: "wallet", name: "Wallet", Comp: WalletApp, category: "Productivity & Finance", system: true },
  photos: { id: "photos", name: "Photos", Comp: PhotosApp, category: "Creativity", system: true },
  weather: { id: "weather", name: "Weather", Comp: WeatherApp, light: true, category: "Information & Reading", system: true },
  calendar: { id: "calendar", name: "Calendar", Comp: CalendarApp, category: "Productivity & Finance", system: true },
  appstore: { id: "appstore", name: "App Store", Comp: AppStoreApp, category: "Entertainment", system: true },
  settings: { id: "settings", name: "Settings", Comp: SettingsApp, category: "Utilities", system: true },
  calculator: { id: "calculator", name: "Calculator", Comp: CalculatorApp, light: true, category: "Utilities", system: true },
  compass: { id: "compass", name: "Compass", Comp: CompassApp, light: true, category: "Utilities", system: true },
  voicememos: { id: "voicememos", name: "Voice Memos", Comp: VoiceMemosApp, category: "Utilities", system: true, actions: [{ label: "New Recording", action: "record" }] },
  contacts: { id: "contacts", name: "Contacts", Comp: ContactsApp, category: "Social", system: true },
  facetime: { id: "facetime", name: "FaceTime", Comp: FaceTimeApp, category: "Social", system: true },
  health: { id: "health", name: "Health", Comp: HealthApp, category: "Health & Fitness", system: true },
  translate: { id: "translate", name: "Translate", Comp: TranslateApp, category: "Reference", system: true },
  files: { id: "files", name: "Files", Comp: FilesApp, category: "Utilities", system: true },
  shortcuts: { id: "shortcuts", name: "Shortcuts", Comp: ShortcutsApp, category: "Productivity & Finance", system: true },
  journal: { id: "journal", name: "Journal", Comp: JournalApp, category: "Health & Fitness", system: true },
  tips: { id: "tips", name: "Tips", Comp: TipsApp, category: "Reference", system: true },
  findmy: { id: "findmy", name: "Find My", Comp: FindMyApp, category: "Utilities", system: true },
  magnifier: { id: "magnifier", name: "Magnifier", Comp: MagnifierApp, light: true, category: "Utilities", system: true },
  twenty48: { id: "twenty48", name: "2048", Comp: Twenty48App, category: "Entertainment", system: false, blurb: "Join the tiles, reach 2048" },
  snake: { id: "snake", name: "Snake", Comp: SnakeApp, category: "Entertainment", system: false, blurb: "The classic arcade game" },
  // Third-party apps (dynamic install from App Store)
  spotify: { id: "spotify", name: "Spotify", Comp: SpotifyApp, category: "Entertainment", system: false, blurb: "Music and Podcasts" },
  youtube: { id: "youtube", name: "YouTube", Comp: YouTubeApp, category: "Entertainment", system: false, blurb: "Watch, listen, stream" },
  instagram: { id: "instagram", name: "Instagram", Comp: InstagramApp, category: "Social", system: false, blurb: "Connect with friends" },
  snapchat: { id: "snapchat", name: "Snapchat", Comp: SnapchatApp, category: "Social", system: false, blurb: "Share the moment" },
  duckduckgo: { id: "duckduckgo", name: "DuckDuckGo", Comp: DuckDuckGoApp, category: "Utilities", system: false, blurb: "Privacy browser" },
  // Media apps
  podcasts: { id: "podcasts", name: "Podcasts", Comp: PodcastsApp, category: "Entertainment", system: true },
  news: { id: "news", name: "News", Comp: NewsApp, category: "Information & Reading", system: true },
  books: { id: "books", name: "Books", Comp: BooksApp, category: "Reference", system: true },
  tv: { id: "tv", name: "TV", Comp: TVApp, light: true, category: "Entertainment", system: true },
  // Utility apps
  fitness: { id: "fitness", name: "Fitness", Comp: FitnessApp, light: true, category: "Health & Fitness", system: true },
  freeform: { id: "freeform", name: "Freeform", Comp: FreeformApp, category: "Productivity & Finance", system: true },
  home: { id: "home", name: "Home", Comp: HomeApp, category: "Utilities", system: true },
  passwords: { id: "passwords", name: "Passwords", Comp: PasswordsApp, category: "Utilities", system: true },
  // More games
  minesweeper: { id: "minesweeper", name: "Minesweeper", Comp: MinesweeperApp, category: "Entertainment", system: false, blurb: "Classic mine-finding" },
  solitaire: { id: "solitaire", name: "Solitaire", Comp: SolitaireApp, category: "Entertainment", system: false, blurb: "Klondike solitaire" },
  memory: { id: "memory", name: "Memory", Comp: MemoryApp, category: "Entertainment", system: false, blurb: "Match the pairs" },
  tictactoe: { id: "tictactoe", name: "Tic-Tac-Toe", Comp: TicTacToeApp, category: "Entertainment", system: false, blurb: "Play vs AI" },
  flappybird: { id: "flappybird", name: "Flappy Bird", Comp: FlappyBirdApp, light: true, category: "Entertainment", system: false, blurb: "Tap to flap" },
};

export const appName = (id: string) => APPS[id]?.name ?? id;

export function runQuickAction(app: string, action: string, open: (id: string) => void) {
  open(app);
  sendAction(app, action);
}
