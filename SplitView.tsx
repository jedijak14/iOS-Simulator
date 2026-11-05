import { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { useOS } from "./store";
import { useSpec } from "./device-context";
import { APPS } from "./registry";
import { sfx } from "./sound";

/** Split View — two apps side-by-side, with a draggable divider. */
export function SplitView() {
  const splitView = useOS((s) => s.splitView);
  const set = useOS((s) => s.set);
  const spec = useSpec();
  const [ratio, setRatio] = useState(0.5);
  const [dragging, setDragging] = useState(false);

  if (!splitView) return null;
  const Left = APPS[splitView.left]?.Comp;
  const Right = APPS[splitView.right]?.Comp;
  if (!Left || !Right) return null;

  const leftW = spec.w * ratio;
  const rightW = spec.w * (1 - ratio) - 6; // 6px divider

  const onDividerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const scale = useOS.getState().scale || 1;
    const x = (e.clientX - rect.left) / scale;
    const r = Math.max(0.25, Math.min(0.75, x / spec.w));
    setRatio(r);
  };

  const swap = () => {
    sfx.swipe();
    set({ splitView: { left: splitView.right, right: splitView.left } });
  };

  return (
    <div className="absolute inset-0 z-[20] flex bg-ios-bg" style={{ animation: "fadeIn 0.25s ease-out" }} data-split-view>
      {/* left app */}
      <div className="relative overflow-hidden" style={{ width: leftW }}>
        <Left />
      </div>
      {/* divider */}
      <div
        className="relative flex w-[6px] cursor-ew-resize items-center justify-center bg-ios-sep"
        style={{ background: "var(--ios-sep)" }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
          sfx.tick();
        }}
        onPointerMove={onDividerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="h-[40px] w-[3px] rounded-full bg-ios-label3" />
      </div>
      {/* right app */}
      <div className="relative overflow-hidden" style={{ width: rightW }}>
        <Right />
      </div>

      {/* floating control bar */}
      <div className="absolute right-2 top-2 z-50 flex gap-1.5 rounded-full bg-ios-material p-1 shadow-lg backdrop-blur-xl" style={{ top: "calc(var(--safe-top) + 4px)" }}>
        <button onClick={swap} className="flex h-7 w-7 items-center justify-center rounded-full text-ios-blue active:bg-ios-fill" title="Swap apps">
          <ArrowLeftRight size={14} />
        </button>
        <button onClick={() => set({ splitView: null })} className="flex h-7 w-7 items-center justify-center rounded-full text-ios-red active:bg-ios-fill" title="Exit Split View">
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
