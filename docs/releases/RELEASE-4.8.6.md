# GazBoard Release Dossier - v4.8.6

- **Release Version**: `4.8.6`
- **Release Date**: 2026-10-17
- **Base Commit**: `ffe7a4a681a389b89d9daa2cea648aa8c5303326`
- **Previous Working Baseline**: `4.8.5` (`GazBoard-4.8.5-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.6-portable.exe` (107,263,747 bytes)

---

## 1. Overview of Release
Release 4.8.6 enhances reading, studying, and audio review workflows: recalibrated 50% highlighter opacity with color-pop contrast, user-configurable audio skip intervals (5s to 30s), a 3-dot management menu for recorded audio sessions, PDF background plate locking, and a dedicated page margin adjustment dialog.

---

## 2. Features Added & Modified

### F-486-01: Calibrated 50% Highlighter Opacity & Color-Pop Luminance
- **Module**: `src/js/core/render.js` (lines 310–370)
- **Description**: Standardized default highlighter stroke opacity at 0.5 with dynamic contrast correction so highlighted text and dark-background sketches remain crisp and fully legible.

### F-486-02: Configurable Audio Skip Intervals (5s – 30s)
- **Module**: `src/js/ui/audio-bar.js` (lines 280–340)
- **Description**: The forward and rewind jump buttons can be customized via settings or right-click to skip 5s, 10s, 15s, or 30s increments.

### F-486-03: Audio Session 3-Dot Overflow Menu
- **Module**: `src/js/ui/audio-bar.js` (lines 410–490)
- **Description**: Added a 3-dot kebab menu to each session in the audio bar offering:
  - Track rename.
  - Export standalone audio (WAV / WebM).
  - Volume normalization.
  - Delete session (with confirmation modal).

### F-486-04: PDF Background Mode (Locked Plate Insertion)
- **Module**: `src/js/insert.js` (lines 310–375)
- **Description**: Option to import PDF document pages as non-selectable background plates behind the ink canvas layer, preventing lasso selection or pointer drags from moving pages during active annotation.

### F-486-05: Dedicated Page Margin Adjustment Dialog
- **Module**: `src/js/ui/pagemargin-dialog.js` (lines 1–296)
- **Description**: Full-featured interactive dialog for configuring printable and visual page margins:
  - Independent top, bottom, left, and right margin sliders (in mm or px).
  - Live dotted outline preview on the active board canvas.
  - Preset options (Narrow, Standard, Wide, Zero).

---

## 3. Bug Fixes in This Release
- **BUG-486-01**: Fixed highlighter darkening when multiple overlapping passes were rendered in rapid succession.
- **BUG-486-02**: Fixed audio track deletion failing to unregister associated timestamp metadata.
- **BUG-486-03**: Fixed PDF page background shift when switching between paged and infinite canvas modes.

---

## 4. Files Touched
- `src/js/app.js`
- `src/js/core/render.js`
- `src/js/core/tools.js`
- `src/js/insert.js`
- `src/js/ui/audio-bar.js`
- `src/js/ui/density-canvas.js`
- `src/js/ui/pagemargin-dialog.js`
- `src/js/ui/pagepicker.js`
- `src/js/ui/panels.js`
- `src/js/ui/toolbar.js`
- `src/locales/*.json` (7 languages)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 passing.
- **Binary Verification**: Launch `GazBoard-4.8.6-portable.exe`. Test Page Margins dialog and audio 3-dot menu.
- **Rollback Target**: `4.8.5` (`GazBoard-4.8.5-portable.exe`).
