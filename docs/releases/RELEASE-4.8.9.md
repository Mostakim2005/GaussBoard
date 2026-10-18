# GazBoard Release Dossier — v4.8.9

- **Release version:** `4.8.9`
- **Release date:** 2026-10-18
- **Base:** v4.8.8, with the video-driven Study Tape and answer-cover interaction fixes
- **Audit attribution:** Initial audit by Codex 4.6 Medium in Cursor; secondary audit and fixes by GPT-6 Luna High using Codex.
- **Git tag:** `v4.8.9` (created locally; remote push is pending GitHub authentication)
- **Windows artifacts:** `GazBoard-4.8.9-portable.exe` (107,270,755 bytes), `GazBoard-Setup-4.8.9.exe` (107,525,327 bytes), and installer blockmap (113,644 bytes).
- **Portable SHA-256:** `0229340AFC24407E5691B419997C041547FDDDD5DA7968DBD6C6B9F7663CF55C`
- **Installer SHA-256:** `EC545BC4F9044E2340BFEB65C97B25EEE16BA1C3AC4EDEB66026191D03E1CC52`
- **Build toolchain:** electron-builder 26.15.3; Electron 43.5.0; Windows x64.

## User-visible changes

- Tapping a rectangular answer cover reveals it; tapping again conceals it. It stays on the board in both states.
- Freehand Study Tape also toggles between concealed and revealed without being removed.
- Revealed outlines remain hittable; attached objects follow cover visibility.
- A dedicated Study Tape drawing tool is available from the ribbon and Add/tools menus.

## Fixes

- Kept revealed covers in hit testing so the next tap can conceal them.
- Added point-based geometry bounds for freehand tape so it can be hit-tested and selected.
- Added the missing `bboxOfPoints` renderer import used by freehand tape.
- Ensured the ribbon action directly activates the tape tool and avoids duplicate Add-menu entries.
- Adjusted the responsive toolbar breakpoint for the added ribbon tool.

## Verification

- `npm run smoke:features:4.8.8`: 6 passed, 0 failed.
- `node scripts/smoke.js`: 1,240 passed, 0 failed.
- `npm run dist:win`: completed; built the Windows x64 portable EXE and NSIS installer.
- Packaged portable executable launched with the focused feature suite and exited successfully (code 0).
- `dist/latest.yml`: validated against v4.8.9 installer name, version, SHA-512 field, and blockmap.
- Standalone translation checker was deferred by user request.

## Artifacts

Built with `npm run dist:win`. The portable executable and installer, including their final byte sizes and SHA-256 digests, are listed above.

## Relationship to v4.8.8

This is an additive patch release. The v4.8.8 tag and binaries remain unchanged and can be used as the comparison build.
