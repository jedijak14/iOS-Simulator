import { saveImportedFile } from "./importedFiles";
import { useEffect, useState } from "react";
import { Check, X, FileText, Image as ImageIcon, Download } from "lucide-react";
import { useOS, useNow } from "./store";
import { newId } from "./data";
import { sfx } from "./sound";
import { fmtTime } from "./utils";

/** StandBy Mode — landscape desk-clock with widgets. */
export function StandBy() {
  const standby = useOS((s) => s.standby);
  const set = useOS((s) => s.set);
  const now = useNow(1000);
  const [view, setView] = useState<"clock" | "widgets" | "photo">("clock");
  const use24 = useOS((s) => s.use24h);

  useEffect(() => {
    if (!standby) return;
    const id = setInterval(() => setView((v) => (v === "clock" ? "widgets" : v === "widgets" ? "photo" : "clock")), 8000);
    return () => clearInterval(id);
  }, [standby]);

  if (!standby) return null;

  const time = fmtTime(now, use24, false);
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-between bg-black text-white"
      style={{ animation: "fadeIn 0.4s ease-out" }}
      onClick={() => set({ standby: false })}
    >
      {/* close button */}
      <button
        aria-label="Exit StandBy"
        onClick={(e) => { e.stopPropagation(); set({ standby: false }); }}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/70 backdrop-blur hover:bg-white/20"
      >
        <X size={18} />
      </button>

      {view === "clock" && (
        <div className="flex w-full items-center justify-center">
          <div className="text-center">
            <div className="text-[140px] font-bold leading-none tabular-nums" style={{ letterSpacing: "-0.06em", fontVariantNumeric: "tabular-nums" }} data-clock>
              {time}
            </div>
            <div className="mt-1 text-[22px] font-medium text-white/70" style={{ letterSpacing: "-0.015em" }}>
              {dateStr}
            </div>
          </div>
        </div>
      )}

      {view === "widgets" && (
        <div className="flex w-full items-center justify-between px-12">
          <div className="flex-1">
            <div className="text-[80px] font-bold leading-none tabular-nums" style={{ letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums" }} data-clock>
              {time}
            </div>
            <div className="mt-1 text-[18px] font-medium text-white/60">{dateStr}</div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md" style={{ minWidth: 180 }}>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Weather</div>
              <div className="mt-1 text-[36px] font-bold">14°</div>
              <div className="text-[13px] text-white/60">Overcast</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md" style={{ minWidth: 180 }}>
              <div className="text-[11px] uppercase tracking-wider text-white/40">Next Event</div>
              <div className="mt-1 text-[16px] font-semibold">Team Standup</div>
              <div className="text-[13px] text-white/60">9:30 AM</div>
            </div>
          </div>
        </div>
      )}

      {view === "photo" && (
        <div className="flex w-full items-center justify-center">
          <img
            src="https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt=""
            className="max-h-[80%] max-w-[70%] rounded-2xl object-cover shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

/** AirDrop incoming-file overlay. */
export function AirDropOverlay() {
  const airdrop = useOS((s) => s.airdrop);
  const set = useOS((s) => s.set);
  const [phase, setPhase] = useState<"incoming" | "receiving" | "done">("incoming");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!airdrop) {
      setPhase("incoming");
      return;
    }
    setPhase(airdrop.phase);
    if (airdrop.phase === "receiving") {
      let p = 0;
      const id = setInterval(() => {
        p += 8;
        if (p >= 100) {
          clearInterval(id);
          setPhase("done");
          set({ airdrop: { ...airdrop, progress: 100, phase: "done" } });
          sfx.success();
        } else {
          set({ airdrop: { ...airdrop, progress: p, phase: "receiving" } });
        }
      }, 120);
      return () => clearInterval(id);
    }
  }, [airdrop?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!airdrop) return;
    if (airdrop.phase === "done") {
      let cancelled = false;
      (async () => {
        if (!airdrop.url) { setError("This was only a demonstration; no file was received."); return; }
        try {
          const response = await fetch(airdrop.url);
          if (!response.ok) throw new Error("Unable to read the file");
          const blob = await response.blob();
          await saveImportedFile({ id: newId(), name: airdrop.name, blob, modified: Date.now() });
          URL.revokeObjectURL(airdrop.url);
          if (!cancelled) { useOS.getState().showToast("Saved to Files on this browser"); setTimeout(() => set({ airdrop: null }), 1800); }
        } catch { if (!cancelled) setError("Could not save the file. Check browser storage and try again."); }
      })();
      return () => { cancelled = true; };
    }
  }, [airdrop?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!airdrop) return null;

  const accept = () => {
    sfx.toggleOn();
    setPhase("receiving");
    set({ airdrop: { ...airdrop, phase: "receiving", progress: 0 } });
  };
  const decline = () => {
    sfx.toggleOff();
    if (airdrop.url) URL.revokeObjectURL(airdrop.url);
    setError("");
    set({ airdrop: null });
  };

  return (
    <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/40 backdrop-blur-md" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className="rounded-3xl bg-ios-material p-6 text-ios-label shadow-2xl backdrop-blur-xl" style={{ width: 320, animation: "popIn 0.3s cubic-bezier(0.34, 1.4, 0.4, 1) both" }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, #0a84ff, #5ac8fa)" }}>
            {airdrop.type === "image" ? <ImageIcon size={26} className="text-white" /> : <FileText size={26} className="text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-semibold">{airdrop.name}</div>
            <div className="text-[13px] text-ios-label2">AirDrop · {airdrop.size}</div>
          </div>
        </div>

        {phase === "incoming" && (
          <>
            <div className="mb-4 text-[14px] text-ios-label2">
              Import this local {airdrop.type === "image" ? "photo" : "file"} into the simulator? This is not Apple AirDrop.
            </div>
            <div className="flex gap-2">
              <button onClick={decline} className="flex-1 rounded-xl bg-ios-fill py-2.5 text-[15px] font-semibold text-ios-label" style={{ background: "var(--ios-fill)" }}>
                Decline
              </button>
              <button onClick={accept} className="flex-1 rounded-xl bg-ios-blue py-2.5 text-[15px] font-semibold text-white" style={{ background: "var(--ios-blue)" }}>
                Accept
              </button>
            </div>
          </>
        )}

        {phase === "receiving" && (
          <div className="py-2 text-center">
            <div className="mb-2 text-[15px] font-medium text-ios-label2">Receiving…</div>
            <div className="mx-auto h-1.5 w-full overflow-hidden rounded-full bg-ios-fill2" style={{ background: "var(--ios-fill2)" }}>
              <div className="h-full rounded-full bg-ios-blue transition-all duration-150" style={{ width: `${airdrop.progress}%`, background: "var(--ios-blue)" }} />
            </div>
            <div className="mt-2 text-[12px] tabular-nums text-ios-label2">{Math.round(airdrop.progress)}%</div>
          </div>
        )}

        {phase === "done" && (
          <div className="py-2 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ios-green" style={{ background: "var(--ios-green)" }}>
              <Check size={28} className="text-white" strokeWidth={3} />
            </div>
            <div className="text-[15px] font-semibold">{error ? "Import unavailable" : "Saving to Files…"}</div>
            <div className="text-[12px] text-ios-label2">{error || "Stored locally in this browser"}</div>
            {error && <button className="mt-3 text-ios-blue" onClick={decline}>Close</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Drag-and-drop AirDrop target — covers the whole screen when files are dragged in. */
export function AirDropDropZone() {
  const [dragging, setDragging] = useState(false);
  const set = useOS((s) => s.set);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      // Only count leaving the window
      if (e.relatedTarget === null) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      const f = files[0];
      const url = URL.createObjectURL(f);
      set({ airdrop: { name: f.name, size: `${(f.size / 1024 / 1024).toFixed(2)} MB`, type: f.type.startsWith("image/") ? "image" : "file", url, progress: 0, phase: "incoming" } });
      sfx.pop();
    };
    const onOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onOver);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onOver);
    };
  }, [set]);

  if (!dragging) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ios-blue/30 backdrop-blur-xl" style={{ pointerEvents: "none" }}>
      <div className="rounded-3xl border-4 border-dashed border-white p-12 text-center text-white" style={{ animation: "popIn 0.2s ease-out" }}>
        <Download size={56} className="mx-auto mb-3" />
        <div className="text-[20px] font-bold" style={{ letterSpacing: "-0.018em" }}>Drop to AirDrop</div>
        <div className="mt-1 text-[14px] text-white/70">Files will be imported into local Files storage</div>
      </div>
    </div>
  );
}
