import { useEffect, useState } from "react";
import { ChevronLeft, Droplets, Eye, Gauge, List, Plus, RefreshCw, Sunrise, Sunset, Sun, Thermometer, Wind, X, WifiOff, Search } from "lucide-react";
import { useOS, isOnline } from "../os/store";
import { useData, patchData, newId, type City } from "../os/data";
import { ScrollView, Sheet, Spinner, SwipeRow, NavBtn, Page, Row, Group, SearchField } from "../os/ui";
import { DAYS_SHORT } from "../os/utils";
import { WeatherIcon, compass, fmtHM, fmtHourLabel, useTemp, useWeather, wmo } from "./weatherData";

function CityCard({ city, onOpen }: { city: City; onOpen: () => void }) {
  const { data } = useWeather(city);
  const t = useTemp();
  const g = data ? wmo(data.current.code, data.current.isDay).grad : (["#4a90e2", "#8ab4d8"] as const);
  const local = new Intl.DateTimeFormat("en-US", { timeZone: data?.tz ?? city.tz, hour: "numeric", minute: "2-digit", hour12: !useOS.getState().use24h }).format(new Date());
  return (
    <button onClick={onOpen} className="block w-full overflow-hidden rounded-[20px] p-4 text-left text-white shadow-lg active:scale-[0.99]" style={{ background: `linear-gradient(145deg,${g[0]},${g[1]})`, height: 112 }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[24px] font-semibold leading-7">{city.name}</div>
          <div className="text-[13px] opacity-90">{local}</div>
        </div>
        <div className="text-[48px] font-light leading-[52px]">{data ? t(data.current.temp) : "–"}</div>
      </div>
      <div className="mt-1 flex items-end justify-between text-[14px]">
        <span className="font-medium">{data ? wmo(data.current.code, data.current.isDay).label : "Loading…"}</span>
        <span className="opacity-90">{data ? `H:${t(data.daily[0].max)}  L:${t(data.daily[0].min)}` : ""}</span>
      </div>
    </button>
  );
}

function Tile({ icon: Icon, title, children, sub }: { icon: typeof Sun; title: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-[18px] bg-white/15 p-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase text-white/65">
        <Icon size={14} /> {title}
      </div>
      <div className="mt-1.5 text-[30px] font-medium leading-tight">{children}</div>
      {sub && <div className="mt-1 text-[13px] leading-snug text-white/80">{sub}</div>}
    </div>
  );
}

function Detail({ city, onBack }: { city: City; onBack: () => void }) {
  const { data, loading, reload } = useWeather(city);
  const t = useTemp();
  const use24 = useOS((s) => s.use24h);
  const online = useOS((s) => isOnline(s));
  const g = data ? wmo(data.current.code, data.current.isDay).grad : (["#4a90e2", "#8ab4d8"] as const);
  const gmin = data ? Math.min(...data.daily.slice(0, 7).map((d) => d.min)) : 0;
  const gmax = data ? Math.max(...data.daily.slice(0, 7).map((d) => d.max)) : 1;
  const uvText = (u: number) => (u < 3 ? "Low" : u < 6 ? "Moderate" : u < 8 ? "High" : "Very High");
  return (
    <div className="absolute inset-0 text-white" style={{ background: `linear-gradient(180deg,${g[0]},${g[1]})` }}>
      <div className="absolute inset-x-0 top-0 z-10 flex items-end justify-between px-3" style={{ height: "calc(var(--safe-top) + 40px)" }}>
        <button onClick={onBack} className="flex items-center gap-0.5 pb-1 text-[17px]"><ChevronLeft size={26} className="-ml-1" />Cities</button>
        <button onClick={reload} className="mb-1.5 rounded-full bg-white/20 p-1.5">{loading ? <Spinner className="h-[18px] w-[18px] !border-white/40 !border-t-white" /> : <RefreshCw size={18} />}</button>
      </div>
      <ScrollView className="h-full">
        <div style={{ height: "calc(var(--safe-top) + 36px)" }} />
        {!data ? (
          <div className="flex justify-center py-32"><Spinner className="h-8 w-8 !border-white/40 !border-t-white" /></div>
        ) : (
          <div className="px-4 pb-24">
            <div className="py-4 text-center">
              <div className="text-[34px] font-normal leading-tight">{city.name}</div>
              <div className="-mt-1 text-[96px] font-extralight leading-[104px]">{t(data.current.temp)}</div>
              <div className="text-[20px] font-medium">{wmo(data.current.code, data.current.isDay).label}</div>
              <div className="text-[20px] font-medium">H:{t(data.daily[0].max)}  L:{t(data.daily[0].min)}</div>
              {(data.sample || !online) && (
                <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[12px]"><WifiOff size={12} /> Showing sample data — offline</div>
              )}
            </div>

            <div className="rounded-[18px] bg-white/15 p-3.5 backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-1.5 border-b border-white/20 pb-2 text-[12px] font-semibold uppercase text-white/65">Hourly Forecast</div>
              <ScrollView axis="x">
                <div className="flex gap-5 pb-1">
                  {data.hourly.map((h, i) => (
                    <div key={i} className="flex w-[44px] shrink-0 flex-col items-center gap-1.5">
                      <span className="text-[14px] font-medium">{i === 0 ? "Now" : fmtHourLabel(h.time, use24)}</span>
                      <WeatherIcon code={h.code} isDay={h.isDay} size={26} />
                      <span className="h-3 text-[11px] font-semibold text-[#8ad8ff]">{h.pop >= 20 ? `${h.pop}%` : ""}</span>
                      <span className="text-[17px] font-medium">{t(h.temp)}</span>
                    </div>
                  ))}
                </div>
              </ScrollView>
            </div>

            <div className="mt-3 rounded-[18px] bg-white/15 p-3.5 backdrop-blur-xl">
              <div className="mb-1 border-b border-white/20 pb-2 text-[12px] font-semibold uppercase text-white/65">7-Day Forecast</div>
              {data.daily.slice(0, 7).map((d, i) => {
                const [y, m, dd] = d.date.split("-").map(Number);
                const lo = ((d.min - gmin) / (gmax - gmin || 1)) * 100;
                const hi = ((d.max - gmin) / (gmax - gmin || 1)) * 100;
                return (
                  <div key={d.date} className="flex items-center gap-2 py-2" style={{ borderTop: i ? "0.5px solid rgba(255,255,255,.2)" : "none" }}>
                    <span className="w-[46px] text-[18px] font-medium">{i === 0 ? "Today" : DAYS_SHORT[new Date(y, m - 1, dd).getDay()]}</span>
                    <div className="flex w-[36px] flex-col items-center">
                      <WeatherIcon code={d.code} size={24} />
                      {d.pop >= 20 && <span className="text-[10px] font-semibold text-[#8ad8ff]">{d.pop}%</span>}
                    </div>
                    <span className="w-9 text-right text-[18px] text-white/65">{t(d.min)}</span>
                    <div className="relative mx-1 h-[5px] flex-1 rounded-full bg-black/25">
                      <div className="absolute h-full rounded-full" style={{ left: `${lo}%`, width: `${Math.max(8, hi - lo)}%`, background: "linear-gradient(90deg,#5ac8fa,#ffd60a,#ff9500)" }} />
                    </div>
                    <span className="w-9 text-[18px]">{t(d.max)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Tile icon={Sun} title="UV Index" sub={`${uvText(data.daily[0].uv)} for the rest of the day`}>{Math.round(data.daily[0].uv)}<span className="ml-1 text-[16px]">{uvText(data.daily[0].uv)}</span></Tile>
              <Tile icon={Sunrise} title="Sunrise" sub={`Sunset: ${fmtHM(data.daily[0].sunset, use24)}`}>{fmtHM(data.daily[0].sunrise, use24)}</Tile>
              <Tile icon={Wind} title="Wind" sub={`From the ${compass(data.current.windDir)}`}>{Math.round(data.current.wind)}<span className="ml-1 text-[16px]">km/h</span></Tile>
              <Tile icon={Droplets} title="Humidity" sub={`The dew point is ${t(data.current.temp - (100 - data.current.humidity) / 5)}`}>{Math.round(data.current.humidity)}%</Tile>
              <Tile icon={Thermometer} title="Feels Like" sub={data.current.feels < data.current.temp ? "Wind is making it feel cooler." : "Similar to the actual temperature."}>{t(data.current.feels)}</Tile>
              <Tile icon={Gauge} title="Pressure" sub="Standard">{Math.round(data.current.pressure)}<span className="ml-1 text-[16px]">hPa</span></Tile>
              <Tile icon={Eye} title="Visibility" sub="Perfectly clear view.">16<span className="ml-1 text-[16px]">km</span></Tile>
              <Tile icon={Sunset} title="Sunset" sub={`Sunrise: ${fmtHM(data.daily[0].sunrise, use24)}`}>{fmtHM(data.daily[0].sunset, use24)}</Tile>
            </div>
            <div className="mt-6 text-center text-[11px] text-white/60">Weather data by Open-Meteo.com</div>
          </div>
        )}
      </ScrollView>
    </div>
  );
}

export default function WeatherApp() {
  const cities = useData((s) => s.cities);
  const [sel, setSel] = useState<string | null>(null);
  const [add, setAdd] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ name: string; sub: string; lat: number; lon: number; tz: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const online = useOS((s) => isOnline(s));
  const city = cities.find((c) => c.id === sel);

  useEffect(() => {
    if (!q.trim() || !online) return setRes([]);
    const tm = setTimeout(() => {
      setBusy(true);
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`)
        .then((r) => r.json())
        .then((j: { results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string }[] }) =>
          setRes((j.results ?? []).map((x) => ({ name: x.name, sub: [x.admin1, x.country].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude, tz: x.timezone }))),
        )
        .catch(() => setRes([]))
        .finally(() => setBusy(false));
    }, 350);
    return () => clearTimeout(tm);
  }, [q, online]);

  const last = useState<City | undefined>(undefined);
  if (city) last[0] = city;
  const showCity = city ?? last[0];

  return (
    <div className="force-dark relative h-full overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ transform: sel ? "scale(.94)" : "none", opacity: sel ? 0 : 1, transition: "all .35s cubic-bezier(.3,.8,.2,1)" }}>
        <Page title="Weather" bg="bg-black" right={<button onClick={() => setAdd(true)} className="text-ios-blue"><Plus size={26} /></button>}>
          <div className="space-y-3 px-4">
            {cities.map((c) => (
              <SwipeRow key={c.id} className="rounded-[20px]" bg="#000" actions={cities.length > 1 ? [{ label: "Delete", color: "#ff3b30", onPress: () => patchData((s) => ({ cities: s.cities.filter((x) => x.id !== c.id) })) }] : []}>
                <CityCard city={c} onOpen={() => setSel(c.id)} />
              </SwipeRow>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2 text-[12px] text-white/40"><List size={14} /> Swipe left on a city to delete</div>
        </Page>
      </div>
      <div className="absolute inset-0" style={{ transform: sel ? "none" : "translateY(100%)", transition: "transform .4s cubic-bezier(.3,.8,.2,1)" }}>
        {showCity && <Detail city={showCity} onBack={() => setSel(null)} />}
      </div>

      <Sheet open={add} onClose={() => setAdd(false)} height="86%">
        <Page title="Add City" large={false} left={<NavBtn onClick={() => setAdd(false)}>Cancel</NavBtn>}>
          <div className="px-4 py-2"><SearchField value={q} onChange={setQ} placeholder="Search for a city" autoFocus /></div>
          {busy && <div className="flex justify-center py-4"><Spinner /></div>}
          <Group>
            {res.map((r, i) => (
              <Row
                key={i}
                icon={Search}
                iconBg="#8e8e93"
                title={r.name}
                subtitle={r.sub}
                onClick={() => {
                  patchData((s) => ({ cities: [...s.cities, { id: newId(), name: r.name, country: r.sub, lat: r.lat, lon: r.lon, tz: r.tz }] }));
                  setAdd(false);
                  setQ("");
                  useOS.getState().showToast(`${r.name} added`);
                }}
              />
            ))}
          </Group>
          {!online && <div className="py-10 text-center text-ios-label2">Connect to the internet to search for cities.</div>}
          {online && q && !busy && res.length === 0 && <div className="py-10 text-center text-ios-label2">No results</div>}
          <span className="hidden"><X size={1} /></span>
        </Page>
      </Sheet>
    </div>
  );
}
