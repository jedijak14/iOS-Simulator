export interface DeviceSpec {
  id: string;
  name: string;
  model: string;
  w: number;
  h: number;
  radius: number; // screen corner radius
  island: boolean;
  homeButton: boolean;
  safeTop: number;
  safeBottom: number;
  kbH: number;
  rows: number;
  bezelTop: number;
  bezelBottom: number;
  bezelSide: number;
}

export const DEVICES: DeviceSpec[] = [
  { id: "ipad", name: "iPad (simulated)", model: "iPad", w: 768, h: 1024, radius: 28, island: false, homeButton: false, safeTop: 32, safeBottom: 24, kbH: 300, rows: 6, bezelTop: 14, bezelBottom: 14, bezelSide: 14 },
  {
    id: "15pro",
    name: "iPhone 15 Pro",
    model: "MTUW3LL/A",
    w: 393,
    h: 852,
    radius: 55,
    island: true,
    homeButton: false,
    safeTop: 54,
    safeBottom: 34,
    kbH: 291,
    rows: 6,
    bezelTop: 11,
    bezelBottom: 11,
    bezelSide: 11,
  },
  {
    id: "15promax",
    name: "iPhone 15 Pro Max",
    model: "MU2N3LL/A",
    w: 430,
    h: 932,
    radius: 55,
    island: true,
    homeButton: false,
    safeTop: 59,
    safeBottom: 34,
    kbH: 301,
    rows: 7,
    bezelTop: 11,
    bezelBottom: 11,
    bezelSide: 11,
  },
  {
    id: "se",
    name: "iPhone SE",
    model: "MMXN3LL/A",
    w: 375,
    h: 667,
    radius: 0,
    island: false,
    homeButton: true,
    safeTop: 20,
    safeBottom: 0,
    kbH: 260,
    rows: 5,
    bezelTop: 84,
    bezelBottom: 96,
    bezelSide: 16,
  },
];

export interface DeviceColor {
  id: string;
  name: string;
  frame: string;
  btn: string;
}

export const COLORS: DeviceColor[] = [
  {
    id: "natural",
    name: "Natural Titanium",
    frame: "linear-gradient(145deg,#e0dacf 0%,#a8a195 35%,#d3ccbf 60%,#8d877c 100%)",
    btn: "#a29c90",
  },
  {
    id: "blue",
    name: "Blue Titanium",
    frame: "linear-gradient(145deg,#68778c 0%,#2f3a4a 35%,#5a687d 60%,#232b37 100%)",
    btn: "#3b4759",
  },
  {
    id: "white",
    name: "White Titanium",
    frame: "linear-gradient(145deg,#fbfbf9 0%,#c9c9c6 35%,#efefed 60%,#b1b1ae 100%)",
    btn: "#d2d2cf",
  },
  {
    id: "black",
    name: "Black Titanium",
    frame: "linear-gradient(145deg,#59595c 0%,#262628 35%,#4a4a4d 60%,#18181a 100%)",
    btn: "#2e2e30",
  },
];

export interface Wallpaper {
  id: string;
  name: string;
  css: string;
}

const mesh = (a: string, b: string, c: string, d: string, base: string) =>
  `radial-gradient(120% 70% at 15% 10%, ${a} 0%, transparent 60%), radial-gradient(90% 60% at 90% 25%, ${b} 0%, transparent 60%), radial-gradient(110% 70% at 20% 95%, ${c} 0%, transparent 60%), radial-gradient(90% 60% at 95% 100%, ${d} 0%, transparent 60%), ${base}`;

export const WALLPAPERS: Wallpaper[] = [
  { id: "aurora", name: "Aurora", css: mesh("#5ee7df", "#b490ca", "#2b5876", "#4e4376", "#1b1f3b") },
  { id: "sunset", name: "Sunset", css: mesh("#ff9a8b", "#ff6a88", "#ffb347", "#c33764", "#3a1c71") },
  { id: "ocean", name: "Ocean", css: mesh("#36d1dc", "#5b86e5", "#0f2027", "#2c5364", "#0b1f33") },
  { id: "bloom", name: "Bloom", css: mesh("#f6d365", "#fda085", "#f093fb", "#f5576c", "#7b2ff7") },
  { id: "forest", name: "Forest", css: mesh("#a8e063", "#56ab2f", "#134e5e", "#71b280", "#0f2b1d") },
  { id: "nebula", name: "Nebula", css: mesh("#7f00ff", "#e100ff", "#00c6ff", "#0072ff", "#0a0a23") },
  { id: "mono", name: "Graphite", css: mesh("#636366", "#8e8e93", "#2c2c2e", "#48484a", "#111113") },
  { id: "peach", name: "Peach", css: mesh("#ffecd2", "#fcb69f", "#ff9a9e", "#fad0c4", "#f8b6a0") },
];

export const wallpaperOf = (id: string) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
