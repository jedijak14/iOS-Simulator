import { useEffect, useState } from "react";
import { Phone as PhoneIcon, PhoneOff, Volume2, MicOff, Grid3x3 } from "lucide-react";
import { useOS, useNow } from "./store";
import { useData, contactName } from "./data";
import { sfx } from "./sound";

/** Full-screen Contact Poster shown when receiving a call. */
export function ContactPoster() {
  const call = useOS((s) => s.call);
  const set = useOS((s) => s.set);
  const contacts = useData((s) => s.contacts);
  useNow(500);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!call) setAccepted(false);
  }, [call]);

  if (!call || call.state !== "calling") return null;

  // Find contact by matching name or number
  const contact = contacts.find((c) =>
    contactName(c) === call.name || c.phone.replace(/\D/g, "").endsWith(call.number.replace(/\D/g, "").slice(-7))
  );
  const hue = contact?.hue ?? 210;
  const name = call.name;

  const accept = () => {
    setAccepted(true);
    sfx.toggleOn();
    set({ call: { ...call, state: "connected", startedAt: Date.now() } });
  };

  const decline = () => {
    sfx.toggleOff();
    set({ call: null });
  };

  return (
    <div
      className="fade-in absolute inset-0 z-[120] flex flex-col items-center justify-between text-white"
      style={{
        background: `linear-gradient(180deg, hsl(${hue} 60% 35%) 0%, hsl(${hue} 70% 20%) 50%, #000 100%)`,
        paddingTop: "calc(var(--safe-top) + 40px)",
        paddingBottom: "calc(var(--safe-bottom) + 40px)",
      }}
    >
      {/* Contact name + poster */}
      <div className="flex flex-col items-center">
        {/* Big avatar / Memoji */}
        <div
          className="flex h-32 w-32 items-center justify-center rounded-full text-[48px] font-bold shadow-2xl"
          style={{
            background: `linear-gradient(180deg, hsl(${hue} 70% 65%), hsl(${hue} 60% 45%))`,
            boxShadow: `0 0 60px hsl(${hue} 70% 50% / 0.4)`,
          }}
        >
          {name[0]?.toUpperCase()}
        </div>
        <div className="mt-5 text-[32px] font-bold" style={{ letterSpacing: "-0.025em" }}>{name}</div>
        <div className="mt-1 text-[16px] text-white/60">incoming call…</div>
      </div>

      {/* Call controls */}
      <div className="flex flex-col items-center gap-6">
        {accepted ? (
          // In-call controls
          <div className="flex gap-8">
            <button onClick={() => sfx.dtmf("1")} className="flex flex-col items-center gap-1.5">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <MicOff size={24} />
              </div>
              <span className="text-[12px]">mute</span>
            </button>
            <button onClick={() => sfx.dtmf("1")} className="flex flex-col items-center gap-1.5">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Grid3x3 size={22} />
              </div>
              <span className="text-[12px]">keypad</span>
            </button>
            <button onClick={() => sfx.dtmf("1")} className="flex flex-col items-center gap-1.5">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                <Volume2 size={24} />
              </div>
              <span className="text-[12px]">speaker</span>
            </button>
          </div>
        ) : null}

        {/* Accept / Decline buttons */}
        <div className="flex gap-20">
          <button onClick={decline} className="flex flex-col items-center gap-2">
            <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#ff3b30] shadow-lg active:scale-95">
              <PhoneOff size={30} fill="#fff" />
            </div>
            <span className="text-[13px]">Decline</span>
          </button>
          {!accepted && (
            <button onClick={accept} className="flex flex-col items-center gap-2">
              <div
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#34c759] shadow-lg active:scale-95"
                style={{ animation: "pulseRing 1.5s ease-out infinite" }}
              >
                <PhoneIcon size={30} fill="#fff" />
              </div>
              <span className="text-[13px]">Accept</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Always-On Display — dim clock when locked and idle. */
export function AlwaysOnDisplay() {
  const aod = useOS((s) => s.aod);
  const locked = useOS((s) => s.locked);
  const screenOn = useOS((s) => s.screenOn);
  const use24 = useOS((s) => s.use24h);
  const now = useNow(1000);

  if (!aod || !locked || !screenOn) return null;

  const hours = now.getHours();
  const mins = now.getMinutes();
  const time = use24 ? `${hours}:${String(mins).padStart(2, "0")}` : `${hours % 12 || 12}:${String(mins).padStart(2, "0")}`;

  return (
    <div
      className="absolute inset-0 z-[130] flex flex-col items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.85)",
        pointerEvents: "none",
      }}
    >
      <div className="text-center" style={{ opacity: 0.5 }}>
        <div
          className="text-[72px] font-semibold tabular-nums text-white"
          style={{ letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}
          data-clock
        >
          {time}
        </div>
        <div className="mt-1 text-[14px] text-white/40">
          {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>
    </div>
  );
}
