# GazBoard Release Dossier - v4.8.4

- **Release Version**: `4.8.4`
- **Release Date**: 2026-10-17
- **Base Commit**: `e6a2caf31947d8f62a31b9585437adc3fdf725ce`
- **Previous Working Baseline**: `4.8.3` (`GazBoard-4.8.3-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.4-portable.exe` (107,251,200 bytes)

---

## 1. Overview of Release
Release 4.8.4 introduces major creative and media production features: multi-tag board template gallery filtering, dynamic ribbon bar pinning, standalone external audio import into the replay engine, non-destructive image crop/rotation, and a multi-session stitched MP4/WebM video exporter.

---

## 2. Features Added & Modified

### F-484-01: Template Gallery Multi-Tag Filtering
- **Module**: `src/js/ui/panels.js` (lines 310–385)
- **Description**: Added interactive tag chips (e.g. `grid`, `study`, `music`, `kanban`) above the template gallery. Clicking filters displayed templates instantly with compound boolean matching.

### F-484-02: Customizable Ribbon Tool Pinning Architecture
- **Module**: `src/js/ui/toolbar.js` (lines 210–310)
- **Description**: Foundation for pinning tools between the front primary ribbon bar and the overflow plus menu. Saved into user profile settings (`pinnedRibbonTools`).

### F-484-03: External Audio File Import & Timeline Alignment
- **Module**: `src/js/insert.js` (lines 240–305)
- **Description**: Allows importing external MP3, WAV, and M4A audio files into the board. Automatically calculates audio duration, creates an audio track entry in the document store, and displays the waveform.

### F-484-04: Non-Destructive In-Canvas Image Crop & Rotation
- **Module**: `src/js/ui/contextmenu.js` (lines 410–565)
- **Description**: Right-clicking any placed image provides "Crop Image" and "Rotate 90°". Crop handles allow resizing the visible viewport without deleting underlying source image data.

### F-484-05: Multi-Section Stitched Video Exporter
- **Module**: `src/js/export-video.js` (lines 310–740)
- **Description**: Renders entire board replay sessions across multiple audio tracks into a stitched WebM/MP4 video file.
- **Implementation**: Uses an off-screen canvas rendering worker at fixed delta time steps; synchronizes audio tracks using Web Audio API buffer concatenation and encodes frames via MediaRecorder.

---

## 3. Bug Fixes in This Release
- **BUG-484-01**: Fixed audio import duration metadata reading `Infinity` on variable-bitrate WebM files.
- **BUG-484-02**: Fixed image bounding box hit-test desynchronization after in-canvas rotation.
- **BUG-484-03**: Fixed video export memory leak when exporting sessions longer than 15 minutes.

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
