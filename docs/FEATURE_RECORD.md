# GazBoard Replay — Master Feature & Fixes Record

This document serves as the master registry of all features, enhancements, bug fixes, algorithmic parameters, and regression invariants implemented in GazBoard Replay (Windows-first fork). Every entry lists its purpose, source files, acceptance criteria, and regression test invariants.

---

## 1. Feature & Invariant Index

| Feature ID | Name | Primary Files | Status | Regression Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **F-101** | StarNote Gesture Scratch-Out Eraser | `src/js/core/scratch.js`<br>`src/js/core/tools.js` | Verified | $\ge 5$ sharp reversals, density $\ge 3.0$, net progress $\le 0.45$. Never erases digits (`2 3 2`, `3`) or letters (`w`, `m`, `WRM`). Toggleable via `settings.scratchOut` and ReplayBar. |
| **F-102** | Active-Recall Study Tape | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/core/hit.js` | Verified | Concealed: diagonal hatched violet/cyan stripes with neon border. Revealed: faint translucent neon outline. Tapping reveals/conceals instantly without dragging background canvas. Supports freehand marker strokes and rectangular boxes. |
| **F-103** | Audio Recording & Temporal Stroke Sync | `src/js/audio-recorder.js`<br>`src/js/core/tools.js`<br>`src/js/core/store.js` | Verified | Captures `p.t` on every stroke point; records WebM audio; stores metadata in `doc.audioTracks`. Additive schema (v2 backward compatible). Stripped from LAN sync. |
| **F-104** | Canvas Replay Engine & Ghost Inking | `src/js/core/replay.js`<br>`src/js/core/surface.js` | Verified | Past strokes: 100% ink. Active stroke: progressive point rendering with glowing pen tip. Future strokes: light-gray ghosted ink (`alpha=0.38, grayscale(1)`). Base canvas isolates audio strokes so ghosting remains visible. Infinite replay loop. |
| **F-105** | AudioBar HUD, Scrubber & Bookmarks | `src/js/ui/audio-bar.js`<br>`src/js/ui/density-canvas.js` | Verified | Floating player with speeds (0.5x–2.0x), configurable skip step (5s, 10s, 13s, 15s), interactive density waveform, clickable gold bookmark diamonds, and session selector dropdown. |
| **F-106** | Top Bar Recording & Obsidian Properties | `src/index.html`<br>`src/js/ui/toolbar.js`<br>`src/js/ui/properties-dialog.js` | Verified | Embedded top-bar audio button with glowing neon red border and live timer. `[🏷️ Properties]` dialog for board aliases and hierarchical tags (`#AI/ML/LLM`). |
| **F-107** | Unified OmniSearch & In-Settings Search | `src/js/ui/search-dialog.js`<br>`src/js/ui/panels.js` | Verified | OmniSearch dialog (Ctrl+F) with light separator and dynamic sizing. In-settings real-time search input filtering all 23+ GazBoard settings rows and hints. |
| **F-108** | Split Study Workspace & Note Overview | `src/js/ui/split-workspace.js`<br>`src/js/ui/note-overview.js` | Verified | Side-by-side dual board viewer. Double-clicking any card in Notes Overview opens note directly. Fixed `boards.load(id)` IPC binding. |
| **F-109** | ReplayBar Floating Toolbar HUD | `src/js/ui/replay-bar.js` | Verified | Draggable and dockable (Top, Bottom, Left, Right, Free). Horizontal/vertical orientation. 6px drag threshold and pointer capture prevents stylus magnetic latching. |
| **F-110** | Deterministic Video Exporter (WebM) | `src/js/export-video.js` | Verified | Offscreen canvas replay pump with audio muxing. Frames cumulative bounding box of session notes with padding. Real-time progress bar, instant cancel, and chunk-flush prevention of 0-byte exports. |
| **F-111** | Pen Opacity Slider & Toggle | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/ui/panels.js` | Verified | Supports stroke opacity (10%–100%) with quick solid/translucent toggle for ballpoint/gel-pen effects. |
| **F-112** | Laser Trail Duration Controller | `src/js/core/surface.js`<br>`src/js/core/tools.js`<br>`src/js/ui/panels.js` | Verified | Configurable trail duration (0ms/instant fade, 300ms, 520ms, 1200ms). Instant fade clears trail immediately on pointer release. |
| **F-113** | Board Link Cards: Thumbnail Toggle | `src/js/core/render.js`<br>`src/js/ui/contextmenu.js` | Verified | Board link card can toggle between rich visual thumbnail preview and compact text/icon pill card. |

---

## 2. Critical Architectural Rules & Anti-Regression Guardrails

1. **Cover Selection vs Study Tape Tap**:
   - `hitCurtain.subtype === 'tape'` toggles immediately on tap.
   - Standard answer covers (`subtype !== 'tape'`) must be selectable in `select` mode so `#ctxbar` displays the "Reveal" button. Never intercept all curtains indiscriminately.
2. **Base Canvas Scene Partitioning**:
   - When an audio session is active or loaded into `AudioBar`, base drawing passes (`drawScene`, `warmFreeze`) MUST apply `(o) => o.audioId !== activeTrackId`. Never draw audio strokes into the base canvas before `drawReplaySession()` runs.
3. **Point Timestamp Preservation**:
   - `tools.js` point generators must preserve `p.t`. Never strip `p.t` during smoothing or simplification.
4. **Finite Duration in Video Export**:
   - Never trust `audio.duration` directly without checking `isFinite()`, as WebM streams can report `Infinity`. Always fall back to `track.durationMs`.
5. **Zero Extra Dependencies**:
   - All gesture math, canvas rendering, hatched patterns, and audio protocols are built natively with zero extra npm dependencies.
6. **i18n Parity Invariant**:
   - All user-facing strings must use `t('...')` and be present across all 7 locale dictionaries (`scripts/i18n-check.js` exit code 0).
