import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "./utils";

export interface Contact {
  id: string;
  first: string;
  last: string;
  phone: string;
  email: string;
  fav: boolean;
  hue: number;
}
export interface Msg {
  id: string;
  from: string; // "me" or contact id
  text: string;
  at: number;
  sms?: boolean;
}
export interface Thread {
  id: string;
  members: string[];
  name?: string;
  msgs: Msg[];
  unread: number;
  sms?: boolean;
}
export interface Note {
  id: string;
  text: string;
  at: number;
  pinned: boolean;
  folder: string;
}
export interface RList {
  id: string;
  name: string;
  color: string;
}
export interface Reminder {
  id: string;
  listId: string;
  text: string;
  done: boolean;
  flag: boolean;
  due?: number;
  notified?: boolean;
}
export interface CalEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  color: string;
  location?: string;
  allDay?: boolean;
}
export interface Mail {
  id: string;
  from: string;
  email: string;
  to?: string;
  subject: string;
  body: string;
  at: number;
  read: boolean;
  flagged: boolean;
  box: "inbox" | "sent" | "drafts" | "trash";
}
export interface Photo {
  id: string;
  src: string;
  at: number;
  fav: boolean;
  kind: "photo" | "video";
  dur?: number;
}
export interface City {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lon: number;
  tz: string;
}
export interface Tab {
  id: string;
  url: string; // "" = start page, "search:query", "wiki:Title", "http..."
  title: string;
}
export interface CallLog {
  id: string;
  name: string;
  number: string;
  at: number;
  dir: "in" | "out" | "missed";
  dur: number;
}

const now = Date.now();
const H = 3600_000;
const D = 24 * H;
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const t0 = startOfToday.getTime();

const contacts: Contact[] = [
  { id: "c1", first: "Mom", last: "", phone: "(415) 555-0134", email: "mom@icloud.com", fav: true, hue: 330 },
  { id: "c2", first: "Alex", last: "Rivera", phone: "(408) 555-0172", email: "alex.rivera@gmail.com", fav: true, hue: 210 },
  { id: "c3", first: "Taylor", last: "Kim", phone: "(650) 555-0198", email: "taylor.kim@outlook.com", fav: true, hue: 160 },
  { id: "c4", first: "Jordan", last: "Lee", phone: "(212) 555-0113", email: "jordan@lee.design", fav: false, hue: 30 },
  { id: "c5", first: "Priya", last: "Shah", phone: "(310) 555-0147", email: "priya.shah@icloud.com", fav: false, hue: 280 },
  { id: "c6", first: "Sam", last: "Patel", phone: "(206) 555-0161", email: "sam.patel@me.com", fav: false, hue: 100 },
  { id: "c7", first: "Dr.", last: "Chen", phone: "(415) 555-0120", email: "office@chendental.com", fav: false, hue: 0 },
  { id: "c8", first: "Luigi's", last: "Pizza", phone: "(415) 555-0199", email: "", fav: false, hue: 20 },
];

const threads: Thread[] = [
  {
    id: "t1",
    members: ["c2"],
    unread: 0,
    msgs: [
      { id: "m1", from: "c2", text: "Hey! Are we still on for the hike this weekend?", at: now - 3 * H },
      { id: "m2", from: "me", text: "Absolutely. I'll bring snacks 🥾", at: now - 2.8 * H },
      { id: "m3", from: "c2", text: "Perfect. Leaving at 8am sharp", at: now - 2.7 * H },
    ],
  },
  {
    id: "t2",
    members: ["c1"],
    unread: 1,
    msgs: [
      { id: "m4", from: "me", text: "Landed safely!", at: now - 1 * D - 3 * H },
      { id: "m5", from: "c1", text: "Call me when you get a chance, sweetheart ❤️", at: now - 1 * H },
    ],
  },
  {
    id: "t3",
    members: ["c2", "c3", "c6"],
    name: "Weekend Crew",
    unread: 0,
    msgs: [
      { id: "m6", from: "c3", text: "Dinner Friday? I found a new ramen place", at: now - 5 * H },
      { id: "m7", from: "c6", text: "I'm in 🍜", at: now - 4.9 * H },
      { id: "m8", from: "me", text: "Count me in!", at: now - 4.8 * H },
    ],
  },
  {
    id: "t4",
    members: ["c4"],
    unread: 0,
    sms: true,
    msgs: [{ id: "m9", from: "c4", text: "Sent you the design files. Let me know what you think.", at: now - 2 * D }],
  },
];

const notes: Note[] = [
  {
    id: "n1",
    text: "Welcome to Notes\nThis is a fully working notes app. Tap to edit, swipe a note to delete it, and pin your favorites.",
    at: now - 2 * H,
    pinned: true,
    folder: "Notes",
  },
  {
    id: "n2",
    text: "Packing list\n• Passport\n• Charger\n• Sunglasses\n• Camera\n• Hiking boots",
    at: now - 1 * D,
    pinned: false,
    folder: "Notes",
  },
  {
    id: "n3",
    text: "Ideas for the weekend\nSunrise hike, farmers market, try that ramen place, finish reading.",
    at: now - 3 * D,
    pinned: false,
    folder: "Notes",
  },
];

const rlists: RList[] = [
  { id: "l1", name: "Reminders", color: "#007aff" },
  { id: "l2", name: "Groceries", color: "#34c759" },
  { id: "l3", name: "Work", color: "#ff9500" },
];
const reminders: Reminder[] = [
  { id: "r1", listId: "l1", text: "Call Mom", done: false, flag: true, due: t0 + 18 * H },
  { id: "r2", listId: "l1", text: "Renew passport", done: false, flag: false },
  { id: "r3", listId: "l2", text: "Oat milk", done: false, flag: false },
  { id: "r4", listId: "l2", text: "Avocados", done: false, flag: false },
  { id: "r5", listId: "l2", text: "Sourdough bread", done: true, flag: false },
  { id: "r6", listId: "l3", text: "Send quarterly report", done: false, flag: true, due: t0 + D + 10 * H },
  { id: "r7", listId: "l3", text: "Review pull requests", done: false, flag: false },
];

const events: CalEvent[] = [
  { id: "e1", title: "Team Standup", start: t0 + 9.5 * H, end: t0 + 10 * H, color: "#007aff", location: "Zoom" },
  { id: "e2", title: "Lunch with Alex", start: t0 + 12.5 * H, end: t0 + 13.5 * H, color: "#34c759", location: "Café Verde" },
  { id: "e3", title: "Design Review", start: t0 + 15 * H, end: t0 + 16 * H, color: "#ff9500", location: "Room 4B" },
  { id: "e4", title: "Dentist", start: t0 + D + 9 * H, end: t0 + D + 10 * H, color: "#ff3b30", location: "Dr. Chen" },
  { id: "e5", title: "Yoga", start: t0 + D + 18 * H, end: t0 + D + 19 * H, color: "#af52de" },
  { id: "e6", title: "Mom's Birthday 🎂", start: t0 + 4 * D, end: t0 + 5 * D, color: "#ff2d55", allDay: true },
  { id: "e7", title: "Flight to SFO", start: t0 + 6 * D + 7 * H, end: t0 + 6 * D + 10 * H, color: "#5ac8fa", location: "JFK T4" },
];

const mails: Mail[] = [
  {
    id: "ml1",
    from: "Apple",
    email: "no_reply@email.apple.com",
    subject: "Welcome to your new iPhone",
    body: "Hello,\n\nThanks for setting up your iPhone. Here are a few things to try:\n\n• Swipe down from the top right for Control Center\n• Swipe up from the bottom to go Home\n• Press and hold the side button to talk to Siri\n\nEnjoy!\n\n— The Apple Team",
    at: now - 1 * H,
    read: false,
    flagged: false,
    box: "inbox",
  },
  {
    id: "ml2",
    from: "Alex Rivera",
    email: "alex.rivera@gmail.com",
    subject: "Weekend plans?",
    body: "Hey,\n\nHiking Saturday morning. Trail starts at 8am — I'll pack lunch, can you grab the coffee?\n\nAlex",
    at: now - 4 * H,
    read: false,
    flagged: true,
    box: "inbox",
  },
  {
    id: "ml3",
    from: "SkyJet Airlines",
    email: "checkin@skyjet.com",
    subject: "Your flight check-in is open",
    body: "Flight SJ 482 · JFK → SFO\nDeparts in 6 days at 7:00 AM, Terminal 4.\n\nCheck in now to choose your seat and get your boarding pass.",
    at: now - 1 * D,
    read: true,
    flagged: false,
    box: "inbox",
  },
  {
    id: "ml4",
    from: "Swift Weekly",
    email: "news@swiftweekly.dev",
    subject: "Issue #312: SwiftUI animations deep-dive",
    body: "This week: spring animations, matched geometry effects, and why your List is re-rendering.\n\nRead the full issue on our site.",
    at: now - 2 * D,
    read: true,
    flagged: false,
    box: "inbox",
  },
  {
    id: "ml5",
    from: "Mom",
    email: "mom@icloud.com",
    subject: "Photos from Sunday",
    body: "Look how big the garden got! Dad says hi.\n\nLove, Mom",
    at: now - 3 * D,
    read: true,
    flagged: false,
    box: "inbox",
  },
  {
    id: "ml6",
    from: "Café Verde",
    email: "hello@cafeverde.com",
    subject: "Your receipt from Café Verde",
    body: "Thanks for stopping by!\n\n1× Oat Flat White  $4.80\n1× Almond Croissant  $3.90\n\nTotal  $8.70",
    at: now - 4 * D,
    read: true,
    flagged: false,
    box: "inbox",
  },
];

const cities: City[] = [
  { id: "ci1", name: "Cupertino", country: "United States", lat: 37.3230, lon: -122.0322, tz: "America/Los_Angeles" },
  { id: "ci2", name: "New York", country: "United States", lat: 40.7128, lon: -74.006, tz: "America/New_York" },
  { id: "ci3", name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { id: "ci4", name: "Tokyo", country: "Japan", lat: 35.6895, lon: 139.6917, tz: "Asia/Tokyo" },
];

const calls: CallLog[] = [
  { id: "cl1", name: "Mom", number: "(415) 555-0134", at: now - 1.2 * H, dir: "missed", dur: 0 },
  { id: "cl2", name: "Alex Rivera", number: "(408) 555-0172", at: now - 5 * H, dir: "out", dur: 312 },
  { id: "cl3", name: "Luigi's Pizza", number: "(415) 555-0199", at: now - 1 * D, dir: "out", dur: 64 },
  { id: "cl4", name: "Taylor Kim", number: "(650) 555-0198", at: now - 2 * D, dir: "in", dur: 845 },
];

export interface DataState {
  contacts: Contact[];
  threads: Thread[];
  notes: Note[];
  rlists: RList[];
  reminders: Reminder[];
  events: CalEvent[];
  mails: Mail[];
  photos: Photo[];
  favPhotos: number[];
  cities: City[];
  clocks: City[];
  tabs: Tab[];
  activeTab: string;
  bookmarks: { title: string; url: string }[];
  history: { title: string; url: string; at: number }[];
  calls: CallLog[];
  mapRecents: string[];
  voiceMemos: { id: string; name: string; dur: number; at: number; url: string }[];
  installedApps: string[];
}

const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => localStorage.getItem(k),
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* quota exceeded: ignore */
    }
  },
  removeItem: (k: string) => localStorage.removeItem(k),
}));

export const useData = create<DataState>()(
  persist(
    () => ({
      contacts,
      threads,
      notes,
      rlists,
      reminders,
      events,
      mails,
      photos: [] as Photo[],
      favPhotos: [] as number[],
      cities,
      clocks: [
        { id: "w1", name: "Cupertino", lat: 0, lon: 0, tz: "America/Los_Angeles" },
        { id: "w2", name: "New York", lat: 0, lon: 0, tz: "America/New_York" },
        { id: "w3", name: "London", lat: 0, lon: 0, tz: "Europe/London" },
        { id: "w4", name: "Tokyo", lat: 0, lon: 0, tz: "Asia/Tokyo" },
      ] as City[],
      tabs: [{ id: "tab1", url: "", title: "Start Page" }] as Tab[],
      activeTab: "tab1",
      bookmarks: [] as { title: string; url: string }[],
      history: [] as { title: string; url: string; at: number }[],
      calls,
      mapRecents: [] as string[],
      voiceMemos: [] as DataState["voiceMemos"],
      installedApps: [] as string[],
    }),
    {
      name: "ios-sim-data",
      version: 2,
      storage: safeStorage,
      partialize: (s) => {
        const { voiceMemos: _v, ...rest } = s;
        void _v;
        return rest;
      },
    },
  ),
);

export const patchData = (fn: (s: DataState) => Partial<DataState>) => useData.setState(fn);

export function contactName(c: Contact | undefined) {
  if (!c) return "Unknown";
  return `${c.first} ${c.last}`.trim();
}
export function findContactByNumber(num: string) {
  const digits = num.replace(/\D/g, "");
  if (!digits) return undefined;
  return useData.getState().contacts.find((c) => c.phone.replace(/\D/g, "").endsWith(digits) && digits.length >= 4);
}
export function formatPhone(d: string) {
  const s = d.replace(/[^\d*#+]/g, "");
  if (/[*#+]/.test(s) || s.length < 4) return s;
  if (s.length <= 7) return s.replace(/(\d{3})(\d+)/, "$1-$2");
  if (s.length <= 10) return s.replace(/(\d{3})(\d{3})(\d+)/, "($1) $2-$3");
  return s.replace(/(\d)(\d{3})(\d{3})(\d+)/, "+$1 ($2) $3-$4");
}
export const newId = uid;
