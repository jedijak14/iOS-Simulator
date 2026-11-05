import { useState } from "react";
import { Check, Plane, ScanFace, Wifi } from "lucide-react";
import { useOS } from "../os/store";
import { Page } from "../os/ui";
import { sfx } from "../os/sound";

interface Card {
  id: string;
  name: string;
  sub: string;
  last: string;
  bg: string;
  fg: string;
  kind: "card" | "pass";
}
const CARDS: Card[] = [
  { id: "apple", name: "Apple Card", sub: "Goldman Sachs", last: "4821", bg: "linear-gradient(135deg,#f5f5f7,#c9c9ce)", fg: "#1c1c1e", kind: "card" },
  { id: "sapphire", name: "Sapphire Preferred", sub: "Visa", last: "1094", bg: "linear-gradient(135deg,#1e3a8a,#0b1f4d)", fg: "#fff", kind: "card" },
  { id: "gold", name: "Gold Rewards", sub: "Amex", last: "3002", bg: "linear-gradient(135deg,#e9c46a,#a0762a)", fg: "#2b1d05", kind: "card" },
  { id: "flight", name: "SkyJet SJ 482", sub: "JFK → SFO · Seat 14A", last: "", bg: "linear-gradient(135deg,#0ea5e9,#1d4ed8)", fg: "#fff", kind: "pass" },
  { id: "student", name: "Student ID", sub: "Stanford University", last: "", bg: "linear-gradient(135deg,#b91c1c,#7f1d1d)", fg: "#fff", kind: "pass" },
];
const TX = [
  ["Café Verde", "$8.70", "Today"],
  ["Whole Foods", "$64.12", "Yesterday"],
  ["Uber", "$18.40", "Mon"],
  ["Apple Store", "$129.00", "Sun"],
];

export default function WalletApp() {
  const [sel, setSel] = useState<string | null>(null);
  const [pay, setPay] = useState<"idle" | "face" | "hold" | "done">("idle");
  const card = CARDS.find((c) => c.id === sel);

  const startPay = () => {
    setPay("face");
    setTimeout(() => setPay("hold"), 900);
    setTimeout(() => {
      setPay("done");
      sfx.charge();
    }, 2500);
    setTimeout(() => setPay("idle"), 3800);
  };

  return (
    <div className="force-dark relative h-full bg-black text-white">
      <Page title="Wallet" bg="bg-black" noPad>
        <div className="relative mx-4" style={{ height: sel ? 220 : 90 + (CARDS.length - 1) * 62 + 140 }}>
          {CARDS.map((c, i) => {
            const selected = c.id === sel;
            const top = sel ? (selected ? 0 : 240 + i * 8) : i * 62;
            return (
              <button
                key={c.id}
                onClick={() => setSel(selected ? null : c.id)}
                className="absolute inset-x-0 h-[200px] overflow-hidden rounded-[16px] p-4 text-left shadow-[0_-4px_14px_rgba(0,0,0,.45)]"
                style={{ top, background: c.bg, color: c.fg, zIndex: selected ? 50 : i, transition: "top .45s cubic-bezier(.3,.8,.2,1), opacity .3s", opacity: sel && !selected ? 0 : 1, pointerEvents: sel && !selected ? "none" : "auto" }}
              >
                <div className="flex items-start justify-between">
                  <div className="text-[19px] font-semibold">{c.name}</div>
                  {c.kind === "pass" ? <Plane size={22} /> : <Wifi size={20} className="rotate-90" />}
                </div>
                <div className="mt-1 text-[13px] opacity-70">{c.sub}</div>
                {c.last && <div className="absolute bottom-4 left-4 text-[15px] tracking-[3px] opacity-80">•••• {c.last}</div>}
                {c.kind === "pass" && (
                  <div className="absolute bottom-4 left-4 right-4 flex h-12 items-center justify-center rounded bg-white/90">
                    <div className="flex h-8 items-end gap-[2px]">{Array.from({ length: 36 }).map((_, k) => <span key={k} className="w-[2px] bg-black" style={{ height: 14 + ((k * 37) % 18) }} />)}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {card && card.kind === "card" && (
          <div className="px-4">
            <button onClick={startPay} className="mb-4 w-full rounded-full bg-white py-3 text-[17px] font-semibold text-black active:opacity-80">Pay with {card.name}</button>
            <div className="mb-2 text-[13px] font-semibold uppercase text-white/50">Latest Transactions</div>
            <div className="overflow-hidden rounded-[12px] bg-[#1c1c1e]">
              {TX.map(([n, a, d]) => (
                <div key={n} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "0.5px solid rgba(255,255,255,.1)" }}>
                  <div>
                    <div className="text-[16px]">{n}</div>
                    <div className="text-[13px] text-white/50">{d}</div>
                  </div>
                  <div className="text-[16px] tabular-nums">{a}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {card && card.kind === "pass" && <div className="px-4 pt-2 text-center text-[14px] text-white/60">Hold your iPhone near the reader to scan this pass.</div>}
        {!sel && <div className="pb-24 text-center text-[13px] text-white/40">Double-click the side button to pay · tap a card to open it</div>}
      </Page>

      {pay !== "idle" && (
        <div className="fade-in absolute inset-0 z-40 flex flex-col items-center justify-end bg-black/60 backdrop-blur-sm" onClick={() => setPay("idle")}>
          <div className="w-full rounded-t-[24px] bg-[#1c1c1e] px-6 pb-12 pt-8 text-center" style={{ paddingBottom: "calc(var(--safe-bottom) + 30px)" }}>
            {pay === "face" && (<><ScanFace size={64} className="mx-auto animate-pulse text-white" strokeWidth={1.3} /><div className="mt-3 text-[18px]">Looking for Face ID…</div></>)}
            {pay === "hold" && (<><Wifi size={64} className="mx-auto animate-pulse rotate-90 text-[#0a84ff]" strokeWidth={1.5} /><div className="mt-3 text-[18px]">Hold Near Reader</div><div className="text-[13px] text-white/50">{card?.name} •••• {card?.last}</div></>)}
            {pay === "done" && (<><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#30d158]"><Check size={38} strokeWidth={3.5} /></div><div className="mt-3 text-[18px]">Done</div><div className="text-[13px] text-white/50">$8.70 · Café Verde</div></>)}
          </div>
        </div>
      )}
      <span className="hidden">{useOS.getState().power}</span>
    </div>
  );
}
