import { useOS } from "./store";
import { getCtx, tone } from "./sound";

export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  dur: number;
  bpm: number;
  root: number;
  scale: number[];
  prog: number[];
  hue: number;
  seed: number;
  wave: OscillatorType;
  density: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PENT = [0, 2, 4, 7, 9];

export const TRACKS: Track[] = [
  { id: 0, title: "Neon Drive", artist: "Midnight Circuit", album: "Night Run", dur: 184, bpm: 112, root: 57, scale: MINOR, prog: [0, 5, 2, 6], hue: 285, seed: 11, wave: "sawtooth", density: 0.75 },
  { id: 1, title: "Golden Hour", artist: "Lumen", album: "Daybreak", dur: 203, bpm: 96, root: 60, scale: MAJOR, prog: [0, 4, 5, 3], hue: 35, seed: 23, wave: "triangle", density: 0.6 },
  { id: 2, title: "Paper Planes", artist: "Hollow Fields", album: "Soft Landing", dur: 167, bpm: 124, root: 62, scale: PENT, prog: [0, 2, 3, 1], hue: 195, seed: 37, wave: "sine", density: 0.8 },
  { id: 3, title: "Slow Tide", artist: "Aria Vale", album: "Low Moon", dur: 221, bpm: 72, root: 55, scale: DORIAN, prog: [0, 3, 4, 3], hue: 215, seed: 41, wave: "sine", density: 0.45 },
  { id: 4, title: "Afterglow", artist: "Neon Atlas", album: "Night Run", dur: 192, bpm: 104, root: 59, scale: MINOR, prog: [0, 2, 5, 4], hue: 330, seed: 53, wave: "triangle", density: 0.7 },
  { id: 5, title: "Cascade", artist: "Vega", album: "Waterline", dur: 176, bpm: 132, root: 64, scale: MAJOR, prog: [0, 5, 3, 4], hue: 150, seed: 67, wave: "square", density: 0.55 },
  { id: 6, title: "Window Seat", artist: "Rainy Days", album: "Lo-Fi Mornings", dur: 148, bpm: 82, root: 58, scale: DORIAN, prog: [1, 4, 0, 5], hue: 20, seed: 79, wave: "triangle", density: 0.5 },
  { id: 7, title: "Orbit", artist: "Starlit", album: "Zero Gravity", dur: 210, bpm: 118, root: 61, scale: PENT, prog: [0, 3, 1, 4], hue: 260, seed: 97, wave: "sawtooth", density: 0.65 },
];

const mf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (seed: number, n: number) => {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

let timer: number | undefined;
let cur: Track | null = null;
let step = 0;
let nextTime = 0;

function degree(t: Track, d: number, oct = 0) {
  const len = t.scale.length;
  const o = Math.floor(d / len);
  return t.root + t.scale[((d % len) + len) % len] + 12 * (o + oct);
}

function schedule() {
  const ctx = getCtx();
  if (!ctx || !cur) return;
  const t = cur;
  const spb = 60 / t.bpm / 2;
  while (nextTime < ctx.currentTime + 0.3) {
    const bar = Math.floor(step / 8) % t.prog.length;
    const deg = t.prog[bar];
    const dl = Math.max(0, nextTime - ctx.currentTime);
    const s8 = step % 8;
    if (s8 === 0) {
      [0, 2, 4].forEach((o, i) => tone({ freq: mf(degree(t, deg + o, 0)), dur: spb * 8.5, type: "sine", gain: 0.05 - i * 0.005, delay: dl, force: true }));
    }
    if (s8 % 4 === 0) tone({ freq: mf(degree(t, deg, -1)), dur: spb * 3, type: "triangle", gain: 0.15, delay: dl, force: true });
    if (s8 % 4 === 0) tone({ freq: 130, slideTo: 42, dur: 0.16, type: "sine", gain: 0.3, delay: dl, force: true });
    if (s8 % 2 === 1) tone({ freq: 7000, dur: 0.03, type: "square", gain: 0.012, delay: dl, force: true });
    if (rnd(t.seed, step) < t.density) {
      const pat = [0, 2, 4, 2, 5, 4, 2, 1][s8];
      const hi = rnd(t.seed + 3, step) > 0.82 ? 1 : 0;
      tone({ freq: mf(degree(t, deg + pat, 1 + hi)), dur: spb * 1.4, type: t.wave, gain: 0.07, delay: dl, force: true });
    }
    nextTime += spb;
    step++;
  }
}

function startEngine(t: Track, atSec: number) {
  const ctx = getCtx();
  if (!ctx) return;
  stopEngine();
  cur = t;
  const spb = 60 / t.bpm / 2;
  step = Math.floor(atSec / spb);
  nextTime = ctx.currentTime + 0.05;
  timer = window.setInterval(schedule, 70);
  schedule();
}
function stopEngine() {
  if (timer) window.clearInterval(timer);
  timer = undefined;
  cur = null;
}

export function musicPos(): number {
  const m = useOS.getState().music;
  const p = m.playing ? m.offset + (Date.now() - m.startedAt) / 1000 : m.offset;
  return Math.min(p, TRACKS[m.idx].dur);
}

export function musicPlay(idx: number) {
  const s = useOS.getState();
  const i = ((idx % TRACKS.length) + TRACKS.length) % TRACKS.length;
  useOS.setState({ music: { ...s.music, active: true, idx: i, playing: true, offset: 0, startedAt: Date.now() } });
  startEngine(TRACKS[i], 0);
}
export function musicPause() {
  const m = useOS.getState().music;
  if (!m.playing) return;
  const p = musicPos();
  stopEngine();
  useOS.setState({ music: { ...m, playing: false, offset: p } });
}
export function musicResume() {
  const m = useOS.getState().music;
  if (!m.active) return musicPlay(m.idx);
  useOS.setState({ music: { ...m, playing: true, startedAt: Date.now() } });
  startEngine(TRACKS[m.idx], m.offset);
}
export function musicToggle() {
  const m = useOS.getState().music;
  if (m.playing) musicPause();
  else musicResume();
}
export function musicNext(auto = false) {
  const m = useOS.getState().music;
  if (auto && m.repeat === "one") return musicPlay(m.idx);
  if (m.shuffle) {
    let n = Math.floor(Math.random() * TRACKS.length);
    if (n === m.idx) n = (n + 1) % TRACKS.length;
    return musicPlay(n);
  }
  if (auto && m.repeat === "off" && m.idx === TRACKS.length - 1) {
    stopEngine();
    useOS.setState({ music: { ...m, playing: false, offset: 0 } });
    return;
  }
  musicPlay(m.idx + 1);
}
export function musicPrev() {
  const m = useOS.getState().music;
  if (musicPos() > 3) return musicSeek(0);
  musicPlay(m.idx - 1);
}
export function musicSeek(sec: number) {
  const m = useOS.getState().music;
  const t = TRACKS[m.idx];
  const p = Math.max(0, Math.min(sec, t.dur - 0.5));
  useOS.setState({ music: { ...m, offset: p, startedAt: Date.now() } });
  if (m.playing) startEngine(t, p);
}
export function musicTick() {
  const m = useOS.getState().music;
  if (m.playing && musicPos() >= TRACKS[m.idx].dur - 0.05) musicNext(true);
}

useOS.subscribe((s, prev) => {
  if (s.power !== "on" && prev.power === "on" && s.music.playing) musicPause();
});

export function artGradient(t: Track) {
  return `linear-gradient(135deg, hsl(${t.hue} 85% 62%), hsl(${(t.hue + 50) % 360} 80% 40%))`;
}
