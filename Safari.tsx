import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, Globe, Lock, Plus, RotateCw, Search, Share, Square, WifiOff, X, Clock, Star } from "lucide-react";
import { useOS, isOnline } from "../os/store";
import { useData, patchData, newId } from "../os/data";
import { Group, NavBtn, Page, Row, ScrollView, Sheet, Spinner, Segmented } from "../os/ui";
import { useAppAction } from "../os/actions";

const FAVS: { title: string; url: string; color: string; letter: string }[] = [
  { title: "Wikipedia", url: "wiki:Main Page", color: "#6b7280", letter: "W" },
  { title: "Apple", url: "wiki:Apple Inc.", color: "#1c1c1e", letter: "A" },
  { title: "OpenStreetMap", url: "https://www.openstreetmap.org/export/embed.html?bbox=-122.1,37.3,-121.95,37.4&layer=mapnik", color: "#34c759", letter: "O" },
  { title: "Example", url: "https://example.com", color: "#007aff", letter: "E" },
  { title: "Hacker News", url: "https://news.ycombinator.com", color: "#ff6600", letter: "Y" },
  { title: "Archive", url: "https://archive.org", color: "#5856d6", letter: "I" },
  { title: "Space", url: "wiki:Solar System", color: "#af52de", letter: "S" },
  { title: "Swift", url: "wiki:Swift (programming language)", color: "#ff9500", letter: "S" },
];
const TRENDING = ["Artificial intelligence", "Northern lights", "Mount Everest", "Quantum computing", "Roman Empire", "Jazz", "Octopus", "Great Barrier Reef"];

const API = "https://en.wikipedia.org/w/api.php";
const titleOf = (url: string) => (url.startsWith("wiki:") ? url.slice(5) : url.startsWith("search:") ? url.slice(7) + " – Search" : url ? safeHost(url) : "Start Page");
function safeHost(u: string) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}
const realUrl = (url: string) => (url.startsWith("wiki:") ? `https://en.wikipedia.org/wiki/${encodeURIComponent(url.slice(5).replace(/ /g, "_"))}` : url.startsWith("search:") ? `https://duckduckgo.com/?q=${encodeURIComponent(url.slice(7))}` : url);

function parseInput(t: string): string {
  const s = t.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) {
    const m = s.match(/^https?:\/\/(?:[a-z]+\.)?wikipedia\.org\/wiki\/([^?#]+)/i);
    return m ? "wiki:" + decodeURIComponent(m[1]).replace(/_/g, " ") : s;
  }
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(s)) return parseInput("https://" + s);
  return "search:" + s;
}

interface WikiPage {
  title: string;
  extract?: string;
  description?: string;
  thumbnail?: { source: string };
  missing?: boolean;
}

function Article({ title, onGo }: { title: string; onGo: (u: string) => void }) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [related, setRelated] = useState<string[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let dead = false;
    setPage(null);
    setErr(false);
    fetch(`${API}?action=query&prop=extracts%7Cpageimages%7Cdescription&titles=${encodeURIComponent(title)}&redirects=1&exlimit=1&piprop=thumbnail&pithumbsize=800&format=json&origin=*`)
      .then((r) => r.json())
      .then((j) => {
        if (dead) return;
        const p = Object.values(j.query.pages)[0] as WikiPage & { missing?: string };
        setPage({ ...p, missing: "missing" in p });
      })
      .catch(() => !dead && setErr(true));
    fetch(`${API}?action=query&list=search&srsearch=${encodeURIComponent(title)}&srlimit=7&format=json&origin=*`)
      .then((r) => r.json())
      .then((j) => !dead && setRelated((j.query.search as { title: string }[]).map((s) => s.title).filter((t) => t !== title).slice(0, 6)))
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [title]);
  if (err) return <Offline retry={() => onGo("wiki:" + title)} />;
  if (!page)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  if (page.missing)
    return (
      <div className="px-6 py-24 text-center text-ios-label2">
        <div className="text-[20px] font-semibold text-ios-label">No article found</div>
        <button className="mt-4 text-ios-blue" onClick={() => onGo("search:" + title)}>
          Search for “{title}”
        </button>
      </div>
    );
  return (
    <div className="bg-ios-bg pb-10">
      {page.thumbnail && <img src={page.thumbnail.source} alt="" draggable={false} className="max-h-[260px] w-full object-cover" />}
      <div className="px-4 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ios-label2">Wikipedia</div>
        <h1 className="font-serif text-[30px] leading-[36px]" style={{ fontFamily: "Georgia, serif" }}>
          {page.title}
        </h1>
        {page.description && <div className="mb-3 text-[14px] text-ios-label2">{page.description}</div>}
        <div className="wiki" dangerouslySetInnerHTML={{ __html: page.extract ?? "<p>No summary available.</p>" }} />
        {related.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[13px] font-semibold uppercase text-ios-label2">Related</div>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <button key={r} onClick={() => onGo("wiki:" + r)} className="rounded-full bg-ios-fill px-3 py-1.5 text-[14px] text-ios-blue active:opacity-60">
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => window.open(realUrl("wiki:" + page.title), "_blank")} className="mt-6 flex items-center gap-1.5 text-[14px] text-ios-blue">
          <ExternalLink size={14} /> Read the full article on Wikipedia
        </button>
      </div>
    </div>
  );
}

function Results({ q, onGo }: { q: string; onGo: (u: string) => void }) {
  const [res, setRes] = useState<{ title: string; snippet: string }[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let dead = false;
    setRes(null);
    setErr(false);
    fetch(`${API}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=15&format=json&origin=*`)
      .then((r) => r.json())
      .then((j) => !dead && setRes(j.query.search))
      .catch(() => !dead && setErr(true));
    return () => {
      dead = true;
    };
  }, [q]);
  if (err) return <Offline retry={() => onGo("search:" + q)} />;
  if (!res)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  return (
    <div className="bg-ios-bg px-4 pb-10 pt-3">
      <div className="mb-3 text-[13px] text-ios-label2">Results for “{q}” from Wikipedia</div>
      {res.length === 0 && <div className="py-16 text-center text-ios-label2">No results found.</div>}
      {res.map((r) => (
        <button key={r.title} onClick={() => onGo("wiki:" + r.title)} className="mb-4 block w-full text-left active:opacity-60">
          <div className="text-[12px] text-ios-label2">en.wikipedia.org › wiki › {r.title.replace(/ /g, "_")}</div>
          <div className="text-[19px] leading-[24px] text-ios-blue">{r.title}</div>
          <div className="text-[14px] leading-[19px] text-ios-label" dangerouslySetInnerHTML={{ __html: r.snippet + "…" }} />
        </button>
      ))}
      <button onClick={() => window.open(realUrl("search:" + q), "_blank")} className="flex items-center gap-1.5 text-[14px] text-ios-blue">
        <ExternalLink size={14} /> Search the whole web for “{q}”
      </button>
    </div>
  );
}

function Offline({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-24 text-center">
      <WifiOff size={52} strokeWidth={1.3} className="mb-3 text-ios-label2" />
      <div className="text-[20px] font-semibold">Not Connected to the Internet</div>
      <div className="mt-1 text-[15px] text-ios-label2">Safari can't open the page because your iPhone isn't connected to the internet.</div>
      <button onClick={retry} className="mt-5 rounded-full bg-ios-blue px-5 py-2 text-[16px] font-semibold text-white">
        Try Again
      </button>
    </div>
  );
}

function Frame({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [url]);
  return (
    <div className="relative h-full w-full bg-white">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      )}
      <iframe key={url} src={url} title="web" onLoad={() => setLoaded(true)} className="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
      <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+4px)] flex justify-center">
        <div className="pointer-events-auto glass-dark rounded-full px-3 py-1 text-[12px] text-white/90">
          Blank page? This site may not allow embedding.{" "}
          <button className="underline" onClick={() => window.open(url, "_blank")}>
            Open in browser
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SafariApp() {
  const tabs = useData((s) => s.tabs);
  const activeTab = useData((s) => s.activeTab);
  const bookmarks = useData((s) => s.bookmarks);
  const history = useData((s) => s.history);
  const online = useOS((s) => isOnline(s));
  const tab = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const [nav, setNav] = useState<Record<string, { stack: string[]; idx: number }>>({});
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [sugg, setSugg] = useState<string[]>([]);
  const [switcher, setSwitcher] = useState(false);
  const [marks, setMarks] = useState(false);
  const [markTab, setMarkTab] = useState<"bookmarks" | "history">("bookmarks");
  const [reload, setReload] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const n = nav[tab.id] ?? { stack: [tab.url], idx: 0 };

  const setUrl = useCallback((id: string, url: string) => {
    patchData((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, url, title: titleOf(url) } : t)) }));
  }, []);

  const go = useCallback(
    (url: string) => {
      const id = useData.getState().activeTab;
      setNav((cur) => {
        const c = cur[id] ?? { stack: [useData.getState().tabs.find((t) => t.id === id)?.url ?? ""], idx: 0 };
        const stack = [...c.stack.slice(0, c.idx + 1), url];
        return { ...cur, [id]: { stack, idx: stack.length - 1 } };
      });
      setUrl(id, url);
      setEditing(false);
      if (url) patchData((s) => ({ history: [{ title: titleOf(url), url, at: Date.now() }, ...s.history.filter((h) => h.url !== url)].slice(0, 80) }));
    },
    [setUrl],
  );
  const step = (d: number) => {
    const i = n.idx + d;
    if (i < 0 || i >= n.stack.length) return;
    setNav({ ...nav, [tab.id]: { ...n, idx: i } });
    setUrl(tab.id, n.stack[i]);
  };
  const newTab = useCallback((url = "") => {
    const t = { id: newId(), url, title: titleOf(url) };
    patchData((s) => ({ tabs: [...s.tabs, t], activeTab: t.id }));
    setSwitcher(false);
    setEditing(false);
  }, []);
  const closeTab = (id: string) => {
    patchData((s) => {
      const rest = s.tabs.filter((t) => t.id !== id);
      if (rest.length === 0) {
        const t = { id: newId(), url: "", title: "Start Page" };
        return { tabs: [t], activeTab: t.id };
      }
      return { tabs: rest, activeTab: s.activeTab === id ? rest[rest.length - 1].id : s.activeTab };
    });
  };

  useAppAction("safari", (a) => {
    if (a === "newtab") newTab();
    else if (a.startsWith("search:")) go("search:" + a.slice(7));
    else if (a.startsWith("wiki:")) go("wiki:" + a.slice(5));
    else if (a.startsWith("open:")) go(parseInput(a.slice(5)));
  });

  // suggestions while typing
  useEffect(() => {
    if (!editing || !text.trim() || !online) {
      setSugg([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API}?action=opensearch&search=${encodeURIComponent(text)}&limit=6&format=json&origin=*`)
        .then((r) => r.json())
        .then((j) => setSugg(j[1] as string[]))
        .catch(() => setSugg([]));
    }, 220);
    return () => clearTimeout(t);
  }, [text, editing, online]);

  const url = tab.url;
  const isMarked = bookmarks.some((b) => b.url === url);
  const label = url ? (url.startsWith("wiki:") ? "en.wikipedia.org" : url.startsWith("search:") ? "Wikipedia Search" : safeHost(url)) : "Search or enter website name";

  let content: React.ReactNode;
  if (!url) {
    content = (
      <div className="bg-ios-grouped pb-10" style={{ minHeight: "100%" }}>
        <div className="px-5 pt-3">
          <div className="mb-3 text-[22px] font-bold">Favorites</div>
          <div className="grid grid-cols-4 gap-y-4">
            {FAVS.map((f) => (
              <button key={f.title} onClick={() => go(f.url)} className="flex flex-col items-center gap-1.5 active:opacity-60">
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] text-[26px] font-semibold text-white" style={{ background: f.color }}>
                  {f.letter}
                </div>
                <span className="w-[72px] truncate text-center text-[11px]">{f.title}</span>
              </button>
            ))}
          </div>
          <div className="mb-2 mt-7 text-[22px] font-bold">Explore Wikipedia</div>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map((t) => (
              <button key={t} onClick={() => go("wiki:" + t)} className="rounded-full bg-ios-cell px-3 py-1.5 text-[14px] active:opacity-60">
                {t}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <>
              <div className="mb-2 mt-7 text-[22px] font-bold">Recently Visited</div>
              <div className="overflow-hidden rounded-[12px] bg-ios-cell">
                {history.slice(0, 4).map((h) => (
                  <Row key={h.url} icon={Clock} iconBg="#8e8e93" title={h.title} subtitle={realUrl(h.url).replace(/^https?:\/\//, "").slice(0, 40)} onClick={() => go(h.url)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  } else if (!online && !url.startsWith("http")) content = <Offline retry={() => setReload((r) => r + 1)} />;
  else if (!online) content = <Offline retry={() => setReload((r) => r + 1)} />;
  else if (url.startsWith("wiki:")) content = <Article key={url + reload} title={url.slice(5)} onGo={go} />;
  else if (url.startsWith("search:")) content = <Results key={url + reload} q={url.slice(7)} onGo={go} />;
  else content = <Frame key={url + reload} url={url} />;

  const submit = () => {
    const u = parseInput(text);
    if (u) go(u);
    else setEditing(false);
    input.current?.blur();
  };

  return (
    <div className="relative flex h-full flex-col bg-ios-bg text-ios-label">
      <ScrollView className="min-h-0 flex-1" key={tab.id + url}>
        <div style={{ height: url.startsWith("http") ? 0 : "var(--safe-top)" }} />
        {content}
      </ScrollView>

      {/* address bar + toolbar */}
      <div className="glass relative z-20 shrink-0" style={{ borderTop: "0.5px solid var(--ios-sep)", paddingBottom: "var(--safe-bottom)" }}>
        <div className="px-3 pt-2">
          <div className="flex h-[40px] items-center gap-2 rounded-[12px] bg-ios-fill px-3">
            {editing ? <Search size={16} className="shrink-0 text-ios-label2" /> : url.startsWith("http") ? <Lock size={13} className="shrink-0 text-ios-label2" /> : <Globe size={14} className="shrink-0 text-ios-label2" />}
            {editing ? (
              <input
                ref={input}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                enterKeyHint="go"
                autoCapitalize="off"
                autoCorrect="off"
                inputMode="url"
                placeholder="Search or enter website name"
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
              />
            ) : (
              <button
                className="min-w-0 flex-1 truncate text-center text-[16px]"
                style={{ color: url ? "var(--ios-label)" : "var(--ios-label2)" }}
                onClick={() => {
                  setText(url ? realUrl(url).replace(/^https?:\/\//, "") : "");
                  setEditing(true);
                }}
              >
                {label}
              </button>
            )}
            {editing ? (
              <button onClick={() => { setEditing(false); (document.activeElement as HTMLElement)?.blur(); }} className="text-[15px] text-ios-blue">
                Cancel
              </button>
            ) : (
              url && (
                <button onClick={() => setReload((r) => r + 1)} className="text-ios-label2">
                  <RotateCw size={15} />
                </button>
              )
            )}
          </div>
        </div>
        <div className="flex h-[44px] items-center justify-around px-2 text-ios-blue">
          <button disabled={n.idx <= 0} onClick={() => step(-1)} className="disabled:opacity-30"><ChevronLeft size={26} /></button>
          <button disabled={n.idx >= n.stack.length - 1} onClick={() => step(1)} className="disabled:opacity-30"><ChevronRight size={26} /></button>
          <button
            onClick={() =>
              useOS.getState().showSheet({
                title: label,
                actions: [
                  { text: "Copy Link", onPress: () => { void navigator.clipboard?.writeText(realUrl(url)).catch(() => undefined); useOS.getState().showToast("Link copied"); } },
                  { text: isMarked ? "Remove Bookmark" : "Add Bookmark", onPress: () => url && patchData((s) => ({ bookmarks: isMarked ? s.bookmarks.filter((b) => b.url !== url) : [{ title: titleOf(url), url }, ...s.bookmarks] })) },
                  { text: "Open in Browser", onPress: () => url && window.open(realUrl(url), "_blank") },
                  { text: "Cancel", style: "cancel" },
                ],
              })
            }
          >
            <Share size={22} />
          </button>
          <button onClick={() => setMarks(true)}><BookOpen size={23} /></button>
          <button onClick={() => setSwitcher(true)} className="relative">
            <Square size={24} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{tabs.length}</span>
          </button>
        </div>
      </div>

      {/* editing overlay */}
      {editing && (
        <div className="fade-in absolute inset-0 z-10 flex flex-col bg-ios-grouped" style={{ paddingBottom: 130 }}>
          <ScrollView className="flex-1 pt-[calc(var(--safe-top)+8px)]">
            {text.trim() && (
              <Group header="Search">
                <Row icon={Search} iconBg="#007aff" title={`“${text.trim()}”`} subtitle="Search Wikipedia" onClick={() => go(parseInput(text))} />
                {sugg.map((s) => (
                  <Row key={s} icon={Search} iconBg="#8e8e93" title={s} onClick={() => go("wiki:" + s)} />
                ))}
              </Group>
            )}
            {(() => {
              const all = [...bookmarks.map((b) => ({ ...b, bm: true })), ...history.map((h) => ({ title: h.title, url: h.url, bm: false }))].filter((x) => !text.trim() || (x.title + x.url).toLowerCase().includes(text.toLowerCase())).slice(0, 8);
              return all.length ? (
                <Group header={text.trim() ? "Bookmarks and History" : "Suggested"}>
                  {all.map((x, i) => (
                    <Row key={x.url + i} icon={x.bm ? Star : Clock} iconBg={x.bm ? "#ff9500" : "#8e8e93"} title={x.title} subtitle={realUrl(x.url).replace(/^https?:\/\//, "").slice(0, 44)} onClick={() => go(x.url)} />
                  ))}
                </Group>
              ) : null;
            })()}
          </ScrollView>
        </div>
      )}

      {/* tab switcher */}
      {switcher && (
        <div className="fade-in absolute inset-0 z-30 flex flex-col bg-ios-grouped">
          <ScrollView className="flex-1">
            <div className="grid grid-cols-2 gap-3 p-4" style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}>
              {tabs.map((t) => (
                <div key={t.id} className="relative overflow-hidden rounded-[14px] bg-ios-cell shadow" style={{ outline: t.id === activeTab ? "2px solid var(--ios-blue)" : "none" }}>
                  <button className="block w-full text-left" onClick={() => { patchData(() => ({ activeTab: t.id })); setSwitcher(false); }}>
                    <div className="flex items-center gap-1.5 px-2.5 py-2 pr-8 text-[13px] font-semibold">
                      <Globe size={13} className="shrink-0" /> <span className="truncate">{t.title}</span>
                    </div>
                    <div className="flex h-[180px] items-center justify-center text-ios-label3" style={{ background: "linear-gradient(180deg,var(--ios-fill),transparent)" }}>
                      <Globe size={40} />
                    </div>
                  </button>
                  <button onClick={() => closeTab(t.id)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ios-fill2">
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </ScrollView>
          <div className="glass flex items-center justify-between px-4 pt-2" style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)", borderTop: "0.5px solid var(--ios-sep)" }}>
            <button onClick={() => newTab()} className="text-ios-blue"><Plus size={28} /></button>
            <span className="text-[15px] font-semibold">{tabs.length} Tab{tabs.length === 1 ? "" : "s"}</span>
            <NavBtn bold onClick={() => setSwitcher(false)}>Done</NavBtn>
          </div>
        </div>
      )}

      <Sheet open={marks} onClose={() => setMarks(false)} height="82%">
        <Page title={markTab === "bookmarks" ? "Bookmarks" : "History"} large={false} left={<NavBtn onClick={() => markTab === "history" ? patchData(() => ({ history: [] })) : undefined}>{markTab === "history" ? "Clear" : ""}</NavBtn>} right={<NavBtn bold onClick={() => setMarks(false)}>Done</NavBtn>}>
          <div className="px-4 pb-3 pt-2">
            <Segmented options={[{ id: "bookmarks", label: "Bookmarks" }, { id: "history", label: "History" }]} value={markTab} onChange={setMarkTab} />
          </div>
          <Group>
            {(markTab === "bookmarks" ? bookmarks : history).map((b, i) => (
              <Row key={b.url + i} icon={markTab === "bookmarks" ? Star : Clock} iconBg={markTab === "bookmarks" ? "#ff9500" : "#8e8e93"} title={b.title} subtitle={realUrl(b.url).replace(/^https?:\/\//, "").slice(0, 44)} onClick={() => { setMarks(false); go(b.url); }} />
            ))}
            {(markTab === "bookmarks" ? bookmarks : history).length === 0 && <div className="py-10 text-center text-ios-label2">{markTab === "bookmarks" ? "No Bookmarks" : "No History"}</div>}
          </Group>
        </Page>
      </Sheet>
    </div>
  );
}
