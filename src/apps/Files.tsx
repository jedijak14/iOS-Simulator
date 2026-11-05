import { useMemo, useState } from "react";
import { ChevronLeft, Folder, FileText, Image as ImageIcon, Music, Film, Search as SearchIcon, Plus, Cloud, Trash2, Star, Download, ChevronRight, MoreHorizontal } from "lucide-react";
import { Group, Page, Row, SearchField, Sheet, NavBtn, Empty, Segmented } from "../os/ui";
import { useOS } from "../os/store";
import { share } from "../os/share";
import { sfx } from "../os/sound";

export interface FSNode {
  id: string;
  name: string;
  kind: "folder" | "doc" | "image" | "audio" | "video";
  size?: string;
  modified?: number;
  parent: string | null;
  url?: string;
  fav?: boolean;
}

const ROOT: FSNode[] = [
  { id: "icloud", name: "iCloud Drive", kind: "folder", parent: null, modified: Date.now() },
  { id: "on-my-iphone", name: "On My iPhone", kind: "folder", parent: null, modified: Date.now() },
  { id: "recently-deleted", name: "Recently Deleted", kind: "folder", parent: null, modified: Date.now() },
];

const FILES: FSNode[] = [
  // iCloud Drive
  { id: "f1", name: "Documents", kind: "folder", parent: "icloud", modified: Date.now() - 86400_000 },
  { id: "f2", name: "Work", kind: "folder", parent: "icloud", modified: Date.now() - 2 * 86400_000 },
  { id: "f3", name: "Photos Backup", kind: "folder", parent: "icloud", modified: Date.now() - 7 * 86400_000 },
  { id: "d1", name: "Q3 Report.pdf", kind: "doc", size: "1.2 MB", parent: "icloud", modified: Date.now() - 3 * 3600_000 },
  { id: "d2", name: "Resume.pdf", kind: "doc", size: "284 KB", parent: "icloud", modified: Date.now() - 86400_000, fav: true },
  { id: "d3", name: "Meeting Notes.txt", kind: "doc", size: "12 KB", parent: "icloud", modified: Date.now() - 5 * 86400_000 },
  // Documents
  { id: "d4", name: "Lease Agreement.pdf", kind: "doc", size: "892 KB", parent: "f1", modified: Date.now() - 14 * 86400_000 },
  { id: "d5", name: "Tax Return 2024.pdf", kind: "doc", size: "1.8 MB", parent: "f1", modified: Date.now() - 30 * 86400_000 },
  { id: "d6", name: "Recipe Collection.txt", kind: "doc", size: "8 KB", parent: "f1", modified: Date.now() - 6 * 86400_000 },
  // Work
  { id: "d7", name: "Project Brief.pdf", kind: "doc", size: "548 KB", parent: "f2", modified: Date.now() - 2 * 86400_000 },
  { id: "d8", name: "Design Mockup.png", kind: "image", size: "2.4 MB", parent: "f2", modified: Date.now() - 3600_000, url: "https://images.pexels.com/photos/327540/pexels-photo-327540.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { id: "d9", name: "Demo Video.mp4", kind: "video", size: "18 MB", parent: "f2", modified: Date.now() - 12 * 3600_000 },
  // Photos Backup
  { id: "d10", name: "Iceland 2024.jpg", kind: "image", size: "3.2 MB", parent: "f3", modified: Date.now() - 9 * 86400_000, url: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { id: "d11", name: "Beach Sunset.jpg", kind: "image", size: "1.8 MB", parent: "f3", modified: Date.now() - 11 * 86400_000, url: "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=600" },
  // On My iPhone
  { id: "f4", name: "Downloads", kind: "folder", parent: "on-my-iphone", modified: Date.now() - 3600_000 },
  { id: "d12", name: "Voice Memo 1.m4a", kind: "audio", size: "412 KB", parent: "on-my-iphone", modified: Date.now() - 2 * 3600_000 },
  { id: "d13", name: "Screenshot.png", kind: "image", size: "1.1 MB", parent: "on-my-iphone", modified: Date.now() - 4 * 3600_000, url: "https://images.pexels.com/photos/1037979/pexels-photo-1037979.jpeg?auto=compress&cs=tinysrgb&w=600" },
  // Downloads
  { id: "d14", name: "Invoice.pdf", kind: "doc", size: "168 KB", parent: "f4", modified: Date.now() - 1800_000 },
  { id: "d15", name: "Wallpaper.jpg", kind: "image", size: "3.6 MB", parent: "f4", modified: Date.now() - 7200_000, url: "https://images.pexels.com/photos/255379/pexels-photo-255379.jpeg?auto=compress&cs=tinysrgb&w=600" },
];

const ICONS: Record<FSNode["kind"], typeof Folder> = {
  folder: Folder,
  doc: FileText,
  image: ImageIcon,
  audio: Music,
  video: Film,
};
const ICON_BG: Record<FSNode["kind"], string> = {
  folder: "#0a84ff",
  doc: "#8e8e93",
  image: "#ff2d55",
  audio: "#ff6a8a",
  video: "#5e5ce6",
};

function fmtDate(ts?: number) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 3600_000) return `${Math.max(1, Math.round(diff / 60000))} min ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)} hr ago`;
  if (diff < 7 * 86400_000) return `${Math.round(diff / 86400_000)} d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function FilesApp() {
  const [path, setPath] = useState<string[]>([]); // ids of folders from root to current
  const [q, setQ] = useState("");
  const [view, setView] = useState<"browse" | "recent" | "search">("browse");
  const [sel, setSel] = useState<string | null>(null);
  const set = useOS((s) => s.set);
  void set;

  const all = [...ROOT, ...FILES];
  const currentId = path[path.length - 1] ?? null;
  const items = useMemo(() => {
    if (view === "recent") {
      return [...all]
        .filter((n) => n.kind !== "folder" && n.parent !== "recently-deleted")
        .sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))
        .slice(0, 20);
    }
    if (view === "search") {
      return all.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()) && n.kind !== "folder");
    }
    return all.filter((n) => n.parent === currentId).sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      return (b.modified ?? 0) - (a.modified ?? 0);
    });
  }, [currentId, view, q]);

  const open = (n: FSNode) => {
    if (n.kind === "folder") {
      setPath((p) => [...p, n.id]);
      setView("browse");
    } else {
      setSel(n.id);
    }
  };

  const selNode = sel ? all.find((n) => n.id === sel) : null;
  const current = currentId ? all.find((n) => n.id === currentId) : null;
  const title = view === "recent" ? "Recents" : view === "search" ? "Search" : current?.name ?? "Browse";

  return (
    <div className="relative h-full overflow-hidden bg-ios-grouped">
      <Page
        title={title}
        right={
          <button className="text-ios-blue" onClick={() => useOS.getState().showToast("New folder created")}>
            <Plus size={26} />
          </button>
        }
        left={path.length > 0 && view === "browse" ? (
          <NavBtn onClick={() => setPath((p) => p.slice(0, -1))}>
            <ChevronLeft size={24} className="-mr-1" /> {path.length > 1 ? all.find((n) => n.id === path[path.length - 2])?.name : "Browse"}
          </NavBtn>
        ) : undefined}
      >
        <div className="px-4 pb-2">
          <Segmented
            options={[
              { id: "browse", label: "Browse" },
              { id: "recent", label: "Recents" },
            ]}
            value={view === "search" ? "browse" : view}
            onChange={(v) => { setView(v as typeof view); setPath([]); }}
            className="mb-3"
          />
          <SearchField value={q} onChange={(v) => { setQ(v); setView(v ? "search" : "browse"); }} placeholder="Search" />
        </div>

        {items.length === 0 ? (
          <Empty icon={SearchIcon} title={q ? "No Results" : "Empty Folder"} text={q ? "Try a different search." : "Add files using the + button."} />
        ) : (
          <Group>
            {items.map((n) => {
              const Icon = ICONS[n.kind];
              const isFolder = n.kind === "folder";
              return (
                <Row
                  key={n.id}
                  icon={Icon}
                  iconBg={ICON_BG[n.kind]}
                  title={n.name}
                  subtitle={isFolder ? `${all.filter((c) => c.parent === n.id).length} items` : n.size}
                  value={fmtDate(n.modified)}
                  right={n.fav ? <Star size={16} fill="#ff9500" color="#ff9500" /> : undefined}
                  chevron={isFolder}
                  onClick={() => open(n)}
                />
              );
            })}
          </Group>
        )}

        {view === "browse" && path.length === 0 && (
          <Group header="Locations">
            <Row icon={Cloud} iconBg="#0a84ff" title="iCloud Drive" subtitle="All your files, everywhere" chevron onClick={() => { setPath(["icloud"]); }} />
            <Row icon={Folder} iconBg="#8e8e93" title="On My iPhone" subtitle="Local storage" chevron onClick={() => { setPath(["on-my-iphone"]); }} />
            <Row icon={Trash2} iconBg="#8e8e93" title="Recently Deleted" chevron onClick={() => { setPath(["recently-deleted"]); }} />
          </Group>
        )}

        <Group header="Storage">
          <Row icon={Cloud} iconBg="#0a84ff" title="iCloud" subtitle="50 GB of 200 GB used" value="" />
          <div className="px-4 py-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-ios-fill2">
              <div className="h-full rounded-full bg-ios-blue" style={{ width: "25%", background: "var(--ios-blue)" }} />
            </div>
          </div>
          <Row icon={Download} iconBg="#34c759" title="On My iPhone" subtitle="12.4 GB of 128 GB used" value="" />
        </Group>
      </Page>

      {/* File preview sheet */}
      <Sheet open={!!sel} onClose={() => setSel(null)} full>
        {selNode && (
          <Page
            title={selNode.name}
            large={false}
            left={<NavBtn onClick={() => setSel(null)}><ChevronLeft size={24} className="-mr-1" /> Files</NavBtn>}
            right={
              <button
                onClick={() => {
                  share({ text: selNode.name, subject: selNode.name, image: selNode.url });
                }}
                className="text-ios-blue"
              >
                <MoreHorizontal size={24} />
              </button>
            }
          >
            <div className="px-4">
              {selNode.kind === "image" && selNode.url && (
                <img src={selNode.url} alt={selNode.name} className="w-full rounded-2xl" />
              )}
              {selNode.kind === "doc" && (
                <div className="rounded-2xl bg-ios-cell p-6">
                  <FileText size={48} className="mx-auto mb-3 text-ios-label2" />
                  <div className="text-[15px] leading-relaxed text-ios-label2">
                    This is a simulated preview of <b className="text-ios-label">{selNode.name}</b>. In a real iOS device, this would show the full document rendered inline.
                  </div>
                </div>
              )}
              {selNode.kind === "audio" && (
                <div className="rounded-2xl bg-ios-cell p-6 text-center">
                  <Music size={48} className="mx-auto mb-3 text-ios-label2" />
                  <div className="text-[17px] font-medium">{selNode.name}</div>
                  <div className="mt-2 text-[13px] text-ios-label2">{selNode.size}</div>
                  <button onClick={() => sfx.ding()} className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-ios-blue text-white" style={{ background: "var(--ios-blue)" }}>▶</button>
                </div>
              )}
              {selNode.kind === "video" && (
                <div className="rounded-2xl bg-ios-cell p-6 text-center">
                  <Film size={48} className="mx-auto mb-3 text-ios-label2" />
                  <div className="text-[17px] font-medium">{selNode.name}</div>
                  <div className="mt-2 text-[13px] text-ios-label2">{selNode.size}</div>
                </div>
              )}
            </div>
            <Group header="Info">
              <Row title="Size" value={selNode.size ?? "—"} />
              <Row title="Modified" value={fmtDate(selNode.modified)} />
              <Row title="Kind" value={selNode.kind[0].toUpperCase() + selNode.kind.slice(1)} />
              <Row title="Favorite" right={<Star size={20} fill={selNode.fav ? "#ff9500" : "none"} color={selNode.fav ? "#ff9500" : "currentColor"} />} onClick={() => useOS.getState().showToast("Favorite toggled")} />
            </Group>
            <Group>
              <Row title={<span className="text-ios-blue">Share</span>} icon={ChevronRight} iconBg="#8e8e93" onClick={() => share({ text: selNode.name, subject: selNode.name, image: selNode.url })} />
              <Row title={<span className="text-ios-blue">Save to Photos</span>} onClick={() => useOS.getState().showToast("Saved to Photos")} />
              <Row title={<span className="text-ios-red">Delete</span>} onClick={() => { useOS.getState().showToast("Moved to Recently Deleted"); setSel(null); }} />
            </Group>
          </Page>
        )}
      </Sheet>
    </div>
  );
}
