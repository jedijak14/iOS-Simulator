import { useEffect, useReducer } from "react";
import { Delete } from "lucide-react";
import { useOS } from "../os/store";

type Op = "+" | "-" | "×" | "÷";
interface CalcState {
  cur: string;
  acc: number | null;
  op: Op | null;
  fresh: boolean;
  last: { op: Op; v: number } | null;
}
type Action =
  | { t: "digit"; d: string }
  | { t: "dot" }
  | { t: "op"; o: Op }
  | { t: "equals" }
  | { t: "clear" }
  | { t: "neg" }
  | { t: "pct" }
  | { t: "back" };

const INIT: CalcState = { cur: "0", acc: null, op: null, fresh: true, last: null };

function fmt(s: string) {
  if (s === "Error") return s;
  const neg = s.startsWith("-");
  const raw = neg ? s.slice(1) : s;
  if (raw.includes("e")) return s;
  const [i, d] = raw.split(".");
  const ip = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + ip + (d !== undefined ? "." + d : "");
}

function num2str(n: number) {
  if (!isFinite(n)) return "Error";
  let s = String(+n.toPrecision(9));
  if (s.includes("e") && Math.abs(n) < 1e15 && Math.abs(n) > 1e-6) s = n.toFixed(8).replace(/\.?0+$/, "");
  return s;
}

const calc = (a: number, o: Op, b: number) => (o === "+" ? a + b : o === "-" ? a - b : o === "×" ? a * b : b === 0 ? NaN : a / b);

function reduce(s: CalcState, a: Action): CalcState {
  switch (a.t) {
    case "digit":
      if (s.fresh || s.cur === "Error") return { ...s, cur: a.d, fresh: false };
      if (s.cur.replace(/[-.]/g, "").length >= 9) return s;
      return { ...s, cur: s.cur === "0" ? a.d : s.cur + a.d };
    case "dot":
      if (s.fresh || s.cur === "Error") return { ...s, cur: "0.", fresh: false };
      return s.cur.includes(".") ? s : { ...s, cur: s.cur + "." };
    case "op": {
      const v = parseFloat(s.cur);
      if (s.acc !== null && s.op && !s.fresh) {
        const r = calc(s.acc, s.op, v);
        return { cur: num2str(r), acc: r, op: a.o, fresh: true, last: null };
      }
      return { ...s, acc: isNaN(v) ? 0 : v, op: a.o, fresh: true, last: null };
    }
    case "equals": {
      const v = parseFloat(s.cur);
      if (s.acc !== null && s.op) {
        return { cur: num2str(calc(s.acc, s.op, v)), acc: null, op: null, fresh: true, last: { op: s.op, v } };
      }
      if (s.last) return { ...s, cur: num2str(calc(v, s.last.op, s.last.v)), fresh: true };
      return s;
    }
    case "clear":
      if (s.cur !== "0" && !s.fresh) return { ...s, cur: "0", fresh: true };
      return INIT;
    case "neg":
      return s.cur === "0" || s.cur === "Error" ? s : { ...s, cur: s.cur.startsWith("-") ? s.cur.slice(1) : "-" + s.cur };
    case "pct":
      return { ...s, cur: num2str(parseFloat(s.cur) / 100), fresh: true };
    case "back":
      if (s.fresh || s.cur === "Error") return s;
      return { ...s, cur: s.cur.length <= 1 || (s.cur.length === 2 && s.cur.startsWith("-")) ? "0" : s.cur.slice(0, -1) };
  }
}

export default function CalculatorApp() {
  const [s, dispatch] = useReducer(reduce, INIT);
  const fg = useOS((st) => st.foreground);

  useEffect(() => {
    if (fg !== "calculator") return;
    const f = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) dispatch({ t: "digit", d: e.key });
      else if (e.key === ".") dispatch({ t: "dot" });
      else if (e.key === "+") dispatch({ t: "op", o: "+" });
      else if (e.key === "-") dispatch({ t: "op", o: "-" });
      else if (e.key === "*" || e.key === "x") dispatch({ t: "op", o: "×" });
      else if (e.key === "/") dispatch({ t: "op", o: "÷" });
      else if (e.key === "Enter" || e.key === "=") dispatch({ t: "equals" });
      else if (e.key === "Backspace") dispatch({ t: "back" });
      else if (e.key.toLowerCase() === "c") dispatch({ t: "clear" });
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [fg]);

  const text = fmt(s.cur);
  const size = text.length > 12 ? 44 : text.length > 9 ? 56 : text.length > 7 ? 68 : 84;
  const active = (o: Op) => s.op === o && s.fresh;

  const Btn = ({ label, onClick, kind = "num", wide, on }: { label: React.ReactNode; onClick: () => void; kind?: "num" | "fn" | "op"; wide?: boolean; on?: boolean }) => {
    const bg = kind === "op" ? (on ? "#fff" : "#ff9f0a") : kind === "fn" ? "#a5a5a5" : "#333333";
    const color = kind === "op" ? (on ? "#ff9f0a" : "#fff") : kind === "fn" ? "#000" : "#fff";
    return (
      <button
        onClick={onClick}
        className="flex h-[76px] items-center rounded-full text-[34px] transition-[filter,background] duration-100 active:brightness-125"
        style={{ gridColumn: wide ? "span 2" : undefined, background: bg, color, justifyContent: wide ? "flex-start" : "center", paddingLeft: wide ? 30 : 0 }}
      >
        {label}
      </button>
    );
  };
  const digit = (d: string) => () => dispatch({ t: "digit", d });

  return (
    <div className="flex h-full flex-col justify-end bg-black px-4 text-white" style={{ paddingBottom: "calc(var(--safe-bottom) + 10px)" }}>
      <div className="flex items-end justify-end pb-2" style={{ minHeight: 120 }}>
        <div data-calc-display className="select-text font-light leading-none tracking-tight" style={{ fontSize: size }}>
          {text}
        </div>
      </div>
      {s.cur !== "0" && !s.fresh && (
        <button onClick={() => dispatch({ t: "back" })} className="mb-2 self-end text-white/50 active:text-white">
          <Delete size={22} />
        </button>
      )}
      <div className="grid grid-cols-4 gap-3 pb-1" style={{ gridAutoRows: 76 }}>
        <Btn kind="fn" label={s.cur !== "0" && !s.fresh ? "C" : "AC"} onClick={() => dispatch({ t: "clear" })} />
        <Btn kind="fn" label="+/−" onClick={() => dispatch({ t: "neg" })} />
        <Btn kind="fn" label="%" onClick={() => dispatch({ t: "pct" })} />
        <Btn kind="op" label="÷" on={active("÷")} onClick={() => dispatch({ t: "op", o: "÷" })} />
        {["7", "8", "9"].map((d) => (
          <Btn key={d} label={d} onClick={digit(d)} />
        ))}
        <Btn kind="op" label="×" on={active("×")} onClick={() => dispatch({ t: "op", o: "×" })} />
        {["4", "5", "6"].map((d) => (
          <Btn key={d} label={d} onClick={digit(d)} />
        ))}
        <Btn kind="op" label="−" on={active("-")} onClick={() => dispatch({ t: "op", o: "-" })} />
        {["1", "2", "3"].map((d) => (
          <Btn key={d} label={d} onClick={digit(d)} />
        ))}
        <Btn kind="op" label="+" on={active("+")} onClick={() => dispatch({ t: "op", o: "+" })} />
        <Btn wide label="0" onClick={digit("0")} />
        <Btn label="." onClick={() => dispatch({ t: "dot" })} />
        <Btn kind="op" label="=" onClick={() => dispatch({ t: "equals" })} />
      </div>
    </div>
  );
}
