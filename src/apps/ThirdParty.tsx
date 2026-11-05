// Stub apps that get installed dynamically from the App Store.
// These are real third-party app icons (from iosicongallery) with simple functional stubs.

import { useState } from "react";
import { Play, Search, Home, Library, Heart, TrendingUp } from "lucide-react";
import { Page, TabBar, Group, Row } from "../os/ui";
import { useOS } from "../os/store";

/** Spotify-like music app stub. */
export function SpotifyApp() {
  const [tab, setTab] = useState<"home" | "search" | "library">("home");
  return (
    <div className="relative h-full overflow-hidden bg-black text-white">
      <Page title="Spotify" bg="bg-black" noPad>
        <div className="px-4">
          <div className="mb-4 text-[28px] font-bold" style={{ letterSpacing: "-0.025em" }}>Good evening</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Liked Songs", color: "#5e5ce6", icon: Heart },
              { name: "Discover Weekly", color: "#1e1e1e" },
              { name: "Daily Mix 1", color: "#ff6a8a" },
              { name: "Chill Vibes", color: "#0a84ff" },
              { name: "Rock Classics", color: "#ff9500" },
              { name: "Focus Flow", color: "#30d158" },
            ].map((p) => (
              <button key={p.name} className="flex items-center gap-2 overflow-hidden rounded-md bg-white/10 p-2 text-left active:bg-white/20">
                <div className="h-12 w-12 shrink-0 rounded" style={{ background: p.color }}>
                  {"icon" in p && p.icon ? <p.icon size={22} className="mx-auto mt-[14px]" fill="#fff" /> : null}
                </div>
                <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">{p.name}</div>
              </button>
            ))}
          </div>

          <div className="mb-2 mt-6 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>Made for you</div>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scroll">
            {["Today's Hits", "Pop Rising", "RapCaviar", "Hot Country", "Rock Now", "Indie"].map((n, i) => (
              <div key={n} className="w-[130px] shrink-0">
                <div className="h-[130px] w-full rounded-md shadow-lg" style={{ background: `hsl(${i * 60}, 60%, 35%)` }} />
                <div className="mt-1 truncate text-[13px] font-semibold">{n}</div>
                <div className="truncate text-[11px] text-white/60">Playlist</div>
              </div>
            ))}
          </div>

          <div className="mb-2 mt-6 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>Popular artists</div>
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scroll">
            {["Drake", "Taylor Swift", "The Weeknd", "Bad Bunny", "Olivia Rodrigo"].map((n, i) => (
              <div key={n} className="w-[110px] shrink-0 text-center">
                <div className="mx-auto h-[110px] w-[110px] rounded-full shadow-lg" style={{ background: `hsl(${i * 70}, 50%, 40%)` }} />
                <div className="mt-1 truncate text-[13px] font-semibold">{n}</div>
                <div className="truncate text-[11px] text-white/60">Artist</div>
              </div>
            ))}
          </div>
        </div>
      </Page>
      <TabBar
        dark
        tabs={[
          { id: "home", label: "Home", icon: Home },
          { id: "search", label: "Search", icon: Search },
          { id: "library", label: "Your Library", icon: Library },
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
      />
    </div>
  );
}

/** YouTube-like video app stub. */
export function YouTubeApp() {
  return (
    <div className="relative h-full overflow-hidden bg-black text-white">
      <Page title="YouTube" bg="bg-black" noPad>
        <div className="px-3">
          {[
            { title: "iOS 27 — What's New", channel: "Apple Explained", views: "2.1M views", time: "3 days ago", duration: "12:34" },
            { title: "Building a Full iOS Simulator in React", channel: "Fireship", views: "847K views", time: "1 week ago", duration: "8:42" },
            { title: "Lo-fi Hip Hop Radio — Beats to Relax/Study", channel: "Lofi Girl", views: "12M views", time: "Streaming now", duration: "LIVE" },
            { title: "How Apple's M5 Chip Was Made", channel: "Marques Brownlee", views: "5.4M views", time: "2 weeks ago", duration: "15:21" },
            { title: "Tesla Roadster — First Drive Review", channel: "Top Gear", views: "1.8M views", time: "5 days ago", duration: "10:12" },
            { title: "Mountain Sunrise 4K Drone Footage", channel: "Nature 4K", views: "320K views", time: "1 month ago", duration: "5:47" },
          ].map((v, i) => (
            <div key={i} className="mb-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl" style={{ background: `hsl(${i * 50}, 50%, 30%)` }}>
                <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">{v.duration}</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                  <div className="rounded-full bg-black/60 p-3"><Play size={28} fill="#fff" /></div>
                </div>
              </div>
              <div className="mt-2 flex gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full" style={{ background: `hsl(${i * 50 + 30}, 60%, 50%)` }} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[14px] font-semibold leading-tight">{v.title}</div>
                  <div className="mt-0.5 text-[12px] text-white/60">{v.channel} · {v.views} · {v.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Page>
    </div>
  );
}

/** Instagram-like social app stub. */
export function InstagramApp() {
  const stories = ["Your story", "alex.rivera", "taylor.kim", "sam.patel", "jordan.lee", "priya.shah", "mom"];
  return (
    <div className="relative h-full overflow-hidden bg-black text-white">
      <Page title="Instagram" bg="bg-black" large={false} noPad>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
          <span className="text-[24px] font-bold" style={{ letterSpacing: "-0.025em", fontFamily: "ui-serif, Georgia, serif" }}>Instagram</span>
          <Heart size={24} />
        </div>
        {/* Stories */}
        <div className="flex gap-3 overflow-x-auto border-b border-white/10 px-3 py-3 hide-scroll">
          {stories.map((s, i) => (
            <div key={s} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full p-[2px]"
                style={{ background: i === 0 ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, #ff8a00, #e52e71, #7028e4)" }}
              >
                <div className="h-full w-full rounded-full border-2 border-black" style={{ background: `hsl(${i * 40}, 60%, 50%)` }} />
              </div>
              <span className="w-full truncate text-center text-[11px]">{s}</span>
            </div>
          ))}
        </div>
        {/* Feed */}
        <div className="space-y-4 pb-8 pt-4">
          {[
            { user: "alex.rivera", hue: 210, caption: "Hiking the Eagle Point trail this weekend 🥾", likes: 234, time: "2 hours ago" },
            { user: "taylor.kim", hue: 160, caption: "Ramen from the new spot downtown 🍜", likes: 412, time: "5 hours ago" },
            { user: "sam.patel", hue: 100, caption: "Coffee and code. Best combination ☕", likes: 89, time: "8 hours ago" },
          ].map((post, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="h-8 w-8 rounded-full" style={{ background: `hsl(${post.hue}, 70%, 55%)` }} />
                <span className="flex-1 text-[13px] font-semibold">{post.user}</span>
                <span className="text-[12px] text-white/50">⋯</span>
              </div>
              <div className="aspect-square w-full" style={{ background: `linear-gradient(135deg, hsl(${post.hue}, 60%, 40%), hsl(${post.hue + 40}, 70%, 30%))` }} />
              <div className="flex gap-4 px-4 py-2">
                <Heart size={24} />
                <span className="text-[13px]">{post.likes} likes</span>
                <span className="ml-auto text-[12px] text-white/50">{post.time}</span>
              </div>
              <div className="px-4 text-[13px]">
                <b>{post.user}</b> {post.caption}
              </div>
            </div>
          ))}
        </div>
      </Page>
    </div>
  );
}

/** Generic "stub" for other third-party apps. */
export function StubApp({ name, color }: { name: string; color: string }) {
  return (
    <div className="relative h-full overflow-hidden bg-ios-bg">
      <Page title={name}>
        <Group>
          <Row
            leading={<div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: color }}><TrendingUp size={18} className="text-white" /></div>}
            title={name}
            subtitle="Thanks for installing!"
          />
        </Group>
        <Group header="About">
          <Row title="Version" value="1.0" />
          <Row title="Developer" value="Third Party" />
          <Row title="Category" value="Entertainment" />
        </Group>
        <Group footer="This is a stub app — a placeholder demonstrating the install flow.">
          <Row title={<span className="text-ios-blue">Open Settings</span>} onClick={() => useOS.getState().openApp("settings")} />
        </Group>
      </Page>
    </div>
  );
}
