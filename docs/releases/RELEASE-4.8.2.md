# GazBoard Release Dossier - v4.8.2

- **Release Version**: `4.8.2`
- **Release Date**: 2026-10-17
- **Base Commit**: `6f2f8d343ac27216a742ecd6192e00664cadf9ef`
- **Previous Working Baseline**: `4.8.1` (`GazBoard-4.8.1-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.2-portable.exe` (107,242,268 bytes)

---

## 1. Overview of Release
Release 4.8.2 delivers major usability improvements across the settings panel, drawing rendering pipeline, laser pointer persistence, audio session timeline navigation, video framing presets, and stylus hardware input thresholds.

---

## 2. Features Added & Modified

### F-482-01: In-Settings Real-Time Search Filtering
- **Module**: `src/js/ui/panels.js` (lines 180–225)
- **Description**: Added a dedicated search filter box at the top of the settings modal. Typing dynamically filters sections, setting groups, and individual toggle switches.
- **Implementation**: Listens to input events on `#settings-search-input`, traverses settings DOM sections, toggles `.setting-row-hidden` class, and highlights substring matches in labels.

### F-482-02: Configurable Freehand Pen Opacity
- **Modules**: `src/js/core/render.js` (lines 110–145), `src/js/core/tools.js` (lines 145–160)
- **Description**: Added an opacity slider (10% to 100%) for standard ink pens in addition to highlighters.
- **Implementation**: Stored `opacity` attribute on stroke objects. When rendering in `render.js`, the canvas `globalAlpha` is calibrated per stroke without leaking into subsequent layers.

### F-482-03: Laser Pointer Trail Duration Control
- **Module**: `src/js/core/render.js` (lines 1120–1165)
- **Description**: Users can adjust the laser pointer fade duration between 500ms and 4000ms.
- **Implementation**: Exposed `laserFadeDurationMs` setting; modified laser trail rendering loop to compute point decay relative to the custom configured duration.

### F-482-04: Audio Multi-Session Selector
- **Modules**: `src/js/ui/audio-bar.js` (lines 85–130), `src/js/ui/density-canvas.js` (lines 35–70)
- **Description**: Dropdown selector in the audio toolbar when a board document contains multiple recorded sessions.
- **Implementation**: Binds to `doc.audioTracks` array; switching session re-attaches audio stream and updates timeline density markers.

### F-482-05: Audio Timeline Bookmark Navigation
- **Modules**: `src/js/ui/audio-bar.js`, `src/js/ui/replay-bar.js` (lines 65–95)
- **Description**: Keyboard shortcuts (`[` and `]`) and visual bookmark markers on the timeline for quick jumping between stroke activity bursts.

### F-482-06: Video Export Framing & Resolution Presets
- **Module**: `src/js/export-video.js` (lines 110–155)
- **Description**: Presets for 720p 30fps and 1080p 60fps export with automatic aspect ratio letterboxing and camera viewport scaling.

### F-482-07: Stylus Drag Threshold Calibration
- **Module**: `src/js/core/surface.js` (lines 190–215)
- **Description**: Configurable minimum drag distance to prevent stylus nib taps from inadvertently triggering canvas panning.

---

## 3. Bug Fixes in This Release
- **BUG-482-01**: Fixed alpha channel bleed where custom pen opacity affected subsequent highlighter render passes.
- **BUG-482-02**: Fixed sub-millisecond timestamp precision drift in audio timeline bookmark calculations.

---

## 4. Files Touched
- `src/js/core/render.js`
- `src/js/core/surface.js`
- `src/js/core/tools.js`
- `src/js/export-video.js`
- `src/js/ui/audio-bar.js`
- `src/js/ui/contextmenu.js`
- `src/js/ui/density-canvas.js`
- `src/js/ui/panels.js`
- `src/js/ui/replay-bar.js`
- `src/locales/*.json` (ar, bn, de, es, pt-BR, zh-Hans, zh-Hant)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 tests pass.
- **Binary Verification**: Launch `GazBoard-4.8.2-portable.exe` on Windows 10/11 x64.
- **Rollback Procedure**: If F-482-02 causes ink rendering regressions, revert to `GazBoard-4.8.1-portable.exe` (commit base).
