import { Moon, Pause, Phone, PhoneOff, Play, Plane, SkipBack, SkipForward, Timer as TimerIcon } from "lucide-react";
import { useOS, useNow } from "./store";
import { useSpec } from "./device-context";
import { fmtClock, fmtTime } from "./utils";
import { TRACKS, artGradient, musicNext, musicPos, musicPrev, musicToggle } from "./music";

function Signal({ color }: { color: string }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill={color}>
      <rect x="0" y="8" width="3" height="4" rx="0.8" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
      <rect x="10" y="3" width="3" height="9" rx="0.8" />
      <rect x="15" y="0" width="3" height="12" rx="0.8" />
    </svg>
  );
}
function Wifi({ color }: { color: string }) {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round">
      <path d="M1.2 4.2a10.5 10.5 0 0 1 14.6 0" />
      <path d="M3.8 7a6.8 6.8 0 0 1 9.4 0" />
      <circle cx="8.5" cy="10" r="1.2" fill={color} stroke="none" />
    </svg>
  );
}
function Battery({ color, level, charging, low, lp }: { color: string; level: number; charging: boolean; low: boolean; lp: boolean }) {
  const fill = charging ? "#30d158" : lp ? "#ffd60a" : low ? "#ff453a" : color;
  const textOnFill = color === "#fff" ? "#000" : "#fff";
  return (
    <svg width="27" height="13" viewBox="0 0 27 13">
      <rect x="0.5" y="0.5" width="22" height="12" rx="3.6" fill="none" stroke={color} opacity="0.4" />
      <rect x="2" y="2" width={Math.max(2, (19 * level) / 100)} height="9" rx="2.2" fill={fill} />
      <path d="M24.2 4.5v4a2.2 2.2 0 0 0 0-4z" fill={color} opacity="0.45" />
      <text x="11.5" y="9.6" textAnchor="middle" fontSize="8.2" fontWeight="700" fill={level > 45 ? textOnFill : color} fontFamily="-apple-system, system-ui">
        {charging ? "⚡" : level}
      </text>
    </svg>
  );
}

export function StatusBar({ light }: { light: boolean }) {
  const spec = useSpec();
  const use24 = useOS((s) => s.use24h);
  const cellular = useOS((s) => s.cellular);
  const airplane = useOS((s) => s.airplane);
  const wifi = useOS((s) => s.wifi);
  const battery = useOS((s) => s.battery);
  const charging = useOS((s) => s.charging);
  const lowPower = useOS((s) => s.lowPower);
  const dnd = useOS((s) => s.dnd);
  const call = useOS((s) => s.call);
  const fg = useOS((s) => s.foreground);
  const now = useNow(5000);
  const color = light ? "#fff" : "currentColor";
  const hasSignal = cellular && !airplane;
  const time = fmtTime(now, use24, false);
  const toCall = !!call && fg !== "phone" && !spec.island;

  if (!spec.island) {
    return (
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex items-center justify-between px-3 text-[12px] font-semibold"
        style={{ height: spec.safeTop, color, background: toCall ? "#34c759" : undefined }}
      >
        {toCall ? (
          <div className="mx-auto text-[13px] text-white">Touch to return to call · {call && call.state === "connected" ? fmtClock((Date.now() - call.startedAt) / 1000) : "calling…"}</div>
        ) : (
          <>
            <div className="flex w-1/3 items-center gap-1">
              {airplane ? <Plane size={12} /> : hasSignal ? <Signal color={color} /> : <span className="text-[11px]">No Service</span>}
              {wifi && <Wifi color={color} />}
            </div>
            <div className="w-1/3 text-center text-[14px]">{time}</div>
            <div className="flex w-1/3 items-center justify-end gap-1">
              {dnd && <Moon size={11} fill={color} />}
              <span className="text-[11px] opacity-80">{battery}%</span>
              <Battery color={color} level={battery} charging={charging} low={battery <= 20} lp={lowPower} />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex items-start justify-between" style={{ height: spec.safeTop, color }}>
      <div className="mt-[11px] flex h-[37px] items-center gap-1 text-[16px] font-semibold tracking-tight" style={{ width: "36%", justifyContent: "center" }}>
        <span>{time}</span>
        {dnd && <Moon size={12} fill={color} className="ml-0.5" />}
      </div>
      <div className="mt-[11px] flex h-[37px] items-center justify-center gap-[6px]" style={{ width: "36%" }}>
        {airplane ? <Plane size={14} fill={color} /> : hasSignal ? <Signal color={color} /> : <span className="text-[10px] font-semibold">No Service</span>}
        {wifi && <Wifi color={color} />}
        <Battery color={color} level={battery} charging={charging} low={battery <= 20} lp={lowPower} />
      </div>
    </div>
  );
}

export function HomeIndicator({ light, onHome }: { light: boolean; onHome?: () => void }) {
  const spec = useSpec();
  if (spec.homeButton) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[80] flex items-end justify-center pb-[8px]"
      style={{ height: 34 }}
      onClick={onHome}
    >
      <div className="h-[5px] w-[139px] rounded-full" style={{ background: light ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)", boxShadow: light ? "0 0 6px rgba(0,0,0,0.25)" : undefined }} />
    </div>
  );
}

export function Island() {
  const call = useOS((s) => s.call);
  const timer = useOS((s) => s.timer);
  const music = useOS((s) => s.music);
  const fg = useOS((s) => s.foreground);
  const expanded = useOS((s) => s.islandExpanded);
  const mic = useOS((s) => s.micActive);
  const cam = useOS((s) => s.camActive);
  const set = useOS((s) => s.set);
  const openApp = useOS((s) => s.openApp);
  useNow(250);

  let kind: "call" | "timer" | "music" | null = null;
  if (call && fg !== "phone") kind = "call";
  else if (timer.status !== "idle" && fg !== "clock") kind = "timer";
  else if (music.active && fg !== "music") kind = "music";
  const ex = expanded && !!kind;
  const track = TRACKS[music.idx];
  const left = timer.status === "running" ? Math.max(0, (timer.endAt - Date.now()) / 1000) : timer.left;

  const w = ex ? 358 : kind ? 188 : 126;
  const h = ex ? (kind === "music" ? 172 : 118) : 37;

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <>
      <div
        className="absolute left-1/2 top-[11px] z-[90] overflow-hidden bg-black text-white"
        style={{
          width: w,
          height: h,
          marginLeft: -w / 2,
          borderRadius: ex ? 40 : 20,
          transition: "all 0.5s cubic-bezier(0.32, 1.2, 0.4, 1)",
          pointerEvents: kind ? "auto" : "none",
          cursor: kind ? "pointer" : "default",
        }}
        onClick={() => kind && set({ islandExpanded: !expanded })}
      >
        {/* true-depth camera dot */}
        {!kind && <div className="absolute right-[22px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-[#10111a] ring-1 ring-[#1b1c28]" />}
        {kind && !ex && (
          <div className="flex h-full items-center justify-between px-3 fade-in">
            {kind === "call" && (
              <>
                <Phone size={16} fill="#30d158" color="#30d158" />
                <span className="text-[14px] font-medium text-[#30d158]">{call && call.state === "connected" ? fmtClock((Date.now() - call.startedAt) / 1000) : "calling"}</span>
              </>
            )}
            {kind === "timer" && (
              <>
                <TimerIcon size={17} color="#ff9f0a" />
                <span className="text-[15px] font-medium tabular-nums text-[#ff9f0a]">{fmtClock(Math.ceil(left))}</span>
              </>
            )}
            {kind === "music" && (
              <>
                <div className="h-[24px] w-[24px] rounded-[6px]" style={{ background: artGradient(track) }} />
                <div className="flex h-[16px] items-end gap-[2px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="eq-bar w-[2.5px] rounded-full bg-[#ff375f]"
                      style={{ height: 16, animationDelay: `${i * 0.13}s`, animationPlayState: music.playing ? "running" : "paused", transform: music.playing ? undefined : "scaleY(0.3)" }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {ex && kind === "music" && (
          <div className="fade-in px-5 pt-4">
            <div className="flex items-center gap-3" onClick={stop(() => { set({ islandExpanded: false }); openApp("music"); })}>
              <div className="h-[52px] w-[52px] rounded-[10px]" style={{ background: artGradient(track) }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold">{track.title}</div>
                <div className="truncate text-[14px] text-white/60">{track.artist}</div>
              </div>
              <div className="flex h-[22px] items-end gap-[2px]">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="eq-bar w-[3px] rounded-full bg-[#ff375f]" style={{ height: 22, animationDelay: `${i * 0.15}s`, animationPlayState: music.playing ? "running" : "paused" }} />
                ))}
              </div>
            </div>
            <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white/90" style={{ width: `${(musicPos() / track.dur) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-center gap-10">
              <button onClick={stop(musicPrev)}>
                <SkipBack size={26} fill="#fff" />
              </button>
              <button onClick={stop(musicToggle)}>{music.playing ? <Pause size={32} fill="#fff" /> : <Play size={32} fill="#fff" />}</button>
              <button onClick={stop(() => musicNext())}>
                <SkipForward size={26} fill="#fff" />
              </button>
            </div>
          </div>
        )}
        {ex && kind === "timer" && (
          <div className="fade-in px-6 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#ff9f0a]">
                  <TimerIcon size={15} /> Timer
                </div>
                <div className="text-[40px] font-light tabular-nums leading-[1.1] text-[#ff9f0a]">{fmtClock(Math.ceil(left))}</div>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff9f0a]/25 text-[#ff9f0a]"
                  onClick={stop(() => (timer.status === "running" ? useOS.getState().pauseTimer() : useOS.getState().resumeTimer()))}
                >
                  {timer.status === "running" ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20" onClick={stop(() => { useOS.getState().cancelTimer(); set({ islandExpanded: false }); })}>
                  <span className="text-[22px]">✕</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {ex && kind === "call" && call && (
          <div className="fade-in px-6 pt-4">
            <div className="flex items-center justify-between">
              <div onClick={stop(() => { set({ islandExpanded: false }); openApp("phone"); })}>
                <div className="text-[13px] text-[#30d158]">{call.state === "connected" ? "Call in progress" : "Calling…"}</div>
                <div className="text-[20px] font-semibold">{call.name}</div>
                <div className="text-[15px] tabular-nums text-white/60">{call.state === "connected" ? fmtClock((Date.now() - call.startedAt) / 1000) : "…"}</div>
              </div>
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff3b30]" onClick={stop(() => { useOS.getState().endCall(); set({ islandExpanded: false }); })}>
                <PhoneOff size={22} fill="#fff" />
              </button>
            </div>
          </div>
        )}
      </div>
      {(mic || cam) && !ex && (
        <div
          className="pointer-events-none absolute top-[21px] z-[91] h-[7px] w-[7px] rounded-full"
          style={{ left: `calc(50% + ${kind ? 104 : 72}px)`, background: cam ? "#30d158" : "#ff9f0a", boxShadow: `0 0 6px ${cam ? "#30d158" : "#ff9f0a"}` }}
        />
      )}
    </>
  );
}
