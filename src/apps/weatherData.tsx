import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun } from "lucide-react";
import { useOS, isOnline } from "../os/store";
import { toF } from "../os/utils";

export interface WeatherData {
  tz: string;
  current: { temp: number; feels: number; humidity: number; code: number; isDay: boolean; wind: number; windDir: number; pressure: number };
  hourly: { time: string; temp: number; code: number; pop: number; isDay: boolean }[];
  daily: { date: string; code: number; max: number; min: number; sunrise: string; sunset: string; uv: number; pop: number }[];
  fetchedAt: number;
  sample?: boolean;
}

export function wmo(code: number, isDay = true): { label: string; grad: [string, string] } {
  if (code === 0) return isDay ? { label: "Clear", grad: ["#2f80ed", "#56ccf2"] } : { label: "Clear", grad: ["#0f2027", "#2c5364"] };
  if (code === 1) return { label: "Mostly Clear", grad: isDay ? ["#3a8ef6", "#6cc6ff"] : ["#141e30", "#243b55"] };
  if (code === 2) return { label: "Partly Cloudy", grad: isDay ? ["#4a90e2", "#8ab4d8"] : ["#1e2a3a", "#3a4a5e"] };
  if (code === 3) return { label: "Overcast", grad: isDay ? ["#6b7b8c", "#9aa8b5"] : ["#2b3340", "#444f5d"] };
  if (code === 45 || code === 48) return { label: "Fog", grad: ["#7b8794", "#b0b9c2"] };
  if (code >= 51 && code <= 57) return { label: "Drizzle", grad: ["#4b6075", "#7f98ad"] };
  if (code >= 61 && code <= 67) return { label: "Rain", grad: ["#37475a", "#5d7388"] };
  if (code >= 71 && code <= 77) return { label: "Snow", grad: ["#8fa4b8", "#d0dce6"] };
  if (code >= 80 && code <= 82) return { label: "Showers", grad: ["#3c4e62", "#667f96"] };
  if (code === 85 || code === 86) return { label: "Snow Showers", grad: ["#8fa4b8", "#d0dce6"] };
  if (code >= 95) return { label: "Thunderstorm", grad: ["#232b38", "#4a5568"] };
  return { label: "Cloudy", grad: ["#6b7b8c", "#9aa8b5"] };
}

export function WeatherIcon({ code, isDay = true, size = 28, className }: { code: number; isDay?: boolean; size?: number; className?: string }) {
  const p = { size, strokeWidth: 1.6, className } as const;
  if (code === 0) return isDay ? <Sun {...p} color="#ffd60a" fill="#ffd60a" /> : <Moon {...p} color="#e8e8f0" fill="#e8e8f0" />;
  if (code === 1 || code === 2) return isDay ? <CloudSun {...p} color="#fff" /> : <CloudMoon {...p} color="#fff" />;
  if (code === 3) return <Cloud {...p} color="#fff" fill="rgba(255,255,255,0.85)" />;
  if (code === 45 || code === 48) return <CloudFog {...p} color="#fff" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...p} color="#fff" />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain {...p} color="#fff" />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...p} color="#fff" />;
  if (code >= 95) return <CloudLightning {...p} color="#fff" />;
  return <Cloud {...p} color="#fff" />;
}

const cache = new Map<string, WeatherData>();
try {
  const raw = localStorage.getItem("ios-sim-weather");
  if (raw) Object.entries(JSON.parse(raw) as Record<string, WeatherData>).forEach(([k, v]) => cache.set(k, v));
} catch {
  /* ignore */
}
const persistCache = () => {
  try {
    localStorage.setItem("ios-sim-weather", JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* ignore */
  }
};

function sample(lat: number, lon: number, tz: string): WeatherData {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233));
  const base = 24 - Math.abs(lat) * 0.35 + seed * 4;
  const now = new Date();
  const hourly = Array.from({ length: 24 }).map((_, i) => {
    const d = new Date(now.getTime() + i * 3600_000);
    const h = d.getHours();
    const temp = base - 5 + 6 * Math.sin(((h - 9) / 24) * Math.PI * 2);
    return { time: d.toISOString(), temp, code: i % 9 < 6 ? 1 : 2, pop: Math.round(seed * 20), isDay: h >= 6 && h < 19 };
  });
  const daily = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getTime() + i * 86400_000);
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, code: [0, 1, 2, 3, 61, 1, 0][i], max: base + 2 + Math.sin(i) * 3, min: base - 7 + Math.cos(i) * 2, sunrise: `${iso}T06:32`, sunset: `${iso}T18:41`, uv: 5, pop: [0, 5, 10, 30, 70, 10, 0][i] };
  });
  return {
    tz,
    current: { temp: hourly[0].temp, feels: hourly[0].temp - 1, humidity: 55, code: 1, isDay: hourly[0].isDay, wind: 12, windDir: 220, pressure: 1014 },
    hourly,
    daily,
    fetchedAt: Date.now(),
    sample: true,
  };
}

export async function fetchWeather(lat: number, lon: number, tz: string): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather http " + res.status);
  const j = await res.json();
  const curT: string = j.current.time;
  let start = (j.hourly.time as string[]).findIndex((t) => t >= curT.slice(0, 13) + ":00");
  if (start < 0) start = 0;
  const hourly = (j.hourly.time as string[]).slice(start, start + 24).map((t, i) => ({
    time: t,
    temp: j.hourly.temperature_2m[start + i] as number,
    code: j.hourly.weather_code[start + i] as number,
    pop: (j.hourly.precipitation_probability[start + i] ?? 0) as number,
    isDay: !!j.hourly.is_day[start + i],
  }));
  const daily = (j.daily.time as string[]).slice(0, 8).map((d, i) => ({
    date: d,
    code: j.daily.weather_code[i] as number,
    max: j.daily.temperature_2m_max[i] as number,
    min: j.daily.temperature_2m_min[i] as number,
    sunrise: j.daily.sunrise[i] as string,
    sunset: j.daily.sunset[i] as string,
    uv: (j.daily.uv_index_max[i] ?? 0) as number,
    pop: (j.daily.precipitation_probability_max[i] ?? 0) as number,
  }));
  return {
    tz: (j.timezone as string) || tz,
    current: {
      temp: j.current.temperature_2m,
      feels: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      code: j.current.weather_code,
      isDay: !!j.current.is_day,
      wind: j.current.wind_speed_10m,
      windDir: j.current.wind_direction_10m,
      pressure: j.current.pressure_msl,
    },
    hourly,
    daily,
    fetchedAt: Date.now(),
  };
}

export function useWeather(city: { lat: number; lon: number; tz: string } | undefined) {
  const online = useOS((s) => isOnline(s));
  const key = city ? `${city.lat.toFixed(2)},${city.lon.toFixed(2)}` : "";
  const [data, setData] = useState<WeatherData | undefined>(() => (key ? cache.get(key) : undefined));
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (!city) return;
      const c = cache.get(key);
      if (c && !force && Date.now() - c.fetchedAt < 15 * 60_000 && !c.sample) {
        setData(c);
        return;
      }
      if (c) setData(c);
      if (!online) {
        if (!c) setData(sample(city.lat, city.lon, city.tz));
        return;
      }
      setLoading(true);
      try {
        const d = await fetchWeather(city.lat, city.lon, city.tz);
        cache.set(key, d);
        persistCache();
        setData(d);
      } catch {
        if (!c) setData(sample(city.lat, city.lon, city.tz));
      } finally {
        setLoading(false);
      }
    },
    [key, online], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    setData(cache.get(key));
    void load();
  }, [key, online, load]);

  return { data, loading, reload: () => load(true) };
}

export function useTemp() {
  const unit = useOS((s) => s.tempUnit);
  return (c: number) => `${Math.round(unit === "f" ? toF(c) : c)}°`;
}

export function fmtHourLabel(iso: string, use24: boolean) {
  const h = parseInt(iso.slice(11, 13), 10);
  if (use24) return String(h).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "PM" : "AM"}`;
}
export function fmtHM(iso: string, use24: boolean) {
  const h = parseInt(iso.slice(11, 13), 10);
  const m = iso.slice(14, 16);
  if (use24) return `${String(h).padStart(2, "0")}:${m}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}
export function compass(deg: number) {
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(deg / 22.5) % 16];
}
