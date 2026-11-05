import { useRef, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Edit3, Flag, Inbox, Mail as MailIcon, Send, SquarePen, Trash2, FileText } from "lucide-react";
import { useOS } from "../os/store";
import { useData, patchData, newId, type Mail } from "../os/data";
import { Avatar, Group, NavBtn, Page, Row, Sheet, SwipeRow } from "../os/ui";
import { relTime } from "../os/utils";
import { useAppAction } from "../os/actions";
import { sfx } from "../os/sound";

type Box = "inbox" | "sent" | "drafts" | "trash" | "flagged" | "unread";

export default function MailApp() {
  const mails = useData((s) => s.mails);
  const [box, setBox] = useState<Box | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const lastBox = useRef<Box>("inbox");
  const lastOpen = useRef<string | null>(null);
  if (box) lastBox.current = box;
  if (openId) lastOpen.current = openId;

  const boxes: { id: Box; name: string; icon: typeof Inbox; color: string; count: number }[] = [
    { id: "inbox", name: "Inbox", icon: Inbox, color: "#007aff", count: mails.filter((m) => m.box === "inbox" && !m.read).length },
    { id: "unread", name: "Unread", icon: MailIcon, color: "#007aff", count: mails.filter((m) => m.box !== "trash" && m.box === "inbox" && !m.read).length },
    { id: "flagged", name: "Flagged", icon: Flag, color: "#ff9500", count: mails.filter((m) => m.flagged && m.box !== "trash").length },
    { id: "drafts", name: "Drafts", icon: FileText, color: "#007aff", count: mails.filter((m) => m.box === "drafts").length },
    { id: "sent", name: "Sent", icon: Send, color: "#007aff", count: 0 },
    { id: "trash", name: "Trash", icon: Trash2, color: "#007aff", count: 0 },
  ];
  const cb = lastBox.current;
  const list = mails
    .filter((m) => (cb === "flagged" ? m.flagged && m.box !== "trash" : cb === "unread" ? !m.read && m.box === "inbox" : m.box === cb))
    .sort((a, b) => b.at - a.at);
  const cur = mails.find((m) => m.id === (openId ?? lastOpen.current));

  const upd = (id: string, p: Partial<Mail>) => patchData((s) => ({ mails: s.mails.map((m) => (m.id === id ? { ...m, ...p } : m)) }));
  const openMail = (id: string) => {
    upd(id, { read: true });
    setOpenId(id);
  };
  const newMail = (toAddr = "") => {
    setTo(toAddr);
    setSubject("");
    setBody("");
    setCompose(true);
  };
  useAppAction("mail", (a) => a === "new" ? newMail() : a.startsWith("to:") && newMail(a.slice(3)));

  const send = () => {
    if (!to.trim()) return useOS.getState().showToast("Add a recipient");
    sfx.send();
    patchData((s) => ({ mails: [{ id: newId(), from: "Me", email: "me@icloud.com", to: to.trim(), subject: subject || "(No Subject)", body, at: Date.now(), read: true, flagged: false, box: "sent" }, ...s.mails] }));
    setCompose(false);
    useOS.getState().showToast("Message sent");
    // a friendly automated reply
    setTimeout(() => {
      const sender = to.trim();
      patchData((s) => ({ mails: [{ id: newId(), from: sender.split("@")[0] || "Mail Delivery", email: sender, subject: "Re: " + (subject || "(No Subject)"), body: "Thanks for your message! I'll get back to you soon.\n\n— Sent from my iPhone", at: Date.now(), read: false, flagged: false, box: "inbox" }, ...s.mails] }));
      useOS.getState().notify({ app: "mail", title: sender.split("@")[0] || "Mail", body: "Re: " + (subject || "(No Subject)") });
    }, 9000);
  };
  const close = () => {
    if (to || subject || body) {
      useOS.getState().showSheet({
        actions: [
          { text: "Delete Draft", style: "destructive", onPress: () => setCompose(false) },
          {
            text: "Save Draft",
            onPress: () => {
              patchData((s) => ({ mails: [{ id: newId(), from: "Me", email: "me@icloud.com", to, subject: subject || "(No Subject)", body, at: Date.now(), read: true, flagged: false, box: "drafts" }, ...s.mails] }));
              setCompose(false);
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      });
    } else setCompose(false);
  };

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      {/* mailboxes */}
      <div className="absolute inset-0" style={{ transform: box ? "translateX(-30%)" : "none", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", filter: box ? "brightness(.92)" : undefined }}>
        <Page title="Mailboxes" left={<NavBtn>Edit</NavBtn>} footer={<Footer onCompose={() => newMail()} text="Updated Just Now" />}>
          <Group>
            {boxes.map((b) => (
              <Row key={b.id} icon={b.icon} iconBg={b.color} title={b.name} value={b.count || undefined} chevron onClick={() => setBox(b.id)} />
            ))}
          </Group>
          <Group header="iCloud">
            <Row icon={Archive} iconBg="#007aff" title="Archive" chevron />
          </Group>
        </Page>
      </div>

      {/* list */}
      <div className="absolute inset-0" style={{ transform: box ? (openId ? "translateX(-30%)" : "none") : "translateX(100%)", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", filter: openId ? "brightness(.92)" : undefined, boxShadow: "-6px 0 18px rgba(0,0,0,.12)" }}>
        <Page
          title={boxes.find((b) => b.id === cb)?.name ?? "Inbox"}
          bg="bg-ios-bg"
          left={<NavBtn onClick={() => setBox(null)}><ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" /><span className="-ml-1">Mailboxes</span></NavBtn>}
          footer={<Footer onCompose={() => newMail()} text={`${list.length} message${list.length === 1 ? "" : "s"}`} />}
        >
          {list.length === 0 && <div className="py-24 text-center text-[20px] text-ios-label2">No Mail</div>}
          {list.map((m) => (
            <SwipeRow
              key={m.id}
              className="bg-ios-bg"
              bg="var(--ios-bg)"
              actions={[
                { label: m.flagged ? "Unflag" : "Flag", color: "var(--ios-orange)", onPress: () => upd(m.id, { flagged: !m.flagged }) },
                m.box === "trash" ? { label: "Delete", color: "var(--ios-red)", onPress: () => patchData((s) => ({ mails: s.mails.filter((x) => x.id !== m.id) })) } : { label: "Trash", color: "var(--ios-red)", onPress: () => upd(m.id, { box: "trash" }) },
              ]}
            >
              <div className="relative flex gap-2 py-2.5 pl-7 pr-4 active:bg-ios-fill" style={{ background: "var(--ios-bg)" }} onClick={() => openMail(m.id)}>
                {!m.read && <span className="absolute left-2.5 top-4 h-[10px] w-[10px] rounded-full bg-ios-blue" />}
                <div className="ios-row min-w-0 flex-1 pb-2" style={{ ["--sep-left" as string]: "0px" }}>
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-[17px] font-semibold">{m.box === "sent" || m.box === "drafts" ? `To: ${m.to ?? ""}` : m.from}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[15px] text-ios-label2">
                      {m.flagged && <Flag size={13} fill="var(--ios-orange)" className="text-ios-orange" />}
                      {relTime(m.at)}
                      <ChevronRight size={14} className="text-ios-label3" />
                    </span>
                  </div>
                  <div className="truncate text-[15px]">{m.subject}</div>
                  <div className="line-clamp-2 text-[15px] leading-[19px] text-ios-label2">{m.body.replace(/\n+/g, " ")}</div>
                </div>
              </div>
            </SwipeRow>
          ))}
        </Page>
      </div>

      {/* detail */}
      <div className="absolute inset-0" style={{ transform: openId ? "none" : "translateX(100%)", transition: "transform .34s cubic-bezier(.3,.8,.2,1)", boxShadow: "-6px 0 18px rgba(0,0,0,.12)" }}>
        {cur && (
          <Page
            title=""
            large={false}
            bg="bg-ios-bg"
            left={<NavBtn onClick={() => setOpenId(null)}><ChevronLeft size={26} strokeWidth={2.4} className="-ml-2" /><span className="-ml-1">{boxes.find((b) => b.id === cb)?.name}</span></NavBtn>}
            right={
              <>
                <button className="text-ios-blue" onClick={() => upd(cur.id, { flagged: !cur.flagged })}><Flag size={22} fill={cur.flagged ? "currentColor" : "none"} /></button>
                <button className="text-ios-blue" onClick={() => { upd(cur.id, { box: "trash" }); setOpenId(null); }}><Trash2 size={22} /></button>
              </>
            }
            footer={
              <div className="glass relative z-20 flex items-center justify-between px-6 pt-2.5 text-ios-blue" style={{ paddingBottom: "calc(var(--safe-bottom) + 6px)", borderTop: "0.5px solid var(--ios-sep)" }}>
                <button onClick={() => { setOpenId(null); newMail(cur.email); setSubject("Re: " + cur.subject.replace(/^Re: /, "")); setBody(`\n\nOn ${new Date(cur.at).toLocaleDateString()}, ${cur.from} wrote:\n> ${cur.body.split("\n").join("\n> ")}`); }}><Edit3 size={22} /></button>
                <button onClick={() => { upd(cur.id, { box: "trash" }); setOpenId(null); }}><Trash2 size={22} /></button>
                <button onClick={() => useOS.getState().showToast("Archived")}><Archive size={22} /></button>
                <button onClick={() => newMail()}><SquarePen size={22} /></button>
              </div>
            }
          >
            <div className="px-4 pt-2">
              <div className="flex items-center gap-3">
                <Avatar name={cur.from} hue={(cur.from.charCodeAt(0) * 17) % 360} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">{cur.from}</div>
                  <div className="truncate text-[13px] text-ios-label2">To: {cur.to ?? "Me"}</div>
                </div>
                <div className="text-[13px] text-ios-label2">{new Date(cur.at).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
              </div>
              <div className="mt-3 text-[21px] font-bold leading-tight">{cur.subject}</div>
              <div className="mt-4 select-text whitespace-pre-wrap pb-8 text-[17px] leading-[24px]" style={{ userSelect: "text" }}>{cur.body}</div>
            </div>
          </Page>
        )}
      </div>

      <Sheet open={compose} onClose={close} height="calc(100% - var(--safe-top) - 10px)">
        <Page title="New Message" large={false} bg="bg-ios-bg" left={<NavBtn onClick={close}>Cancel</NavBtn>} right={<NavBtn bold onClick={send}><Send size={20} /></NavBtn>}>
          <div className="px-4 pt-2 text-[17px]">
            <label className="ios-row flex items-center gap-2 py-2.5" style={{ ["--sep-left" as string]: "0px" }}><span className="text-ios-label2">To:</span><input value={to} onChange={(e) => setTo(e.target.value)} type="email" autoCapitalize="off" className="flex-1 bg-transparent outline-none" /></label>
            <label className="ios-row flex items-center gap-2 py-2.5" style={{ ["--sep-left" as string]: "0px" }}><span className="text-ios-label2">Subject:</span><input value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 bg-transparent outline-none" /></label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="mt-2 block h-[320px] w-full resize-none bg-transparent outline-none" />
          </div>
        </Page>
      </Sheet>
    </div>
  );
}

function Footer({ onCompose, text }: { onCompose: () => void; text: string }) {
  return (
    <div className="glass relative z-20 flex items-center justify-between px-5 pt-2.5" style={{ borderTop: "0.5px solid var(--ios-sep)", paddingBottom: "calc(var(--safe-bottom) + 6px)" }}>
      <span className="w-6" />
      <span className="text-[11px] text-ios-label2">{text}</span>
      <button onClick={onCompose} className="text-ios-blue"><SquarePen size={23} /></button>
    </div>
  );
}
