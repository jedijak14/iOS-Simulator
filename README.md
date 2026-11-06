# iOS Simulator — Enhanced (v3)

An interactive iPhone simulator that runs in the browser. Built with React 19, TypeScript, Vite, Tailwind 4, Zustand. **Real iOS app icons** from iosicongallery.com. **Real iOS system sounds** (lock, unlock, message, charge, shutter, alarm, ringtone, boot). Plus all-new pro features.

## Windows desktop app

A Windows installer is built by the GitHub Actions **Build Windows desktop app** workflow. See [IPA_TESTING.md](IPA_TESTING.md#windows-desktop-app) for download, build, and native execution requirements. Native iOS execution requires a separate Mac and a simulator-compatible build.

## ⚡ Quick start — open `ios-simulator.html`

**Just open `ios-simulator.html` in any modern browser** (Chrome, Firefox, Safari, Edge). It's a single self-contained file (976 KB) with all JavaScript, CSS, fonts, sounds, and icons bundled or referenced via CDN. No install, no build step, no server needed.

- ✅ Works offline (sounds bundled as base64; icons need internet on first load, then cached)
- ✅ Persists your settings and data to `localStorage`
- ✅ If you see "Loading iOS Simulator…" for more than a few seconds, your browser may have JavaScript disabled — enable it and reload.

## Two ways to run

1. **Single-file build (RECOMMENDED)** — open `ios-simulator.html` directly in any modern browser. Sounds are bundled as base64 data URIs so it works completely offline. (976 KB, gzips to ~290 KB.)

2. **Source project** — `cd ios-simulator && npm install && npm run dev` (Vite dev server on port 5173) or `npm run build` to regenerate `dist/`. With the source project, the 16 real iOS sound files live in `public/sounds/`.

   ⚠️ **Don't open the source project's `index.html` directly** — it won't work because it references `/src/main.tsx` which only resolves through the Vite dev server or build. Use `ios-simulator.html` for direct-to-browser usage, or run `npm run dev`.

## Troubleshooting

**"It's just a black screen"**
- Make sure you're opening `ios-simulator.html` (the single-file build), NOT `ios-simulator/index.html` (the source).
- Make sure JavaScript is enabled in your browser.
- Try a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to clear cached state.
- If you had an older version installed, the localStorage may be stale. Open the browser console and run `Object.keys(localStorage).filter(k=>k.startsWith('ios-sim')).forEach(k=>localStorage.removeItem(k))` then reload.

**Icons not showing**
- The real iOS icons load from `cdn.jim-nielsen.com`. If you're offline or that CDN is blocked, the simulator falls back to SVG art automatically. Check your network connection.

**Sounds not playing**
- Browsers require a user interaction (click/tap) before audio can play. Click anywhere on the simulator once and sounds will work.
- Sounds are bundled as base64 data URIs in the single-file build, so they work offline.

## IPA testing

Open **App Store → Test IPA** to upload and analyze real `.ipa` packages locally: XML/binary `Info.plist`, bundle metadata, Mach-O architectures, signing-resource presence, and JSON reports. No server upload occurs during local analysis.

For actual native installation and launch, an authenticated macOS companion is included at `tools/ipa-runner.mjs` (`npm run ipa-runner`). It uses real `xcrun simctl install` / `launch` commands. Browser-only environments cannot execute iOS ARM binaries, and the UI never reports a native launch unless the companion returns success. See [IPA_TESTING.md](IPA_TESTING.md) for setup, security, and limitations.

## What's new in v3

### Real iOS app icons (from iosicongallery.com)

- Every registered simulator app now uses artwork from **iOS Icon Gallery**, loaded from `cdn.jim-nielsen.com` — including Apple system apps, third-party apps, and all built-in games.
- Phone, Messages, Mail, Safari, Music, Clock, Maps, Camera, Reminders, Notes, Stocks, Wallet, Photos, Weather, Calendar, Contacts, FaceTime, Health, Translate, Files, Shortcuts, Journal, Tips, Find My, Magnifier, Podcasts, News, Books, Fitness, TV, Freeform, Home, iTunes, Passwords, GarageBand, iMovie, Keynote, Numbers, Pages, TestFlight, App Store Connect, Apple Store.
- Real third-party app icons too: **Spotify, YouTube, YouTube Music, Instagram, Snapchat, DuckDuckGo**.
- For the few built-in Apple utilities not listed separately in the gallery, the closest available Apple/gallery artwork is used.
- The `AppIcon` component gracefully falls back to the original SVG art only if gallery artwork fails to load.
- All gallery icons are preloaded on app start for instant rendering.

### Real iOS system sounds (16 sounds)

Loaded from the [extratone/iOSSystemSounds](https://github.com/extratone/iOSSystemSounds) repo, converted to small MP3s (under 25 KB each), and preloaded as AudioBuffers:

| Sound | Used for |
|---|---|
| `lock.m4a` | Lock screen lock |
| `AutoUnlock_Haptic.m4a` | Unlock |
| `ReceivedMessage.m4a` | Notification tri-tone, message received |
| `SentMessage.m4a` | Message sent |
| `connect_power.m4a` | Charging chime |
| `photoShutter.m4a` | Camera shutter |
| `key_press_click.m4a` | Keyboard tick (synthesized fallback used for speed) |
| `new-mail.m4a` | Mail received |
| `Alarm_Haptic.m4a` | Alarm |
| `Ringtone_US_Haptic.m4a` | Ringtone |
| `Tink.m4a` / `Tock.m4a` | UI ticks |
| `SystemStartup_Haptic.m4a` | Boot chord |
| `payment_success.m4a` | Apple Pay success (Wallet) |
| `payment_failure.m4a` | Apple Pay failure |
| `vc~ringing.m4a` | FaceTime ringback |

Each `sfx.X()` method tries the real iOS sound first, falling back to the synthesized WebAudio version if the buffer isn't loaded yet.

### Sidebar always visible

The right-side **Simulator control panel** is now always visible (was hidden below 880px viewport). It auto-shrinks from 280px to 220px on narrow screens. The phone auto-scales to fit.

### StandBy Mode (iOS 17+)

Click "StandBy Mode" in the simulator panel (or press the hardware button) to enter a full-screen landscape desk-clock mode. Auto-rotates through three views every 8 seconds:

1. **Clock** — huge 140px tabular-num time display
2. **Widgets** — time on left, weather + next event on right
3. **Photo** — full-bleed photo slideshow

Tap anywhere to exit.

### Split View (iPadOS-style multitasking)

Click "Split View" in the simulator panel to launch the current app side-by-side with Notes (or Safari + Notes by default). Features:

- **Draggable divider** between the two apps (25%–75% range)
- **Swap button** to flip the apps
- **Exit button** to leave Split View
- Each app runs its full component independently

### AirDrop dropzone

Two ways to trigger:

1. **Drag and drop** any file from your desktop onto the simulator window — a full-screen dropzone appears with "Drop to AirDrop" prompt.
2. Click "Drop a file (or click) → AirDrop" in the simulator panel to use a file picker.
3. Or click "Simulate AirDrop · Incoming file" for a quick demo.

The AirDrop overlay shows:
- File name, size, type (image/file)
- "AirPods Pro wants to share…" prompt
- **Accept / Decline** buttons
- Progress bar during transfer
- ✓ Saved confirmation
- Auto-saves images to Photos, files to Files

### Lock Screen customization (long-press)

Long-press anywhere on the Lock Screen (hold for 600ms) to open the customization editor:

- **Clock Color** — 10 swatches (white, orange, red, pink, purple, blue, cyan, green, gray, yellow) with glow effect for non-white colors
- **Font** — System / Rounded / Serif
- **Wallpaper** — pick from the 8 built-in wallpapers
- Selections persist to `localStorage`

### App Store with real third-party apps

The App Store now has 5 installable third-party apps in addition to the Apple apps:

- **Spotify** — full music app stub with home/search/library tabs, playlists, artists
- **YouTube** — video feed stub with thumbnails, durations, channel info
- **Instagram** — social feed stub with stories row, posts with likes
- **Snapchat** — stub app
- **DuckDuckGo** — stub app

Tap **Get** to install any of them with a progress ring; the icon appears on your home screen. Each opens with a realistic-looking stub UI.

### Wallet pass creation

The Wallet app now has a **+ Add Pass** button. Create your own:

- 3 pass types: Event Ticket, Boarding Pass, Library Card (each with its own gradient)
- Name + subtitle fields
- Auto-generated barcode on the pass
- Passes persist to `localStorage` across sessions

### Real Apple Pay sound

When the Wallet Apple Pay flow completes, it now plays the real iOS `payment_success.m4a` chime instead of the synthesized charge sound.

## Features from previous versions (still here)

- 30+ apps with realistic stubs (Contacts, FaceTime, Health, Translate, Files, Shortcuts, Journal, Tips, Find My, Magnifier, etc.)
- Self-rendered canvas Maps app (real OSM tiles, drag/zoom, locate-me, scale bar)
- Layered WebAudio sound engine (synthesized fallbacks for everything)
- Real Share Sheet (AirDrop/Messages/Mail/Notes/Reminders/Photos/Copy)
- More Focus modes (DND/Personal/Work/Sleep) with Control Center picker
- Live Activities in Dynamic Island (workout, delivery)
- Per-app notification settings
- Reminders with due-date picker
- Stocks news clickable → Safari
- Siri recognizes "open <app>" for all 30+ apps + new Focus commands
- Inter + Inter Tight web fonts for SF Pro–like typography
- Tabular numerals + tight letter spacing app-wide
- Spring sheet animations, thicker vibrancy, iOS 17 polish

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` / `H` | Home |
| `L` | Lock / wake |
| `S` | App switcher |
| `C` | Control Center |
| `N` | Notifications |
| `/` | Spotlight |
| `I` | Siri |
| `D` | Toggle dark mode |

## Files in this download

- **`ios-simulator.html`** — single 973 KB HTML file with sounds bundled as base64. Opens directly in any browser, no install needed.
- **`ios-simulator/`** — full source project. Run `npm install && npm run dev` to start the dev server, or `npm run build` to regenerate `dist/`. Sounds live in `public/sounds/`.
- **`README.md`** — this file.

## Tech stack

- React 19.2 + TypeScript 5.9
- Vite 7.3 + `vite-plugin-singlefile`
- Tailwind 4 (via `@tailwindcss/vite`)
- Zustand 5 (with `persist` middleware)
- lucide-react for icons
- WebAudio for the layered sound engine + procedural music
- HTML5 Canvas for the self-rendered Maps app
- Real iOS app icons from iosicongallery.com (cdn.jim-nielsen.com)
- Real iOS system sounds from github.com/extratone/iOSSystemSounds
- `getUserMedia` / `MediaRecorder` / `DeviceOrientationEvent` / `Geolocation` for hardware features
- Inter + Inter Tight (Google Fonts) as the SF Pro fallback typography
