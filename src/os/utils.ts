export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, "0");

export function fmtClock(sec: number, hundredths = false) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const base = h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  if (!hundredths) return base;
  return `${base}.${pad(Math.floor((s * 100) % 100))}`;
}

export function fmtTime(d: Date, use24: boolean, withAmPm = true) {
  const h = d.getHours();
  const m = pad(d.getMinutes());
  if (use24) return `${pad(h)}:${m}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${withAmPm ? ` ${h >= 12 ? "PM" : "AM"}` : ""}`;
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function relTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 45_000) return "now";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const toF = (c: number) => (c * 9) / 5 + 32;

export function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export const photoUrl = (id: number, w = 600, h = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;
