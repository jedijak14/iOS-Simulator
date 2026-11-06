import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, FileBox, Lock, PackageOpen, Play, ShieldCheck, Terminal, Upload, X } from "lucide-react";
import { analyzeIPA, type IPACheck, type IPAReport } from "../os/ipa";
import { Group, Row, Spinner } from "../os/ui";

const formatSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

function CheckRow({ check }: { check: IPACheck }) {
  const color = check.status === "pass" ? "var(--ios-green)" : check.status === "fail" ? "var(--ios-red)" : "var(--ios-orange)";
  return (
    <div className="ios-row flex items-start gap-3 px-4 py-3" style={{ ["--sep-left" as string]: "48px" }}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
        {check.status === "pass" ? <Check size={15} strokeWidth={3} /> : check.status === "fail" ? <X size={15} strokeWidth={3} /> : <AlertTriangle size={14} strokeWidth={2.5} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{check.label}</div>
        <div className="mt-0.5 text-[12px] leading-[17px] text-ios-label2">{check.detail}</div>
      </div>
    </div>
  );
}

function downloadReport(report: IPAReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.bundleId.replace(/[^a-z0-9.-]/gi, "_") || "ipa"}-analysis.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function IPATesting() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const iconRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<IPAReport | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [runnerUrl, setRunnerUrl] = useState("");
  const [runnerToken, setRunnerToken] = useState("");
  const [runnerBusy, setRunnerBusy] = useState(false);
  const [runnerMessage, setRunnerMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => () => {
    if (iconRef.current) URL.revokeObjectURL(iconRef.current);
  }, []);

  const clearIcon = () => {
    if (iconRef.current) URL.revokeObjectURL(iconRef.current);
    iconRef.current = null;
    setIconUrl(null);
  };

  const inspect = async (file: File | undefined) => {
    if (!file || busy) return;
    fileRef.current = file;
    setRunnerMessage(null);
    setBusy(true);
    setError("");
    setReport(null);
    clearIcon();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const analysis = await analyzeIPA(file);
      if (analysis.icon) {
        const url = URL.createObjectURL(new Blob([analysis.icon.slice().buffer as ArrayBuffer], { type: "image/png" }));
        iconRef.current = url;
        setIconUrl(url);
      }
      setReport(analysis.report);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The IPA could not be analyzed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const runNative = async () => {
    const file = fileRef.current;
    if (!report || !file || runnerBusy) return;
    setRunnerMessage(null);
    let endpoint: URL;
    try {
      endpoint = new URL(runnerUrl);
      if (endpoint.protocol !== "https:") throw new Error("Use an HTTPS runner URL to protect the IPA and bearer token.");
      if (!runnerToken) throw new Error("Enter the runner's bearer token.");
    } catch (reason) {
      setRunnerMessage({ ok: false, text: reason instanceof Error ? reason.message : "Enter a valid runner URL." });
      return;
    }

    setRunnerBusy(true);
    try {
      const response = await fetch(`${endpoint.origin}${endpoint.pathname.replace(/\/$/, "")}/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runnerToken}`,
          "Content-Type": "application/octet-stream",
          "X-Bundle-ID": report.bundleId,
          "X-IPA-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; pid?: number | null; launchOutput?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || `Runner returned HTTP ${response.status}.`);
      setReport((current) => current ? {
        ...current,
        nativeExecution: "launched",
        nativeProcessId: result.pid ?? undefined,
        checks: current.checks.map((check) => check.id === "runtime" ? { ...check, status: "pass", detail: `Installed and launched on the connected macOS runner${result.pid ? ` as process ${result.pid}` : ""}.` } : check),
      } : current);
      setRunnerMessage({ ok: true, text: result.launchOutput || `Launch succeeded${result.pid ? ` · PID ${result.pid}` : ""}` });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The native launch failed.";
      setReport((current) => current ? { ...current, nativeExecution: "failed", checks: current.checks.map((check) => check.id === "runtime" ? { ...check, status: "fail", detail: message } : check) } : current);
      setRunnerMessage({ ok: false, text: message });
    } finally {
      setRunnerBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="flex flex-col items-center px-8 py-20 text-center">
        <Spinner className="h-9 w-9" />
        <div className="mt-5 text-[20px] font-semibold">Analyzing IPA…</div>
        <div className="mt-1 text-[13px] leading-5 text-ios-label2">Reading the ZIP package, bundle metadata, and executable header locally.</div>
      </div>
    );
  }

  if (report) {
    return (
      <div className="px-4 pb-4">
        <Group>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-ios-fill2 text-ios-blue">
              {iconUrl ? <img src={iconUrl} alt={`${report.appName} icon`} className="h-full w-full object-cover" /> : <FileBox size={32} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[21px] font-bold">{report.appName}</div>
              <div className="truncate text-[13px] text-ios-label2">{report.bundleId}</div>
              <div className="mt-0.5 text-[12px] text-ios-label2">Version {report.version} ({report.build})</div>
            </div>
          </div>
        </Group>

        <Group header="Package">
          <Row title="File" value={report.fileName} />
          <Row title="Size" value={formatSize(report.fileSize)} />
          <Row title="Minimum iOS" value={report.minimumIOS} />
          <Row title="Platform" value={report.platform} />
          <Row title="Architectures" value={report.architectures.join(", ") || "Unknown"} />
          <Row title="Devices" value={report.deviceFamilies.join(", ")} />
          <Row title="Provisioning Profile" value={report.hasProvisioningProfile ? "Present" : "Not embedded"} />
        </Group>

        <Group header="Test Results" footer="These are local static package checks. They do not prove that the app is trusted, signed by Apple, or able to launch.">
          {report.checks.map((check) => <CheckRow key={check.id} check={check} />)}
        </Group>

        <Group header="Native Execution" footer="The companion uses xcrun simctl install and xcrun simctl launch on a booted iOS Simulator. Your runner token is kept only in memory.">
          <div className="flex items-start gap-3 p-4">
            <Terminal size={22} className="mt-0.5 shrink-0 text-ios-label2" />
            <div className="text-[13px] leading-[19px] text-ios-label2">
              {report.nativeExecution === "launched" ? `Installed and launched on the connected macOS runner${report.nativeProcessId ? ` · PID ${report.nativeProcessId}` : ""}.` : report.nativeExecution === "failed" ? "The native launch did not complete. See the error below." : "Native launch has not run. Connect the authenticated macOS companion below to install and launch this development IPA."}
            </div>
          </div>
          <details className="border-t border-ios-sep px-4 py-3">
            <summary className="cursor-pointer text-[14px] font-semibold text-ios-blue">Connect macOS Runner</summary>
            <div className="mt-3 space-y-2">
              <input value={runnerUrl} onChange={(event) => setRunnerUrl(event.target.value)} placeholder="https://your-secure-runner.example" autoCapitalize="none" autoCorrect="off" className="w-full rounded-lg bg-ios-fill2 px-3 py-2.5 text-[13px] outline-none" />
              <input value={runnerToken} onChange={(event) => setRunnerToken(event.target.value)} type="password" placeholder="Runner bearer token" autoComplete="off" className="w-full rounded-lg bg-ios-fill2 px-3 py-2.5 text-[13px] outline-none" />
              <button disabled={runnerBusy || !runnerUrl || !runnerToken} onClick={() => void runNative()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ios-green py-2.5 text-[14px] font-semibold text-white disabled:opacity-45">
                {runnerBusy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Play size={17} fill="currentColor" />}
                {runnerBusy ? "Uploading & Launching…" : "Upload & Launch on Mac"}
              </button>
              {runnerMessage && <div role={runnerMessage.ok ? "status" : "alert"} className={`rounded-lg p-3 text-[12px] leading-[17px] ${runnerMessage.ok ? "bg-ios-green/10 text-ios-green" : "bg-ios-red/10 text-ios-red"}`}>{runnerMessage.text}</div>}
              <div className="text-[11px] leading-[16px] text-ios-label3">Requires tools/ipa-runner.mjs on a Mac with Xcode and a booted simulator. Use an HTTPS tunnel for a hosted browser.</div>
            </div>
          </details>
        </Group>

        <div className="mt-5 flex gap-3">
          <button onClick={() => downloadReport(report)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ios-blue py-3 text-[15px] font-semibold text-white active:opacity-70"><Download size={18} /> Export Report</button>
          <button disabled={runnerBusy} onClick={() => { setReport(null); setRunnerMessage(null); fileRef.current = null; clearIcon(); }} className="flex-1 rounded-xl bg-ios-fill2 py-3 text-[15px] font-semibold text-ios-blue active:opacity-70 disabled:opacity-40">Test Another IPA</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <input ref={inputRef} type="file" accept=".ipa,application/octet-stream" className="hidden" onChange={(event) => void inspect(event.target.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void inspect(event.dataTransfer.files[0]); }}
        className={`flex w-full flex-col items-center rounded-[18px] border-2 border-dashed px-7 py-10 text-center transition-colors active:opacity-70 ${dragging ? "border-ios-blue bg-ios-blue/10" : "border-ios-fill2 bg-ios-cell"}`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ios-blue text-white"><Upload size={29} /></div>
        <div className="mt-4 text-[20px] font-bold">Choose an IPA</div>
        <div className="mt-1 text-[14px] text-ios-label2">or drag and drop it here</div>
        <div className="mt-3 text-[12px] text-ios-label3">.ipa · up to 512 MB · analyzed on this device</div>
      </button>

      {error && <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl bg-ios-red/10 p-4 text-[13px] leading-[18px] text-ios-red"><AlertTriangle size={20} className="shrink-0" /><div>{error}</div></div>}

      <Group header="What Gets Tested">
        <Row icon={PackageOpen} iconBg="#0a84ff" title="Package & Metadata" subtitle="ZIP structure, Info.plist, bundle ID, versions, and devices" />
        <Row icon={FileBox} iconBg="#5e5ce6" title="Executable" subtitle="Mach-O header and arm64/x86_64 architectures" />
        <Row icon={ShieldCheck} iconBg="#34c759" title="Signing Resources" subtitle="Checks for code resources and an embedded provisioning profile" />
      </Group>

      <Group footer="Your IPA never leaves this browser tab. Closing or reloading the tab discards the uploaded package and report.">
        <div className="flex items-start gap-3 p-4"><Lock size={19} className="mt-0.5 shrink-0 text-ios-green" /><div className="text-[13px] leading-[19px] text-ios-label2"><span className="font-semibold text-ios-label">Private by design.</span> Analysis runs entirely in browser memory; no server upload occurs.</div></div>
      </Group>

      <div className="mt-4 rounded-xl bg-ios-orange/10 p-4 text-[13px] leading-[19px] text-ios-label2"><span className="font-semibold text-ios-orange">Native execution requires macOS.</span> This tool performs real static IPA analysis, but a web browser cannot launch native iOS applications.</div>
    </div>
  );
}
