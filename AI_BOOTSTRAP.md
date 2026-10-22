# GazBoard Replay — Fast AI Bootstrap & Context Router

> **CRITICAL DIRECTIVE FOR FUTURE AI AGENTS**:
> **DO NOT ingest or read all documentation files in `docs/` at once.** Read repository `AGENTS.md` when present, then this bootstrap, then [`docs/INDEX.md`](docs/INDEX.md) to route to one subsystem dossier. Consult [`docs/AI_DOCS_MAP.md`](docs/AI_DOCS_MAP.md) only when you need to understand the documentation structure or resolve which record is authoritative. Read only the selected dossier and the source/tests it names.

---

## 1. Quick Repository Facts & Mental Model

* **Project**: **GazBoard Replay** (Windows-first fork of GazBoard v4.8.1); current source release **v5.1.0**. It adds linked excerpts, heading/block links and Obsidian Markdown conveniences alongside the cumulative local feature line.
  * **Current repo snapshot:** read `package.json`, `git status`, `git log` and local tags for live version/commit state. Release details and verification: [`docs/releases/RELEASE-5.1.0.md`](docs/releases/RELEASE-5.1.0.md); prior audit and deferred findings: [`docs/releases/AUDIT-POST-4.8.1-TO-5.0.0.md`](docs/releases/AUDIT-POST-4.8.1-TO-5.0.0.md). Full onboarding, preferences, and next-session protocol: [`docs/DEVELOPER_HANDOVER.md`](docs/DEVELOPER_HANDOVER.md).
  * **Archive policy:** keep active work in this repository. Copy only a verified durable release to the user's configured archive location; never rely on stale hardcoded archive paths in old release notes.
  * Base-only behavior and source entry points: [`docs/BASE_FEATURE_CATALOG-4.8.1.md`](docs/BASE_FEATURE_CATALOG-4.8.1.md).
  * Upstream tags v4.9.0–v4.9.4 are on a separate diverged history; v5.1.0 does not claim to include them.
  * Custom feature and fix history through v4.8.11: [`docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) covers v4.8.2–v4.8.8; see the v4.8.9, v4.8.10, and v4.8.11 release dossiers for later patches.
  * Treat plans as proposals/history, not proof of shipped behavior. Verify current behavior against source and focused tests.
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
* **Product choice principle**: preserve existing user-selectable modes and add alternatives as separate options when feasible. See the inking dossier for engine tradeoffs and cross-feature effects.

---

## 2. On-Demand Subsystem Reading Matrix

> **Fast Navigation Tip**: For document roles, authority, and token-light browsing rules, see [`docs/AI_DOCS_MAP.md`](docs/AI_DOCS_MAP.md). For the feature-by-feature lookup chart, see [`docs/INDEX.md`](docs/INDEX.md).
> Open **ONLY** the designated Tier 1 Layer Dossier corresponding to your task:

| Subsystem | If working on... | Read ONLY these files before modifying code |
| :--- | :--- | :--- |
| **Audio & Replay** | Audio recording, replay animations, scrubber timeline, bookmarks, or audio cards | 1. [`docs/layers/01-audio-and-replay.md`](docs/layers/01-audio-and-replay.md)<br>2. `src/js/core/replay.js` & `src/js/ui/audio-bar.js` |
| **Eraser & Gestures** | Gesture scratch-out eraser, scribble detection, or false-positive tuning | 1. [`docs/layers/02-inking-and-gestures.md`](docs/layers/02-inking-and-gestures.md)<br>2. `src/js/core/scratch.js` |
| **Inking & Pens** | Pen engines, Windows Ink Bézier smoothing, highlighter opacity, or color-pop | 1. [`docs/layers/02-inking-and-gestures.md`](docs/layers/02-inking-and-gestures.md)<br>2. `src/js/core/ink.js` & `src/js/core/render.js` |
| **Study Tools** | Active-recall study tape, flashcard reveals, or canvas bloom decay | 1. [`docs/layers/03-canvas-and-study-tape.md`](docs/layers/03-canvas-and-study-tape.md)<br>2. `src/js/core/render.js` & `src/js/core/hit.js` |
| **Images & Annotation** | Cropping images or writing pen annotations directly onto embedded images | 1. [`docs/layers/03-canvas-and-study-tape.md`](docs/layers/03-canvas-and-study-tape.md)<br>2. `src/js/ui/contextmenu.js` |
| **Connectors & Arrows** | Arrowheads, straight lines, barbed geometry, or thickness scaling | 1. [`docs/layers/04-geometry-and-templates.md`](docs/layers/04-geometry-and-templates.md)<br>2. `src/js/core/connectors.js` |
| **Templates & Zoom** | Importing external image/PDF templates, board snapshots, or zoom presets | 1. [`docs/layers/04-geometry-and-templates.md`](docs/layers/04-geometry-and-templates.md)<br>2. `src/js/templates.js` & `src/js/ui/toolbar.js` |
| **PDF & Margins** | PDF import modes (background vs movable), margin adjustment dialog | 1. [`docs/layers/05-pdf-and-pagemargins.md`](docs/layers/05-pdf-and-pagemargins.md)<br>2. `src/js/ui/pagemargin-dialog.js` |
| **Split View & UI** | Dual-pane study layout, OmniSearch (Ctrl+F), ribbon pinning, or tags | 1. [`docs/layers/06-workspace-and-ui.md`](docs/layers/06-workspace-and-ui.md)<br>2. `src/js/ui/split-workspace.js` & `src/js/ui/toolbar.js` |
| **Video Exporter** | Multi-session video stitching, WebM export, camera framing, or filename behavior | 1. [`docs/layers/07-video-export.md`](docs/layers/07-video-export.md)<br>2. `src/js/export-video.js` |
| **Layers (On Standby)** | Resuming the multi-layer system feature | 1. `docs/DEVELOPER_HANDOVER.md` (§6 On-Hold Features)<br>2. `docs/plan/04-quality.md` (Phase 4 Layer Architecture) |

---

## 3. The 6 Non-Negotiable Architectural Invariants

Every AI agent working on this codebase **must** adhere to these 6 golden rules to prevent regressions:

1. **Scene Partitioning During Audio Replay**:
   * Strokes belonging to the active audio track (`o.audioId === activeTrackId`) must **never** be baked into the base frozen canvas bitmap. The base rendering pass explicitly excludes them: `(o) => o.audioId !== activeTrackId`. Replay strokes are drawn strictly in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**:
   * All point simplification, Bézier curve fitting, and smoothing functions in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio-ink synchronization.
3. **Finite Audio Duration Safeguard**:
   * For in-app recordings, WebM chunks can report `duration = Infinity` until indexed; record elapsed wall-clock time in `track.durationMs` and do not rely solely on the media element clock. For imported audio, use finite metadata when available and preserve unknown duration when it is unavailable—never invent a duration.
4. **100% Internationalization (i18n) Parity**:
   * Every user-facing UI string must be wrapped in `t('...')` and defined across all 7 translation files (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`). Run `node scripts/i18n-check.js` before finishing.
5. **Zero Extra Native Dependencies**:
   * Do not introduce npm packages that require C/C++ compilation (`node-gyp`). Keep the codebase lightweight, portable, and clean.
6. **Study Tape and Answer Cover Toggle**:
   * Both study tape (`subtype: 'tape'`) and rectangular answer covers (`subtype !== 'tape'`) persist on the board and toggle concealed/revealed on tap. Revealed covers remain hittable as faint dashed outlines; attached content follows the cover state. The Study Tape drawing tool is available from the ribbon and Add/tools menus.

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

Choose the verification group that matches the change. Mandatory regression and custom-feature tests are separate; translation parity applies when UI strings/locales are in scope.

```powershell
# Mandatory regression suite
node scripts/smoke.js

# Custom additions, separately
npm run smoke:custom
npm run smoke:features:4.8.4.1
npm run smoke:features:4.8.8
npm run smoke:replay
npm run smoke:video

# Translation parity
node scripts/i18n-check.js

# Windows packaging
npm run dist:win
```

Current patch release notes and verification state: [`docs/releases/RELEASE-4.8.21.md`](docs/releases/RELEASE-4.8.21.md).

Current repository status, release snapshot, owner preferences, and verification limitations: [`docs/DEVELOPER_HANDOVER.md`](docs/DEVELOPER_HANDOVER.md).

See [`docs/INDEX.md`](docs/INDEX.md) for feature-to-test navigation and [`docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](docs/FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) for release-specific scope.
