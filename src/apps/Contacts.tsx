import { useState } from "react";
import { ChevronLeft, Plus, Search as SearchIcon, Share, Star, MessageCircle, Phone as PhoneIcon, Video, Mail as MailIcon, Trash2 } from "lucide-react";
import { useData, patchData, newId, contactName, formatPhone } from "../os/data";
import { useOS } from "../os/store";
import { sendAction } from "../os/actions";
import { Avatar, Group, NavBtn, Page, Row, SearchField, Sheet, Empty, Segmented } from "../os/ui";
import { share } from "../os/share";
import { callNumber } from "./Phone";

export default function ContactsApp() {
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [newC, setNewC] = useState(false);
  const [f, setF] = useState({ first: "", last: "", phone: "", email: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "fav">("all");
  const contacts = useData((s) => s.contacts);

  const sorted = [...contacts].sort((a, b) => contactName(a).localeCompare(contactName(b)));
  const filtered = sorted.filter((c) => {
    if (scope === "fav" && !c.fav) return false;
    return contactName(c).toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q);
  });
  const letters = Array.from(new Set(filtered.map((c) => contactName(c)[0]?.toUpperCase() ?? "?")));

  const openDetail = (id: string) => {
    setDetail(id);
    setEditId(null);
  };

  const startEdit = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    if (c) {
      setF({ first: c.first, last: c.last, phone: c.phone, email: c.email });
      setEditId(id);
      setNewC(true);
    }
  };

  const save = () => {
    if (editId) {
      patchData((s) => ({ contacts: s.contacts.map((c) => (c.id === editId ? { ...c, first: f.first, last: f.last, phone: formatPhone(f.phone), email: f.email } : c)) }));
      setEditId(null);
    } else {
      patchData((s) => ({ contacts: [...s.contacts, { id: newId(), first: f.first, last: f.last, phone: formatPhone(f.phone), email: f.email, fav: false, hue: Math.floor(Math.random() * 360) }] }));
    }
    setNewC(false);
  };

  const detailContact = detail ? contacts.find((c) => c.id === detail) : null;

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page
        title="Contacts"
        right={
          <button className="text-ios-blue" onClick={() => { setF({ first: "", last: "", phone: "", email: "" }); setEditId(null); setNewC(true); }}>
            <Plus size={26} />
          </button>
        }
      >
        <div className="px-4 pb-2">
          <Segmented
            options={[{ id: "all", label: "All" }, { id: "fav", label: "Favorites" }]}
            value={scope}
            onChange={(v) => setScope(v as "all" | "fav")}
            className="mb-3"
          />
          <SearchField value={q} onChange={setQ} placeholder="Search" />
        </div>
        {filtered.length === 0 && <Empty icon={SearchIcon} title={q ? "No Results" : "No Contacts"} text={q ? "Try a different search." : "Tap + to add a contact."} />}
        {letters.map((l) => (
          <Group key={l} header={l}>
            {filtered
              .filter((c) => (contactName(c)[0]?.toUpperCase() ?? "?") === l)
              .map((c) => (
                <Row
                  key={c.id}
                  leading={<Avatar name={contactName(c)} hue={c.hue} size={36} />}
                  title={contactName(c)}
                  onClick={() => openDetail(c.id)}
                />
              ))}
          </Group>
        ))}
        <div className="px-4 pb-3 pt-1 text-center text-[12px] text-ios-label2">{filtered.length} Contacts</div>
      </Page>

      <Sheet open={!!detail && !!detailContact} onClose={() => setDetail(null)} height="calc(100% - var(--safe-top) - 10px)">
        {detailContact && (
          <Page
            title=""
            large={false}
            left={<NavBtn onClick={() => setDetail(null)}><ChevronLeft size={24} className="-ml-2" />Contacts</NavBtn>}
            right={
              <NavBtn onClick={() => patchData((s) => ({ contacts: s.contacts.map((x) => (x.id === detailContact.id ? { ...x, fav: !x.fav } : x)) }))}>
                <Star size={22} fill={detailContact.fav ? "currentColor" : "none"} />
              </NavBtn>
            }
          >
            <div className="flex flex-col items-center pt-2">
              <Avatar name={contactName(detailContact)} hue={detailContact.hue} size={96} />
              <div className="mt-3 text-[28px] font-semibold">{contactName(detailContact)}</div>
              <div className="mt-4 flex gap-3">
                {[
                  { icon: MessageCircle, label: "message", run: () => { setDetail(null); useOS.getState().openApp("messages"); sendAction("messages", "to:" + detailContact.id); } },
                  { icon: PhoneIcon, label: "call", run: () => { setDetail(null); callNumber(detailContact.phone, contactName(detailContact)); } },
                  { icon: Video, label: "FaceTime", run: () => { setDetail(null); useOS.getState().openApp("facetime"); sendAction("facetime", "to:" + detailContact.id); } },
                  { icon: MailIcon, label: "mail", run: () => { setDetail(null); useOS.getState().openApp("mail"); sendAction("mail", "to:" + detailContact.email); } },
                ].map((b) => (
                  <button key={b.label} onClick={b.run} className="flex h-[62px] w-[74px] flex-col items-center justify-center gap-1 rounded-[12px] bg-ios-cell text-ios-blue active:opacity-60">
                    <b.icon size={22} />
                    <span className="text-[11px]">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <Group>
                <Row title={<span className="text-[13px] text-ios-label2">mobile</span>} subtitle={<span className="text-[17px] text-ios-blue">{detailContact.phone}</span>} onClick={() => { setDetail(null); callNumber(detailContact.phone, contactName(detailContact)); }} />
                {detailContact.email && <Row title={<span className="text-[13px] text-ios-label2">email</span>} subtitle={<span className="text-[17px] text-ios-blue">{detailContact.email}</span>} onClick={() => { share({ text: detailContact.email, subject: "Email" }); }} />}
              </Group>
              <Group>
                <Row title={<span className="text-ios-blue">Share Contact</span>} icon={Share} iconBg="#8e8e93" onClick={() => share({ text: `${contactName(detailContact)}\n${detailContact.phone}${detailContact.email ? `\n${detailContact.email}` : ""}`, subject: contactName(detailContact) })} />
                <Row title={<span className="text-ios-blue">Edit</span>} onClick={() => { const id = detailContact.id; setDetail(null); startEdit(id); }} />
                <Row title={<span className="text-ios-red">Delete Contact</span>} onClick={() => { patchData((s) => ({ contacts: s.contacts.filter((x) => x.id !== detailContact.id) })); setDetail(null); }} />
              </Group>
            </div>
          </Page>
        )}
      </Sheet>

      <Sheet open={newC} onClose={() => { setNewC(false); setEditId(null); }} height="70%">
        <Page
          title={editId ? "Edit Contact" : "New Contact"}
          large={false}
          left={<NavBtn onClick={() => { setNewC(false); setEditId(null); }}>Cancel</NavBtn>}
          right={<NavBtn bold disabled={!f.first && !f.last} onClick={save}>Done</NavBtn>}
        >
          <div className="pt-4">
            <Group>
              {(["first", "last", "phone", "email"] as const).map((k) => (
                <input
                  key={k}
                  value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: e.target.value })}
                  placeholder={{ first: "First name", last: "Last name", phone: "Phone", email: "Email" }[k]}
                  type={k === "phone" ? "tel" : k === "email" ? "email" : "text"}
                  autoCapitalize={k === "email" ? "off" : "words"}
                  className="ios-row block w-full bg-transparent px-4 py-3 text-[17px] outline-none"
                />
              ))}
            </Group>
            {editId && (
              <Group>
                <Row title={<span className="text-ios-red">Delete Contact</span>} icon={Trash2} iconBg="#ff3b30" onClick={() => { patchData((s) => ({ contacts: s.contacts.filter((x) => x.id !== editId) })); setNewC(false); setEditId(null); }} />
              </Group>
            )}
          </div>
        </Page>
      </Sheet>
    </div>
  );
}
