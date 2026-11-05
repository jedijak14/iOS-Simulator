import { useMemo, useState } from "react";
import { ChevronLeft, Heart, Footprints, BedDouble, Activity, Flame, Droplet, Brain, Plus } from "lucide-react";
import { Group, Page, Row, Segmented, Sheet, NavBtn } from "../os/ui";
import { useOS, useNow } from "../os/store";

interface DayPoint {
  date: number;
  steps: number;
  hr: number; // avg resting heart rate
  sleep: number; // hours
  active: number; // active minutes
  calories: number; // active calories
  water: number; // glasses
  mindful: number; // mindful minutes
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateDays(n: number, seed: number): DayPoint[] {
  const r = seededRand(seed);
  const out: DayPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    out.push({
      date: d.getTime(),
      steps: Math.round(4000 + r() * 9000 + (weekend ? 2500 : 0)),
      hr: Math.round(58 + r() * 8),
      sleep: +(5.5 + r() * 3).toFixed(1),
      active: Math.round(20 + r() * 70),
      calories: Math.round(380 + r() * 480),
      water: Math.round(3 + r() * 6),
      mindful: Math.round(r() * 25),
    });
  }
  return out;
}

function fmtDate(ts: number, withYear = false) {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
}

function MiniLine({ data, color, height = 64, fill = true }: { data: number[]; color: string; height?: number; fill?: boolean }) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / range) * (h - 12)]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const fillPath = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {fill && <path d={fillPath} fill={color} opacity={0.18} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill={color} />
      ))}
    </svg>
  );
}

function BarChart({ data, color, height = 80 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="text-[9px] tabular-nums text-ios-label2">{d.value > 0 ? d.value : ""}</div>
          <div className="w-full rounded-t-[3px]" style={{ height: `${(d.value / max) * (height - 22)}px`, background: color, minHeight: 2 }} />
          <div className="text-[9px] text-ios-label2">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

type Metric = "steps" | "hr" | "sleep" | "active" | "calories" | "water" | "mindful";
const METRICS: { id: Metric; label: string; icon: typeof Heart; color: string; unit: string; fmt: (v: number) => string }[] = [
  { id: "steps", label: "Steps", icon: Footprints, color: "#ff2d55", unit: "", fmt: (v) => v.toLocaleString() },
  { id: "hr", label: "Heart Rate", icon: Heart, color: "#ff3b30", unit: "", fmt: (v) => `${v} BPM` },
  { id: "sleep", label: "Sleep", icon: BedDouble, color: "#5e5ce6", unit: "", fmt: (v) => `${v}h` },
  { id: "active", label: "Active", icon: Activity, color: "#ff9500", unit: "", fmt: (v) => `${v}m` },
  { id: "calories", label: "Calories", icon: Flame, color: "#ff6a00", unit: "", fmt: (v) => v.toLocaleString() },
  { id: "water", label: "Water", icon: Droplet, color: "#0a84ff", unit: "", fmt: (v) => `${v}` },
  { id: "mindful", label: "Mindful", icon: Brain, color: "#34c759", unit: "", fmt: (v) => `${v}m` },
];

export default function HealthApp() {
  useNow(30_000);
  const [range, setRange] = useState<"d" | "w" | "m" | "y">("w");
  const [metric, setMetric] = useState<Metric | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const days = useMemo(() => generateDays(365, 42), []);
  const today = days[days.length - 1];
  const week = days.slice(-7);
  const month = days.slice(-30);
  const year = days.slice(-365);

  const arrFor = (m: Metric) => {
    if (range === "d") return [today[m]];
    if (range === "w") return week.map((d) => d[m]);
    if (range === "m") return month.map((d) => d[m]);
    return year.map((d) => d[m]);
  };
  const cur = metric ? METRICS.find((m) => m.id === metric)! : null;

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page
        title="Health"
        right={
          <button className="text-ios-blue" onClick={() => setAddOpen(true)}>
            <Plus size={26} />
          </button>
        }
      >
        {/* Today summary card */}
        <div className="px-4 pb-1">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#fe2d55] to-[#ff6a8a] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-medium uppercase tracking-wider text-white/70">Today</div>
                <div className="text-[28px] font-bold leading-tight">{today.steps.toLocaleString()}</div>
                <div className="text-[13px] text-white/80">steps · {fmtDate(today.date)}</div>
              </div>
              <Footprints size={56} strokeWidth={1.2} className="opacity-60" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/20 pt-3">
              <div>
                <div className="text-[10px] uppercase text-white/60">Heart</div>
                <div className="text-[15px] font-semibold">{today.hr} BPM</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-white/60">Sleep</div>
                <div className="text-[15px] font-semibold">{today.sleep}h</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-white/60">Active</div>
                <div className="text-[15px] font-semibold">{today.active}m</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {["Walk", "Run", "Cycle"].map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    useOS.getState().set({ liveActivity: { kind: "workout", title: w === "Walk" ? "Walking" : w === "Run" ? "Running" : "Cycling", subtitle: `Outdoor ${w}`, progress: 0, color: "#ff2d55", startedAt: Date.now() } });
                    useOS.getState().goHome();
                    useOS.getState().showToast(`${w} workout started — see Dynamic Island`);
                  }}
                  className="flex-1 rounded-full bg-white/20 py-1.5 text-[13px] font-semibold backdrop-blur active:bg-white/30"
                >
                  ▶ {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Favorites */}
        <Group header="Favorites">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const data = arrFor(m.id);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            const last = data[data.length - 1] ?? 0;
            return (
              <Row
                key={m.id}
                icon={Icon}
                iconBg={m.color}
                title={m.label}
                value={
                  <span className="text-[15px] tabular-nums">
                    {m.fmt(last)} <span className="text-ios-label2">avg {m.fmt(Math.round(avg))}</span>
                  </span>
                }
                chevron
                onClick={() => setMetric(m.id)}
              />
            );
          })}
        </Group>

        {/* Highlights */}
        <Group header="Highlights">
          <Row
            icon={Flame}
            iconBg="#ff6a00"
            title="Active Energy"
            subtitle="You've closed your move ring 6 days in a row."
            value=""
            chevron
            onClick={() => setMetric("calories")}
          />
          <Row
            icon={Heart}
            iconBg="#ff3b30"
            title="Cardio Fitness"
            subtitle="Above average for your age and sex."
            value="High"
          />
          <Row
            icon={Footprints}
            iconBg="#ff2d55"
            title="Steps"
            subtitle={`Walking ${today.steps.toLocaleString()} steps today — about ${(today.steps * 0.000762).toFixed(1)} km`}
          />
        </Group>

        {/* Trends chart */}
        <Group header={`Trends · ${{ d: "Today", w: "Week", m: "Month", y: "Year" }[range]}`}>
          <div className="px-1 pb-1">
            <Segmented
              options={[
                { id: "d", label: "D" },
                { id: "w", label: "W" },
                { id: "m", label: "M" },
                { id: "y", label: "Y" },
              ]}
              value={range}
              onChange={(v) => setRange(v as typeof range)}
              className="mb-3"
            />
            <div className="rounded-xl bg-ios-cell p-3">
              <div className="mb-1 text-[13px] font-semibold text-ios-label">Steps</div>
              <MiniLine data={arrFor("steps")} color="#ff2d55" />
            </div>
            <div className="mt-3 rounded-xl bg-ios-cell p-3">
              <div className="mb-1 text-[13px] font-semibold text-ios-label">Heart Rate</div>
              <MiniLine data={arrFor("hr")} color="#ff3b30" height={48} />
            </div>
          </div>
        </Group>

        {/* Sleep */}
        <Group header="Sleep · Last 7 Days">
          <div className="rounded-xl bg-ios-cell p-3">
            <BarChart
              data={week.map((d) => ({ label: ["S", "M", "T", "W", "T", "F", "S"][new Date(d.date).getDay()], value: d.sleep }))}
              color="#5e5ce6"
            />
          </div>
        </Group>

        {/* Sources */}
        <Group header="Data Sources">
          <Row title="iPhone" subtitle="Steps, walking, running distance" value="" />
          <Row title="Apple Watch" subtitle="Heart rate, activity, standing" value="" />
          <Row title="Sleep Tracker" subtitle="Sleep analysis" value="" />
        </Group>
      </Page>

      {/* Metric detail sheet */}
      <Sheet open={!!metric} onClose={() => setMetric(null)} full>
        {cur && <MetricDetail metric={cur} days={days} onBack={() => setMetric(null)} />}
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} height="50%">
        <Page title="Add Data" large={false} left={<NavBtn onClick={() => setAddOpen(false)}>Cancel</NavBtn>}>
          <Group>
            {METRICS.slice(0, 4).map((m) => {
              const Icon = m.icon;
              return <Row key={m.id} icon={Icon} iconBg={m.color} title={`Add ${m.label}`} chevron onClick={() => { useOS.getState().showToast(`${m.label} data added`); setAddOpen(false); }} />;
            })}
          </Group>
        </Page>
      </Sheet>
    </div>
  );
}

function MetricDetail({ metric, days, onBack }: { metric: typeof METRICS[number]; days: DayPoint[]; onBack: () => void }) {
  const [range, setRange] = useState<"w" | "m" | "y">("m");
  const arr = range === "w" ? days.slice(-7).map((d) => d[metric.id]) : range === "m" ? days.slice(-30).map((d) => d[metric.id]) : days.slice(-365).map((d) => d[metric.id]);
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const last = arr[arr.length - 1] ?? 0;
  const Icon = metric.icon;

  return (
    <Page
      title={metric.label}
      large={false}
      left={
        <NavBtn onClick={onBack}>
          <ChevronLeft size={24} className="-mr-1" /> Health
        </NavBtn>
      }
      right={<Icon size={26} style={{ color: metric.color }} />}
    >
      <div className="flex items-center gap-3 px-4 py-2">
        <Icon size={36} style={{ color: metric.color }} />
        <div>
          <div className="text-[40px] font-bold leading-none tabular-nums" style={{ color: metric.color }}>
            {metric.fmt(last)}
          </div>
          <div className="text-[13px] text-ios-label2">{metric.unit}</div>
        </div>
      </div>

      <Group header="Average">
        <Row title="Average" value={metric.fmt(Math.round(avg))} />
        <Row title="Highest" value={metric.fmt(max)} />
        <Row title="Lowest" value={metric.fmt(min)} />
      </Group>

      <Group header="Trend">
        <Segmented
          options={[
            { id: "w", label: "1W" },
            { id: "m", label: "1M" },
            { id: "y", label: "1Y" },
          ]}
          value={range}
          onChange={(v) => setRange(v as typeof range)}
          className="mb-3"
        />
        <div className="rounded-xl bg-ios-cell p-3">
          <MiniLine data={arr} color={metric.color} height={120} />
        </div>
      </Group>

      <Group header="Recent Days">
        {days
          .slice(-6)
          .reverse()
          .map((d) => (
            <Row key={d.date} title={fmtDate(d.date, true)} value={metric.fmt(d[metric.id])} />
          ))}
      </Group>
    </Page>
  );
}
