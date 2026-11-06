#!/usr/bin/env node
/**
 * Authenticated macOS companion for native IPA installation/launch tests.
 * Requires Xcode's xcrun/simctl and a booted iOS Simulator (or IPA_RUNNER_DEVICE).
 */
import http from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.IPA_RUNNER_HOST || "127.0.0.1";
const TOKEN = process.env.IPA_RUNNER_TOKEN || "";
const DEVICE = process.env.IPA_RUNNER_DEVICE || "booted";
const MAX_BYTES = 512 * 1024 * 1024;
const origins = new Set((process.env.IPA_RUNNER_ORIGIN || "http://localhost:5173,https://ios-simulator.vercel.app").split(",").map((value) => value.trim()).filter(Boolean));

if (TOKEN.length < 16) {
  console.error("Set IPA_RUNNER_TOKEN to a random secret of at least 16 characters.");
  process.exit(1);
}
if (process.platform !== "darwin") console.warn("Warning: this companion is intended for macOS with Xcode simctl.");

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) return false;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Bundle-ID, X-IPA-Name");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store" });
  res.end(body);
}

function authorized(req) {
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

async function simctl(args) {
  return execFileAsync("xcrun", ["simctl", ...args], { timeout: 120000, maxBuffer: 1024 * 1024 });
}

async function readUpload(req) {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BYTES) throw Object.assign(new Error("IPA exceeds the 512 MB runner limit."), { status: 413 });
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) tooLarge = true;
    else chunks.push(chunk);
  }
  if (tooLarge) throw Object.assign(new Error("IPA exceeds the 512 MB runner limit."), { status: 413 });
  if (!size) throw Object.assign(new Error("Empty upload."), { status: 400 });
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  if (!cors(req, res)) return json(res, 403, { ok: false, error: "Origin is not allowed." });
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (!authorized(req)) return json(res, 401, { ok: false, error: "Invalid or missing bearer token." });

  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, platform: process.platform, device: DEVICE, maxBytes: MAX_BYTES });
  }

  if (req.method !== "POST" || req.url !== "/run") return json(res, 404, { ok: false, error: "Not found." });
  const bundleId = String(req.headers["x-bundle-id"] || "");
  if (!/^[a-z0-9.-]+$/i.test(bundleId) || bundleId.length > 255) return json(res, 400, { ok: false, error: "Invalid X-Bundle-ID header." });

  let directory;
  try {
    const ipa = await readUpload(req);
    directory = await mkdtemp(join(tmpdir(), "ios-sim-ipa-"));
    const path = join(directory, "upload.ipa");
    await writeFile(path, ipa, { flag: "wx" });
    const install = await simctl(["install", DEVICE, path]);
    const launch = await simctl(["launch", DEVICE, bundleId]);
    const launchOutput = `${launch.stdout || ""}${launch.stderr || ""}`.trim();
    const pidMatch = launchOutput.match(/:\s*(\d+)\s*$/);
    json(res, 200, {
      ok: true,
      bundleId,
      device: DEVICE,
      pid: pidMatch ? Number(pidMatch[1]) : null,
      installOutput: `${install.stdout || ""}${install.stderr || ""}`.trim(),
      launchOutput,
    });
  } catch (error) {
    const detail = error?.stderr || error?.message || String(error);
    json(res, error?.status || 500, { ok: false, error: String(detail).slice(0, 4000) });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`IPA runner listening on http://${HOST}:${PORT}`);
  console.log(`Device: ${DEVICE}. Allowed origins: ${[...origins].join(", ")}`);
  console.log("Expose it through an HTTPS tunnel before configuring a hosted web client.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
