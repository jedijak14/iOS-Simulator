import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { useOS, useNow } from "./store";
import { useData } from "./data";
import { DAYS_SHORT, MONTHS, fmtTime, photoUrl, sameDay } from "./utils";
import { TRACKS, artGradient, musicToggle } from "./music";
import { WeatherIcon, useTemp, useWeather, wmo } from "../apps/weatherData";

export const STOCK_PHOTOS = [27667695, 1666022, 40701120, 27630474, 18385183, 22944327, 17558422, 17674075, 39553434, 31255875, 35708965];

export function WeatherWidget({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const city = useData((s) => s.cities[0]);
  const { data } = useWeather(city);
  const t = useTemp();
  const g = data ? wmo(data.current.code, data.current.isDay).grad : (["#3a8ef6", "#6cc6ff"] as const);
  return (
    <div
      onClick={onOpen}
      className="relative h-full w-full cursor-pointer overflow-hidden rounded-[22px] p-4 text-white"
      style={{ background: `linear-gradient(160deg, ${g[0]}, ${g[1]})` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-[15px] font-semibold">{city?.name ?? "Cupertino"}</div>
          <div className="text-[44px] font-light leading-[48px]">{data ? t(data.current.temp) : "–°"}</div>
        </div>
        {data && <WeatherIcon code={data.current.code} isDay={data.current.isDay} size={34} />}
      </div>
      <div className="mt-3 text-[14px] font-medium">{data ? wmo(data.current.code, data.current.isDay).label : "Loading…"}</div>
      <div className="text-[14px] opacity-90">{data ? `H:${t(data.daily[0].max)}  L:${t(data.daily[0].min)}` : ""}</div>
      {data && (
        <div className="absolute bottom-3 right-4 flex gap-4 text-center text-[11px]">
          {data.hourly.slice(1, 6).filter((_, i) => i % 1 === 0).slice(0, 4).map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="opacity-80">{parseInt(h.time.slice(11, 13), 10) % 12 || 12}{parseInt(h.time.slice(11, 13), 10) >= 12 ? "PM" : "AM"}</span>
              <WeatherIcon code={h.code} isDay={h.isDay} size={16} />
              <span className="font-medium">{t(h.temp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarWidget({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const now = useNow(30_000);
  const events = useData((s) => s.events);
  const use24 = useOS((s) => s.use24h);
  const today = events.filter((e) => sameDay(new Date(e.start), now) && e.end > now.getTime()).sort((a, b) => a.start - b.start);
  return (
    <div onClick={onOpen} className="h-full w-full cursor-pointer overflow-hidden rounded-[22px] bg-ios-cell p-3.5 text-ios-label">
      <div className="text-[12px] font-semibold uppercase text-ios-red">{DAYS_SHORT[now.getDay()]}</div>
      <div className="text-[34px] font-light leading-[36px]">{now.getDate()}</div>
      <div className="mt-1.5 space-y-1">
        {today.length === 0 && <div className="text-[12px] text-ios-label2">No more events today</div>}
        {today.slice(0, 2).map((e) => (
          <div key={e.id} className="flex gap-1.5 rounded-[4px] border-l-[3px] bg-ios-fill pl-1.5 text-[11px] leading-[13px]" style={{ borderColor: e.color }}>
            <div className="min-w-0 py-0.5">
              <div className="truncate font-semibold">{e.title}</div>
              <div className="text-ios-label2">{e.allDay ? "All-day" : fmtTime(new Date(e.start), use24)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="sr-only">{MONTHS[now.getMonth()]}</div>
    </div>
  );
}

export function PhotosWidget({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const [ok, setOk] = useState(true);
  const day = new Date().getDate();
  const id = STOCK_PHOTOS[day % STOCK_PHOTOS.length];
  return (
    <div
      onClick={onOpen}
      className="relative h-full w-full cursor-pointer overflow-hidden rounded-[22px]"
      style={{ background: "linear-gradient(135deg,#f6d365,#fda085)" }}
    >
      {ok && <img src={photoUrl(id, 400, 400)} alt="" draggable={false} className="h-full w-full object-cover" onError={() => setOk(false)} />}
      <div className="absolute left-3 top-3 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">Featured Photo</div>
    </div>
  );
}

export function ClockWidget({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const now = useNow(1000);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <div onClick={onOpen} className="flex h-full w-full cursor-pointer items-center justify-center rounded-[22px] bg-black">
      <svg viewBox="0 0 100 100" className="h-[84%] w-[84%]">
        <circle cx="50" cy="50" r="48" fill="#1c1c1e" />
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 30} 50 50)`}>
            <line x1="50" y1="6" x2="50" y2={i % 3 === 0 ? "13" : "10"} stroke="#fff" strokeWidth={i % 3 === 0 ? 2.4 : 1.4} />
          </g>
        ))}
        {[12, 3, 6, 9].map((n, i) => (
          <text key={n} x={50 + Math.sin((i * Math.PI) / 2) * 33} y={50 - Math.cos((i * Math.PI) / 2) * 33 + 5} textAnchor="middle" fontSize="13" fontWeight="500" fill="#fff">
            {n}
          </text>
        ))}
        <line x1="50" y1="50" x2="50" y2="28" stroke="#fff" strokeWidth="4" strokeLinecap="round" transform={`rotate(${h * 30} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="14" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" transform={`rotate(${m * 6} 50 50)`} />
        <line x1="50" y1="58" x2="50" y2="10" stroke="#ff9f0a" strokeWidth="1.4" transform={`rotate(${s * 6} 50 50)`} />
        <circle cx="50" cy="50" r="3" fill="#ff9f0a" />
      </svg>
    </div>
  );
}

export function MusicWidget({ onOpen }: { onOpen: (e: React.MouseEvent) => void }) {
  const music = useOS((s) => s.music);
  const track = TRACKS[music.idx];
  return (
    <div onClick={onOpen} className="relative h-full w-full cursor-pointer overflow-hidden rounded-[22px] p-3.5 text-white" style={{ background: artGradient(track) }}>
      <div className="text-[12px] font-semibold opacity-80">{music.active ? "Now Playing" : "Music"}</div>
      <div className="absolute inset-x-3.5 bottom-3.5 flex items-end justify-between">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight">{track.title}</div>
          <div className="truncate text-[12px] opacity-80">{track.artist}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            musicToggle();
          }}
          className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 backdrop-blur"
        >
          {music.playing ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}
        </button>
      </div>
    </div>
  );
}

export function WidgetView({ id, onOpen }: { id: string; onOpen: (e: React.MouseEvent) => void }) {
  switch (id) {
    case "weather":
      return <WeatherWidget onOpen={onOpen} />;
    case "calendar":
      return <CalendarWidget onOpen={onOpen} />;
    case "photos":
      return <PhotosWidget onOpen={onOpen} />;
    case "clock":
      return <ClockWidget onOpen={onOpen} />;
    case "music":
      return <MusicWidget onOpen={onOpen} />;
    default:
      return null;
  }
}

export const WIDGET_APP: Record<string, string> = { weather: "weather", calendar: "calendar", photos: "photos", clock: "clock", music: "music" };
