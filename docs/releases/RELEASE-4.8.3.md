# GazBoard Release Dossier - v4.8.3

- **Release Version**: `4.8.3`
- **Release Date**: 2026-10-17
- **Base Commit**: `d8d4a209cc345b21ee011f0e55a5954945a74ad2`
- **Previous Working Baseline**: `4.8.2` (`GazBoard-4.8.2-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.3-portable.exe` (107,245,970 bytes)

---

## 1. Overview of Release
Release 4.8.3 represents the consolidation of User Feedback Rounds 1 & 2. It hardens gesture recognition to prevent false-positive scribble deletions, enhances audio UI scrubber fidelity, enables direct double-click navigation in Note Overview, and introduces rich object inspection.

---

## 2. Features Added & Modified

### F-483-01: Directional Scribble Gesture Rejection
- **Module**: `src/js/core/scratch.js` (lines 80–145)
- **Description**: Filters out intentional rapid hatching, cursive handwriting, and shaded strokes from being misidentified as scratch-out erase gestures.
- **Implementation**: Enforces minimum directional reversal angle (>110°), minimum oscillation count (>=4 reversals), and bounding-box aspect ratio constraints before firing stroke deletion.

### F-483-02: Gradient Audio Density Canvas HUD
- **Modules**: `src/js/ui/density-canvas.js` (lines 40–122), `src/js/ui/audio-bar.js` (lines 140–210)
- **Description**: Replaced flat audio timeline with a real-time rendered 2D density gradient indicating stroke frequency during recording and playback.
- **Implementation**: Bins stroke timestamps into discrete time buckets; renders vertical gradient bars scaled to stroke intensity with active playback head indicator.

### F-483-03: Note Overview Direct Double-Click Camera Jump
- **Module**: `src/js/ui/note-overview.js` (lines 140–195)
- **Description**: Double-clicking any page thumbnail or card in the Note Overview drawer instantly animates the camera to center the canvas on that page.
- **Implementation**: Attached `dblclick` event listener to `.overview-page-card`; invokes `camera.panTo(card.x, card.y)` with smooth easing.

### F-483-04: Extended Object Properties Dialog
- **Module**: `src/js/ui/properties-dialog.js` (lines 60–185)
- **Description**: Complete metadata inspector for selected canvas elements (stroke point count, bounding box width/height/coordinates, creation timestamp, layer ID).

### F-483-05: Non-Modal Search Dialog Keyboard Trapping Fix
- **Module**: `src/js/ui/search-dialog.js` (lines 45–110)
- **Description**: Ensures Escape key cleanly clears input before dismissal; Up/Down arrow keys smoothly cycle through search results without losing focus.

---

## 3. Bug Fixes in This Release
- **BUG-001 through BUG-011**:
  - BUG-001: Scratch-out false positives during cursive penmanship resolved by `scratch.js` angle checks.
  - BUG-003: Audio recording pause/resume state inconsistency in `audio-recorder.js`.
  - BUG-005: Note Overview thumbnail rendering stutter on large boards.
  - BUG-008: Split workspace camera synchronization race condition on window resize.

---

## 4. Files Touched
- `src/index.html`
- `src/js/app.js`
- `src/js/core/audio-recorder.js`
- `src/js/core/replay.js`
- `src/js/core/scratch.js`
- `src/js/core/surface.js`
- `src/js/ui/audio-bar.js`
- `src/js/ui/contextmenu.js`
- `src/js/ui/density-canvas.js`
- `src/js/ui/note-overview.js`
- `src/js/ui/panels.js`
- `src/js/ui/properties-dialog.js`
- `src/js/ui/search-dialog.js`
- `src/js/ui/split-workspace.js`
- `src/js/ui/toolbar.js`
- `src/locales/*.json` (7 languages)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 passing.
- **Binary Verification**: Launch `GazBoard-4.8.3-portable.exe`. Verify cursive inking does not disappear.
- **Rollback Target**: `4.8.2` (`GazBoard-4.8.2-portable.exe`).
