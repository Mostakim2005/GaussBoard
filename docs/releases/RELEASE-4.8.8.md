# GazBoard Release Dossier — v4.8.8

- **Release version:** `4.8.8`
- **Release date:** 2026-10-18
- **Base:** cumulative v4.8.1–v4.8.7 feature line, with the audit fixes listed below
- **Audit attribution:** Initial audit by Codex 4.6 Medium in Cursor; secondary audit and fixes by GPT-6 Luna High using Codex.
- **Windows artifacts:** `GazBoard-4.8.8-portable.exe` (107,270,761 bytes) and `GazBoard-Setup-4.8.8.exe` (107,525,358 bytes).
- **Portable SHA-256:** `64B38D7E16ED93F6230DFFA90F4BCAC7FA69DBD7AFC1C4A59E585AE2EF9C3A9C`
- **Installer SHA-256:** `B08894B5D16CB851C6D787B44F6B3DEF3894562D99FC4ED4D9C7045E608258F8`
- **Build toolchain:** electron-builder 26.15.3; Electron 43.5.0; Windows x64.

## Overview

Version 4.8.8 consolidates the advertised 4.8.2–4.8.7 additions and the follow-up fixes from the custom-feature audit. It preserves the existing inking choices and adds Catmull–Rom/Bézier as a distinct selectable engine.

## Changes in this release

- Adds a selectable Catmull–Rom/Bézier inking engine while retaining GazBoard Default, Windows Ink, and Perfect Freehand. Engine changes invalidate cached stroke geometry; stored sample timestamps and metadata are preserved.
- Adds an adjustable 10–100% pen opacity control alongside the existing opacity toggle.
- Extends tag filtering to custom templates as well as boards. Template filtering supports multiple selected tags; custom templates can carry editable tags.
- Adds 720p30, 1080p30, and 1080p60 video export presets.
- Draws per-page margin guides on the board canvas and keeps validated margin data through page cleaning and saving. The guides are not included in exported images/video/PDF layouts and do not prevent writing outside the margins.
- Adds filled, open, stealth, and diamond connector/shape arrowheads, including vector export support.
- Resolves imported audio duration from media metadata when available; avoids inventing a 60-second duration when metadata is unavailable.
- Revokes temporary media URLs and adds bounded metadata loading and download cleanup.
- Hardens the privileged `app:` resource path boundary against sibling-prefix traversal.
- Includes earlier 4.8.4.1 crop undo/cancel, crop-bound, and isolated video-export lifecycle fixes.

## Verification

Commands:

```powershell
node --test test/custom-features.test.mjs test/path-security.test.cjs
npm run smoke:features:4.8.8
npm run smoke:custom
node scripts/smoke.js
```

Results:

- Mandatory regression smoke: **1,240 passed, 0 failed**.
- Custom Node feature checks: **13 passed, 0 failed**.
- App protocol path-security checks: **2 passed, 0 failed**.
- Focused 4.8.4.1 Electron checks: **9 passed, 0 failed**.
- Focused 4.8.8 Electron checks: **3 passed, 0 failed**.
- Windows portable and NSIS installer builds completed successfully.

The Electron smoke suites were run with unique `GAZBOARD_USER_DATA` folders after Windows denied clearing the shared smoke temp folder. The regular `node scripts/smoke.js` run with an isolated folder completed successfully. Translation verification with standalone `scripts/i18n-check.js` was intentionally deferred at the user's request; the mandatory full smoke includes its own locale assertions, but translation quality was not separately audited.

## Known limitations

- Page margin guides are a visual writing aid only; they are not enforced as a clipping/print area in PDF or other exports.
- Video presets are exercised through the export dialog and configuration path. The custom smoke suite does not encode a full-duration real Windows MediaRecorder output.
- External audio import depends on the host's media decoder for metadata; unknown duration is retained as unknown rather than guessed.

## Audit record

See [`AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md`](AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md) for the feature inventory and prior release boundaries. See `test/custom-features.test.mjs`, `test/path-security.test.cjs`, and `test/smoke-features-4.8.8.js` for automated coverage.
