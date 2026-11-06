# IPA package testing and native launch

Open **App Store → Test IPA**, or choose **Test IPA · Upload & analyze package** in the simulator's Developer controls.

## What works entirely in the browser

The tester accepts real `.ipa` files by file picker or drag-and-drop and analyzes them locally. The package is not sent to Vercel, Supabase, or any other service.

- ZIP/IPA structure and `Payload/*.app` discovery
- XML and binary `Info.plist` decoding
- App name, bundle ID, version/build, minimum iOS, platform, and device families
- App icon extraction when a matching PNG is present
- Mach-O executable discovery and arm64/x86_64 architecture inspection
- Presence of `_CodeSignature/CodeResources` and `embedded.mobileprovision`
- JSON report export

The analyzer reads only the executable's first 64 KiB when inspecting architecture, even for large apps. Files up to 512 MiB are supported; ZIP64 packages and packages over that limit are rejected rather than exhausting browser memory.

**These are static checks.** They do not cryptographically validate Apple signatures, provisioning, entitlements, or notarization. A warning in the Native Execution section is intentional: no native launch has occurred unless a companion runner explicitly returns success.

## Actual installation and launch on macOS

Native IPA execution cannot be performed by browser JavaScript. The repository includes an authenticated companion at `tools/ipa-runner.mjs` that performs real installation and launch through Xcode's `simctl`.

### Prerequisites

1. A Mac with Xcode and its command-line tools.
2. A booted iOS Simulator (`open -a Simulator`, or use `xcrun simctl boot <device-udid>`).
3. A development/ad-hoc IPA that is signed for that simulator environment. An App Store DRM/encrypted IPA is not made runnable by this tool.
4. Node.js 18 or newer.
5. An HTTPS tunnel to the companion if the browser is hosted. Do not expose the companion publicly without its token and origin restrictions.

### Start the companion

Generate a strong random secret locally, then start the runner with it:

```sh
cd iOS-Simulator
export IPA_RUNNER_TOKEN='replace-with-a-long-random-secret'
export IPA_RUNNER_ORIGIN='https://ios-simulator.vercel.app'
npm run ipa-runner
```

By default the companion listens on `127.0.0.1:8765` and installs to `booted`. Optional settings:

- `PORT` — listening port, default `8765`
- `IPA_RUNNER_HOST` — listening interface, default `127.0.0.1`
- `IPA_RUNNER_DEVICE` — simulator UDID or `booted`
- `IPA_RUNNER_ORIGIN` — comma-separated browser origins allowed by CORS

Expose the local listener through your trusted HTTPS tunnel. In the IPA report, open **Connect macOS Runner**, enter the tunnel's HTTPS origin and the bearer token, then choose **Upload & Launch on Mac**.

The runner executes the equivalent of:

```sh
xcrun simctl install booted /temporary/path/upload.ipa
xcrun simctl launch booted com.example.yourapp
```

It uses `execFile` with separate arguments, never a shell command built from upload metadata. A successful response updates the report to `nativeExecution: "launched"` and includes the process ID when `simctl` returns one. Installation and launch errors are returned to the report. Temporary IPA files are deleted after each attempt.

### Security notes

- `IPA_RUNNER_TOKEN` is mandatory and must contain at least 16 characters; use a longer random value in practice.
- The browser requires an HTTPS runner URL and keeps the token only in component memory. It is not written to localStorage or included in exported reports.
- Configure `IPA_RUNNER_ORIGIN` narrowly. The default allows the local Vite origin and `https://ios-simulator.vercel.app`.
- Uploads are limited to 512 MiB. The runner requires `Authorization: Bearer …` for health checks and runs.
- The companion is intentionally small and single-purpose. For shared or production use, put it behind your organization's authenticated tunnel and rotate tokens regularly.
