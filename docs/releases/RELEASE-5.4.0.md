# GazBoard Release 5.4.0 — Phase 1 Upstream Sync (4.8.2..4.9.4)

> **Release Version**: `v5.4.0`  
> **Release Date**: October 23, 2026  
> **Base Alignment**: Ported safe upstream features and bugfixes from `v4.8.2` through `v4.9.4` into GazBoard's custom architecture (`v5.3.0` $\rightarrow$ `v5.4.0`).  
> **Integrity Guarantee**: All 19 custom features and all 6 Golden Invariants preserved with 0 regressions. Zero extra native C++ dependencies introduced. 100% i18n parity maintained.

---

## 1. Executive Summary

GazBoard 5.4.0 marks the completion of **Phase 1** of the architectural roadmap: cleanly merging upstream feature improvements and stability fixes from upstream versions `v4.8.2` through `v4.9.4` while strictly defending GazBoard's custom capabilities (Split Study Workspace, Markdown & Obsidian Interoperability, Excerpt Bi-directional Linking, Audio Replay with Scene Partitioning, Study Tape & Answer Covers, and Custom Pens).

All additions were audited and guarded to ensure zero performance degradation and total compliance with the repository's invariants.

### 1.1 Binary Deliverable & Release Artifacts
* **Portable Binary**: `GazBoard-v5.4.0-Portable.exe`
* **File Size**: 106,627,966 bytes (101.68 MB)
* **Packaging Model**: Standalone, self-contained single-file portable Windows executable. Zero installation, zero registry writes, fully isolated user data. Built on demand via `npx electron-builder --win portable`.

---

## 2. Ported Upstream Features & Architectural Hardening

### 2.1 Guarded Pencil Tool & Audio-Safe Acoustic Engine
* **Pencil Tool & Shading**:
  - Added the realistic graphite pencil tool (`effect: 'pencil'`, `PENCIL_GRAPHITE = '#4b4a48'`) in `src/js/ui/palettes.js` and `src/js/core/render.js`.
  - Emulates natural pencil shading with tilt/pressure awareness and paper texture rendering.
  - **Performance Optimization**: Shading strokes generate dense point arrays. Canvas pattern creation is cached per canvas context using `WeakMap` to avoid repetitive DOM canvas allocations, and incremental darkness calculations run in $O(1)$ time.
* **Audio-Safe Acoustic Engine (`src/js/core/pencilsound.js`)**:
  - Upstream introduced physical pencil scratch audio that modulates volume and frequency based on pen speed.
  - **Golden Invariant Guard**: To prevent the mechanical pencil audio from bleeding into microphone recordings or interfering with replay playback, `src/js/core/tools.js` strictly checks `this.audioBusy()`. Whenever audio recording or audio replay is in progress, pencil acoustics are completely muted.
  - A user setting (`t('Pencil sound')`) was added to Settings allowing users to disable the sound effect at will.

### 2.2 Pane-Isolated Mouse Wheel Page Scrolling
* Upstream added mouse wheel scrolling on paged canvases (`A4`, `A5`, etc.).
* **Pane Isolation Guard**: In dual-pane split workspaces (`SplitWorkspace`), mouse wheel page scrolling is bound strictly to the surface camera of the pane currently under the cursor (`this.surface.cam.y += dy`), ensuring scrolling one document never inadvertently scrolls or shifts the companion study board.

### 2.3 Smoother Panning via Slid Canvas Blitting (`_slideFrozen()`)
* Ported upstream's optimized viewport panning in `src/js/core/surface.js`.
* When panning a heavy board, `_slideFrozen()` blits the previously frozen bitmap across by device-pixel offsets and repaints only the newly exposed border strip, preventing frame drops during rapid dragging.
* Hardened with `if (this.noSlide) return false;` to allow deterministic cold-rebuild invalidation tests.

### 2.4 File Conflict Resolution & Board Claiming
* Ported upstream `claimLocalBoard()` in `src/js/app.js` to intelligently handle opening board files that share IDs or origins without overwriting existing local work.
* **Custom Markdown Compatibility**: Normalized text card defaults (`markdown: true`, `cardStyle: 'canvas'`) within `drawing()` comparator so that boards created in previous versions or loaded from raw disk files match their canonical in-memory representations without false-positive conflict prompts.

### 2.5 Board List & Folder Synchronization
* Ported folder metadata sync (`folders.json`) and atomic folder switching safeguards across `storage-location.js`, `main.js`, and `src/js/ui/panels.js`.
* Ensured `app.saveBeforeLeaving()` flushes active strokes and uncommitted text boxes before board switches or folder navigations.

---

## 3. Conscious Architectural Exclusions

### 3.1 Conscious Exclusion: `Shift Straight Line` (`drawStraight`)
* **Decision**: Upstream commit `33e5bd2` introduced `drawStraight(points, angle)` which forces freehand pen strokes into rigid lines when the `Shift` key is held.
* **Why Excluded**:
  1. **Breaks Connectors & Geometric Snapping**: GazBoard already has Lateral Feature #1 (`holdToShape`) which detects lines, arrows, rectangles, and circles dynamically when the pen is held still.
  2. **Violates Golden Invariant #2**: Upstream's `drawStraight` stripped original stroke point timestamps (`p.t`), replacing them with artificially spaced points. This irreversibly breaks stroke-level audio replay synchronization.
* **Status**: Permanently excluded and documented in `AI_BOOTSTRAP.md` and `docs/layers/02-inking-and-gestures.md`.

---

## 4. Internationalization (i18n) Parity

* Ported 16 new upstream translation keys across all 7 supported locales:
  - Arabic (`ar.json`)
  - Bengali (`bn.json`)
  - German (`de.json`)
  - Spanish (`es.json`)
  - Brazilian Portuguese (`pt-BR.json`)
  - Simplified Chinese (`zh-Hans.json`)
  - Traditional Chinese (`zh-Hant.json`)
* Verified with `node scripts/i18n-check.js`: **1,557 / 1,557 strings translated (100% complete, 0 missing)**.

---

## 5. Verification & Test Results

The release passed 100% of the regression and test suites:

| Test Suite | Result | Status |
| :--- | :---: | :---: |
| **Electron Regression Smoke Suite (`test/smoke.js`)** | **1,240 / 1,240 Passed** | ✅ PASS (0 Failed) |
| **Node Custom Feature Suite (`scripts/smoke-custom.js`)** | **30 / 30 Passed** | ✅ PASS (0 Failed) |
| **Node Markdown Extension Checks** | **15 / 15 Passed** | ✅ PASS (0 Failed) |
| **Node Excerpt / Link Checks** | **4 / 4 Passed** | ✅ PASS (0 Failed) |
| **Node Replay-Camera Checks** | **14 / 14 Passed** | ✅ PASS (0 Failed) |
| **Node Video Framing Checks** | **3 / 3 Passed** | ✅ PASS (0 Failed) |
| **Node Protocol Security Checks** | **2 / 2 Passed** | ✅ PASS (0 Failed) |
| **Electron 4.8.4.1 Audit Checks** | **9 / 9 Passed** | ✅ PASS (0 Failed) |
| **Electron 4.8.8 Custom Feature Checks** | **8 / 8 Passed** | ✅ PASS (0 Failed) |
| **Electron 5.0.0 Replay Mode Checks** | **3 / 3 Passed** | ✅ PASS (0 Failed) |
| **Electron 5.1.0 Split / Excerpt Checks** | **5 / 5 Passed** | ✅ PASS (0 Failed) |
| **Strict 100% i18n Parity Check (`scripts/i18n-check.js`)** | **1,557 / 1,557** | ✅ PASS (0 Missing) |
