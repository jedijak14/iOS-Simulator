// Tiny WebAudio sound engine used for system sounds (all synthesized, no assets).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export const audioFlags = { volume: 0.6, silent: false, keyClicks: true, masterOff: false };

export function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function getMaster() {
  getCtx();
  return master;
}

interface ToneOpts {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
  force?: boolean; // ignore silent switch (music, alarms)
}

export function tone(o: ToneOpts) {
  if (audioFlags.masterOff) return;
  if (audioFlags.silent && !o.force) return;
  const c = getCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.15;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
  const peak = (o.gain ?? 0.2) * (0.15 + audioFlags.volume * 0.85);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

export const sfx = {
  tick() {
    if (!audioFlags.keyClicks) return;
    tone({ freq: 1800, dur: 0.025, type: "square", gain: 0.035 });
  },
  tock() {
    if (!audioFlags.keyClicks) return;
    tone({ freq: 1200, dur: 0.03, type: "square", gain: 0.035 });
  },
  ding() {
    tone({ freq: 1318, dur: 0.35, gain: 0.18 });
    tone({ freq: 1760, dur: 0.5, gain: 0.14, delay: 0.12 });
    tone({ freq: 2093, dur: 0.6, gain: 0.1, delay: 0.26 });
  },
  receive() {
    tone({ freq: 880, dur: 0.18, gain: 0.16 });
    tone({ freq: 1320, dur: 0.3, gain: 0.14, delay: 0.1 });
  },
  send() {
    tone({ freq: 500, slideTo: 1400, dur: 0.18, gain: 0.14, type: "triangle" });
  },
  lock() {
    tone({ freq: 700, slideTo: 380, dur: 0.1, gain: 0.12, type: "triangle" });
  },
  unlock() {
    tone({ freq: 500, slideTo: 900, dur: 0.1, gain: 0.1, type: "triangle" });
  },
  shutter() {
    tone({ freq: 2400, dur: 0.04, type: "square", gain: 0.12 });
    tone({ freq: 1500, dur: 0.06, type: "square", gain: 0.1, delay: 0.07 });
  },
  dtmf(k: string) {
    const f = DTMF[k];
    if (!f) return;
    tone({ freq: f[0], dur: 0.14, gain: 0.07, force: true });
    tone({ freq: f[1], dur: 0.14, gain: 0.07, force: true });
  },
  alarm() {
    for (let i = 0; i < 4; i++) tone({ freq: 1568, dur: 0.12, type: "square", gain: 0.1, delay: i * 0.16, force: true });
  },
  ringtone() {
    tone({ freq: 784, dur: 0.18, gain: 0.14, force: false });
    tone({ freq: 988, dur: 0.18, gain: 0.14, delay: 0.2 });
    tone({ freq: 1175, dur: 0.3, gain: 0.14, delay: 0.4 });
  },
  ringback() {
    tone({ freq: 440, dur: 0.9, gain: 0.05, force: true });
    tone({ freq: 480, dur: 0.9, gain: 0.05, force: true });
  },
  volume() {
    tone({ freq: 1000, dur: 0.05, gain: 0.1, type: "triangle", force: true });
  },
  pop() {
    tone({ freq: 600, slideTo: 300, dur: 0.07, gain: 0.1, type: "sine" });
  },
  charge() {
    tone({ freq: 880, dur: 0.12, gain: 0.12, force: true });
    tone({ freq: 1320, dur: 0.2, gain: 0.12, delay: 0.1, force: true });
  },
  boot() {
    tone({ freq: 261.6, dur: 1.6, gain: 0.16, type: "sine", force: true });
    tone({ freq: 329.6, dur: 1.5, gain: 0.12, type: "sine", force: true });
    tone({ freq: 392, dur: 1.4, gain: 0.1, type: "sine", force: true });
    tone({ freq: 523.3, dur: 1.3, gain: 0.08, type: "sine", force: true });
  },
};
