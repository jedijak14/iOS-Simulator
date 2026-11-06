import { inflateSync, Inflate } from "fflate";

export type IPACheckStatus = "pass" | "warn" | "fail";

export interface IPACheck {
  id: string;
  label: string;
  status: IPACheckStatus;
  detail: string;
}

export interface IPAReport {
  schemaVersion: 1;
  analyzedAt: string;
  fileName: string;
  fileSize: number;
  appName: string;
  bundleId: string;
  version: string;
  build: string;
  minimumIOS: string;
  platform: string;
  executable: string;
  architectures: string[];
  deviceFamilies: string[];
  appBundle: string;
  hasCodeResources: boolean;
  hasProvisioningProfile: boolean;
  nativeExecution: "not-run" | "launched" | "failed";
  nativeProcessId?: number;
  checks: IPACheck[];
}

export interface IPAAnalysis {
  report: IPAReport;
  icon?: Uint8Array;
}

interface ZipEntry {
  name: string;
  method: number;
  flags: number;
  compressedSize: number;
  size: number;
  localOffset: number;
}

const textDecoder = new TextDecoder();
const MAX_IPA_BYTES = 512 * 1024 * 1024;
const MAX_PLIST_BYTES = 4 * 1024 * 1024;
const MAX_ICON_BYTES = 8 * 1024 * 1024;

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function zipEntries(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < 22) throw new Error("This file is too small to be a valid ZIP/IPA package.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const earliest = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= earliest; i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This file is not a valid ZIP/IPA package.");
  const count = u16(view, eocd + 10);
  const centralOffset = u32(view, eocd + 16);
  if (count === 0xffff || centralOffset === 0xffffffff) throw new Error("ZIP64 IPAs larger than 4 GB are not supported by the in-browser tester.");
  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > bytes.length || u32(view, cursor) !== 0x02014b50) throw new Error("The IPA has a damaged ZIP directory.");
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const entry: ZipEntry = {
      name: textDecoder.decode(nameBytes),
      flags: u16(view, cursor + 8),
      method: u16(view, cursor + 10),
      compressedSize: u32(view, cursor + 20),
      size: u32(view, cursor + 24),
      localOffset: u32(view, cursor + 42),
    };
    if (entry.compressedSize === 0xffffffff || entry.size === 0xffffffff || entry.localOffset === 0xffffffff) throw new Error("This IPA uses ZIP64 entry sizes, which are not supported by the in-browser tester.");
    entries.push(entry);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function entryDataStart(bytes: Uint8Array, entry: ZipEntry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (entry.localOffset + 30 > bytes.length || u32(view, entry.localOffset) !== 0x04034b50) throw new Error(`Damaged local ZIP header for ${entry.name}.`);
  const nameLength = u16(view, entry.localOffset + 26);
  const extraLength = u16(view, entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  if (start + entry.compressedSize > bytes.length) throw new Error(`Truncated ZIP data for ${entry.name}.`);
  return start;
}

function inflateEntry(bytes: Uint8Array, entry: ZipEntry, limit = Infinity, partial = false): Uint8Array {
  if (entry.flags & 1) throw new Error(`Encrypted ZIP entries are not supported (${entry.name}).`);
  if (!partial && entry.size > limit) throw new Error(`${entry.name} is too large to inspect safely.`);
  const start = entryDataStart(bytes, entry);
  const compressed = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) {
    const result = compressed.slice(0, Math.min(compressed.length, limit));
    if (!partial && result.length !== entry.size) throw new Error(`Size mismatch while extracting ${entry.name}.`);
    return result;
  }
  if (entry.method !== 8) throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}.`);
  if (limit === Infinity) {
    const result = inflateSync(compressed);
    if (result.length !== entry.size) throw new Error(`Size mismatch while extracting ${entry.name}.`);
    return result;
  }

  const chunks: Uint8Array[] = [];
  let outputSize = 0;
  const inflater = new Inflate((chunk) => {
    chunks.push(chunk);
    outputSize += chunk.length;
  });
  for (let offset = 0; offset < compressed.length && outputSize < limit; offset += 65536) {
    inflater.push(compressed.subarray(offset, Math.min(offset + 65536, compressed.length)), false);
  }
  const output = new Uint8Array(Math.min(outputSize, limit));
  let written = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.min(chunk.length, output.length - written));
    output.set(slice, written);
    written += slice.length;
    if (written >= output.length) break;
  }
  return output;
}

function parseXMLPlist(bytes: Uint8Array): Record<string, unknown> {
  const xml = textDecoder.decode(bytes);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Info.plist contains invalid XML.");
  const root = doc.documentElement;
  const parse = (node: Element): unknown => {
    const children = Array.from(node.children);
    switch (node.localName) {
      case "dict": {
        const result: Record<string, unknown> = {};
        for (let i = 0; i < children.length - 1; i += 2) {
          if (children[i].localName === "key") result[children[i].textContent ?? ""] = parse(children[i + 1]);
        }
        return result;
      }
      case "array":
        return children.map(parse);
      case "string":
      case "date":
      case "data":
        return node.textContent ?? "";
      case "integer":
        return Number(node.textContent ?? 0);
      case "real":
        return Number(node.textContent ?? 0);
      case "true":
        return true;
      case "false":
        return false;
      default:
        return children[0] ? parse(children[0]) : null;
    }
  };
  const value = parse(root);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Info.plist does not contain a bundle dictionary.");
  return value as Record<string, unknown>;
}

function parseBinaryPlist(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.length < 40 || textDecoder.decode(bytes.subarray(0, 8)) !== "bplist00") throw new Error("Invalid binary plist header.");
  const trailer = bytes.length - 32;
  const offsetSize = bytes[trailer + 6];
  const refSize = bytes[trailer + 7];
  const readUInt = (offset: number, width: number) => {
    if (width < 1 || width > 8 || offset + width > bytes.length) throw new Error("Invalid binary plist integer.");
    let value = 0n;
    for (let i = 0; i < width; i++) value = (value << 8n) | BigInt(bytes[offset + i]);
    return value;
  };
  const asNumber = (value: bigint) => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Binary plist value exceeds the supported range.");
    return Number(value);
  };
  const objectCount = asNumber(readUInt(trailer + 8, 8));
  const topObject = asNumber(readUInt(trailer + 16, 8));
  const offsetTable = asNumber(readUInt(trailer + 24, 8));
  if (offsetTable + objectCount * offsetSize > trailer) throw new Error("Invalid binary plist offset table.");
  const offsets = Array.from({ length: objectCount }, (_, i) => asNumber(readUInt(offsetTable + i * offsetSize, offsetSize)));
  const cache = new Map<number, unknown>();

  const parseObject = (index: number, depth = 0): unknown => {
    if (depth > 100 || index >= objectCount) throw new Error("Invalid binary plist object graph.");
    if (cache.has(index)) return cache.get(index);
    const start = offsets[index];
    const marker = bytes[start];
    const kind = marker >> 4;
    const info = marker & 15;
    const lengthAt = (position: number, nibble: number) => {
      if (nibble < 15) return { length: nibble, next: position };
      const intMarker = bytes[position];
      if ((intMarker >> 4) !== 1) throw new Error("Invalid extended binary plist length.");
      const width = 1 << (intMarker & 15);
      return { length: asNumber(readUInt(position + 1, width)), next: position + 1 + width };
    };
    const { length, next } = lengthAt(start + 1, info);
    let value: unknown;
    switch (kind) {
      case 0:
        value = info === 8 ? false : info === 9 ? true : null;
        break;
      case 1:
        value = asNumber(readUInt(next, 1 << info));
        break;
      case 2: {
        const width = 1 << info;
        const view = new DataView(bytes.buffer, bytes.byteOffset + next, width);
        value = width === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
        break;
      }
      case 3: {
        if (info !== 3) throw new Error("Invalid binary plist date.");
        const seconds = new DataView(bytes.buffer, bytes.byteOffset + next, 8).getFloat64(0, false);
        value = new Date((seconds + 978307200) * 1000).toISOString();
        break;
      }
      case 4:
        value = bytes.slice(next, next + length);
        break;
      case 5:
        value = textDecoder.decode(bytes.subarray(next, next + length));
        break;
      case 6: {
        const units = new Uint16Array(length);
        for (let i = 0; i < length; i++) units[i] = (bytes[next + i * 2] << 8) | bytes[next + i * 2 + 1];
        value = String.fromCharCode(...units);
        break;
      }
      case 8:
        value = asNumber(readUInt(next, info + 1));
        break;
      case 10:
      case 12: {
        const array: unknown[] = [];
        cache.set(index, array);
        for (let i = 0; i < length; i++) array.push(parseObject(asNumber(readUInt(next + i * refSize, refSize)), depth + 1));
        return array;
      }
      case 13: {
        const dict: Record<string, unknown> = {};
        cache.set(index, dict);
        const values = next + length * refSize;
        for (let i = 0; i < length; i++) {
          const key = parseObject(asNumber(readUInt(next + i * refSize, refSize)), depth + 1);
          dict[String(key)] = parseObject(asNumber(readUInt(values + i * refSize, refSize)), depth + 1);
        }
        return dict;
      }
      default:
        throw new Error(`Unsupported binary plist object type 0x${kind.toString(16)}.`);
    }
    cache.set(index, value);
    return value;
  };

  const result = parseObject(topObject);
  if (!result || typeof result !== "object" || Array.isArray(result) || result instanceof Uint8Array) throw new Error("Binary Info.plist does not contain a bundle dictionary.");
  return result as Record<string, unknown>;
}

function parsePlist(bytes: Uint8Array) {
  return textDecoder.decode(bytes.subarray(0, 8)) === "bplist00" ? parseBinaryPlist(bytes) : parseXMLPlist(bytes);
}

function stringValue(value: unknown, fallback = "Unknown") {
  return typeof value === "string" && value.trim() ? value : typeof value === "number" ? String(value) : fallback;
}

function architectures(header: Uint8Array): string[] {
  if (header.length < 8) return [];
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const magicBE = view.getUint32(0, false);
  const cpuName = (cpu: number) => cpu === 0x0100000c ? "arm64" : cpu === 0x01000007 ? "x86_64" : cpu === 12 ? "armv7" : `CPU 0x${cpu.toString(16)}`;
  if (magicBE === 0xcafebabe || magicBE === 0xcafebabf) {
    const is64 = magicBE === 0xcafebabf;
    const count = Math.min(view.getUint32(4, false), 32);
    const result: string[] = [];
    const archSize = is64 ? 32 : 20;
    for (let i = 0; i < count && 8 + (i + 1) * archSize <= header.length; i++) result.push(cpuName(view.getUint32(8 + i * archSize, false)));
    return [...new Set(result)];
  }
  const magicLE = view.getUint32(0, true);
  if (magicLE === 0xfeedface || magicLE === 0xfeedfacf) return [cpuName(view.getUint32(4, true))];
  if (magicBE === 0xfeedface || magicBE === 0xfeedfacf) return [cpuName(view.getUint32(4, false))];
  return [];
}

function iconCandidates(plist: Record<string, unknown>) {
  const names = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string") names.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
  };
  collect(plist.CFBundleIconFiles);
  collect(plist.CFBundleIconName);
  const icons = plist.CFBundleIcons;
  if (icons && typeof icons === "object" && !Array.isArray(icons)) {
    const primary = (icons as Record<string, unknown>).CFBundlePrimaryIcon;
    if (primary && typeof primary === "object" && !Array.isArray(primary)) {
      collect((primary as Record<string, unknown>).CFBundleIconFiles);
      collect((primary as Record<string, unknown>).CFBundleIconName);
    }
  }
  return [...names];
}

function compareVersion(a: string, b: string) {
  const left = a.split(".").map((part) => Number(part.replace(/\D.*/, "")) || 0);
  const right = b.split(".").map((part) => Number(part.replace(/\D.*/, "")) || 0);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export async function analyzeIPA(file: File): Promise<IPAAnalysis> {
  if (!file.name.toLowerCase().endsWith(".ipa")) throw new Error("Choose a file with the .ipa extension.");
  if (file.size === 0) throw new Error("The selected IPA is empty.");
  if (file.size > MAX_IPA_BYTES) throw new Error("This IPA exceeds the 512 MB in-browser analysis limit.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = zipEntries(bytes);
  const infoEntries = entries.filter((entry) => /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry.name));
  if (infoEntries.length !== 1) throw new Error(`Expected one Payload/*.app/Info.plist, found ${infoEntries.length}.`);
  const infoEntry = infoEntries[0];
  const appBundle = infoEntry.name.slice(0, -"Info.plist".length);
  const plist = parsePlist(inflateEntry(bytes, infoEntry, MAX_PLIST_BYTES));
  const executable = stringValue(plist.CFBundleExecutable, "");
  if (!executable || executable.includes("/") || executable.includes("..")) throw new Error("Info.plist has no valid CFBundleExecutable.");
  const executableEntry = entries.find((entry) => entry.name === `${appBundle}${executable}`);
  const executableHeader = executableEntry ? inflateEntry(bytes, executableEntry, 65536, true) : new Uint8Array();
  const archs = architectures(executableHeader);
  const bundleId = stringValue(plist.CFBundleIdentifier);
  const appName = stringValue(plist.CFBundleDisplayName, stringValue(plist.CFBundleName, file.name.replace(/\.ipa$/i, "")));
  const minimumIOS = stringValue(plist.MinimumOSVersion, "Not specified");
  const families = Array.isArray(plist.UIDeviceFamily) ? plist.UIDeviceFamily.map((id) => id === 1 ? "iPhone" : id === 2 ? "iPad" : `Device family ${id}`) : ["Not specified"];
  const hasCodeResources = entries.some((entry) => entry.name === `${appBundle}_CodeSignature/CodeResources`);
  const hasProvisioningProfile = entries.some((entry) => entry.name === `${appBundle}embedded.mobileprovision`);
  const checks: IPACheck[] = [
    { id: "package", label: "IPA package structure", status: "pass", detail: `ZIP container and ${appBundle.replace(/^Payload\//, "")} bundle are readable.` },
    { id: "metadata", label: "Bundle metadata", status: bundleId === "Unknown" ? "fail" : "pass", detail: bundleId === "Unknown" ? "CFBundleIdentifier is missing." : `${bundleId} · Minimum iOS ${minimumIOS}` },
    { id: "executable", label: "Native executable", status: !executableEntry ? "fail" : archs.length ? "pass" : "fail", detail: !executableEntry ? `${executable} is missing from the app bundle.` : archs.length ? `${executable}: ${archs.join(", ")}` : "The executable is not a recognized Mach-O binary." },
    { id: "signature", label: "Signing resources", status: hasCodeResources ? "pass" : "warn", detail: hasCodeResources ? "_CodeSignature/CodeResources is present. Cryptographic trust and provisioning were not verified." : "No _CodeSignature/CodeResources found. A native installation would require a valid signature." },
    { id: "compatibility", label: "Declared OS compatibility", status: minimumIOS !== "Not specified" && compareVersion(minimumIOS, "17.0") > 0 ? "warn" : "pass", detail: minimumIOS === "Not specified" ? "MinimumOSVersion is not declared." : compareVersion(minimumIOS, "17.0") > 0 ? `Requires iOS ${minimumIOS}; this simulator presents an iOS 17 environment.` : `Minimum iOS ${minimumIOS} is within the presented iOS 17 environment.` },
    { id: "runtime", label: "Native launch test", status: "warn", detail: "Not run. Native IPA execution requires a macOS iOS Simulator or device runner; browser JavaScript cannot execute iOS ARM binaries." },
  ];

  const names = iconCandidates(plist);
  const pngEntries = entries.filter((entry) => entry.name.startsWith(appBundle) && entry.name.endsWith(".png") && entry.size <= MAX_ICON_BYTES);
  const scored = pngEntries.map((entry) => {
    const base = entry.name.slice(appBundle.length).toLowerCase();
    let score = 0;
    if (names.some((name) => base.includes(name.toLowerCase()))) score += 100;
    if (base.includes("appicon")) score += 40;
    if (base.includes("@3x")) score += 12;
    else if (base.includes("@2x")) score += 8;
    if (base.includes("60x60")) score += 6;
    if (base.includes("notification") || base.includes("settings") || base.includes("spotlight")) score -= 30;
    return { entry, score };
  }).sort((a, b) => b.score - a.score);
  let icon: Uint8Array | undefined;
  if (scored.length && scored[0].score > 0) {
    try {
      icon = inflateEntry(bytes, scored[0].entry, MAX_ICON_BYTES);
    } catch {
      icon = undefined;
    }
  }

  return {
    icon,
    report: {
      schemaVersion: 1,
      analyzedAt: new Date().toISOString(),
      fileName: file.name,
      fileSize: file.size,
      appName,
      bundleId,
      version: stringValue(plist.CFBundleShortVersionString),
      build: stringValue(plist.CFBundleVersion),
      minimumIOS,
      platform: stringValue(plist.DTPlatformName, "iphoneos"),
      executable,
      architectures: archs,
      deviceFamilies: families,
      appBundle,
      hasCodeResources,
      hasProvisioningProfile,
      nativeExecution: "not-run",
      checks,
    },
  };
}
