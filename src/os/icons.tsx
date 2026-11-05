import { Camera, Cloud, Mail, MessageCircle, Music, Phone, Settings, Sun, Heart, Video, Languages, Folder, BookOpen, MapPin, Search, Sparkles, Activity, Moon } from "lucide-react";
import { DAYS_SHORT } from "./utils";
import { useNow } from "./store";
import { iconUrl } from "./iconUrls";
import { useIconMode, iconModeFilter } from "./TintedIcons";

const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Inter, system-ui, sans-serif`;

function Grad({ id, a, b }: { id: string; a: string; b: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={a} />
        <stop offset="1" stopColor={b} />
      </linearGradient>
    </defs>
  );
}

function ClockFace() {
  const now = useNow(1000);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%">
      <rect width="60" height="60" fill="#000" />
      <circle cx="30" cy="30" r="27" fill="#fff" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="30"
          y1="5.5"
          x2="30"
          y2={i % 3 === 0 ? "9.5" : "8"}
          stroke="#1c1c1e"
          strokeWidth={i % 3 === 0 ? 1.6 : 1}
          transform={`rotate(${i * 30} 30 30)`}
        />
      ))}
      <line x1="30" y1="30" x2="30" y2="16" stroke="#1c1c1e" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${h * 30} 30 30)`} />
      <line x1="30" y1="30" x2="30" y2="9" stroke="#1c1c1e" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${m * 6} 30 30)`} />
      <line x1="30" y1="34" x2="30" y2="8" stroke="#ff9500" strokeWidth="1" transform={`rotate(${s * 6} 30 30)`} />
      <circle cx="30" cy="30" r="1.8" fill="#ff9500" />
    </svg>
  );
}

function CalendarFace() {
  const now = useNow(30_000);
  return (
    <svg viewBox="0 0 60 60" width="100%" height="100%">
      <rect width="60" height="60" fill="#fff" />
      <text x="30" y="17" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#ff3b30" fontFamily={FONT}>
        {DAYS_SHORT[now.getDay()].toUpperCase()}
      </text>
      <text x="30" y="49" textAnchor="middle" fontSize="33" fontWeight="300" fill="#1c1c1e" fontFamily={FONT}>
        {now.getDate()}
      </text>
    </svg>
  );
}

function Gradient({ a, b, children }: { a: string; b: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(180deg, ${a}, ${b})` }}>
      {children}
    </div>
  );
}

function Art({ id }: { id: string }) {
  switch (id) {
    case "phone":
      return (
        <Gradient a="#67e26b" b="#1fb83a">
          <Phone size="52%" fill="#fff" strokeWidth={0} />
        </Gradient>
      );
    case "messages":
      return (
        <Gradient a="#67e26b" b="#1fb83a">
          <MessageCircle size="58%" fill="#fff" strokeWidth={0} />
        </Gradient>
      );
    case "mail":
      return (
        <Gradient a="#5ab9ff" b="#0b6cf0">
          <Mail size="58%" color="#fff" strokeWidth={1.9} />
        </Gradient>
      );
    case "camera":
      return (
        <Gradient a="#e6e6ea" b="#a5a5ab">
          <Camera size="56%" color="#2c2c2e" fill="#2c2c2e" strokeWidth={1.5} className="[&_circle]:fill-[#8e8e93]" />
        </Gradient>
      );
    case "music":
      return (
        <Gradient a="#ff6a8a" b="#f5213f">
          <Music size="54%" color="#fff" strokeWidth={2.4} />
        </Gradient>
      );
    case "settings":
      return (
        <Gradient a="#d6d7dc" b="#8f9096">
          <Settings size="66%" color="#4a4a50" strokeWidth={1.5} fill="#7d7e84" />
        </Gradient>
      );
    case "weather":
      return (
        <div className="relative h-full w-full" style={{ background: "linear-gradient(180deg,#2f7df0,#6cc6ff)" }}>
          <Sun className="absolute left-[14%] top-[12%]" size="46%" color="#ffd60a" fill="#ffd60a" strokeWidth={1.5} />
          <Cloud className="absolute bottom-[12%] right-[8%]" size="62%" color="#fff" fill="#fff" strokeWidth={1.5} />
        </div>
      );
    case "clock":
      return <ClockFace />;
    case "calendar":
      return <CalendarFace />;
    case "notes":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="nt" a="#ffe36b" b="#ffcc00" />
          <rect width="60" height="60" fill="#fff" />
          <rect width="60" height="17" fill="url(#nt)" />
          {[27, 35, 43, 51].map((y) => (
            <line key={y} x1="8" x2="52" y1={y} y2={y} stroke="#e0e0e5" strokeWidth="1" />
          ))}
          <rect x="8" y="22" width="30" height="2.6" rx="1.3" fill="#3a3a3c" />
        </svg>
      );
    case "reminders":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#fff" />
          {[
            ["#ff9500", 15],
            ["#007aff", 30],
            ["#ff3b30", 45],
          ].map(([c, y]) => (
            <g key={String(y)}>
              <circle cx="14" cy={Number(y)} r="5.5" fill="none" stroke={String(c)} strokeWidth="2" />
              <line x1="25" x2="52" y1={Number(y)} y2={Number(y)} stroke="#d1d1d6" strokeWidth="2" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      );
    case "stocks":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#000" />
          {[15, 27, 39, 51].map((y) => (
            <line key={y} x1="0" x2="60" y1={y} y2={y} stroke="#2c2c2e" strokeWidth="1" />
          ))}
          <polyline points="6,46 17,34 26,40 38,22 48,26 55,12" fill="none" stroke="#30d158" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#000" />
          <rect x="7" y="13" width="46" height="14" rx="4" fill="#ff453a" />
          <rect x="7" y="19" width="46" height="14" rx="4" fill="#ffd60a" />
          <rect x="7" y="25" width="46" height="14" rx="4" fill="#30d158" />
          <rect x="7" y="31" width="46" height="14" rx="4" fill="#0a84ff" />
          <rect x="5" y="35" width="50" height="19" rx="5" fill="#2c2c2e" />
          <rect x="5" y="35" width="50" height="3" fill="#1c1c1e" />
        </svg>
      );
    case "photos":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#fff" />
          {["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#5ac8fa", "#007aff", "#af52de", "#ff2d55"].map((c, i) => (
            <ellipse
              key={c}
              cx="30"
              cy="19"
              rx="7.5"
              ry="11.5"
              fill={c}
              opacity="0.82"
              transform={`rotate(${i * 45} 30 30)`}
              style={{ mixBlendMode: "multiply" }}
            />
          ))}
        </svg>
      );
    case "safari":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="sf" a="#6dc6ff" b="#0a6cf0" />
          <rect width="60" height="60" fill="#fff" />
          <circle cx="30" cy="30" r="25" fill="url(#sf)" />
          <circle cx="30" cy="30" r="25" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".9" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1="30" y1="6" x2="30" y2={i % 6 === 0 ? "10" : "8"} stroke="#fff" strokeWidth="0.7" transform={`rotate(${i * 15} 30 30)`} />
          ))}
          <g transform="rotate(45 30 30)">
            <polygon points="30,12 35,30 25,30" fill="#ff3b30" />
            <polygon points="30,48 35,30 25,30" fill="#fff" />
          </g>
          <circle cx="30" cy="30" r="1.8" fill="#fff" />
        </svg>
      );
    case "maps":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#eaf3e2" />
          <path d="M0 40 L60 22" stroke="#fff" strokeWidth="7" />
          <path d="M-5 14 C20 20 28 40 40 66" stroke="#ffd96a" strokeWidth="6" fill="none" />
          <rect x="38" y="0" width="22" height="16" fill="#bfe3ff" />
          <circle cx="30" cy="30" r="10" fill="#0a84ff" stroke="#fff" strokeWidth="2.5" />
          <polygon points="30,24 35,35 30,32.5 25,35" fill="#fff" />
        </svg>
      );
    case "calculator":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          <rect x="8" y="8" width="44" height="12" rx="2" fill="#2c2c2e" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect
                key={`${r}${c}`}
                x={8 + c * 11.5}
                y={25 + r * 11.5}
                width="9.5"
                height="9.5"
                rx="2.5"
                fill={c === 3 ? "#ff9f0a" : r === 0 ? "#a5a5a5" : "#505050"}
              />
            )),
          )}
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          <circle cx="30" cy="30" r="25" fill="#000" stroke="#d1d1d6" strokeWidth="1.5" />
          {Array.from({ length: 36 }).map((_, i) => (
            <line key={i} x1="30" y1="6" x2="30" y2={i % 9 === 0 ? "10" : "8"} stroke="#fff" strokeWidth="0.7" transform={`rotate(${i * 10} 30 30)`} />
          ))}
          <polygon points="30,13 34,30 26,30" fill="#ff3b30" />
          <polygon points="30,47 34,30 26,30" fill="#fff" />
          <circle cx="30" cy="30" r="2" fill="#000" stroke="#999" />
        </svg>
      );
    case "voicememos":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          {[6, 12, 22, 14, 28, 18, 10, 20, 8, 4].map((h, i) => (
            <rect key={i} x={7 + i * 4.7} y={34 - h / 2} width="2.4" height={h} rx="1.2" fill="#ff453a" />
          ))}
          <line x1="6" x2="54" y1="48" y2="48" stroke="#3a3a3c" strokeWidth="1" />
        </svg>
      );
    case "appstore":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="as" a="#40c3ff" b="#0a6cf0" />
          <rect width="60" height="60" fill="url(#as)" />
          <g stroke="#fff" strokeWidth="4" strokeLinecap="round">
            <line x1="22" y1="43" x2="34" y2="17" />
            <line x1="38" y1="43" x2="26" y2="17" transform="translate(0 0)" />
            <line x1="19" y1="35" x2="41" y2="35" strokeWidth="3.5" />
          </g>
        </svg>
      );
    case "twenty48":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#bbada0" />
          {[
            [6, 6, "#eee4da", "2", "#776e65"],
            [32, 6, "#f2b179", "8", "#fff"],
            [6, 32, "#f67c5f", "64", "#fff"],
            [32, 32, "#edc22e", "2k", "#fff"],
          ].map(([x, y, c, t, tc]) => (
            <g key={String(t)}>
              <rect x={Number(x)} y={Number(y)} width="22" height="22" rx="3" fill={String(c)} />
              <text x={Number(x) + 11} y={Number(y) + 15.5} textAnchor="middle" fontSize="11" fontWeight="800" fill={String(tc)} fontFamily={FONT}>
                {t}
              </text>
            </g>
          ))}
        </svg>
      );
    case "snake":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="sn" a="#78e08f" b="#13a043" />
          <rect width="60" height="60" fill="url(#sn)" />
          <polyline points="12,44 12,24 30,24 30,40 46,40 46,18" fill="none" stroke="#0b3d20" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="46" cy="16" r="5" fill="#0b3d20" />
          <circle cx="44.5" cy="14.5" r="1.3" fill="#fff" />
          <circle cx="48.5" cy="14.5" r="1.3" fill="#fff" />
          <circle cx="12" cy="52" r="3" fill="#ff3b30" />
        </svg>
      );
    case "minesweeper":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={6 + c * 16} y={6 + r * 16} width="14" height="14" rx="2" fill={r === 1 && c === 1 ? "#ff3b30" : "#3a3a3c"} />
          )))}
          <circle cx="30" cy="30" r="5" fill="#ff3b30" />
          <circle cx="27" cy="27" r="2" fill="#fff" opacity="0.6" />
        </svg>
      );
    case "solitaire":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="sol" a="#1a3a5c" b="#0d1f33" />
          <rect width="60" height="60" fill="url(#sol)" />
          <rect x="10" y="16" width="24" height="34" rx="3" fill="#fff" transform="rotate(-12 22 33)" />
          <rect x="22" y="14" width="24" height="34" rx="3" fill="#fff" transform="rotate(8 34 31)" />
          <text x="34" y="34" textAnchor="middle" fontSize="16" fill="#ff3b30" fontFamily={FONT} transform="rotate(8 34 31)">A</text>
          <text x="28" y="46" textAnchor="middle" fontSize="10" fill="#ff3b30" fontFamily={FONT} transform="rotate(8 34 31)">♥</text>
        </svg>
      );
    case "memory":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="mem" a="#5e5ce6" b="#3634a3" />
          <rect width="60" height="60" fill="url(#mem)" />
          {[0, 1].map((r) => [0, 1, 2].map((c) => (
            <rect key={`${r}${c}`} x={8 + c * 16} y={8 + r * 22} width="14" height="20" rx="2" fill="#fff" opacity="0.9" />
          )))}
        </svg>
      );
    case "tictactoe":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          <line x1="22" y1="12" x2="22" y2="48" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="38" y1="12" x2="38" y2="48" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="22" x2="48" y2="22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="38" x2="48" y2="38" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <text x="17" y="20" textAnchor="middle" fontSize="12" fill="#0a84ff" fontFamily={FONT} fontWeight="700">X</text>
          <text x="33" y="36" textAnchor="middle" fontSize="12" fill="#ff3b30" fontFamily={FONT} fontWeight="700">O</text>
          <text x="17" y="52" textAnchor="middle" fontSize="12" fill="#ff3b30" fontFamily={FONT} fontWeight="700">O</text>
        </svg>
      );
    case "flappybird":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <Grad id="fb" a="#4ec0ca" b="#2a8a94" />
          <rect width="60" height="60" fill="url(#fb)" />
          <rect x="0" y="48" width="60" height="12" fill="#ded895" />
          <rect x="40" y="20" width="14" height="28" fill="#5c9c3e" />
          <rect x="40" y="0" width="14" height="18" fill="#5c9c3e" />
          <circle cx="18" cy="30" r="9" fill="#f7d51d" />
          <circle cx="22" cy="27" r="3" fill="#fff" />
          <circle cx="23" cy="27" r="1.5" fill="#000" />
          <polygon points="27,30 33,28 33,32" fill="#ff9500" />
        </svg>
      );
    case "contacts":
      return (
        <Gradient a="#f5f5f7" b="#d6d6db">
          <div className="flex h-full w-full flex-col items-center justify-center" style={{ background: "linear-gradient(180deg,#f7f7f9,#c9c9cf)" }}>
            <div className="flex h-[58%] w-[58%] items-center justify-center rounded-full" style={{ background: "linear-gradient(180deg,#8e8e93,#636366)" }}>
              <svg viewBox="0 0 60 60" width="100%" height="100%"><circle cx="30" cy="22" r="9" fill="#fff" /><path d="M14 50 a16 14 0 0 1 32 0 z" fill="#fff" /></svg>
            </div>
          </div>
        </Gradient>
      );
    case "facetime":
      return (
        <Gradient a="#5be36a" b="#0ba31c">
          <Video size="56%" color="#fff" fill="#fff" strokeWidth={1.6} />
        </Gradient>
      );
    case "health":
      return (
        <Gradient a="#ffffff" b="#ececf0">
          <Heart size="50%" color="#fe2d55" fill="#fe2d55" strokeWidth={1.5} />
        </Gradient>
      );
    case "translate":
      return (
        <Gradient a="#5ac8fa" b="#0a84ff">
          <Languages size="58%" color="#fff" strokeWidth={2.2} />
        </Gradient>
      );
    case "files":
      return (
        <Gradient a="#1c1c1e" b="#0a0a0c">
          <Folder size="60%" color="#5ac8fa" fill="#5ac8fa" strokeWidth={1.5} />
        </Gradient>
      );
    case "shortcuts":
      return (
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          <rect width="60" height="60" fill="#1c1c1e" />
          <rect x="14" y="14" width="13" height="13" rx="3" fill="#5ac8fa" transform="rotate(-8 20.5 20.5)" />
          <rect x="33" y="14" width="13" height="13" rx="3" fill="#34c759" transform="rotate(8 39.5 20.5)" />
          <rect x="14" y="33" width="13" height="13" rx="3" fill="#ff9f0a" transform="rotate(8 20.5 39.5)" />
          <rect x="33" y="33" width="13" height="13" rx="3" fill="#ff375f" transform="rotate(-8 39.5 39.5)" />
        </svg>
      );
    case "journal":
      return (
        <Gradient a="#ffb74d" b="#f57c00">
          <BookOpen size="56%" color="#fff" strokeWidth={1.8} />
        </Gradient>
      );
    case "tips":
      return (
        <Gradient a="#fff6c2" b="#ffd60a">
          <Sparkles size="56%" color="#a86b00" strokeWidth={2} />
        </Gradient>
      );
    case "findmy":
      return (
        <Gradient a="#7ee2a0" b="#0aa64a">
          <div className="relative flex h-full w-full items-center justify-center">
            <MapPin size="48%" color="#fff" fill="#fff" strokeWidth={1.5} className="absolute" />
            <div className="absolute h-[18%] w-[18%] rounded-full bg-[#0a84ff]" />
          </div>
        </Gradient>
      );
    case "magnifier":
      return (
        <Gradient a="#3a3a3c" b="#1c1c1e">
          <Search size="62%" color="#ffd60a" strokeWidth={2.4} />
        </Gradient>
      );
    case "podcasts":
      return (
        <Gradient a="#b66ef0" b="#7a3df0">
          <Activity size="60%" color="#fff" strokeWidth={2.4} />
        </Gradient>
      );
    case "news":
      return (
        <Gradient a="#ffffff" b="#e8e8ec">
          <div className="flex h-full w-full items-center justify-center text-[28px] font-serif font-bold text-[#ff3b30]" style={{ fontFamily: "Times, serif" }}>
            N
          </div>
        </Gradient>
      );
    case "books":
      return (
        <Gradient a="#ff9f40" b="#ff6a00">
          <BookOpen size="58%" color="#fff" strokeWidth={1.8} />
        </Gradient>
      );
    case "fitness":
      return (
        <Gradient a="#ff4d6d" b="#c9184a">
          <Activity size="56%" color="#fff" strokeWidth={2.4} />
        </Gradient>
      );
    case "meditation":
      return (
        <Gradient a="#8e9bff" b="#4254d6">
          <Moon size="56%" color="#fff" strokeWidth={1.8} />
        </Gradient>
      );
    default:
      return <Gradient a="#c7c7cc" b="#8e8e93" />;
  }
}

export function AppIcon({ id, size = 60 }: { id: string; size?: number }) {
  const url = iconUrl(id);
  const mode = useIconMode();
  const filter = iconModeFilter(mode);
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2237,
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)",
      }}
    >
      {url ? (
        <img
          src={url}
          alt={id}
          width={size}
          height={size}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
          style={filter ? { filter } : undefined}
          onError={(e) => {
            // hide img and fall back to the SVG art
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const sib = (e.currentTarget.nextElementSibling as HTMLElement | null);
            if (sib) sib.style.display = "block";
          }}
        />
      ) : null}
      <div style={{ display: url ? "none" : "block", height: "100%", width: "100%", filter: filter || undefined }}>
        <Art id={id} />
      </div>
    </div>
  );
}

export function FolderIcon({ apps, size = 60 }: { apps: string[]; size?: number }) {
  const mini = size * 0.22;
  return (
    <div
      className="grid shrink-0 grid-cols-3 content-center justify-items-center gap-[3px] p-[6px]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2237,
        background: "rgba(200,200,205,0.38)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {apps.slice(0, 9).map((a) => (
        <AppIcon key={a} id={a} size={mini} />
      ))}
    </div>
  );
}
