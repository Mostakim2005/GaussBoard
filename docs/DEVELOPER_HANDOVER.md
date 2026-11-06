# GazBoard Replay — Developer Handover & Future Agent Guide

> **Current handover snapshot (2026-10-25):** v6.9.2 is a source-only P0 + P1 hardening release: 74 findings logged and 68 fixed across the split workspace, audio-ink timing, replay partitioning, scratch eraser, study tape/covers, industrial circuit simulation and presets, video export defaults/MP4 warning, Markdown/KaTeX safety, calculus grapher, multi-tab sessions, and orthogonal connectors, with 6 items documented as known limitations. i18n parity is 2,245/2,245 across all 7 locales and the new-feature smoke suite passes 24/24. Read [`hardening/AUDIT_LOG.md`](hardening/AUDIT_LOG.md) for finding-level status, [`releases/RELEASE-6.9.2.md`](releases/RELEASE-6.9.2.md) for the release record, [`INDEX.md`](INDEX.md) for routing, and [`../AI_BOOTSTRAP.md`](../AI_BOOTSTRAP.md) for the quick router.

> **Important**: This document is the primary onboarding manual for any future AI assistant, software engineer, or contributor picking up this project in a new session or clean environment. It details the complete architecture, data models, state flows, invariant guardrails, and build instructions.

---

## 1. Executive Summary

* **Project**: **GaussBoard** — a fork of GazBoard. The product name users see is GaussBoard; the
  internal app identity, storage folder and `.gazboard` file extension deliberately stay under the
  original name so upstream changes keep merging cleanly and existing boards keep opening. A full
  internal rename is deferred until the fork is self-sufficient.
* **Fork**: [`Mostakim2005/GazBoard`](https://github.com/Mostakim2005/GazBoard) (a real GitHub fork,
  so upstream can be merged directly).
* **Base Repository**: Upstream [GazBoard by theBoringCodes](https://github.com/fahim9778/GazBoard).
* **Mission**: Deliver a lightning-fast, offline-first digital whiteboard tailored for Windows 10/11 tablet and desktop users, integrating study features inspired by **StarNote** and **Flexcil**:
  1. *Audio-Synchronized Note Replay*: Audio recordings capture sub-millisecond timestamps on every pen point (`p.t`), enabling temporal replay with electric cyan glow animations, waveform density scrubbing, and click-to-seek jump.
  2. *Active-Recall Study Tape*: Interactive masking tape rendered with diagonal neon hatched stripes that toggle open and closed on tap.
  3. *Natural Gesture Scratch-Out Eraser*: Rapid back-and-forth scrubbing automatically deletes struck-through words with zero false-positives on normal handwriting.
  4. *Turnout-Style Page Margin Adjustment*: Draggable 8-handle margin controller with Cornell Notes and wide margin templates.
  5. *Dual Study Workspace*: Side-by-side split screen for simultaneous textbook viewing and scratch-pad note taking.
  6. *Pluggable Inking Pipeline*: Hardware DirectInk low-latency pen trail paired with pure-JS velocity-weighted cubic Bézier curve fitting (`Windows Ink` mode).
  7. *Deterministic Video Exporter*: Multi-session WebM animation pipeline with stitched audio tracks.

## 1.1 Current Worktree and Release State (2026-10-25)

- **Working repository:** `C:\Users\kazir\Documents\OpenCode\GazBoard`.
- **Current source version:** v6.9.2, officially released as **GaussBoard** (homage to Carl Friedrich Gauss for EE students; inspirations from StarNote, Flexcil, LiquidText, OneNote; maintained by Kazi S. Mostakim; original heritage from GazBoard by MD. Fakhruddin Gazzali). Portable binary deliverables: `releases/GaussBoard-v6.9.2-Portable.exe` (113,139,325 bytes) and preserved `releases/GazBoard-v6.9.2-Portable.exe` (113,146,990 bytes).
- **Git state:** branch `feat/cumulative-fixes`, tag `v6.9.2`.
- **Lineage:** delivers the P0 + P1 senior hardening audit (74 findings, 68 fixed) on top of the Phase 9 Offline Third-Party Libraries & UI/UX Discovery Entry Points Audit and the Phase 3–8 STEM, linguistics and workspace releases.
- **Latest release scope:** [`releases/RELEASE-6.9.2.md`](releases/RELEASE-6.9.2.md) records the P0 + P1 hardening audit: 74 findings logged, 68 fixed, 6 documented as known limitations; corrections across split workspace persistence/focus/text editing, audio-ink fragment timestamps, replay/covers partitioning, study-runner cover state, circuit simulation (DOL latch, fully wired Forward-Reverse preset, diode and driver-node fixes, DMM continuity), video export defaults (WebM with audio; MP4 no-sound notice), Markdown/KaTeX safety, grapher domain/asymptote/zoom handling, multi-tab undo/cache/duplicate/session dialogs, and degenerate orthogonal arrowheads. 100% i18n parity (2,245/2,245 keys across 7 locales); new-feature smoke 24/24, P1 unit suite 5/5, 4.8.8 checks 8/8. Finding-level record: [`hardening/AUDIT_LOG.md`](hardening/AUDIT_LOG.md). Releases ledger is at [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md).
- **Master Architecture Matrix:** [`COMPREHENSIVE_FEATURE_ARCHITECTURE_MATRIX.md`](COMPREHENSIVE_FEATURE_ARCHITECTURE_MATRIX.md) maps all 40+ features and phases from v4.8.1 to v6.9.2, file interactions, failure modes, and architectural mechanics.
- **Hardening Execution Dossiers:**
  - P0: [`hardening/00-P0-MISSION-CRITICAL-FOUNDATIONS.md`](hardening/00-P0-MISSION-CRITICAL-FOUNDATIONS.md) (**Executed & audited in v6.9.2**: Split Workspace, Audio-Ink Sync, Replay Scene Partitioning, Scratch Eraser, Study Tape — findings/fixes in [`hardening/AUDIT_LOG.md`](hardening/AUDIT_LOG.md))
  - P1: [`hardening/01-P1-COMPUTATIONAL-ENGINES-AND-MEDIA.md`](hardening/01-P1-COMPUTATIONAL-ENGINES-AND-MEDIA.md) (**Executed & audited in v6.9.2**: MNA Circuit Sim, Semiconductors & 555, WebM/MP4 Video, Markdown/KaTeX, Calculus Grapher, Tab Persistence, Manhattan Routing — 5/5 unit tests in `test/p1-hardening.test.mjs`; 4 open limitations recorded in [`hardening/AUDIT_LOG.md`](hardening/AUDIT_LOG.md))
  - P2: [`hardening/02-P2-DOMAIN-WORKBENCHES-AND-SIMULATORS.md`](hardening/02-P2-DOMAIN-WORKBENCHES-AND-SIMULATORS.md) (**Fully Hardened & Audited**: 3D Mol* Viewer, ChemDraw SMILES, Symbolic CAS, 3D Grapher, Dataview/Kanban, FSRS v5, Document Navigator, Physics Lab — 7/7 unit tests verified in `test/p2-hardening.test.mjs`)
  - P3: [`hardening/03-P3-UTILITIES-AND-UI-ENHANCEMENTS.md`](hardening/03-P3-UTILITIES-AND-UI-ENHANCEMENTS.md) (**Fully Hardened & Audited**: Stroke Opacity, Highlighter Contrast, Laser Trail, AudioBar Waveform, ReplayBar Dock, Periodic Table, Molar Mass, Technical Linter, WordNet TTS — 6/6 unit tests verified in `test/p3-hardening.test.mjs`)
- **Archive policy:** keep active work here. Use the user-configured durable archive only after a release has passed checks; do not copy to historical Antigravity paths from older records.
- **Verification/build state:** focused audit tests and locale checks pass (P1 5/5, new features 24/24, 4.8.8 8/8, i18n 2,245/2,245, markdown 15/15, custom 30/30). The base suite is 1,247 passed with one pre-existing dynamic-`t()` scan failure in `technical-linter.js`; `test/video-framing.test.mjs` still needs a DOM. Portable binaries `GaussBoard-v6.9.2-Portable.exe` and `GazBoard-v6.9.2-Portable.exe` built into `releases/`; see [`releases/RELEASE-6.9.2.md`](releases/RELEASE-6.9.2.md) for the verification table.
- **Audit attribution supplied by the project owner:** initial audit — Codex 4.6 Medium in Cursor; secondary audit/fixes — GPT-6 Luna High using Codex.
- **Collaboration preferences:** the owner uses dictated English and may need intent rephrased in plain language when a request is ambiguous. When feasible, retain user-selectable alternatives rather than forcing a binary choice (especially for inking engines). The feature request is the product source of truth; propose trade-offs before removing or simplifying requested behavior.

### Suggested next-session opening

1. Read `AGENTS.md`, then `AI_BOOTSTRAP.md` and `docs/INDEX.md` to choose one layer dossier. Consult [`AI_DOCS_MAP.md`](AI_DOCS_MAP.md) only if document scope or authority is unclear. Read this handover only for current state, owner preferences, archive policy, or verification limits.
2. Ask what the user wants to tackle next if the prompt does not specify a concrete next change. Do not infer a release, tag, EXE build, or archive update from a documentation/audit request.
3. For a reported replay defect, start with `docs/layers/01-audio-and-replay.md`; for video-export behavior/performance, start with `docs/layers/07-video-export.md`. Confirm whether the issue is reproducible with provided/test data before changing behavior.
4. Keep base regression and custom-feature suites distinct. The owner explicitly restricted smoke verification to features added after v4.8.1; run `node scripts/smoke.js --new-features`. Check i18n parity with `node scripts/i18n-check.js` when UI strings change.
5. Update the release dossier, release ledger, feature record, bug log, and both documentation trees only when their content is affected. Archive only a completed and verified release snapshot.

---

## 2. Repository Architecture & Directory Map

```
GazBoard/
├── main.js                  # Electron main process (lifecycle, IPC handlers, window creation)
├── preload.js               # Context-isolated IPC bridge exposing window.board API
├── package.json             # Build configs (electron-builder, targets: nsis, portable)
├── storage-location.js      # Multi-folder board catalog and local storage directory manager
├── src/
│   ├── index.html           # Main UI container, toolbars, modal card overlays
│   ├── css/app.css          # Core stylesheets, HUD styling, theme variables
│   ├── js/
│   │   ├── app.js           # Central application controller, commands, and tool state
│   │   ├── insert.js        # PDF / Word / Image / Slide importer & background page loader
│   │   ├── templates.js     # Template registry, thumbnail previews, and custom board snapshots
│   │   ├── i18n.js          # Runtime translation loader (t('...'))
│   │   ├── core/            # Fundamental mathematical and rendering engines
│   │   │   ├── audio-recorder.js # Web Audio capture, finite duration guard, asset serialization
│   │   │   ├── camera.js    # Camera viewport, 2D transforms, zoomTo, fitWidth, fitHeight
│   │   │   ├── circuit-sim.js # Modified Nodal Analysis (MNA), reactive RLC, semiconductors, 555 timer
│   │   │   ├── connectors.js# Line & arrow geometry, barbed arrowheads, heads converter
│   │   │   ├── excerpts.js  # Linked excerpt regions with bidirectional source back-links
│   │   │   ├── fsrs.js      # FSRS v5 spaced repetition algorithm and card scheduler
│   │   │   ├── hit.js       # Spatial hit-testing, pick(), box selection, lasso
│   │   │   ├── ink.js       # Pluggable inking engines (GazBoard, Windows Ink Bézier, Freehand)
│   │   │   ├── inktrail.js  # Chromium Delegated Ink Trail (navigator.ink.requestPresenter)
│   │   │   ├── markdown.js  # Obsidian GFM parser, math, callouts, footnotes, block embeds
│   │   │   ├── pages.js     # Pad sheet layout, pageRects, margin offset computation
│   │   │   ├── render.js    # 2D canvas drawing pipeline, dual-pass glow, audio cards, composite modes
│   │   │   ├── replay.js    # ReplayEngine, temporal stroke scheduler, autonomous delta clock
│   │   │   ├── scientific-math.js # Safe AST math parser, numerical calculus, Symbolic CAS
│   │   │   ├── scratch.js   # Gesture scratch-out detector (dominant axis spatial overlap guard)
│   │   │   ├── store.js     # Document op-log, undo/redo stacks, toJSON/load serialization
│   │   │   ├── surface.js   # Interactive viewport canvas, dynamic HUD passes, bloom decay
│   │   │   ├── technical-linter.js # University-level grammar, academic tone & citation linter
│   │   │   └── tools.js     # Pointer event state machine (draw, erase, marquee, tap-to-seek)
│   │   └── ui/              # User interface components and floating controls
│   │       ├── academic-dictionary.js # WordNet AWL sublists 1-10, thesaurus, TTS pronunciation
│   │       ├── audio-bar.js        # Floating draggable AudioBar HUD & Recording Panel
│   │       ├── chemical-sketcher.js# ChemDraw-style 2D molecule drawing, SMILES parser
│   │       ├── circuit-workbench.js# Interactive circuit schematic editor & oscilloscope HUD
│   │       ├── density-canvas.js   # Waveform density scrubber & named bookmark editor
│   │       ├── document-navigator.js # Document outline & TOC jump sidebar
│   │       ├── function-grapher.js # 2D/3D surface & polar function calculus grapher
│   │       ├── kanban-board.js     # Embedded interactive Kanban board card
│   │       ├── molecule-viewer.js  # Mol* 3D biomolecular structure viewer bridge
│   │       ├── note-overview.js    # Gallery card view with smart reflow action overlay
│   │       ├── pagemargin-dialog.js# Turnout-style page margin modal with 8 draggable handles
│   │       ├── pagepicker.js       # PDF import page range, mode (background/objects), & alignment
│   │       ├── panels.js           # Settings panels, in-settings token search, paper selection
│   │       ├── periodic-table.js   # Interactive periodic table & molar mass calculator
│   │       ├── phet-runner.js      # Physics simulation lab (optics, Coulomb, momentum, sandbox)
│   │       ├── properties-dialog.js# Obsidian-style board tags & aliases with autocomplete
│   │       ├── replay-bar.js       # Movable ReplayBar floating HUD
│   │       ├── search-dialog.js    # OmniSearch (Ctrl+F) multi-word fuzzy search & command palette
│   │       ├── split-workspace.js  # Dual side-by-side study workspace manager
│   │       ├── study-runner.js     # Active-recall flashcards & image occlusion quiz runner
│   │       └── toolbar.js          # Bottom/top toolbars, zoom presets popover, highlighter menu
│   ├── vendor/              # 15 offline verified third-party libraries (KaTeX, PDF.js, Three.js, etc.)
│   └── locales/             # 7 synchronized translation files (ar, bn, de, es, pt-BR, zh-Hans, zh-Hant)
├── docs/
│   ├── COMPREHENSIVE_FEATURE_ARCHITECTURE_MATRIX.md # Comprehensive 40+ feature cross-subsystem matrix
│   ├── FEATURE_RECORD.md    # Master feature index (F-101 to F-140) and invariants
│   ├── BUG_FIX_LOG.md       # Root-cause breakdown of all fixed bugs (BUG-001 to BUG-051)
│   ├── DEVELOPER_HANDOVER.md# This onboarding manual
│   ├── hardening/           # P0-P3 hardening dossiers
│   │   ├── 00-P0-MISSION-CRITICAL-FOUNDATIONS.md
│   │   ├── 01-P1-COMPUTATIONAL-ENGINES-AND-MEDIA.md
│   │   ├── 02-P2-DOMAIN-WORKBENCHES-AND-SIMULATORS.md
│   │   └── 03-P3-UTILITIES-AND-UI-ENHANCEMENTS.md
│   ├── layers/              # Progressive layer dossiers (01 to 07)
│   ├── releases/            # Release dossiers and notes
│   └── plan/                # 8-phase architectural blueprint and specs
└── scripts/
    ├── smoke.js             # Electron headless/display smoke test suite
    └── i18n-check.js        # Strict 100% translation coverage checker
```

---

## 3. Core Data Schemas & Invariants

### 3.1. Document Store Schema (`doc`)
The whiteboard state is serialized via `Store.toJSON()` and hydrated via `Store.load()`:
```javascript
{
  version: 2,
  objects: {
    [id]: {
      id: "s_1729000000",
      type: "stroke",          // 'stroke' | 'shape' | 'note' | 'text' | 'image' | 'curtain' | 'connector' | 'audio'
      tool: "highlighter",     // 'pen' | 'highlighter' | 'tape'
      color: "#fff100",
      width: 20,
      opacity: 0.50,           // Configurable opacity (default 0.50 for highlighters)
      colorPop: true,          // Text color-popping contrast enhancement toggle
      points: [
        { x: 100, y: 150, p: 0.5, t: 1240 } // p: pressure, t: timestamp relative to audio session start
      ],
      audioId: "aud_track_1",  // Linked audio track ID
      t0: 1240,                // Earliest stroke point timestamp
      t1: 1820                 // Latest stroke point timestamp
    }
  },
  order: ["s_1729000000", ...],
  pages: [
    {
      w: 794,
      h: 1122,
      date: "2026-10-17",
      margins: { left: 40, right: 40, top: 40, bottom: 40 }, // Page margin adjustments
      bg: "#ffffff"
    }
  ],
  audioTracks: [               // Registered audio lecture sessions
    {
      id: "track_1729000000",
      assetId: "ast_abc123",   // File asset reference stored in app://board/asset/<id>
      name: "Lecture 4 Notes",
      durationMs: 452000,      // Explicit duration in milliseconds (avoids WebM Infinity bug)
      created: 1729180000000,
      bookmarks: [
        { id: "bm_1", t: 124000, name: "Proof of Theorem 2" }
      ]
    }
  ],
  tags: ["#study/math", "#exam"],
  aliases: ["Linear Algebra Lecture 4"]
}
```

---

## 4. Key Engineering Invariants (Must Never Violate)

1. **Scene Partitioning During Replay**:
   * During audio replay, strokes belonging to the currently playing session (`o.audioId === activeTrackId`) must **never** be baked into the base frozen canvas bitmap. The base pass filters them out: `(o) => o.audioId !== activeTrackId`. Replay strokes are drawn exclusively in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation**:
   * All point simplification, stroke smoothing, and Bezier curve fitting functions in `tools.js` and `ink.js` must strictly preserve `p.t`. Stripping `p.t` causes replay to break.
3. **i18n Parity (100% Coverage)**:
   * Every user-facing UI string must be wrapped in `t('...')` and present in all 7 locale dictionaries (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`). `node scripts/i18n-check.js` enforces this and will fail the build if a string is missing.
4. **Zero Extra Native Dependencies**:
   * Do not introduce native C++ Node addons (e.g. `node-gyp`). Keep all gesture mathematics, inking interpolation, and audio handling in pure portable JavaScript so the app builds cleanly on any Windows system.

---

## 5. Verification Commands

The mandatory regression suite and custom-addition suites are separate. Run `npm run smoke:custom` for the custom feature group, or `npm run smoke:features:4.8.4.1` / `npm run smoke:features:4.8.8` for release-scoped checks. Translation verification is separate and should be run when locale/UI strings are part of the change.

Before creating any release or commit, verify the entire test suite passes:
```powershell
# 1. Run the full smoke test suite (1,240 tests)
node scripts/smoke.js

# 2. Verify all 7 translation dictionaries; use the checker's current count rather than a hardcoded historical total
node scripts/i18n-check.js

# 3. Build Windows Executables (NSIS installer, portable exe, unpacked directory)
npm run dist:win
```

---

## 6. On-Hold Features & Next Steps

* **Layer System (On Standby)**:
  * The user requested to put the multi-layer feature on hold.
  * When resuming, follow the architecture detailed in Phase 4 of `docs/plan/04-quality.md`: add `layerId` to objects, maintain `doc.layers = [{ id, name, visible, locked }]`, and add visibility filtering to `render.js:drawScene()`.

## 7. Handover Authority and Evidence

- For what is in the v4.8.1 baseline, use [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md).
- For v4.8.2–v4.8.8 evolution, use [`FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](FEATURE_EVOLUTION-4.8.1-to-4.8.8.md); for v4.8.9 onward, use the per-release dossiers linked from [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md).
- For current implementation entry points and test commands, use `docs/INDEX.md` and the single relevant `docs/layers/*.md` dossier. Plans are historical proposals, not proof that a feature shipped.
- For final package identities, checksums, and archive path, use [`releases/RELEASE-4.8.11.md`](releases/RELEASE-4.8.11.md). The portable and installer artifacts are under `dist/` in the working tree and the verified snapshot under the archive path above.
- Current exporter remains Chromium `canvas.captureStream()` + `MediaRecorder` (VP9/Opus with WebM fallback). WebCodecs and native FFmpeg were assessed but not integrated; a performance claim requires representative real-board benchmarks.

---

## 8. Handover Protocol for AI Models: Autonomous Auditing, Hardening & Lateral Feature Cross-Pollination

This section establishes mandatory operating directives for any AI assistant continuing engineering on GazBoard:

### 8.1. Autonomous Auditing & Vulnerability Discovery
1. **Never Assume Code is Defect-Free**: Continuously audit recent releases (v4.8.12 through v4.8.20) for subtle regressions:
   - State isolation leaks between split viewports ([`src/js/ui/split-workspace.js`](../src/js/ui/split-workspace.js)).
   - Coordinate space drift or precision loss during deep zooming or pan bounds ([`src/js/core/camera.js`](../src/js/core/camera.js), [`src/js/ui/pagemargin-dialog.js`](../src/js/ui/pagemargin-dialog.js)).
   - WeakMap and geometry cache invalidation gaps ([`src/js/core/ink.js`](../src/js/core/ink.js), [`src/js/core/render.js`](../src/js/core/render.js)).
   - SVG `<foreignObject>` namespace compliance and unescaped HTML characters ([`src/js/core/markdown.js`](../src/js/core/markdown.js)).
2. **Defensive Hardening**: When a potential flaw, vulnerability, or poor architectural decision is identified:
   - Do not wait for user complaints; proactively propose and implement the hardening fix.
   - Always accompany code changes with targeted unit tests in `test/custom-features.test.mjs` or `test/markdown.test.mjs`.

### 8.2. Lateral Feature Cross-Pollination & App Inspiration
When designing or refining features, actively examine and draw inspiration from premier study and note-taking apps:
* **Obsidian & Logseq**:
  - Frontmatter metadata extraction (`--- yaml ---`) auto-populating board properties and `#tags`.
  - Magnetic edge connection ports on card bounding boxes for visual flowcharting.
  - Collapsible block callouts and embedded board cards (`![[Board#Section]]`).
* **Flexcil & LiquidText**:
  - Split-view bidirectional excerpt jump links with visual accent glow pulses (`#00e5ff`).
  - Margin grid snapping for study notes and Cornell layout workflows.
* **StarNote, GoodNotes 6 & Apple Notes**:
  - Scribble-to-erase kinematics and lasso circle-to-select gestures.
  - Straighten-and-hold tactile stroke snapping for lines, circles, and polygons.
* **Concepts & Procreate**:
  - Real-time digitizer stylus barrel tilt modulation (`tiltX`, `tiltY`) for chisel calligraphy and fountain flex.
  - Realistic wet ink bleed and paper grain procedural shaders.

### 8.3. Execution & Fast Testing Directives
* **Strict Fast Test Budget**: ONLY run `node --test test/custom-features.test.mjs test/markdown.test.mjs test/replay-reading.test.mjs test/video-framing.test.mjs` ($< 250\text{ms}$). NEVER run the 1,240 base smoke tests.
* **Portable Packaging by Default**: Standard feature builds must produce `GazBoard-v<Version>-Portable.exe` in `releases/` and mirror to `C:\Users\kazir\Documents\Antigravity\GazBoard\dist\`.
