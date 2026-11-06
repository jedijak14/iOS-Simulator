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
  const [cards, setCards] = useState<Card[]>(() => {
    try {
      const stored = localStorage.getItem("ios-sim-wallet-cards");
      return stored ? [...CARDS, ...JSON.parse(stored)] : CARDS;
    } catch {
      return CARDS;
    }
  });
  const [addingPass, setAddingPass] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: "", issuer: "", last: "" });
  const addCard = () => {
    if (!newCard.name.trim() || !/^\d{4}$/.test(newCard.last)) return;
    savePasses([...cards, { id: "card-" + Date.now(), name: newCard.name.trim(), sub: newCard.issuer.trim() || "Demo card", last: newCard.last, bg: "linear-gradient(135deg,#415a77,#142438)", fg: "#fff", kind: "card" }]);
    setNewCard({ name: "", issuer: "", last: "" }); setAddingCard(false);
    useOS.getState().showToast("Demo card added");
  };
  const [newPass, setNewPass] = useState({ name: "", sub: "", kind: "event" as "event" | "flight" | "library" });
  const card = cards.find((c) => c.id === sel);

  const savePasses = (next: Card[]) => {
    const custom = next.filter((c) => !CARDS.some((b) => b.id === c.id));
    setCards(next);
    try { localStorage.setItem("ios-sim-wallet-cards", JSON.stringify(custom)); } catch { /* ignore */ }
  };

  const addPass = () => {
    if (!newPass.name.trim()) return;
    const id = "p" + Date.now();
    const colors: Record<string, { bg: string; fg: string }> = {
      event: { bg: "linear-gradient(135deg,#7c3aed,#4c1d95)", fg: "#fff" },
      flight: { bg: "linear-gradient(135deg,#0ea5e9,#1d4ed8)", fg: "#fff" },
      library: { bg: "linear-gradient(135deg,#16a34a,#14532d)", fg: "#fff" },
    };
    const c = colors[newPass.kind];
    const pass: Card = { id, name: newPass.name, sub: newPass.sub || (newPass.kind === "event" ? "Event Ticket" : newPass.kind === "flight" ? "Boarding Pass" : "Library Card"), last: "", bg: c.bg, fg: c.fg, kind: "pass" };
    savePasses([...cards, pass]);
    setNewPass({ name: "", sub: "", kind: "event" });
    setAddingPass(false);
    sfx.success();
    useOS.getState().showToast("Pass added to Wallet");
  };

  const startPay = () => {
    setPay("face");
    setTimeout(() => setPay("hold"), 900);
    setTimeout(() => {
      setPay("done");
      sfx.paySuccess();
    }, 2500);
    setTimeout(() => setPay("idle"), 3800);
  };

  return (
    <div className="force-dark relative h-full bg-black text-white">
      <Page title="Wallet" bg="bg-black" noPad>
        <div className="relative mx-4" style={{ height: sel ? 220 : 90 + (cards.length - 1) * 62 + 140 }}>
          {cards.map((c, i) => {
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
            <button onClick={startPay} className="mb-4 w-full rounded-full bg-white py-3 text-[17px] font-semibold text-black active:opacity-80">Simulate payment with {card.name}</button>
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
        {card && card.kind === "pass" && <div className="px-4 pt-2 text-center text-[14px] text-white/60">Demo pass only — this barcode is not valid for scanning.</div>}
        {!sel && (
          <div className="px-4 pb-24">
            <button onClick={() => setAddingPass(true)} className="mt-4 w-full rounded-full border border-white/20 py-2.5 text-[15px] font-semibold text-white active:bg-white/10">
              + Add Pass
            </button>
            <button onClick={() => setAddingCard(true)} className="mt-3 w-full rounded-full border border-white/20 py-2.5 text-[15px] font-semibold text-white active:bg-white/10">+ Add Demo Card</button>
            <div className="mt-3 text-center text-[13px] text-white/40">Demo wallet only. Cards cannot make payments.</div>
          </div>
        )}
      </Page>

      {addingCard && <div className="fade-in absolute inset-0 z-40 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setAddingCard(false)}><div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-[24px] bg-[#1c1c1e] px-5 pb-10 pt-6 text-white">
        <h2 className="mb-2 text-xl font-bold">Add Demo Card</h2><p className="mb-4 text-sm text-white/60">For display only. Do not enter a full card number; payments and Apple Pay are not supported.</p>
        <input value={newCard.name} onChange={(e) => setNewCard({ ...newCard, name: e.target.value })} placeholder="Card name" className="mb-2 w-full rounded-xl bg-white/10 px-4 py-3 outline-none" />
        <input value={newCard.issuer} onChange={(e) => setNewCard({ ...newCard, issuer: e.target.value })} placeholder="Issuer (optional)" className="mb-2 w-full rounded-xl bg-white/10 px-4 py-3 outline-none" />
        <input value={newCard.last} onChange={(e) => setNewCard({ ...newCard, last: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="Last 4 digits only" inputMode="numeric" maxLength={4} className="mb-4 w-full rounded-xl bg-white/10 px-4 py-3 outline-none" />
        <div className="flex gap-2"><button onClick={() => setAddingCard(false)} className="flex-1 rounded-full bg-white/10 py-3">Cancel</button><button onClick={addCard} disabled={!newCard.name.trim() || !/^\d{4}$/.test(newCard.last)} className="flex-1 rounded-full bg-white py-3 font-semibold text-black disabled:opacity-40">Add</button></div>
      </div></div>}
      {addingPass && (
        <div className="fade-in absolute inset-0 z-40 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setAddingPass(false)}>
          <div className="w-full rounded-t-[24px] bg-[#1c1c1e] px-5 pb-10 pt-6 text-white" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
            <div className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-white/30" />
            <div className="mb-4 text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>Add a Pass</div>
            <div className="mb-3 flex gap-2">
              {([
                { id: "event", label: "Event" },
                { id: "flight", label: "Boarding" },
                { id: "library", label: "Library" },
              ] as const).map((k) => (
                <button
                  key={k.id}
                  onClick={() => setNewPass({ ...newPass, kind: k.id })}
                  className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold ${newPass.kind === k.id ? "bg-white text-black" : "bg-white/10 text-white"}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <input
              value={newPass.name}
              onChange={(e) => setNewPass({ ...newPass, name: e.target.value })}
              placeholder="Pass name (e.g. Concert Ticket)"
              className="mb-2 w-full rounded-xl bg-white/10 px-4 py-3 text-[16px] outline-none placeholder:text-white/40"
            />
            <input
              value={newPass.sub}
              onChange={(e) => setNewPass({ ...newPass, sub: e.target.value })}
              placeholder="Subtitle (e.g. Seat 12A · Section C)"
              className="mb-4 w-full rounded-xl bg-white/10 px-4 py-3 text-[16px] outline-none placeholder:text-white/40"
            />
            <div className="flex gap-2">
              <button onClick={() => setAddingPass(false)} className="flex-1 rounded-full bg-white/10 py-3 text-[16px] font-semibold">Cancel</button>
              <button onClick={addPass} disabled={!newPass.name.trim()} className="flex-1 rounded-full bg-white py-3 text-[16px] font-semibold text-black disabled:opacity-40">Add Pass</button>
            </div>
          </div>
        </div>
      )}

      {pay !== "idle" && (
        <div className="fade-in absolute inset-0 z-40 flex flex-col items-center justify-end bg-black/60 backdrop-blur-sm" onClick={() => setPay("idle")}>
          <div className="w-full rounded-t-[24px] bg-[#1c1c1e] px-6 pb-12 pt-8 text-center" style={{ paddingBottom: "calc(var(--safe-bottom) + 30px)" }}>
            {pay === "face" && (<><ScanFace size={64} className="mx-auto animate-pulse text-white" strokeWidth={1.3} /><div className="mt-3 text-[18px]">Simulating authentication…</div></>)}
            {pay === "hold" && (<><Wifi size={64} className="mx-auto animate-pulse rotate-90 text-[#0a84ff]" strokeWidth={1.5} /><div className="mt-3 text-[18px]">Simulated payment</div><div className="text-[13px] text-white/50">{card?.name} •••• {card?.last}</div></>)}
            {pay === "done" && (<><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#30d158]"><Check size={38} strokeWidth={3.5} /></div><div className="mt-3 text-[18px]">Simulation complete</div><div className="text-[13px] text-white/50">$8.70 · Café Verde</div></>)}
          </div>
        </div>
      )}
      <span className="hidden">{useOS.getState().power}</span>
    </div>
  );
}
