import { useState } from "react";
import { ChevronLeft, MapPin, Smartphone, Watch, Headphones, Search as SearchIcon, Plus, RefreshCw, Volume2, BatteryMedium } from "lucide-react";
import { Group, Page, Row, Segmented, Empty, NavBtn, Sheet } from "../os/ui";
import { useOS, useNow } from "../os/store";

interface Device {
  id: string;
  name: string;
  kind: "phone" | "watch" | "airpods" | "ipad" | "mac" | "tag";
  icon: typeof Smartphone;
  color: string;
  battery: number;
  charging: boolean;
  location: string;
  distance: string;
  lat: number;
  lng: number;
  updated: number;
  online: boolean;
  playSound: boolean;
}

const DEVICES: Device[] = [
  { id: "d1", name: "iPhone", kind: "phone", icon: Smartphone, color: "#1c1c1e", battery: 87, charging: false, location: "Current Location", distance: "Here", lat: 37.323, lng: -122.032, updated: Date.now(), online: true, playSound: false },
  { id: "d2", name: "Apple Watch", kind: "watch", icon: Watch, color: "#ff3b30", battery: 64, charging: false, location: "Home", distance: "0.1 mi", lat: 37.3235, lng: -122.0325, updated: Date.now() - 5 * 60000, online: true, playSound: false },
  { id: "d3", name: "AirPods Pro", kind: "airpods", icon: Headphones, color: "#8e8e93", battery: 42, charging: false, location: "Café Verde", distance: "0.4 mi", lat: 37.327, lng: -122.028, updated: Date.now() - 30 * 60000, online: true, playSound: false },
  { id: "d4", name: "iPad", kind: "ipad", icon: Smartphone, color: "#0a84ff", battery: 95, charging: true, location: "Home Office", distance: "0.1 mi", lat: 37.3236, lng: -122.0322, updated: Date.now() - 2 * 60000, online: true, playSound: false },
  { id: "d5", name: "MacBook Pro", kind: "mac", icon: Smartphone, color: "#34c759", battery: 78, charging: false, location: "Home Office", distance: "0.1 mi", lat: 37.3236, lng: -122.0322, updated: Date.now() - 4 * 60000, online: true, playSound: false },
  { id: "d6", name: "Keys (AirTag)", kind: "tag", icon: MapPin, color: "#ff9500", battery: 88, charging: false, location: "Home", distance: "0.1 mi", lat: 37.3235, lng: -122.0325, updated: Date.now() - 60 * 60000, online: true, playSound: false },
  { id: "d7", name: "Backpack (AirTag)", kind: "tag", icon: MapPin, color: "#5e5ce6", battery: 12, charging: false, location: "Café Verde", distance: "0.4 mi", lat: 37.327, lng: -122.028, updated: Date.now() - 4 * 3600_000, online: false, playSound: false },
];

const PEOPLE: { id: string; name: string; location: string; distance: string; updated: number; hue: number }[] = [
  { id: "p1", name: "Mom", location: "Home", distance: "12 mi", updated: Date.now() - 12 * 60000, hue: 330 },
  { id: "p2", name: "Alex Rivera", location: "Café Verde", distance: "0.4 mi", updated: Date.now() - 3 * 60000, hue: 210 },
  { id: "p3", name: "Taylor Kim", location: "Office", distance: "2.1 mi", updated: Date.now() - 24 * 60000, hue: 160 },
];

function fmtAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

export default function FindMyApp() {
  useNow(60_000);
  const [tab, setTab] = useState<"people" | "devices" | "items">("devices");
  const [sel, setSel] = useState<Device | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page title="Find My" right={<button onClick={refresh} className="text-ios-blue"><RefreshCw size={22} className={refreshing ? "animate-spin" : ""} /></button>}>
        <div className="px-4 pb-2">
          <Segmented
            options={[
              { id: "people", label: "People" },
              { id: "devices", label: "Devices" },
              { id: "items", label: "Items" },
            ]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            className="mb-3"
          />
        </div>

        {/* Map preview */}
        <div className="px-4 pb-3">
          <div className="relative h-[160px] overflow-hidden rounded-2xl bg-ios-cell">
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #eaf3e2 0%, #d4e8d0 50%, #c9e3ff 100%)" }}>
              {/* fake map streets */}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <path d="M0 80 L60 60 L160 90 L240 70" stroke="#fff" strokeWidth="10" fill="none" opacity="0.8" />
                <path d="M40 0 L80 80 L60 160" stroke="#fff" strokeWidth="6" fill="none" opacity="0.8" />
                <path d="M0 130 L200 110 L240 140" stroke="#ffd96a" strokeWidth="5" fill="none" />
              </svg>
              {/* device pins */}
              {(tab === "devices" ? DEVICES : tab === "items" ? DEVICES.filter((d) => d.kind === "tag") : []).map((d, i) => (
                <div
                  key={d.id}
                  className="absolute flex h-7 w-7 items-center justify-center rounded-full text-white shadow-lg"
                  style={{
                    left: `${15 + i * 14}%`,
                    top: `${30 + (i % 3) * 22}%`,
                    background: d.color,
                    border: "2px solid #fff",
                  }}
                >
                  <d.icon size={14} />
                </div>
              ))}
              {tab === "people" && PEOPLE.map((p, i) => (
                <div key={p.id} className="absolute flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg" style={{ left: `${20 + i * 22}%`, top: `${30 + (i % 2) * 28}%`, background: `hsl(${p.hue} 70% 55%)`, border: "2px solid #fff", fontSize: 12, fontWeight: 600 }}>
                  {p.name[0]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tab === "people" && (
          <Group header="Sharing With You">
            {PEOPLE.length === 0 ? <Empty icon={SearchIcon} title="No One Sharing" /> : PEOPLE.map((p) => (
              <Row
                key={p.id}
                leading={<div className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: `hsl(${p.hue} 70% 55%)` }}>{p.name[0]}</div>}
                title={p.name}
                subtitle={p.location}
                value={<span className="text-[13px] text-ios-label2">{p.distance}</span>}
                chevron
              />
            ))}
            <Row icon={Plus} iconBg="#34c759" title={<span className="text-ios-blue">Share My Location</span>} onClick={() => useOS.getState().showToast("Share Location request sent")} />
          </Group>
        )}

        {tab === "devices" && (
          <Group header="My Devices">
            {DEVICES.map((d) => (
              <Row
                key={d.id}
                icon={d.icon}
                iconBg={d.color}
                title={d.name}
                subtitle={`${d.location} · ${fmtAgo(d.updated)}`}
                value={
                  <span className="flex items-center gap-1 text-[13px] text-ios-label2">
                    {d.charging && <span className="text-ios-green">⚡</span>}
                    <BatteryMedium size={14} />
                    {d.battery}%
                  </span>
                }
                chevron
                onClick={() => setSel(d)}
              />
            ))}
          </Group>
        )}

        {tab === "items" && (
          <Group header="My Items">
            {DEVICES.filter((d) => d.kind === "tag").map((d) => (
              <Row
                key={d.id}
                icon={d.icon}
                iconBg={d.color}
                title={d.name}
                subtitle={`${d.location} · ${d.online ? "Online" : "Offline"}`}
                value={<span className="text-[13px] text-ios-label2">{d.battery}%</span>}
                chevron
                onClick={() => setSel(d)}
              />
            ))}
            <Row icon={Plus} iconBg="#34c759" title={<span className="text-ios-blue">Add an Item</span>} onClick={() => useOS.getState().showToast("Pair a new AirTag")} />
          </Group>
        )}

        <Group footer="Find My helps you locate your Apple devices, items with AirTags, and friends who share their location with you.">
          <Row title="Me" subtitle="Location Sharing: On" value="" chevron />
        </Group>
      </Page>

      <Sheet open={!!sel} onClose={() => setSel(null)} height="70%">
        {sel && (
          <Page
            title={sel.name}
            large={false}
            left={<NavBtn onClick={() => setSel(null)}><ChevronLeft size={24} className="-mr-1" /> Devices</NavBtn>}
          >
            <div className="px-4">
              <div className="relative h-[200px] overflow-hidden rounded-2xl bg-ios-cell">
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #eaf3e2 0%, #d4e8d0 50%, #c9e3ff 100%)" }}>
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <path d="M0 80 L60 60 L160 90 L240 70" stroke="#fff" strokeWidth="10" fill="none" />
                    <path d="M40 0 L80 80 L60 160" stroke="#fff" strokeWidth="6" fill="none" />
                  </svg>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="absolute -inset-6 animate-ping rounded-full" style={{ background: sel.color + "33" }} />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl" style={{ background: sel.color, border: "3px solid #fff" }}>
                        <sel.icon size={22} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Group header="Location">
              <Row title="Address" value={sel.location} />
              <Row title="Distance" value={sel.distance} />
              <Row title="Last Updated" value={fmtAgo(sel.updated)} />
              <Row title="Battery" value={`${sel.battery}%${sel.charging ? " ⚡" : ""}`} />
            </Group>

            <Group>
              <Row icon={Volume2} iconBg="#0a84ff" title={<span className="text-ios-blue">Play Sound</span>} onClick={() => { useOS.getState().showToast("Playing sound on " + sel.name); setTimeout(() => useOS.getState().showToast("Sound played"), 2000); }} />
              <Row title={<span className="text-ios-blue">Directions</span>} onClick={() => useOS.getState().openApp("maps")} />
              <Row title={<span className="text-ios-blue">Notify When Found</span>} onClick={() => useOS.getState().showToast("Notification set")} />
              {!sel.online && <Row title={<span className="text-ios-red">Mark As Lost</span>} onClick={() => useOS.getState().showToast("Lost Mode activated")} />}
            </Group>
          </Page>
        )}
      </Sheet>
    </div>
  );
}
