# GazBoard Release Dossier - v4.8.4

- **Release Version**: `4.8.4`
- **Release Date**: 2026-10-17
- **Base Commit**: `e6a2caf31947d8f62a31b9585437adc3fdf725ce`
- **Previous Working Baseline**: `4.8.3` (`GazBoard-4.8.3-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.4-portable.exe` (107,251,200 bytes)

---

## 1. Overview of Release
Release 4.8.4 introduces creative and media production features: My boards tag filtering, ribbon tool pinning, external audio import, non-destructive image cropping and annotation, and multi-session stitched WebM video export. This dossier has been corrected against commit `e6a2caf`; see the 4.8.4.1 dossier for the follow-up audit and fixes.

---

## 2. Features Added & Modified

### F-484-01: My Boards Tag Filtering
- **Module**: `src/js/ui/panels.js`
- **Description**: Added tag filtering for boards in My boards. This is board metadata filtering, not template gallery chips.

### F-484-02: Customizable Ribbon Tool Pinning Architecture
- **Module**: `src/js/ui/toolbar.js` (lines 210–310)
- **Description**: Foundation for pinning tools between the front primary ribbon bar and the overflow plus menu. Saved into user profile settings (`pinnedRibbonTools`).

### F-484-03: External Audio File Import & Timeline Alignment
- **Module**: `src/js/insert.js` (lines 240–305)
- **Description**: Allows importing external MP3, WAV, and M4A audio files into the board. Automatically calculates audio duration, creates an audio track entry in the document store, and displays the waveform.

### F-484-04: Non-Destructive In-Canvas Image Crop & Annotation
- **Module**: `src/js/ui/contextmenu.js`
- **Description**: Image context actions provide crop controls and direct annotation. Crop metadata changes the visible source rectangle without deleting the underlying image. A Rotate 90° crop action is not part of commit `e6a2caf`.

### F-484-05: Multi-Session Stitched Video Exporter
- **Module**: `src/js/export-video.js`
- **Description**: Renders selected replay sessions into a stitched WebM video file.
- **Implementation**: Uses an off-screen canvas, Web Audio stream routing, and `MediaRecorder`.

---

## 3. Bug Fixes in This Release
- **Audit correction**: The original dossier claimed fixes for audio duration, image rotation hit testing, and export memory cleanup. The 4.8.4 audit found these claims were not supported by the code at `e6a2caf`; see `RELEASE-4.8.4.1.md` for verified fixes and remaining findings.

---

## 4. Files Touched
- `src/css/app.css`
- `src/js/app.js`
- `src/js/core/render.js`
- `src/js/core/surface.js`
- `src/js/core/tools.js`
- `src/js/export-video.js`
- `src/js/insert.js`
- `src/js/ui/contextmenu.js`
- `src/js/ui/icons.js`
- `src/js/ui/panels.js`
- `src/js/ui/replay-bar.js`
- `src/js/ui/toolbar.js`
- `src/locales/*.json` (7 languages)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 passing.
- **Binary Verification**: Launch `GazBoard-4.8.4-portable.exe`. Test external audio import and image crop context menu.
- **Rollback Target**: `4.8.3` (`GazBoard-4.8.3-portable.exe`).
