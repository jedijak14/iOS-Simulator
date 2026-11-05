import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Newspaper } from "lucide-react";
import { useOS } from "../os/store";
import { patchData } from "../os/data";
import { Page, Sheet, Segmented } from "../os/ui";

interface Sym {
  s: string;
  name: string;
  base: number;
  cap: string;
  vol: string;
}
const SYMS: Sym[] = [
  { s: "AAPL", name: "Apple Inc.", base: 189.3, cap: "2.94T", vol: "58.4M" },
  { s: "MSFT", name: "Microsoft Corporation", base: 415.5, cap: "3.09T", vol: "21.2M" },
  { s: "GOOGL", name: "Alphabet Inc.", base: 172.1, cap: "2.14T", vol: "27.9M" },
  { s: "AMZN", name: "Amazon.com, Inc.", base: 183.6, cap: "1.91T", vol: "42.7M" },
  { s: "NVDA", name: "NVIDIA Corporation", base: 118.9, cap: "2.92T", vol: "301M" },
  { s: "TSLA", name: "Tesla, Inc.", base: 178.4, cap: "568B", vol: "81.3M" },
  { s: "META", name: "Meta Platforms, Inc.", base: 505.2, cap: "1.29T", vol: "13.6M" },
  { s: "NFLX", name: "Netflix, Inc.", base: 641.8, cap: "277B", vol: "3.4M" },
];

function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

function series(sym: Sym, n: number, vol: number, last: number, salt: number) {
  const r = rng(hash(sym.s) + salt);
  const raw: number[] = [0];
  for (let i = 1; i < n; i++) raw.push(raw[i - 1] + (r() - 0.48) * vol);
  const end = raw[n - 1];
  return raw.map((v) => last * (1 + (v - end) / 100));
}

const RANGES = { "1D": [78, 0.18], "1W": [35, 0.7], "1M": [30, 1.2], "3M": [63, 1.5], "1Y": [52, 3.2] } as const;
type Range = keyof typeof RANGES;

function Chart({ sym, price, range, prev }: { sym: Sym; price: number; range: Range; prev: number }) {
  const [n, vol] = RANGES[range];
  const data = useMemo(() => series(sym, n, vol, price, range.charCodeAt(1)), [sym, n, vol, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const pts = [...data.slice(0, -1), price];
  const [hover, setHover] = useState<number | null>(null);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const W = 340;
  const H = 190;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - 8 - ((v - min) / (max - min || 1)) * (H - 24);
  const path = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = price >= (range === "1D" ? prev : pts[0]);
  const color = up ? "#30d158" : "#ff453a";
  const ref = useRef<SVGSVGElement>(null);
  const hv = hover !== null ? pts[hover] : null;
  return (
    <div className="relative">
      {hv !== null && <div className="absolute left-0 top-0 text-[13px] text-white/60">{hv.toFixed(2)}</div>}
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        onPointerMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={"g" + sym.s} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {range === "1D" && <line x1="0" x2={W} y1={y(prev)} y2={y(prev)} stroke="#fff" strokeOpacity=".25" strokeDasharray="3 4" />}
        <path d={`${path} L${W},${H} L0,${H} Z`} fill={`url(#g${sym.s})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#fff" strokeOpacity=".5" />
            <circle cx={x(hover)} cy={y(pts[hover])} r="4.5" fill="#fff" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function StocksApp() {
  const fg = useOS((s) => s.foreground) === "stocks";
  const prev = useMemo(() => Object.fromEntries(SYMS.map((s) => [s.s, +(s.base * (0.985 + rng(hash(s.s) + new Date().getDate())() * 0.03)).toFixed(2)])), []);
  const [prices, setPrices] = useState<Record<string, number>>(() => Object.fromEntries(SYMS.map((s) => [s.s, s.base])));
  const [sel, setSel] = useState<Sym | null>(null);
  const [range, setRange] = useState<Range>("1D");
  const [pct, setPct] = useState(true);
  const last = useRef<Sym | null>(null);
  if (sel) last.current = sel;

  useEffect(() => {
    if (!fg) return;
    const id = setInterval(() => {
      setPrices((p) => {
        const n = { ...p };
        SYMS.forEach((s) => {
          n[s.s] = +(n[s.s] * (1 + (Math.random() - 0.5) * 0.0016)).toFixed(2);
        });
        return n;
      });
    }, 1500);
    return () => clearInterval(id);
  }, [fg]);

  const cs = sel ?? last.current;
  return (
    <div className="force-dark h-full bg-black text-white">
      <Page title="Stocks" bg="bg-black" right={<button onClick={() => setPct(!pct)} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">{pct ? "%" : "Δ"}</button>}>
        <div className="px-4 pb-2 text-[13px] text-white/45">Simulated market data · refreshes live</div>
        <div className="mx-4 overflow-hidden rounded-[12px]">
          {SYMS.map((s) => {
            const p = prices[s.s];
            const ch = p - prev[s.s];
            const up = ch >= 0;
            return (
              <button key={s.s} onClick={() => { setSel(s); setRange("1D"); }} className="flex w-full items-center justify-between py-3 text-left active:bg-white/10" style={{ borderBottom: "0.5px solid rgba(255,255,255,.12)" }}>
                <div>
                  <div className="text-[19px] font-semibold">{s.s}</div>
                  <div className="text-[13px] text-white/55">{s.name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <svg width="70" height="26" viewBox="0 0 70 26">
                    <polyline fill="none" strokeWidth="1.6" stroke={up ? "#30d158" : "#ff453a"} points={series(s, 24, 0.4, p, 3).map((v, i, a) => `${(i / (a.length - 1)) * 70},${24 - ((v - Math.min(...a)) / (Math.max(...a) - Math.min(...a) || 1)) * 22}`).join(" ")} />
                  </svg>
                  <div className="text-right">
                    <div className="text-[18px] tabular-nums">{p.toFixed(2)}</div>
                    <div className="mt-0.5 inline-block min-w-[74px] rounded-[6px] px-2 py-0.5 text-center text-[15px] font-medium tabular-nums" style={{ background: up ? "#30d158" : "#ff453a" }}>
                      {pct ? `${up ? "+" : ""}${((ch / prev[s.s]) * 100).toFixed(2)}%` : `${up ? "+" : ""}${ch.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mx-4 mt-6">
          <div className="mb-2 flex items-center gap-2 text-[20px] font-bold"><Newspaper size={20} /> Business News</div>
          {["Chipmakers rally as AI demand stays strong", "Fed signals patience on rate decisions", "Retail sales beat expectations in latest report", "Tech earnings season: what to watch this week"].map((h, i) => {
            const sources = ["Reuters", "Bloomberg", "AP", "WSJ"];
            const wikiQuery = h.split(" ").slice(0, 4).join(" ");
            return (
              <button
                key={h}
                onClick={() => {
                  useOS.getState().openApp("safari");
                  setTimeout(() => {
                    patchData((s) => ({
                      tabs: s.tabs.map((t) => (t.id === s.activeTab ? { ...t, url: `search:${wikiQuery}`, title: "Wikipedia Search" } : t)),
                    }));
                  }, 80);
                }}
                className="block w-full py-3 text-left"
                style={{ borderTop: "0.5px solid rgba(255,255,255,.12)" }}
              >
                <div className="text-[11px] font-semibold uppercase text-white/45">{sources[i]}</div>
                <div className="text-[16px] leading-snug text-white/95">{h}</div>
                <div className="mt-0.5 text-[12px] text-white/40">Tap to read more →</div>
              </button>
            );
          })}
        </div>
      </Page>
      <Sheet open={!!sel} onClose={() => setSel(null)} bg="bg-black" height="88%">
        {cs && (
          <div className="force-dark h-full overflow-y-auto bg-black px-5 pb-8 pt-9 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[28px] font-bold">{cs.s}</div>
                <div className="text-[14px] text-white/55">{cs.name}</div>
              </div>
              <button onClick={() => setSel(null)} className="rounded-full bg-white/15 p-1.5"><ChevronDown size={20} /></button>
            </div>
            <div className="mt-2 text-[40px] font-semibold tabular-nums">{prices[cs.s].toFixed(2)}</div>
            <div className="text-[16px] tabular-nums" style={{ color: prices[cs.s] >= prev[cs.s] ? "#30d158" : "#ff453a" }}>
              {prices[cs.s] >= prev[cs.s] ? "+" : ""}{(prices[cs.s] - prev[cs.s]).toFixed(2)} ({(((prices[cs.s] - prev[cs.s]) / prev[cs.s]) * 100).toFixed(2)}%)
            </div>
            <div className="mt-4">
              <Chart sym={cs} price={prices[cs.s]} range={range} prev={prev[cs.s]} />
            </div>
            <div className="mt-3">
              <Segmented options={(Object.keys(RANGES) as Range[]).map((r) => ({ id: r, label: r }))} value={range} onChange={setRange} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 text-[14px]">
              {[
                ["Open", (prev[cs.s] * 1.002).toFixed(2)],
                ["High", (Math.max(prices[cs.s], prev[cs.s]) * 1.006).toFixed(2)],
                ["Low", (Math.min(prices[cs.s], prev[cs.s]) * 0.992).toFixed(2)],
                ["Volume", cs.vol],
                ["Mkt Cap", cs.cap],
                ["Prev Close", prev[cs.s].toFixed(2)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2" style={{ borderBottom: "0.5px solid rgba(255,255,255,.12)" }}>
                  <span className="text-white/55">{k}</span>
                  <span className="tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
