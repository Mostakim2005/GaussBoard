# GazBoard Replay — Fast AI Bootstrap & Context Router

> **CRITICAL DIRECTIVE FOR FUTURE AI AGENTS**:
> **DO NOT ingest or read all documentation files in `docs/` at once.** Doing so will consume over 100,000 tokens of your context window and degrade reasoning capability.
> This repository is strictly modular. Read **only** this bootstrap document first, then look up **only** the specific section or file relevant to the user's immediate request from the **On-Demand Reading Matrix** below.

---

## 1. Quick Repository Facts & Mental Model

* **Project**: **GazBoard Replay** (Windows-first fork of GazBoard v4.8.1).
* **Base Architecture**: Pure Vanilla JavaScript (ES6 Modules), HTML5 Canvas 2D, Electron 43.
  * **Zero Frontend Frameworks**: No React, Vue, Angular, or Svelte. Pure DOM manipulation and raw Canvas2D rendering.
  * **Zero C++ Native Addons**: No `node-gyp` or native DLLs. All gesture math, cubic Bézier curve fitting, and audio protocols are pure portable JavaScript.
* **Core Document State (`doc`)**:
  * Handled by `Store` (`src/js/core/store.js`).
  * `doc.objects`: Dictionary of all canvas objects keyed by ID (`stroke`, `shape`, `note`, `text`, `image`, `curtain`, `connector`, `audio`).
  * `doc.pages`: Array of pad sheet definitions with dimensions and custom margins (`margins: { left, right, top, bottom }`).
  * `doc.audioTracks`: Array of audio recording sessions (`id`, `assetId`, `name`, `durationMs`, `bookmarks`).
  * `doc.tags` & `doc.aliases`: Obsidian-style metadata for cross-board organization.
* **Storage & Packaging**:
  * Single boards are saved either as raw JSON (`.gazboard`) or as a standard ZIP container (`PK\x03\x04`) if audio tracks are bundled.
  * File assets (audio files, images) are addressed via `app://board/asset/<id>` and streamed over HTTP 206 byte-range requests.

---

## 2. On-Demand Subsystem Reading Matrix

When the user asks you to modify, debug, or extend a feature, read **only** the corresponding files listed in this table:

| Subsystem | If working on... | Read ONLY these files before modifying code |
| :--- | :--- | :--- |
| **Audio & Replay** | Audio recording, replay animations, scrubber timeline, bookmarks, or audio cards | 1. `docs/DEVELOPER_HANDOVER.md` (§3.1 Document Store Schema)<br>2. `docs/BUG_FIX_LOG.md` (BUG-005, BUG-006, BUG-007)<br>3. `src/js/core/replay.js` & `src/js/ui/audio-bar.js` |
| **Eraser & Gestures** | Gesture scratch-out eraser, scribble detection, or false-positive tuning | 1. `docs/BUG_FIX_LOG.md` (BUG-001 & BUG-002: Spatial Overlap Guard)<br>2. `src/js/core/scratch.js` |
| **Inking & Pens** | Pen engines, Windows Ink Bézier smoothing, highlighter opacity, or color-pop | 1. `docs/FEATURE_RECORD.md` (F-111, F-114)<br>2. `src/js/core/ink.js` & `src/js/core/render.js` |
| **Study Tools** | Active-recall study tape, flashcard reveals, or split-screen workspace | 1. `docs/FEATURE_RECORD.md` (F-102, F-108)<br>2. `docs/BUG_FIX_LOG.md` (BUG-008)<br>3. `src/js/ui/split-workspace.js` |
| **PDF & Margins** | PDF import modes (background vs movable), margin adjustment dialog | 1. `docs/FEATURE_RECORD.md` (F-118, F-119)<br>2. `src/js/ui/pagemargin-dialog.js` & `src/js/insert.js` |
| **Connectors & Arrows** | Arrowheads, straight lines, barbed geometry, or thickness scaling | 1. `docs/FEATURE_RECORD.md` (Round 4, Point 1)<br>2. `src/js/core/connectors.js` |
| **Templates & Backgrounds**| Importing external image/PDF templates or snapshotting active board | 1. `docs/FEATURE_RECORD.md` (Round 4, Point 2)<br>2. `src/js/templates.js` & `src/js/ui/panels.js` |
| **Images & Annotation** | Cropping images or writing pen annotations directly onto embedded images | 1. `docs/FEATURE_RECORD.md` (Round 3, Point 3)<br>2. `src/js/ui/contextmenu.js` & `src/js/core/tools.js` |
| **Video Exporter** | Multi-session video stitching, WebM export, or camera framing | 1. `docs/FEATURE_RECORD.md` (F-110 & Round 3, Point 4)<br>2. `src/js/export-video.js` |
| **Search & Organization** | OmniSearch (Ctrl+F), in-settings search, or board tags/aliases | 1. `docs/BUG_FIX_LOG.md` (BUG-004)<br>2. `src/js/ui/search-dialog.js` & `src/js/ui/properties-dialog.js` |
| **Layers (On Standby)** | Resuming the multi-layer system feature | 1. `docs/DEVELOPER_HANDOVER.md` (§6 On-Hold Features)<br>2. `docs/plan/04-quality.md` (Phase 4 Layer Architecture) |

---

## 3. The 6 Non-Negotiable Architectural Invariants

Every AI agent working on this codebase **must** adhere to these 6 golden rules to prevent regressions:

1. **Scene Partitioning During Audio Replay**:
   * Strokes belonging to the active audio track (`o.audioId === activeTrackId`) must **never** be baked into the base frozen canvas bitmap. The base rendering pass explicitly excludes them: `(o) => o.audioId !== activeTrackId`. Replay strokes are drawn strictly in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**:
   * All point simplification, Bézier curve fitting, and smoothing functions in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio-ink synchronization.
3. **Finite Audio Duration Safeguard**:
   * WebM audio chunks generated by `MediaRecorder` report `duration = Infinity` until fully indexed. Never rely solely on `audio.currentTime` or `audio.duration`. Always use `track.durationMs = Date.now() - startTime`.
4. **100% Internationalization (i18n) Parity**:
   * Every user-facing UI string must be wrapped in `t('...')` and defined across all 7 translation files (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`). Run `node scripts/i18n-check.js` before finishing.
5. **Zero Extra Native Dependencies**:
   * Do not introduce npm packages that require C/C++ compilation (`node-gyp`). Keep the codebase lightweight, portable, and clean.
6. **Study Tape vs Curtain Discrimination**:
   * Study tape (`subtype: 'tape'`) must toggle between concealed (hatched neon stripes) and revealed (faint dashed border) on a single click or tap. Standard curtains (`subtype !== 'tape'`) must remain selectable for the reveal toolbar.

---

## 4. Historical Modification Epochs

If you need to understand the evolution of changes made to the original base app:

* **Epoch 0 — Base Audit & Security Hardening**: Audited base GazBoard v4.8.1; established Electron context isolation, safe IPC protocols, and single-board ZIP packaging. (Documented in `docs/plan/00-comprehension.md` and `01-audit.md`).
* **Epoch 1 — Milestones 1 to 5**: Core study tools implemented: StarNote scratch-out eraser, active-recall tape, streaming audio recorder, ReplayEngine, split study workspace, and video exporter. (Documented in `docs/plan/05-file-plan.md`).
* **Epoch 2 — User Feedback Rounds 1 & 2**: Fixed 11 edge-case bugs (spatial overlap guard against `2 3 2`/`WRM` false positives, audio clock stall fallback, in-settings search tokenization, split workspace DOM mounting). (Documented in `docs/BUG_FIX_LOG.md`).
* **Epoch 3 — User Feedback Round 3**: Added gallery `#tags` filtering, ribbon tool pinning/unpinning, external audio import, non-destructive image cropping, direct image annotation locking, and multi-session video stitching. (Documented in `docs/FEATURE_RECORD.md` Round 3).
* **Epoch 4 — User Feedback Round 4**: Added elongated/barbed arrowheads and line converters, custom templates from files and active board snapshots, pluggable inking with Windows Ink velocity Bézier smoothing, zoom presets popover with favorites, highlighter 50% opacity and color-pop, audio skip durations (5s–30s), recording 3-dot context menu, PDF background mode, and Turnout 8-handle page margin dialog. (Documented in `docs/FEATURE_RECORD.md` Round 4).

---

## 5. Verification Commands

Always run these verification commands before presenting completed code to the user:

```powershell
# 1. Full Regression Test Suite (1,240 tests)
node scripts/smoke.js

# 2. Strict 100% Translation Coverage Check (1,349 strings)
node scripts/i18n-check.js

# 3. Production Windows Executable Compilation (Portable & Setup EXE)
npm run dist:win
```
