import type { ComponentType } from "react";
import PhoneApp from "../apps/Phone";
import MessagesApp from "../apps/Messages";
import SafariApp from "../apps/Safari";
import MusicApp from "../apps/Music";
import MailApp from "../apps/Mail";
import ClockApp from "../apps/Clock";
import MapsApp from "../apps/Maps";
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
import { Twenty48App, SnakeApp } from "../apps/Games";
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
  twenty48: { id: "twenty48", name: "2048", Comp: Twenty48App, category: "Entertainment", system: false, blurb: "Join the tiles, reach 2048" },
  snake: { id: "snake", name: "Snake", Comp: SnakeApp, category: "Entertainment", system: false, blurb: "The classic arcade game" },
};

export const appName = (id: string) => APPS[id]?.name ?? id;

export function runQuickAction(app: string, action: string, open: (id: string) => void) {
  open(app);
  sendAction(app, action);
}
