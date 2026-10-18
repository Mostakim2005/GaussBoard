# GazBoard Release Dossier — v4.8.11

- **Release version:** `4.8.11`
- **Release date:** 2026-10-18
- **Base:** v4.8.10
- **Audit attribution:** Initial audit by Codex 4.6 Medium in Cursor; secondary audit and fixes by GPT-6 Luna High using Codex.
- **Git tag:** `v4.8.11` (local release tag).
- **Windows artifacts:** `GazBoard-4.8.11-portable.exe` (107,277,397 bytes), `GazBoard-Setup-4.8.11.exe` (107,531,929 bytes), and installer blockmap (113,562 bytes).
- **Portable SHA-256:** `E4E2F96FAE77E57FB0CC814546895F64A779A2586E0DD177A84EE576E35A7019`
- **Installer SHA-256:** `EF1514E7A2B57C721203A063457A6C6BBD7BA7485B519E9F9BAA7A2753455275`
- **Build toolchain:** electron-builder 26.15.3; Electron 43.5.0; Windows x64.

## User-visible changes

- Replay seeks remain authoritative while the media element is still completing a seek. Media lifecycle events retry and resolve pending positions instead of allowing the old media clock to overwrite the selected position.
- Live replay outlines now use a visible source-over feedback pass, including for highlighter strokes, while the original ink keeps its regular rendering behavior. A one-point replay prefix gets a tiny render-only segment so the outline is visible at stroke start.
- Replay camera follow now offers viewport, center-point, and center-zone framing. Center-zone keeps the animated point inside the middle 40% of the screen and pans only after it crosses the zone; the existing follow toggle remains available.
- Recording rename uses GazBoard's custom text dialog and commits an undoable `audioTracks` document update. The action menu chooses the side with more screen room and constrains its height for scrolling.
- Video export suggestions append a UTC timestamp and sanitize Windows-invalid filename characters.

## Implementation areas

- `src/js/core/replay.js`: pending seek authority, async seek resolution, active point lookup, and camera framing behavior.
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
- `npm run smoke:custom`: passed; 13 general custom-feature, 10 replay, 3 video-framing, 2 protocol-security, 9 v4.8.4.1 Electron, and 8 v4.8.8 Electron checks.
- `node scripts/smoke.js`: 1,240 passed, 0 failed, including the repository's in-suite locale coverage.
- `git diff --check`: passed.
- `npm run dist:win`: completed; generated Windows x64 portable EXE and NSIS installer.
- Standalone `node scripts/i18n-check.js` was not run, following the user's request to defer standalone translation testing.

## Artifacts

The portable EXE and installer are in `dist/`. Source, docs, tests, and build artifacts are copied to `C:\Users\kazir\Documents\Antigravity\GazBoard\V-4.8.11\` after verification.
