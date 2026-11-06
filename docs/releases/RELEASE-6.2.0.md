# Release Dossier — GazBoard v6.2.0

> **Release Version**: `v6.2.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(study): implement Phase 2 Memory & Document Synthesis with FSRS v5, AnkiConnect & LiquidText Excerpts (v6.2.0)`  
> **Binary Deliverable**: `GazBoard-v6.2.0-Portable.exe` (108,195,296 bytes / 103.18 MiB)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,240 smoke checks passed, 0 native C++ dependencies, preserved `p.t` stroke timestamps, Study Tape persistence).

---

## 1. Executive Summary & Phase 2 Scope

Release **`v6.2.0`** delivers **Phase 2** of the Engineering, STEM Revision & EE Simulation Architecture roadmap defined in [`docs/plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md`](../plan/spec/doc6_engineering_stem_ee_and_simulation_architecture.md).

It establishes a comprehensive **Memory & Document Synthesis Subsystem** inside GazBoard:
1. **Embedded Free Spaced Repetition Scheduler (FSRS v5)**: Pure JavaScript DSR (Difficulty, Stability, Retrievability) scheduling engine.
2. **In-App Active-Recall Review Runner**: Smooth camera gliding, occlusion toggling, and interactive retention rating HUD (<kbd>Ctrl+Shift+R</kbd>).
3. **AnkiConnect Desktop Bridge & APKG Exporter**: Direct sync to desktop Anki via `http://127.0.0.1:8765` and pure JavaScript `.apkg` packaging for AnkiDroid and AnkiMobile.
4. **LiquidText-Style Document Synthesis**: Interactive anchor glyphs on canvas excerpts, document excerpt shelf drawer in the Workbench, and elastic relationship tethers.

---

## 2. Key Features & Subsystem Deliverables

### 2.1 Pure JavaScript FSRS v5 Spaced Repetition Engine (`src/js/core/fsrs.js`)
* **DSR Mathematical Model**:
  * Implements the modern Free Spaced Repetition Scheduler v5 without external npm native dependencies.
  * Default weight vector $W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898]$.
  * Full state machine: `New` (0), `Learning` (1), `Review` (2), `Relearning` (3).
  * 4 rating levels: `Again` (1), `Hard` (2), `Good` (3), `Easy` (4).
* **Interval Calculations**:
  * Dynamic retrievability: $R(t, S) = (1 + Factor \cdot \frac{t}{S})^{-0.5}$ with $Factor = 19/81$.
  * Real-time preview of next review intervals (`previewNextIntervals(card)`) displayed directly on the UI rating buttons (e.g. `<10m`, `1d`, `3d`, `24d`).
* **Study Tape & Answer Cover Integration**:
  * Directly attaches `fsrs` metadata to whiteboard `curtain` objects (`subtype: 'tape'` or rectangular covers).
  * Fully preserves undo/redo history and document persistence.

### 2.2 Interactive Review Runner HUD (`src/js/ui/study-runner.js`)
* **Focus & Fluid Navigation**:
  * Launch via Workbench button or global hotkey <kbd>Ctrl+Shift+R</kbd>.
  * Automatically collects due cards or runs revision of all board occlusions.
  * Smoothly glides the camera (`cam.glideTo(box)`) to center the active tape/cover.
* **Active Occlusion Workflow**:
  * Cards start concealed with hatched neon striping.
  * User recalls the hidden term, then reveals via `[Reveal Answer]`, tapping the tape, or pressing <kbd>Space</kbd>.
  * 4 color-coded FSRS rating buttons appear with calculated intervals.
  * Rating immediately recalculates stability, records lapses, and advances to the next card.
  * Completion summary modal displays cards reviewed and FSRS retention status.

### 2.3 AnkiConnect Bridge & Pure JS `.apkg` Exporter (`src/js/core/anki.js`)
* **Desktop Anki Synchronization**:
  * Connects via local HTTP POST to `http://127.0.0.1:8765`.
  * Gracefully probes for AnkiConnect presence with non-blocking timeouts.
  * Pushes cards into designated deck (`GazBoard::<BoardName>`) with tags and reverse `gazboard://board/...` URI links.
* **Standards-Compliant `.apkg` Packaging**:
  * Uses bundled `src/vendor/jszip.min.js` to package flashcard collections offline.
  * Generates Anki-compatible TSV schema (`anki_import.txt`), deck manifest JSON, and media maps.
  * Native file save dialog (`saveBoardFile` IPC) or browser blob download.

### 2.4 LiquidText Document Synthesis Extensions (`src/js/core/excerpts.js`, `src/js/ui/sidebar-ribbon.js`)
* **Interactive Excerpt Anchor Badges**:
  * Whiteboard excerpt images display a blue anchor glyph badge.
  * Clicking an anchor badge smoothly animates the camera or opens the Split Study Workspace to the exact source page and paragraph bounds.
* **Elastic Relationship Tethers**:
  * Quadratic Bézier connecting cables linking excerpts to their origin or related canvas nodes.
  * Toggleable via the Workbench Diagrams shelf and persisted in user settings (`settings.showExcerptTethers`).
* **Document Excerpt Shelf**:
  * Live drawer inside the Workbench listing all active document excerpts with thumbnails, originating board name, page indicators, and one-click jump buttons.

---

## 3. Verification & Quality Assurance

1. **Automated Regression Smoke Test**:
   - `node scripts/smoke.js`
   - **Result**: `1240 passed, 0 failed` across all canvas drawing, gesture recognition, audio sync, audio replay, study tape, and storage suites.
2. **Strict 100% Internationalization (i18n) Parity**:
   - `node scripts/i18n-check.js`
   - **Result**: **1,912 / 1,912 translated, 0 missing, 0 errors** across all 7 supported locales (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`).
3. **Binary Packaging Verification (Rule 5 Protocol)**:
   - Standalone portable binary: `GazBoard-v6.2.0-Portable.exe`.
   - Zero-installation, runs out of the box with zero registry pollution.

---

## 4. Key Changed Files

| File | Subsystem | Modifications |
| :--- | :--- | :--- |
| `src/js/core/fsrs.js` | Spaced Repetition | Created pure JS FSRS v5 DSR scheduling algorithm, interval calculations, and card collection. |
| `src/js/ui/study-runner.js` | UI / Review HUD | Created interactive review runner with camera glideTo, reveal animations, and FSRS rating hotkeys. |
| `src/js/core/anki.js` | Sync & Packaging | Created AnkiConnect HTTP bridge and pure JS `.apkg` package exporter. |
| `src/js/ui/sidebar-ribbon.js` | Workbench Ribbon | Connected active review buttons, live FSRS card counter pills, Anki sync, APKG export, and excerpt drawer. |
| `src/css/app.css` | Styling | Added Section 55: Glassmorphism review HUD, rate buttons, pulse animations, and excerpt cards. |
| `src/js/app.js` | Core Application | Wired `studyRunner`, `startStudySession`, `syncToAnki`, `exportToApkg`, and <kbd>Ctrl+Shift+R</kbd> hotkey. |
| `src/locales/*.json` | i18n | Added 36 translation keys across Arabic, Bengali, German, Spanish, Portuguese, and Chinese. |
| `package.json` | Project Config | Bumped version to `6.2.0`. |
