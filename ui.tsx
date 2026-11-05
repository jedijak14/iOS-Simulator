import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, ChevronLeft, ChevronRight, Search, X, type LucideIcon } from "lucide-react";
import { useOS } from "./store";
import { clamp, cx, initials } from "./utils";

/* ------------------------------------------------------------------ */
/* Scrolling with mouse-drag + inertia (touch uses native scrolling)    */
/* ------------------------------------------------------------------ */

type ScrollProps = {
  className?: string;
  style?: CSSProperties;
  axis?: "y" | "x";
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  children?: ReactNode;
};

export const ScrollView = forwardRef<HTMLDivElement, ScrollProps>(function ScrollView(
  { className, style, axis = "y", onScroll, children },
  fwd,
) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(fwd, () => ref.current as HTMLDivElement);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let dragging = false;
    let sx = 0,
      sy = 0,
      sl = 0,
      st = 0,
      lx = 0,
      ly = 0,
      lt = 0,
      vx = 0,
      vy = 0,
      pid = -1,
      raf = 0;
    const scale = () => useOS.getState().scale || 1;
    const canScroll = () =>
      axis === "y" ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      const ev = e as PointerEvent & { __claimed?: boolean };
      if (ev.__claimed) return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[data-nodrag],[contenteditable=true]")) return;
      if (!canScroll()) return;
      ev.__claimed = true;
      cancelAnimationFrame(raf);
      down = true;
      dragging = false;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
      sl = el.scrollLeft;
      st = el.scrollTop;
      lt = performance.now();
      vx = vy = 0;
      pid = e.pointerId;
    };
    const onMove = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      const s = scale();
      const dx = (e.clientX - sx) / s;
      const dy = (e.clientY - sy) / s;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 6) return;
        const horiz = Math.abs(dx) > Math.abs(dy);
        if ((axis === "y" && horiz) || (axis === "x" && !horiz)) {
          down = false;
          return;
        }
        dragging = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (axis === "y") el.scrollTop = st - dy;
      else el.scrollLeft = sl - dx;
      const now = performance.now();
      const dt = Math.max(1, now - lt);
      vx = (lx - e.clientX) / s / dt;
      vy = (ly - e.clientY) / s / dt;
      lt = now;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== pid) return;
      down = false;
      if (!dragging) return;
      dragging = false;
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, true), 50);
      if (performance.now() - lt > 80) return;
      const step = () => {
        vx *= 0.95;
        vy *= 0.95;
        if (axis === "y") el.scrollTop += vy * 16;
        else el.scrollLeft += vx * 16;
        if (Math.abs(axis === "y" ? vy : vx) > 0.02) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [axis]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={cx("hide-scroll", axis === "y" ? "overflow-y-auto overflow-x-hidden" : "overflow-x-auto overflow-y-hidden", className)}
      style={style}
    >
      {children}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Generic helpers                                                      */
/* ------------------------------------------------------------------ */

export function useScale() {
  return useOS((s) => s.scale);
}

export function useLongPress(cb: (e: React.PointerEvent) => void, ms = 480) {
  const t = useRef<number>(0);
  const start = useRef({ x: 0, y: 0 });
  const fired = useRef(false);
  const clear = () => window.clearTimeout(t.current);
  return {
    fired,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        clear();
        t.current = window.setTimeout(() => {
          fired.current = true;
          cb(e);
        }, ms);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear();
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onPointerLeave: clear,
    },
  };
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cx("spin h-5 w-5 rounded-full border-2 border-ios-label3 border-t-ios-label2", className)}
      role="progressbar"
    />
  );
}

export function Avatar({ name, hue = 210, size = 40, icon }: { name: string; hue?: number; size?: number; icon?: ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(180deg, hsl(${hue} 70% 68%), hsl(${hue} 60% 50%))`,
      }}
    >
      {icon ?? initials(name)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation chrome                                                    */
/* ------------------------------------------------------------------ */

export function NavBtn({
  children,
  onClick,
  bold,
  disabled,
  color,
}: {
  children: ReactNode;
  onClick?: () => void;
  bold?: boolean;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex h-[44px] items-center gap-0.5 text-[17px] active:opacity-40 disabled:opacity-40",
        bold && "font-semibold",
        !color && "text-ios-blue",
      )}
      style={color ? { color } : undefined}
    >
      {children}
    </button>
  );
}

export function BackBtn({ label, onClick }: { label?: string; onClick: () => void }) {
  return (
    <NavBtn onClick={onClick}>
      <ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" />
      <span className="-ml-1">{label ?? "Back"}</span>
    </NavBtn>
  );
}

interface PageProps {
  title?: string;
  large?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  bg?: string;
  noPad?: boolean;
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: (y: number) => void;
  subtitle?: ReactNode;
  transparentBar?: boolean;
  className?: string;
  below?: ReactNode;
}

export function Page({
  title,
  large = true,
  left,
  right,
  children,
  footer,
  bg = "bg-ios-grouped",
  scrollRef,
  onScroll,
  noPad,
  subtitle,
  className,
  below,
}: PageProps) {
  const [y, setY] = useState(0);
  const small = !large;
  const titleOp = small ? 1 : clamp((y - 28) / 16, 0, 1);
  const barOp = small ? (y > 2 ? 1 : 0) : y > 36 ? 1 : 0;
  return (
    <div className={cx("relative flex h-full flex-col overflow-hidden text-ios-label", bg, className)}>
      <div className="absolute inset-x-0 top-0 z-20" style={{ height: "calc(var(--safe-top) + 44px)" }}>
        <div
          className="glass absolute inset-0 transition-opacity duration-200"
          style={{ opacity: barOp, borderBottom: "0.5px solid var(--ios-sep)" }}
        />
        <div className="absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-between px-4">
          <div className="z-10 flex min-w-[70px] items-center justify-start">{left}</div>
          <div
            className="pointer-events-none absolute inset-x-[80px] flex flex-col items-center text-center"
            style={{ opacity: titleOp }}
          >
            <span className="truncate text-[17px] font-semibold" style={{ letterSpacing: "-0.012em" }}>{title}</span>
            {subtitle}
          </div>
          <div className="z-10 flex min-w-[70px] items-center justify-end gap-4">{right}</div>
        </div>
      </div>
      <ScrollView
        ref={scrollRef}
        className="min-h-0 flex-1"
        onScroll={(e) => {
          const v = (e.target as HTMLDivElement).scrollTop;
          setY(v);
          onScroll?.(v);
        }}
      >
        <div style={{ height: "calc(var(--safe-top) + 44px)" }} />
        {large && title && <h1 className="px-4 pb-2 pt-0.5 text-[34px] font-bold leading-[41px]" style={{ letterSpacing: "-0.022em" }}>{title}</h1>}
        {children}
        {!noPad && <div style={{ height: "calc(var(--safe-bottom) + 28px)" }} />}
      </ScrollView>
      {below}
      {footer}
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  dark,
  badge,
}: {
  tabs: { id: T; label: string; icon: LucideIcon; fill?: boolean }[];
  value: T;
  onChange: (t: T) => void;
  dark?: boolean;
  badge?: Partial<Record<T, number>>;
}) {
  return (
    <div
      className={cx("glass relative z-20 shrink-0", dark && "!bg-black/70")}
      style={{ borderTop: "0.5px solid var(--ios-sep)", paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex h-[49px] items-center justify-around px-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const on = t.id === value;
          const b = badge?.[t.id];
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cx("relative flex flex-1 flex-col items-center gap-[1px] pt-1", on ? "text-ios-blue" : "text-ios-gray")}
            >
              <Icon size={24} strokeWidth={on ? 2.4 : 1.8} fill={on && t.fill ? "currentColor" : "none"} />
              <span className="text-[10px] font-medium">{t.label}</span>
              {!!b && (
                <span className="absolute right-[22%] top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-ios-red px-1 text-[11px] font-medium text-white">
                  {b}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                                */
/* ------------------------------------------------------------------ */

export function Group({
  header,
  footer,
  children,
  className,
  flat,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  flat?: boolean;
}) {
  return (
    <section className={cx("mb-6 px-4", className)}>
      {header && <div className="px-4 pb-1.5 text-[13px] uppercase text-ios-label2">{header}</div>}
      <div className={cx("overflow-hidden rounded-[10px]", !flat && "bg-ios-cell")}>{children}</div>
      {footer && <div className="px-4 pt-1.5 text-[13px] leading-[18px] text-ios-label2">{footer}</div>}
    </section>
  );
}

export function IconBadge({ icon: Icon, bg, size = 29 }: { icon: LucideIcon; bg: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[7px] text-white"
      style={{ width: size, height: size, background: bg }}
    >
      <Icon size={size * 0.62} strokeWidth={2} />
    </div>
  );
}

export function Row({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  chevron,
  onClick,
  right,
  destructive,
  check,
  leading,
  className,
  titleClass,
  minH = 44,
}: {
  icon?: LucideIcon;
  iconBg?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  check?: boolean;
  leading?: ReactNode;
  className?: string;
  titleClass?: string;
  minH?: number;
}) {
  const hasLead = !!icon || !!leading;
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={cx("ios-row flex items-center gap-3 px-4 py-[6px] text-[17px]", onClick && "active:bg-ios-fill", className)}
      style={{ minHeight: minH, ["--sep-left" as string]: hasLead ? (icon ? "60px" : "68px") : "16px" }}
    >
      {icon && iconBg && <IconBadge icon={icon} bg={iconBg} />}
      {leading}
      <div className="min-w-0 flex-1 py-[3px]">
        <div className={cx("truncate", destructive && "text-ios-red", titleClass)}>{title}</div>
        {subtitle && <div className="truncate text-[13px] leading-[18px] text-ios-label2">{subtitle}</div>}
      </div>
      {value !== undefined && <div className="max-w-[55%] truncate text-ios-label2">{value}</div>}
      {right}
      {check && <Check size={20} strokeWidth={2.6} className="text-ios-blue" />}
      {chevron && <ChevronRight size={20} strokeWidth={2.4} className="-mr-1 shrink-0 text-ios-label3" />}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          // import inline to avoid cycle
          import("./sound").then(({ sfx }) => (on ? sfx.toggleOff() : sfx.toggleOn()));
        }
        onChange(!on);
      }}
      className={cx("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200", disabled && "opacity-50")}
      style={{ background: on ? "var(--ios-green)" : "var(--ios-fill2)" }}
    >
      <span
        className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] transition-transform duration-200"
        style={{ transform: `translateX(${on ? 20 : 0}px)` }}
      />
    </button>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  left,
  right,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-ios-label2">
      {left}
      <input
        data-nodrag
        type="range"
        className="ios-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--p" as string]: `${p}%` }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {right}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className={cx("relative flex h-[32px] rounded-[9px] bg-ios-fill p-[2px]", className)}>
      <div
        className="absolute bottom-[2px] top-[2px] rounded-[7px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] transition-all duration-200 dark:bg-[#636366]"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          left: `calc(2px + ${idx} * (100% - 4px) / ${options.length})`,
          background: "var(--seg, #fff)",
        }}
      />
      {options.map((o) => (
        <button
          key={String(o.id)}
          onClick={() => onChange(o.id)}
          className={cx("relative z-10 flex-1 text-[13px]", o.id === value ? "font-semibold" : "font-medium")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  onSubmit,
  autoFocus,
  className,
  hint = "search",
  onFocus,
  onBlur,
  inputRef,
  dark,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
  hint?: "search" | "go" | "done";
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  dark?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex h-[36px] items-center gap-1.5 rounded-[10px] px-2",
        dark ? "bg-white/15 text-white" : "bg-ios-fill2/60 text-ios-label2",
        className,
      )}
      style={dark ? undefined : { background: "var(--ios-fill)" }}
    >
      <Search size={17} strokeWidth={2.4} className="shrink-0 opacity-70" />
      <input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        enterKeyHint={hint}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder={placeholder}
        className={cx("min-w-0 flex-1 bg-transparent text-[17px] outline-none", dark ? "text-white" : "text-ios-label")}
      />
      {value && (
        <button onClick={() => onChange("")} className="shrink-0 opacity-60">
          <X size={16} strokeWidth={3} className="rounded-full bg-current p-[3px] text-ios-label3" style={{ color: "var(--ios-label3)" }} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet                                                                */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  children,
  full,
  bg = "bg-ios-grouped",
  height,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
  bg?: string;
  height?: number | string;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [dy, setDy] = useState(0);
  const drag = useRef<{ y: number } | null>(null);
  const scale = useScale();
  useEffect(() => {
    if (open) {
      setMounted(true);
      setDy(0);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(t);
  }, [open]);
  if (!mounted) return null;
  return (
    <div className="absolute inset-0 z-40">
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: shown ? 0.35 : 0 }}
        onClick={onClose}
      />
      <div
        className={cx("absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[12px] text-ios-label shadow-2xl", bg)}
        style={{
          height: height ?? (full ? "calc(100% - var(--safe-top) - 10px)" : "calc(100% - var(--safe-top) - 10px)"),
          transform: `translateY(${shown ? dy : 100}${shown ? "px" : "%"})`,
          transition: drag.current ? "none" : "transform 0.5s cubic-bezier(0.34, 1.3, 0.4, 1)",
        }}
      >
        <div
          className="absolute inset-x-0 top-0 z-30 flex h-6 cursor-grab justify-center pt-1.5"
          onPointerDown={(e) => {
            drag.current = { y: e.clientY };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (drag.current) setDy(Math.max(0, (e.clientY - drag.current.y) / scale));
          }}
          onPointerUp={() => {
            const d = dy;
            drag.current = null;
            if (d > 100) onClose();
            else setDy(0);
          }}
        >
          <div className="h-[5px] w-9 rounded-full bg-ios-label3" />
        </div>
        <div className="relative min-h-0 flex-1" style={{ ["--safe-top" as string]: "0px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wheel picker (drag, wheel, touch)                                    */
/* ------------------------------------------------------------------ */

export function WheelPicker({
  items,
  value,
  onChange,
  loop = false,
  width = 70,
  align = "center",
  light,
}: {
  items: string[];
  value: number;
  onChange: (v: number) => void;
  loop?: boolean;
  width?: number;
  align?: "center" | "right" | "left";
  light?: boolean;
}) {
  const n = items.length;
  const IH = 34;
  const [pos, setPos] = useState(value);
  const posRef = useRef(value);
  const [dragging, setDragging] = useState(false);
  const st = useRef({ y: 0, p: 0, id: -1 });
  const wheelT = useRef(0);
  const el = useRef<HTMLDivElement>(null);
  const scale = useScale();
  const mod = useCallback((p: number) => ((Math.round(p) % n) + n) % n, [n]);
  const setP = (p: number) => {
    posRef.current = p;
    setPos(p);
  };
  const snap = useCallback(() => {
    const t = loop ? Math.round(posRef.current) : clamp(Math.round(posRef.current), 0, n - 1);
    posRef.current = t;
    setPos(t);
    onChange(loop ? mod(t) : t);
  }, [loop, n, mod, onChange]);

  useEffect(() => {
    const cur = loop ? mod(posRef.current) : clamp(Math.round(posRef.current), 0, n - 1);
    if (cur !== value) {
      let target = value;
      if (loop) {
        const c = Math.round(posRef.current);
        const base = c - (((c % n) + n) % n);
        target = base + value;
        if (target - c > n / 2) target -= n;
        if (c - target > n / 2) target += n;
      }
      posRef.current = target;
      setPos(target);
    }
  }, [value, loop, n, mod]);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let p = posRef.current + e.deltaY / 60;
      if (!loop) p = clamp(p, -0.4, n - 0.6);
      setP(p);
      window.clearTimeout(wheelT.current);
      wheelT.current = window.setTimeout(snap, 120);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [loop, n, snap]);

  const rendered: ReactNode[] = [];
  const base = Math.round(pos);
  for (let k = base - 4; k <= base + 4; k++) {
    if (!loop && (k < 0 || k >= n)) continue;
    const d = k - pos;
    const idx = loop ? ((k % n) + n) % n : k;
    rendered.push(
      <div
        key={k}
        className="absolute left-0 right-0 flex items-center text-[23px]"
        style={{
          top: `calc(50% - ${IH / 2}px)`,
          height: IH,
          justifyContent: align === "right" ? "flex-end" : align === "left" ? "flex-start" : "center",
          paddingRight: align === "right" ? 8 : 0,
          transform: `translateY(${d * IH}px) rotateX(${clamp(-d * 24, -70, 70)}deg) scale(${1 - Math.min(Math.abs(d), 3) * 0.06})`,
          opacity: Math.max(0.12, 1 - Math.abs(d) * 0.3),
          fontWeight: Math.abs(d) < 0.5 ? 500 : 400,
          color: light ? "#fff" : undefined,
        }}
      >
        {items[idx]}
      </div>,
    );
  }
  return (
    <div
      ref={el}
      data-nodrag
      className="relative cursor-grab overflow-hidden"
      style={{ width, height: IH * 5, perspective: 420, touchAction: "none" }}
      onPointerDown={(e) => {
        st.current = { y: e.clientY, p: posRef.current, id: e.pointerId };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        let p = st.current.p - (e.clientY - st.current.y) / scale / IH;
        if (!loop) p = clamp(p, -0.4, n - 0.6);
        setP(p);
      }}
      onPointerUp={() => {
        setDragging(false);
        snap();
      }}
      onPointerCancel={() => {
        setDragging(false);
        snap();
      }}
    >
      {rendered}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Swipe-to-reveal row                                                  */
/* ------------------------------------------------------------------ */

export function SwipeRow({
  children,
  actions,
  className,
  bg = "var(--ios-cell)",
}: {
  children: ReactNode;
  actions: { label: string; color: string; onPress: () => void }[];
  className?: string;
  bg?: string;
}) {
  const W = 78 * actions.length;
  const [x, setX] = useState(0);
  const [anim, setAnim] = useState(true);
  const s = useRef({ x0: 0, y0: 0, base: 0, active: false, moved: false, id: -1 });
  const scale = useScale();
  return (
    <div className={cx("relative overflow-hidden", className)}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width: W }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => {
              setX(0);
              a.onPress();
            }}
            className="flex-1 text-[15px] font-medium text-white"
            style={{ background: a.color }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div
        className="relative bg-ios-cell"
        style={{
          transform: `translateX(${x}px)`,
          transition: anim ? "transform 0.28s cubic-bezier(0.2,0.8,0.2,1)" : "none",
          touchAction: "pan-y",
          background: bg,
        }}
        onPointerDown={(e) => {
          s.current = { x0: e.clientX, y0: e.clientY, base: x, active: true, moved: false, id: e.pointerId };
        }}
        onPointerMove={(e) => {
          const c = s.current;
          if (!c.active || e.pointerId !== c.id) return;
          const dx = (e.clientX - c.x0) / scale;
          const dy = (e.clientY - c.y0) / scale;
          if (!c.moved) {
            if (Math.hypot(dx, dy) < 8) return;
            if (Math.abs(dy) > Math.abs(dx)) {
              c.active = false;
              return;
            }
            c.moved = true;
            setAnim(false);
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
          }
          setX(clamp(c.base + dx, -W * 1.6, 0));
        }}
        onPointerUp={() => {
          const c = s.current;
          if (!c.active) return;
          c.active = false;
          setAnim(true);
          if (c.moved) {
            const stop = (ev: Event) => {
              ev.stopPropagation();
              ev.preventDefault();
            };
            window.addEventListener("click", stop, { capture: true, once: true });
            setTimeout(() => window.removeEventListener("click", stop, true), 50);
            if (x < -W * 1.35) {
              actions[actions.length - 1].onPress();
              setX(0);
            } else setX(x < -W / 2 ? -W : 0);
          }
        }}
        onClickCapture={(e) => {
          if (x !== 0) {
            e.stopPropagation();
            setX(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                 */
/* ------------------------------------------------------------------ */

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center px-10 py-20 text-center text-ios-label2">
      <Icon size={48} strokeWidth={1.4} className="mb-3 opacity-60" />
      <div className="text-[20px] font-semibold text-ios-label">{title}</div>
      {text && <div className="mt-1 text-[15px]">{text}</div>}
    </div>
  );
}

export function PillButton({
  children,
  onClick,
  color = "var(--ios-blue)",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx("rounded-full px-4 py-[5px] text-[15px] font-semibold text-white active:opacity-70 disabled:opacity-40", className)}
      style={{ background: color }}
    >
      {children}
    </button>
  );
}

export function useTick(ms: number, active = true) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

export function openLink(url: string) {
  useOS.getState().openApp("safari");
  window.dispatchEvent(new CustomEvent("safari-open", { detail: url }));
}

export { React };
