// WebAudio sound engine — all synthesized, no assets.
// Layered oscillators + filtered noise + proper ADSR envelopes for richer, iOS-like sounds.
// Plus: real iOS system sounds (m4a → mp3) loaded from /sounds/.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let comp: DynamicsCompressorNode | null = null;

export const audioFlags = { volume: 0.6, silent: false, keyClicks: true, masterOff: false };

/** Cache of preloaded real iOS sound effect AudioBuffers. */
const realBufferCache = new Map<string, AudioBuffer>();
const realLoading = new Set<string>();

const REAL_SOUNDS: Record<string, string> = {
  lock: "/sounds/lock.mp3",
  unlock: "/sounds/unlock.mp3",
  received: "/sounds/received.mp3",
  send: "/sounds/sent.mp3",
  receive: "/sounds/received.mp3",
  ding: "/sounds/received.mp3",
  shutter: "/sounds/shutter.mp3",
  alarm: "/sounds/alarm.mp3",
  ringtone: "/sounds/ringtone.mp3",
  ringback: "/sounds/ringing.mp3",
  charge: "/sounds/charge.mp3",
  boot: "/sounds/boot.mp3",
  mail: "/sounds/mail.mp3",
  paySuccess: "/sounds/paySuccess.mp3",
  payFail: "/sounds/payFail.mp3",
  // For very short UI clicks we keep synthesized versions — real key/tink are 0.04s
  key: "/sounds/key.mp3",
  tink: "/sounds/tink.mp3",
  tock: "/sounds/tock.mp3",
};

/** Preload a real iOS sound into memory. */
function preloadReal(name: string): void {
  if (realBufferCache.has(name) || realLoading.has(name)) return;
  const url = REAL_SOUNDS[name];
  if (!url) return;
  realLoading.add(name);
  const c = getCtx();
  if (!c) return;
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => c.decodeAudioData(buf))
    .then((decoded) => {
      realBufferCache.set(name, decoded);
      realLoading.delete(name);
    })
    .catch(() => {
      realLoading.delete(name);
    });
}

/** Play a real iOS sound by name (falls back silently if not loaded). */
function playReal(name: string, gainMul = 1): boolean {
  if (audioFlags.masterOff) return false;
  if (audioFlags.silent) return false;
  const c = getCtx();
  if (!c || !master) return false;
  const buf = realBufferCache.get(name);
  if (!buf) {
    // try to lazy-load it for next time
    preloadReal(name);
    return false;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.5 * gainMul * (0.2 + audioFlags.volume * 0.8);
  src.connect(g);
  g.connect(master);
  src.start();
  return true;
}

/** Preload all real iOS sounds for instant playback. */
export function preloadSounds(): void {
  for (const name of Object.keys(REAL_SOUNDS)) preloadReal(name);
}

export function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      // compressor for louder, punchier transients without clipping
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.002;
      comp.release.value = 0.15;
      master.connect(comp);
      comp.connect(ctx.destination);
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
  force?: boolean;
  /** harmonic detune in cents — adds slight chorus for warmth */
  detune?: number;
  /** adds a sine sub-oscillator an octave below */
  sub?: boolean;
}

/** Layered tone with sub osc + detune for warmth. */
export function tone(o: ToneOpts) {
  if (audioFlags.masterOff) return;
  if (audioFlags.silent && !o.force) return;
  const c = getCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.15;
  const peak = (o.gain ?? 0.2) * (0.15 + audioFlags.volume * 0.85);
  const detune = o.detune ?? 0;

  const voice = (freq: number, type: OscillatorType, gainMul: number, det: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    osc.detune.value = det;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * gainMul), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };

  voice(o.freq, o.type ?? "sine", 1, detune);
  // slight sharp detune for chorus
  if (o.type !== "square" && peak > 0.05) {
    voice(o.freq, o.type ?? "sine", 0.45, detune + 6);
    voice(o.freq, o.type ?? "sine", 0.32, detune - 6);
  }
  // sub octave for body
  if (o.sub) voice(o.freq / 2, "sine", 0.55, 0);
}

/** Filtered white noise burst — for ticks, haptics, shakers. */
function noise(o: { dur?: number; gain?: number; delay?: number; force?: boolean; type?: BiquadFilterType; freq?: number; q?: number; decay?: number }) {
  if (audioFlags.masterOff) return;
  if (audioFlags.silent && !o.force) return;
  const c = getCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.05;
  const peak = (o.gain ?? 0.1) * (0.15 + audioFlags.volume * 0.85);
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = o.type ?? "bandpass";
  filt.frequency.value = o.freq ?? 2000;
  filt.Q.value = o.q ?? 1;
  const g = c.createGain();
  const decay = o.decay ?? dur;
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Bell-like tone with inharmonic partials — for chimes, alarms. */
function bell(o: { freq: number; dur?: number; gain?: number; delay?: number; force?: boolean }) {
  if (audioFlags.masterOff) return;
  if (audioFlags.silent && !o.force) return;
  const c = getCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 1.0;
  const peak = (o.gain ?? 0.18) * (0.15 + audioFlags.volume * 0.85);
  // inharmonic ratio partials (like a real bell)
  const partials = [1, 2.0, 2.83, 4.0, 5.4];
  const amps = [1, 0.5, 0.32, 0.22, 0.12];
  partials.forEach((p, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = o.freq * p;
    const a = peak * amps[i];
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * (1 - i * 0.12));
    osc.connect(g);
    g.connect(master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  });
}

const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

export const sfx = {
  // Sharp tick — like an iOS haptic / keyboard click
  tick() {
    if (!audioFlags.keyClicks) return;
    if (playReal("tink", 0.6)) return;
    noise({ dur: 0.018, gain: 0.05, freq: 3200, q: 3, decay: 0.012 });
    tone({ freq: 1900, dur: 0.022, type: "square", gain: 0.018 });
  },
  // Slightly softer tick — tock for alternate keys
  tock() {
    if (!audioFlags.keyClicks) return;
    if (playReal("tock", 0.6)) return;
    noise({ dur: 0.022, gain: 0.045, freq: 2200, q: 2.5, decay: 0.016 });
    tone({ freq: 1300, dur: 0.026, type: "square", gain: 0.018 });
  },
  // Tri-tone notification chime — REAL iOS ReceivedMessage
  ding() {
    if (playReal("received")) return;
    bell({ freq: 1318.5, dur: 0.85, gain: 0.14 });
    bell({ freq: 1760, dur: 0.95, gain: 0.13, delay: 0.13 });
    bell({ freq: 2093, dur: 1.1, gain: 0.11, delay: 0.27 });
  },
  // Message received — REAL iOS ReceivedMessage
  receive() {
    if (playReal("received")) return;
    tone({ freq: 880, dur: 0.16, gain: 0.16, type: "sine", sub: true });
    tone({ freq: 1320, dur: 0.32, gain: 0.13, type: "sine", sub: true, delay: 0.09 });
    noise({ dur: 0.02, gain: 0.02, freq: 5000, q: 4, delay: 0 });
  },
  // Message sent — REAL iOS SentMessage
  send() {
    if (playReal("send")) return;
    tone({ freq: 480, slideTo: 1400, dur: 0.22, gain: 0.14, type: "triangle" });
    noise({ dur: 0.08, gain: 0.04, freq: 1800, q: 1.2, decay: 0.06, delay: 0.02 });
  },
  // Lock — REAL iOS lock sound
  lock() {
    if (playReal("lock")) return;
    noise({ dur: 0.04, gain: 0.07, freq: 800, q: 2, decay: 0.03 });
    tone({ freq: 720, slideTo: 380, dur: 0.11, gain: 0.11, type: "triangle", sub: true });
  },
  // Unlock — REAL iOS AutoUnlock
  unlock() {
    if (playReal("unlock")) return;
    tone({ freq: 480, slideTo: 920, dur: 0.11, gain: 0.1, type: "triangle", sub: true });
    noise({ dur: 0.022, gain: 0.04, freq: 2400, q: 3, delay: 0.06 });
  },
  // Camera shutter — REAL iOS photoShutter
  shutter() {
    if (playReal("shutter")) return;
    noise({ dur: 0.012, gain: 0.16, freq: 4500, q: 1.5, decay: 0.008 });
    tone({ freq: 2600, dur: 0.018, type: "square", gain: 0.07 });
    noise({ dur: 0.06, gain: 0.12, freq: 1400, q: 1.8, decay: 0.05, delay: 0.025 });
    tone({ freq: 1100, dur: 0.04, type: "square", gain: 0.05, delay: 0.03 });
  },
  // DTMF keypad — accurate dual-tone
  dtmf(k: string) {
    const f = DTMF[k];
    if (!f) return;
    tone({ freq: f[0], dur: 0.14, gain: 0.07, force: true });
    tone({ freq: f[1], dur: 0.14, gain: 0.07, force: true });
  },
  // Alarm — REAL iOS Alarm
  alarm() {
    if (playReal("alarm", 1.2)) {
      // loop by re-scheduling after the buffer ends (handled by caller, not here)
      return;
    }
    for (let i = 0; i < 6; i++) {
      bell({ freq: 1568, dur: 0.18, gain: 0.13, force: true, delay: i * 0.18 });
      bell({ freq: 2093, dur: 0.18, gain: 0.11, force: true, delay: i * 0.18 + 0.04 });
    }
  },
  // Ringtone — REAL iOS Ringtone_US
  ringtone() {
    if (playReal("ringtone")) return;
    const notes = [
      [784, 0], [988, 0.18], [1175, 0.36], [988, 0.54],
      [784, 0.78], [988, 0.96], [1175, 1.14], [1568, 1.32],
    ] as const;
    notes.forEach(([f, d]) => {
      tone({ freq: f, dur: 0.16, gain: 0.13, type: "triangle", sub: true, delay: d });
      tone({ freq: f * 2, dur: 0.14, gain: 0.05, type: "sine", delay: d + 0.005 });
    });
  },
  // Standard ringback (US) — REAL iOS ringing
  ringback() {
    if (playReal("ringback", 0.5)) return;
    tone({ freq: 440, dur: 1.0, gain: 0.045, force: true });
    tone({ freq: 480, dur: 1.0, gain: 0.045, force: true });
  },
  // Volume tick
  volume() {
    tone({ freq: 1000, dur: 0.05, gain: 0.09, type: "triangle", force: true });
    noise({ dur: 0.015, gain: 0.03, freq: 3000, q: 4, force: true });
  },
  // Pop — UI selection
  pop() {
    tone({ freq: 600, slideTo: 280, dur: 0.08, gain: 0.1, type: "sine" });
    noise({ dur: 0.02, gain: 0.03, freq: 2000, q: 3 });
  },
  // Charge chime — REAL iOS connect_power
  charge() {
    if (playReal("charge")) return;
    bell({ freq: 1318.5, dur: 0.4, gain: 0.13, force: true });
    bell({ freq: 1976, dur: 0.55, gain: 0.12, force: true, delay: 0.07 });
    bell({ freq: 2637, dur: 0.7, gain: 0.1, force: true, delay: 0.14 });
  },
  // Boot chord — REAL iOS SystemStartup
  boot() {
    if (playReal("boot", 1.2)) return;
    tone({ freq: 130.8, dur: 1.8, gain: 0.14, type: "sine", sub: true, force: true });
    tone({ freq: 261.6, dur: 1.7, gain: 0.13, type: "sine", force: true });
    tone({ freq: 329.6, dur: 1.6, gain: 0.11, type: "sine", force: true, delay: 0.05 });
    tone({ freq: 392, dur: 1.5, gain: 0.1, type: "sine", force: true, delay: 0.1 });
    tone({ freq: 523.3, dur: 1.3, gain: 0.08, type: "sine", force: true, delay: 0.18 });
    tone({ freq: 783.99, dur: 1.0, gain: 0.05, type: "sine", force: true, delay: 0.28 });
  },
  // Mail received — REAL iOS new-mail
  mail() {
    if (playReal("mail")) return;
    sfx.ding();
  },
  // Apple Pay success — REAL iOS payment_success
  paySuccess() {
    if (playReal("paySuccess")) return;
    sfx.success();
  },
  payFail() {
    if (playReal("payFail")) return;
    sfx.error();
  },
  // Sheet open — soft whoosh
  sheetOpen() {
    noise({ dur: 0.18, gain: 0.025, freq: 1200, q: 0.6, decay: 0.16 });
  },
  // Sheet close
  sheetClose() {
    noise({ dur: 0.14, gain: 0.022, freq: 800, q: 0.6, decay: 0.12 });
  },
  // Swipe — soft brush
  swipe() {
    noise({ dur: 0.07, gain: 0.018, freq: 2400, q: 0.7, decay: 0.06 });
  },
  // App open — pop with rising pitch
  appOpen() {
    tone({ freq: 320, slideTo: 540, dur: 0.16, gain: 0.06, type: "sine" });
    noise({ dur: 0.025, gain: 0.025, freq: 1800, q: 2, decay: 0.02 });
  },
  // App close — falling pitch
  appClose() {
    tone({ freq: 540, slideTo: 320, dur: 0.16, gain: 0.06, type: "sine" });
    noise({ dur: 0.025, gain: 0.025, freq: 1600, q: 2, decay: 0.02 });
  },
  // Toggle on / off
  toggleOn() {
    tone({ freq: 880, dur: 0.06, gain: 0.07, type: "sine" });
    tone({ freq: 1320, dur: 0.08, gain: 0.05, type: "sine", delay: 0.02 });
  },
  toggleOff() {
    tone({ freq: 660, slideTo: 380, dur: 0.08, gain: 0.06, type: "sine" });
  },
  // Pull-to-refresh
  refresh() {
    tone({ freq: 600, dur: 0.06, gain: 0.07, type: "triangle" });
    tone({ freq: 900, dur: 0.1, gain: 0.05, type: "triangle", delay: 0.06 });
  },
  // Success confirmation
  success() {
    tone({ freq: 660, dur: 0.1, gain: 0.1, type: "sine", sub: true });
    tone({ freq: 880, dur: 0.1, gain: 0.08, type: "sine", delay: 0.08 });
    tone({ freq: 1320, dur: 0.18, gain: 0.08, type: "sine", delay: 0.16 });
  },
  // Error buzz
  error() {
    tone({ freq: 220, dur: 0.18, gain: 0.13, type: "square" });
    tone({ freq: 180, dur: 0.18, gain: 0.13, type: "square", delay: 0.01 });
  },
};
