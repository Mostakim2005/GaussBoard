# GazBoard Replay — Developer Handover & Future Agent Guide

> **Important**: This document is the primary onboarding manual for any future AI assistant, software engineer, or contributor picking up this project in a new session or clean environment. It details the complete architecture, data models, state flows, invariant guardrails, and build instructions.

---

## 1. Executive Summary

* **Project**: **GazBoard Replay** (Windows-first fork of GazBoard v4.8.1).
* **Base Repository**: Upstream [GazBoard by theBoringCodes](https://github.com/fahim9778/GazBoard).
* **Mission**: Deliver a lightning-fast, offline-first digital whiteboard tailored for Windows 10/11 tablet and desktop users, integrating study features inspired by **StarNote** and **Flexcil**:
  1. *Audio-Synchronized Note Replay*: Audio recordings capture sub-millisecond timestamps on every pen point (`p.t`), enabling temporal replay with electric cyan glow animations, waveform density scrubbing, and click-to-seek jump.
  2. *Active-Recall Study Tape*: Interactive masking tape rendered with diagonal neon hatched stripes that toggle open and closed on tap.
  3. *Natural Gesture Scratch-Out Eraser*: Rapid back-and-forth scrubbing automatically deletes struck-through words with zero false-positives on normal handwriting.
  4. *Turnout-Style Page Margin Adjustment*: Draggable 8-handle margin controller with Cornell Notes and wide margin templates.
  5. *Dual Study Workspace*: Side-by-side split screen for simultaneous textbook viewing and scratch-pad note taking.
  6. *Pluggable Inking Pipeline*: Hardware DirectInk low-latency pen trail paired with pure-JS velocity-weighted cubic Bézier curve fitting (`Windows Ink` mode).
  7. *Deterministic Video Exporter*: Multi-session WebM animation pipeline with stitched audio tracks.

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
│   │   │   ├── camera.js    # Camera viewport, 2D transforms, zoomTo, fitWidth, fitHeight
│   │   │   ├── connectors.js# Line & arrow geometry, barbed arrowheads, heads converter
│   │   │   ├── hit.js       # Spatial hit-testing, pick(), box selection, lasso
│   │   │   ├── ink.js       # Pluggable inking engines (GazBoard, Windows Ink Bézier, Freehand)
│   │   │   ├── inktrail.js  # Chromium Delegated Ink Trail (navigator.ink.requestPresenter)
│   │   │   ├── pages.js     # Pad sheet layout, pageRects, margin offset computation
│   │   │   ├── render.js    # 2D canvas drawing pipeline, dual-pass glow, audio cards, composite modes
│   │   │   ├── replay.js    # ReplayEngine, temporal stroke scheduler, autonomous delta clock
│   │   │   ├── scratch.js   # Gesture scratch-out detector (dominant axis spatial overlap guard)
│   │   │   ├── store.js     # Document op-log, undo/redo stacks, toJSON/load serialization
│   │   │   ├── surface.js   # Interactive viewport canvas, dynamic HUD passes, bloom decay
│   │   │   └── tools.js     # Pointer event state machine (draw, erase, marquee, tap-to-seek)
│   │   └── ui/              # User interface components and floating controls
│   │       ├── audio-bar.js        # Floating draggable AudioBar HUD & Recording Panel
│   │       ├── density-canvas.js   # Waveform density scrubber & named bookmark editor
│   │       ├── note-overview.js    # Gallery card view with smart reflow action overlay
│   │       ├── pagemargin-dialog.js# Turnout-style page margin modal with 8 draggable handles
│   │       ├── pagepicker.js       # PDF import page range, mode (background/objects), & alignment
│   │       ├── panels.js           # Settings panels, in-settings token search, paper selection
│   │       ├── properties-dialog.js# Obsidian-style board tags & aliases with autocomplete
│   │       ├── replay-bar.js       # Movable ReplayBar floating HUD
│   │       ├── search-dialog.js    # OmniSearch (Ctrl+F) multi-word fuzzy search
│   │       ├── split-workspace.js  # Dual side-by-side study workspace manager
│   │       └── toolbar.js          # Bottom/top toolbars, zoom presets popover, highlighter menu
│   └── locales/             # 7 synchronized translation files (ar, bn, de, es, pt-BR, zh-Hans, zh-Hant)
├── docs/
│   ├── FEATURE_RECORD.md    # Master feature index (F-101 to F-119) and invariants
│   ├── BUG_FIX_LOG.md       # Root-cause breakdown of all fixed bugs
│   ├── DEVELOPER_HANDOVER.md# This onboarding manual
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

Before creating any release or commit, verify the entire test suite passes:
```powershell
# 1. Run the full smoke test suite (1,240 tests)
node scripts/smoke.js

# 2. Verify all 7 translation dictionaries are 100% complete (1,368 strings)
node scripts/i18n-check.js

# 3. Build Windows Executables (NSIS installer, portable exe, unpacked directory)
npm run dist:win
```

---

## 6. On-Hold Features & Next Steps

* **Layer System (On Standby)**:
  * The user requested to put the multi-layer feature on hold.
  * When resuming, follow the architecture detailed in Phase 4 of `docs/plan/04-quality.md`: add `layerId` to objects, maintain `doc.layers = [{ id, name, visible, locked }]`, and add visibility filtering to `render.js:drawScene()`.
