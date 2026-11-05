import { useState } from "react";
import { Sparkles, ChevronRight, Search, Lightbulb, Zap, Battery, Shield, Camera, Bell, Wifi } from "lucide-react";
import { Group, Page, Row, SearchField, Empty, Segmented } from "../os/ui";
import { useOS } from "../os/store";

interface Tip {
  id: string;
  title: string;
  body: string;
  icon: typeof Sparkles;
  color: string;
  category: "essential" | "tips" | "features" | "security";
}

const TIPS: Tip[] = [
  {
    id: "t1",
    title: "Swipe to go Home",
    body: "Swipe up from the bottom edge of the screen to return to the Home Screen. Swipe up and pause to open the App Switcher.",
    icon: Zap,
    color: "#0a84ff",
    category: "essential",
  },
  {
    id: "t2",
    title: "Control Center & Notifications",
    body: "Swipe down from the top-right corner to open Control Center. Swipe down from the top-left to see your notifications.",
    icon: Battery,
    color: "#ff9500",
    category: "essential",
  },
  {
    id: "t3",
    title: "Spotlight Search",
    body: "Press the / key or swipe down on the Home Screen to search apps, contacts, notes, and the web with Spotlight.",
    icon: Search,
    color: "#8e8e93",
    category: "essential",
  },
  {
    id: "t4",
    title: "Talk to Siri",
    body: "Press and hold the side button (right side of the device) to ask Siri anything. Try 'Set a timer for 5 minutes'.",
    icon: Sparkles,
    color: "#5e5ce6",
    category: "essential",
  },
  {
    id: "t5",
    title: "Lock Screen Widgets",
    body: "On the Lock Screen you'll see battery, weather, and calendar widgets at a glance. Tap the time to wake the device.",
    icon: Bell,
    color: "#34c759",
    category: "features",
  },
  {
    id: "t6",
    title: "Rearrange Apps",
    body: "Long-press any app icon to enter edit mode (jiggle). Drag apps to rearrange, drop one on another to make a folder.",
    icon: ChevronRight,
    color: "#ff2d55",
    category: "tips",
  },
  {
    id: "t7",
    title: "App Library",
    body: "Swipe all the way right to find the App Library — apps organized into categories you can search.",
    icon: Search,
    color: "#0a84ff",
    category: "features",
  },
  {
    id: "t8",
    title: "Take a Screenshot",
    body: "Real iOS: press Side button + Volume Up. Here in the simulator: use your browser's screenshot shortcut.",
    icon: Camera,
    color: "#ff3b30",
    category: "tips",
  },
  {
    id: "t9",
    title: "Face ID & Passcode",
    body: "Set up a passcode in Settings → Face ID & Passcode. The simulator uses a simulated Face ID and 6-digit passcode.",
    icon: Shield,
    color: "#34c759",
    category: "security",
  },
  {
    id: "t10",
    title: "Wi-Fi & Cellular",
    body: "Toggle radios in Control Center or Settings. Airplane Mode turns off Wi-Fi, Bluetooth, and Cellular together.",
    icon: Wifi,
    color: "#0a84ff",
    category: "essential",
  },
  {
    id: "t11",
    title: "Siri Suggestions",
    body: "Spotlight shows Siri Suggestions based on your usage and time of day. The more you use the simulator, the smarter it gets.",
    icon: Lightbulb,
    color: "#ffd60a",
    category: "features",
  },
  {
    id: "t12",
    title: "Low Power Mode",
    body: "When your battery drops to 20%, you'll be prompted to enable Low Power Mode. Find it in Settings → Battery.",
    icon: Battery,
    color: "#ff9500",
    category: "tips",
  },
];

const CATS: { id: Tip["category"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "essential", label: "Essential" },
  { id: "features", label: "Features" },
  { id: "tips", label: "Tips" },
  { id: "security", label: "Security" },
];

export default function TipsApp() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Tip["category"] | "all">("all");

  const filtered = TIPS.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    return t.title.toLowerCase().includes(q.toLowerCase()) || t.body.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page title="Tips" right={<Sparkles size={24} className="text-ios-blue" />}>
        <div className="px-4 pb-2">
          <SearchField value={q} onChange={setQ} placeholder="Search Tips" />
        </div>
        <div className="px-4 pb-2">
          <Segmented options={CATS.map((c) => ({ id: c.id, label: c.label }))} value={cat} onChange={(v) => setCat(v as typeof cat)} />
        </div>

        {/* Featured */}
        <div className="px-4 pb-2">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a84ff] to-[#5ac8fa] p-4 text-white shadow-sm">
            <Sparkles size={28} className="mb-2 opacity-90" />
            <div className="text-[20px] font-bold leading-tight">Welcome to your iPhone</div>
            <div className="mt-1 text-[14px] text-white/85">Discover what your device can do. Browse tips below or search for a feature.</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty icon={Search} title="No Tips Found" text="Try a different search." />
        ) : (
          <Group>
            {filtered.map((t) => {
              const Icon = t.icon;
              return (
                <Row
                  key={t.id}
                  icon={Icon}
                  iconBg={t.color}
                  title={t.title}
                  subtitle={t.body}
                  chevron
                  onClick={() => useOS.getState().showToast(t.title)}
                />
              );
            })}
          </Group>
        )}

        <Group footer="Tips updates automatically as you use your iPhone.">
          <Row title="Version" value="iOS 17.0" />
          <Row title="More Tips" subtitle="Visit apple.com/iphone/tips" chevron onClick={() => useOS.getState().showToast("Open Safari to view online tips")} />
        </Group>
      </Page>
    </div>
  );
}

