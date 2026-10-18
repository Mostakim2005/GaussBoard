# GazBoard Release Dossier — v4.8.10

- **Release version:** `4.8.10`
- **Release date:** 2026-10-18
- **Base:** v4.8.9, including the earlier replay reliability and Reading/Writing mode changes in the working tree.
- **Audit attribution:** Initial audit by Codex 4.6 Medium in Cursor; secondary audit and fixes by GPT-6 Luna High using Codex.
- **Git tag:** `v4.8.10` (local release tag).
- **Windows artifacts:** `GazBoard-4.8.10-portable.exe` (107,275,427 bytes), `GazBoard-Setup-4.8.10.exe` (107,529,946 bytes), and installer blockmap (113,480 bytes).
- **Portable SHA-256:** `03973BF81C3D7CF66153217D2955547E91AA9E9428465D81D21C1366A2E78E48`
- **Installer SHA-256:** `090980707375E7F32F6851F3430B570A86DE4D161FDA0F54AFBE1B1F23746ED3`
- **Build toolchain:** electron-builder 26.15.3; Electron 43.5.0; Windows x64.

## User-visible changes

- **Live replay camera follow:** AudioBar has a saved toggle. When enabled, replay pans toward the active animated stroke when it is outside the visible board area. Turning it off cancels an in-progress replay camera glide.
- **Video export framing:** Choose a fixed view or follow the replay. Fixed view can fit the selected recording's ink bounds or the entire board, including page extents. Follow view eases the exported camera toward the active or next timestamped stroke.
- Both framing modes work for single recordings and stitched multi-session exports. When a recording has no associated ink, framing falls back to the current board view.

## Implementation

- `src/js/core/replay.js` reads `settings.replayCameraFollow` and follows an active stroke only when enabled.
- `src/js/ui/audio-bar.js` adds the persistent camera-follow control.
- `src/js/export-video.js` calculates recording and board bounds, exposes framing controls, and updates the offscreen camera from the audio playback clock.
- Locale dictionaries include the new control labels and options.

## Verification

- `npm run smoke:replay`: 7 passed, 0 failed.
- `npm run smoke:video`: 3 passed, 0 failed, including single-track framing-option forwarding.
- `node scripts/smoke.js --features-4.8.8`: 8 passed, 0 failed, including both framing-mode selections.
- `npm run smoke:custom`: passed (13 custom-feature, 7 replay, 3 video-framing, 2 protocol-security, 9 v4.8.4.1 Electron, and 8 v4.8.8 Electron checks).
- `node scripts/smoke.js`: 1,240 passed, 0 failed.
- `npm run dist:win`: completed; generated Windows x64 portable EXE and NSIS installer.
- Portable EXE startup: launched with an isolated temporary profile and remained running after startup; process was then stopped.
- `dist/latest.yml`: validated for v4.8.10 name/version, installer size, SHA-512 metadata, and blockmap.
- Translation parity checker was not run, following the user's standing request to defer translation testing.

## Artifacts

The portable executable and installer, including their hashes and byte sizes, are recorded above. The source and release documentation are archived in `C:\Users\kazir\Documents\Antigravity\GazBoard\V-4.8.10\` after verification. The video framing tests exercise the bounds and camera math plus dialog choices; a long-duration real-time media encode was not run as part of this release verification.
