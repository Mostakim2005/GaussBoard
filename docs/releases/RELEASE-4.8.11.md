# GazBoard Release Dossier — v4.8.11

- **Release version:** `4.8.11`
- **Release date:** 2026-10-18
- **Base:** v4.8.10
- **Audit attribution:** Initial audit by Codex 4.6 Medium in Cursor; secondary audit and fixes by GPT-6 Luna High using Codex.
- **Git tag:** `v4.8.11` (local release tag).
- **Windows artifacts:** `dist-replay-fix/GazBoard-4.8.11-portable.exe` (107,277,884 bytes), `GazBoard-Setup-4.8.11.exe` (107,532,422 bytes), and installer blockmap (113,853 bytes). The ordinary `dist/` portable executable remained locked by the user's running app, so electron-builder emitted this verified build to a separate output folder.
- **Portable SHA-256:** `04DFD73E58A5626A20F62E51BBC1E0F4D08D96ABB8C56416D9801262EBA973FF`
- **Installer SHA-256:** `BC7BDF6B0A8469A531FA3BF1D34A0FE5A2DFC53C32C348B2A26305E22ED78E12`
- **Installer blockmap SHA-256:** `3CA45A2296D3B4D4AB873CED3AFB8A43F9E346841876E8BE0D5950001847AE5E`
- **Build toolchain:** electron-builder 26.15.3; Electron 43.5.0; Windows x64.

## User-visible changes

- Replay seeks remain authoritative while the media element is still completing a seek. Media lifecycle events retry and resolve pending positions instead of allowing the old media clock to overwrite the selected position.
- Live replay outlines now use a visible source-over feedback pass, including for highlighter strokes, while the original ink keeps its regular rendering behavior. A one-point replay prefix gets a tiny render-only segment so the outline is visible at stroke start.
- Replay camera follow now offers viewport, center-point, and center-zone framing. Center-zone keeps the animated point inside the middle 40% of the screen and pans only after it crosses the zone; the existing follow toggle remains available.
- Recording rename uses GazBoard's custom text dialog and commits an undoable `audioTracks` document update. The action menu chooses the side with more screen room and constrains its height for scrolling.
- Video export suggestions append a UTC timestamp and sanitize Windows-invalid filename characters.

## Implementation areas

- `src/js/core/replay.js`: pending seek authority, async seek resolution, active point lookup, and camera framing behavior.
- `src/js/app.js`: supplies the owning App to the primary board Surface so live rendering can access ReplayEngine.
- `src/js/core/surface.js`: source-over replay outline rendering and visible stroke-start feedback.
- `src/js/ui/audio-bar.js`: custom rename dialog, undoable persistence, camera framing selector, and measured menu placement.
- `src/js/export-video.js`: safe unique default video names.
- `src/locales/*.json`: translated labels for the camera framing selector and recording rename dialog.
- `test/replay-reading.test.mjs` and `test/audio-bar.test.mjs`: focused regression checks.

## Export-engine assessment

The current exporter stays on Chromium `canvas.captureStream()` and `MediaRecorder`; no new media backend was selected in this patch. WebCodecs is a possible optional backend for more direct codec and bitrate control, but it requires frame/audio timestamp orchestration and muxing, and runtime codec support checks. A bundled native FFmpeg backend offers the most mature output controls and likely strongest throughput, at the cost of larger distributions and more maintenance. `ffmpeg.wasm` is a poor fit for this desktop encoder path because the project runs in Electron and the project maintainers report that it is slower than native FFmpeg. Benchmark real board exports before replacing the current backend.

## Verification

- `npm run smoke:replay`: 13 passed, 0 failed (seek state, replay outline render, dead-zone camera, recording rename/persistence, adaptive menu placement, and unique filename rules).
- `npm run smoke:video`: 3 passed, 0 failed.
- `npm run smoke:custom`: passed after the live wiring correction; 13 general custom-feature, 10 replay, 3 video-framing, 2 protocol-security, 9 v4.8.4.1 Electron, and 8 v4.8.8 Electron checks.
- `node scripts/smoke.js`: 1,240 passed, 0 failed in the full regression run performed after the live wiring correction; it was not repeated during this packaging follow-up per the user's custom-only smoke request.
- `git diff --check`: passed.
- `npx electron-builder --win --config.directories.output=dist-replay-fix`: completed; generated Windows x64 portable EXE and NSIS installer. The regular `dist/` portable output was held open by the currently running GazBoard app, so it was left untouched.
- `node scripts/i18n-check.js`: 1,395/1,395 in each of ar, bn, de, es, pt-BR, zh-Hans, and zh-Hant.

## Post-tag live replay correction (2026-10-18)

### Why live replay failed while video export worked

Both paths use `Surface`, but instantiate it separately. `VideoExporter` passed `{ app: this.app }` into its temporary export Surface. The main board in `src/js/app.js` constructed its Surface with only the low-latency setting. Since the Surface stores `opts.app || null`, the live one had no path to the App's ReplayEngine. Its draw loop therefore could not render the live replay overlay; export still could. Reading/Writing mode was not the cause: it selects gesture/editing behavior, while replay rendering depends on the Surface's app reference, replay state, and audio-ink sync setting.

### What changed and how it works

The primary Surface now receives `app: this`. When replay sync is active, the normal frozen scene excludes strokes belonging to the selected audio session, and `Surface.drawReplaySession()` renders their timestamped points progressively in the dynamic overlay. The visible source-over feedback pass makes highlighter/replay outlines visible while the original stroke retains its normal blend behavior. Export and live playback now have the required app/replay context. The user confirmed the live board behavior works after this correction. See BUG-023 and F-120.

### Follow-up verification and package

The full regression run after the code correction passed 1,240/1,240. The release follow-up reran the feature-specific custom suites, rather than repeating base app smoke, per the user's request. Custom suite totals: 45 passed, 0 failed across six groups (13 + 10 + 3 + 2 + 9 + 8). Locale coverage passed 1,395/1,395 in all seven languages. The Windows x64 portable and NSIS builds completed in `dist-replay-fix/`; exact sizes and SHA-256 hashes are listed at the top of this dossier. Updated docs, replay source, smoke harness fix, and these artifacts were copied into the v4.8.11 archive after verification.

## Artifacts

The corrected portable EXE, installer, and blockmap are in `dist-replay-fix/`; the user's running `dist/GazBoard-4.8.11-portable.exe` was not interrupted or overwritten. Source, docs, tests, and rebuilt artifacts are copied to `C:\Users\kazir\Documents\Antigravity\GazBoard\V-4.8.11\`.
