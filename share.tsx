import { useState, useEffect } from "react";
import { Check, Clipboard, FileText, MessageCircle, Mail as MailIcon, NotebookPen, Image as ImageIcon, Airplay, SquarePen, X } from "lucide-react";
import { useOS } from "./store";
import { useData, patchData, newId } from "./data";
import { sfx } from "./sound";

export interface SharePayload {
  /** Plain text content */
  text?: string;
  /** Optional title/subject for email/messages */
  subject?: string;
  /** Optional image URL (Pexels-style) */
  image?: string;
  /** Optional source app id for "Add to <app>" row */
  sourceApp?: string;
}

type Target = "copy" | "messages" | "mail" | "notes" | "photos" | "reminders" | "airdrop";

const TARGETS: { id: Target; label: string; icon: typeof MailIcon; bg: string }[] = [
  { id: "airdrop", label: "AirDrop", icon: Airplay, bg: "#007aff" },
  { id: "messages", label: "Messages", icon: MessageCircle, bg: "#34c759" },
  { id: "mail", label: "Mail", icon: MailIcon, bg: "#0a84ff" },
  { id: "notes", label: "Notes", icon: SquarePen, bg: "#ffcc00" },
  { id: "reminders", label: "Reminders", icon: NotebookPen, bg: "#ff9500" },
  { id: "photos", label: "Photos", icon: ImageIcon, bg: "#ff2d55" },
  { id: "copy", label: "Copy", icon: Clipboard, bg: "#8e8e93" },
];

export function share(payload: SharePayload) {
  useOS.getState().set({ shareSheet: payload });
}

export function ShareSheet() {
  const payload = useOS((s) => s.shareSheet);
  const set = useOS((s) => s.set);
  const open = useOS((s) => s.openApp);
  const close = () => set({ shareSheet: null });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!payload) setCopied(false);
  }, [payload]);

  if (!payload) return null;
  const text = payload.text ?? "";
  const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;

  const run = (t: Target) => {
    sfx.pop();
    switch (t) {
      case "copy":
        try {
          navigator.clipboard?.writeText(text);
        } catch {
          /* ignore */
        }
        setCopied(true);
        setTimeout(close, 700);
        return;
      case "airdrop":
        useOS.getState().showToast("Looking for nearby devices…");
        setTimeout(() => useOS.getState().showToast("No nearby devices found"), 1500);
        return;
      case "messages":
        close();
        open("messages");
        // create a thread with the shared text as outgoing
        setTimeout(() => {
          const threads = useData.getState().threads;
          // Reuse a stub "Notes" thread with a 1-tap "Saved Link" contact
          let thread = threads.find((x) => x.id === "t-share");
          if (!thread) {
            thread = { id: "t-share", members: [], name: "Saved Links", unread: 0, msgs: [] };
            patchData((s) => ({ threads: [...s.threads, thread!] }));
          }
          patchData((s) => ({
            threads: s.threads.map((th) =>
              th.id === "t-share"
                ? { ...th, msgs: [...th.msgs, { id: newId(), from: "me", text: payload.subject ? `${payload.subject}\n${text}` : text, at: Date.now() }] }
                : th,
            ),
          }));
        }, 80);
        return;
      case "mail":
        close();
        open("mail");
        setTimeout(() => {
          patchData((s) => ({
            mails: [
              { id: newId(), from: "me", email: "you@icloud.com", to: "", subject: payload.subject ?? "Shared", body: text, at: Date.now(), read: true, flagged: false, box: "drafts" as const },
              ...s.mails,
            ],
          }));
        }, 80);
        return;
      case "notes":
        close();
        open("notes");
        setTimeout(() => {
          patchData((s) => ({
            notes: [{ id: newId(), text: (payload.subject ? payload.subject + "\n" : "") + text, at: Date.now(), pinned: false, folder: "Notes" }, ...s.notes],
          }));
        }, 80);
        return;
      case "reminders":
        close();
        open("reminders");
        setTimeout(() => {
          patchData((s) => ({
            reminders: [{ id: newId(), listId: "l1", text: text.split("\n")[0].slice(0, 80), done: false, flag: false }, ...s.reminders],
          }));
        }, 80);
        return;
      case "photos":
        if (payload.image) {
          patchData((s) => ({ photos: [{ id: newId(), src: payload.image!, at: Date.now(), fav: false, kind: "photo" as const }, ...s.photos] }));
          useOS.getState().showToast("Saved to Photos");
        } else {
          useOS.getState().showToast("Nothing to save");
        }
        close();
        return;
    }
  };

  return (
    <div className="absolute inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-2 pb-[calc(var(--safe-bottom)+8px)]" style={{ animation: "ios-sheet-up 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        {/* Preview card */}
        <div className="flex w-full max-w-[360px] items-center gap-3 rounded-2xl bg-ios-cell px-3 py-2.5 shadow-xl">
          {payload.image ? (
            <img src={payload.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ios-fill2 text-ios-label2">
              <FileText size={22} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {payload.subject && <div className="truncate text-[15px] font-semibold">{payload.subject}</div>}
            <div className="truncate text-[13px] text-ios-label2">{preview || "No content"}</div>
          </div>
          <button onClick={close} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-ios-fill2 text-ios-label2">
            <X size={15} strokeWidth={3} />
          </button>
        </div>

        {/* Targets */}
        <div className="w-full max-w-[360px] rounded-2xl bg-ios-cell p-3 shadow-xl">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {TARGETS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => run(t.id)}
                  className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 active:scale-95"
                >
                  <div
                    className="flex h-[58px] w-[58px] items-center justify-center rounded-[14px] text-white shadow-sm"
                    style={{ background: t.bg }}
                  >
                    {copied && t.id === "copy" ? <Check size={26} strokeWidth={3} /> : <Icon size={26} />}
                  </div>
                  <span className="text-[11px] text-ios-label">{copied && t.id === "copy" ? "Copied" : t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={close}
          className="w-full max-w-[360px] rounded-2xl bg-ios-cell py-3.5 text-[17px] font-semibold text-ios-blue shadow-xl active:opacity-60"
        >
          Close
        </button>
      </div>
      <style>{`@keyframes ios-sheet-up{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
