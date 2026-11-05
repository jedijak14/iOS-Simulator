import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData, newId } from "../os/data";
import { Page, SwipeRow } from "../os/ui";
import { fmtClock } from "../os/utils";
import { useAppAction } from "../os/actions";

export default function VoiceMemosApp() {
  const memos = useData((s) => s.voiceMemos);
  const [rec, setRec] = useState(false);
  const [t, setT] = useState(0);
  const [bars, setBars] = useState<number[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const t0 = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);

  const stopStream = () => {
    stream.current?.getTracks().forEach((x) => x.stop());
    stream.current = null;
    useOS.setState({ micActive: false });
  };

  const start = async () => {
    t0.current = Date.now();
    setT(0);
    setBars([]);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      useOS.setState({ micActive: true });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new Ctx();
      const src = ac.createMediaStreamSource(s);
      const an = ac.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      analyser.current = an;
      chunks.current = [];
      const r = new MediaRecorder(s);
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        save(url);
        void ac.close();
      };
      r.start();
      mr.current = r;
    } catch {
      mr.current = null;
      analyser.current = null;
      useOS.getState().showToast("Microphone unavailable — recording a silent demo memo");
    }
    setRec(true);
  };

  const save = (url: string) => {
    const dur = Math.max(1, Math.round((Date.now() - t0.current) / 1000));
    patchData((s) => ({ voiceMemos: [{ id: newId(), name: `New Recording ${s.voiceMemos.length + 1}`, dur, at: Date.now(), url }, ...s.voiceMemos] }));
  };

  const stop = () => {
    setRec(false);
    if (mr.current && mr.current.state !== "inactive") mr.current.stop();
    else save("");
    stopStream();
    mr.current = null;
  };

  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => {
      setT((Date.now() - t0.current) / 1000);
      let level = 0.15 + Math.random() * 0.5;
      if (analyser.current) {
        const d = new Uint8Array(analyser.current.frequencyBinCount);
        analyser.current.getByteTimeDomainData(d);
        let max = 0;
        d.forEach((v) => (max = Math.max(max, Math.abs(v - 128))));
        level = Math.min(1, max / 64 + 0.05);
      }
      setBars((b) => [...b.slice(-60), level]);
    }, 100);
    return () => clearInterval(id);
  }, [rec]);

  useEffect(() => () => stopStream(), []);
  useAppAction("voicememos", (a) => a === "record" && !rec && void start());

  const play = (m: { id: string; url: string; dur: number }) => {
    audio.current?.pause();
    if (playing === m.id) {
      setPlaying(null);
      return;
    }
    setPlaying(m.id);
    setPos(0);
    if (m.url) {
      const a = new Audio(m.url);
      audio.current = a;
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onended = () => setPlaying(null);
      a.volume = Math.max(0.1, useOS.getState().volume);
      void a.play();
    } else {
      const t1 = Date.now();
      const id = setInterval(() => {
        const p = (Date.now() - t1) / 1000;
        setPos(p);
        if (p >= m.dur) {
          clearInterval(id);
          setPlaying(null);
        }
      }, 200);
    }
  };

  return (
    <Page
      title="All Recordings"
      footer={
        <div className="glass relative z-20 flex flex-col items-center pt-3" style={{ borderTop: "0.5px solid var(--ios-sep)", paddingBottom: "calc(var(--safe-bottom) + 12px)" }}>
          {rec && (
            <div className="mb-2 w-full px-6">
              <div className="flex h-[54px] items-center justify-center gap-[2px] overflow-hidden">
                {bars.map((b, i) => (
                  <div key={i} className="w-[3px] shrink-0 rounded-full bg-ios-red" style={{ height: Math.max(3, b * 52) }} />
                ))}
              </div>
              <div className="text-center text-[28px] font-light tabular-nums">{fmtClock(t, true).slice(0, -1)}</div>
            </div>
          )}
          <button
            onClick={rec ? stop : start}
            className="flex h-[66px] w-[66px] items-center justify-center rounded-full border-[3px] border-ios-label3"
          >
            <div className="flex items-center justify-center bg-ios-red text-white transition-all" style={{ width: rec ? 28 : 54, height: rec ? 28 : 54, borderRadius: rec ? 6 : 27 }}>
              {rec ? <Square size={0} /> : null}
            </div>
          </button>
        </div>
      }
    >
      {memos.length === 0 && (
        <div className="flex flex-col items-center px-10 py-24 text-center text-ios-label2">
          <Mic size={52} strokeWidth={1.3} className="mb-3 opacity-60" />
          <div className="text-[20px] font-semibold text-ios-label">No Recordings</div>
          <div className="mt-1 text-[15px]">Tap the red button to start recording.</div>
        </div>
      )}
      <div className="mx-4 overflow-hidden rounded-[10px] bg-ios-cell">
        {memos.map((m) => (
          <SwipeRow key={m.id} actions={[{ label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ voiceMemos: s.voiceMemos.filter((x) => x.id !== m.id) })) }]}>
            <div className="ios-row px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[17px] font-semibold">{m.name}</div>
                  <div className="text-[13px] text-ios-label2">{new Date(m.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                </div>
                <div className="text-[15px] tabular-nums text-ios-label2">{fmtClock(m.dur)}</div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => play(m)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ios-blue text-white">
                  {playing === m.id ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" />}
                </button>
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-ios-fill2">
                  <div className="h-full bg-ios-blue" style={{ width: playing === m.id ? `${Math.min(100, (pos / m.dur) * 100)}%` : "0%" }} />
                </div>
                <button onClick={() => patchData((s) => ({ voiceMemos: s.voiceMemos.filter((x) => x.id !== m.id) }))} className="text-ios-label3 hover:text-ios-red">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </SwipeRow>
        ))}
      </div>
    </Page>
  );
}
