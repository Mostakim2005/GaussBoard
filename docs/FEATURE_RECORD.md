# GazBoard Replay — Master Feature & Fixes Record

This document serves as the master registry of all features, enhancements, bug fixes, algorithmic parameters, and regression invariants implemented in GazBoard Replay (Windows-first fork). Every entry lists its purpose, source files, acceptance criteria, and regression test invariants.

---

## 1. Feature & Invariant Index

| Feature ID | Name | Primary Files | Status | Regression Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **F-101** | StarNote Gesture Scratch-Out Eraser | `src/js/core/scratch.js`<br>`src/js/core/tools.js`<br>`src/js/ui/toolbar.js` | Verified | $\ge 5$ sharp reversals, density $\ge 3.5$, net progress $\le 0.35$, dominant reversal axis spatial overlap guard ($\ge 0.25$). No time limit cutoff. Never erases digits (`2 3 2`, `3`) or words (`w`, `m`, `WRM`). Explicit ON/OFF toggle in Eraser popover. |
| **F-102** | Active-Recall Study Tape | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/core/hit.js` | Verified | Concealed: diagonal hatched violet/cyan stripes with neon border. Revealed: faint translucent neon outline. Tapping reveals/conceals instantly without dragging background canvas. Supports freehand marker strokes and rectangular boxes. |
| **F-103** | Audio Recording & Temporal Stroke Sync | `src/js/core/audio-recorder.js`<br>`src/js/core/tools.js`<br>`src/js/core/store.js`<br>`src/js/ui/toolbar.js` | Verified | `#btnTopRecord` captures `p.t` on every stroke point; records WebM audio; stores metadata in `doc.audioTracks`. Additive schema (v2 backward compatible). Stripped from LAN sync. |
| **F-104** | Canvas Replay Engine & Glow Inking | `src/js/core/replay.js`<br>`src/js/core/surface.js` | Verified | Past strokes: 100% ink (with 450ms cyan bloom decay on finish). Active stroke: electric neon cyan glow outline (`#00e5ff`, shadowBlur 14, width + 5) with glowing pen tip. Future strokes: light-gray ghosted ink (`alpha=0.38, grayscale(1)`). Fallback delta clock prevents audio stall. Base canvas isolates audio strokes. |
| **F-105** | AudioBar HUD, Scrubber & Bookmarks | `src/js/ui/audio-bar.js`<br>`src/js/ui/density-canvas.js` | Verified | Floating player with speeds (0.5x–2.0x), configurable skip steps (5s, 10s, 13s, 15s, 30s), custom glassmorphic session selector, interactive density waveform, stylus/touch seeking, and floating bookmark preview card with clickable `[Jump]` button. |
| **F-106** | Top Bar Recording & Obsidian Properties | `src/index.html`<br>`src/js/ui/toolbar.js`<br>`src/js/ui/properties-dialog.js` | Verified | Embedded top-bar audio button with glowing neon red border and live timer. `[🏷️ Properties]` dialog with cross-board workspace autocomplete for tags (`#tag/subtag`) and aliases. Live top-bar property chips. |
| **F-107** | Unified OmniSearch & In-Settings Search | `src/js/ui/search-dialog.js`<br>`src/js/ui/panels.js` | Verified | OmniSearch dialog (Ctrl+F) with light separator and dynamic sizing. Multi-word token fuzzy matching across titles and descriptions for both board search and in-Settings search. |
| **F-108** | Split Study Workspace & Note Overview | `src/js/ui/split-workspace.js`<br>`src/js/ui/note-overview.js` | Verified | Side-by-side dual board viewer with robust pane lifecycle initialization. Double-clicking any card in Notes Overview opens note directly. Action bar overlay (`Split`, `Tag`, `Alias`) with smart reflow based on title length; removed redundant 3-dots menu. |
| **F-109** | ReplayBar Floating Toolbar HUD | `src/js/ui/replay-bar.js` | Verified | Draggable and dockable (Top, Bottom, Left, Right, Free). Horizontal/vertical orientation. 6px drag threshold and pointer capture prevents stylus magnetic latching. |
| **F-110** | Deterministic Video Exporter (WebM) | `src/js/export-video.js` | Verified | Offscreen canvas replay pump with audio muxing. Frames cumulative bounding box of session notes with padding. Real-time progress bar, instant cancel, and chunk-flush prevention of 0-byte exports. |
| **F-111** | Pen Opacity Slider & Toggle | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/ui/panels.js` | Verified | Supports stroke opacity (10%–100%) with quick solid/translucent toggle for ballpoint/gel-pen effects. |
| **F-112** | Laser Trail Duration Controller | `src/js/core/surface.js`<br>`src/js/core/tools.js`<br>`src/js/ui/panels.js` | Verified | Configurable trail duration (0ms/instant fade, 300ms, 520ms, 1.2s, 2.5s, 5.0s, 10s). Instant choice highlight (`.primary`) on click. |
| **F-113** | Board Link Cards: Thumbnail Toggle | `src/js/core/render.js`<br>`src/js/ui/contextmenu.js` | Verified | Board link card can toggle between rich visual thumbnail preview and compact text/icon pill card. Fixed right-click context menu and selection toolbar overlap conflict. |

---

## 2. Hardening & Feedback Resolution Log

### Round 1 & Round 2 Hardening (All 9 User Issues Addressed)
1. **Note Overview Double-Click & Smart Reflow Actions** (`src/js/ui/note-overview.js`):
   - Added `dblclick` event listener on board cards to open immediately.
   - Removed 3-dots menu. Added direct action overlay buttons: `[ | ] Split View`, `# Tag`, `🏷️ Alias`.
   - Implemented smart reflow: if title exceeds 22 characters, the action buttons reflow cleanly above the title.
2. **Context Menu vs. Selection Bar Overlap** (`src/js/ui/contextmenu.js`):
   - Dismisses `#ctxbar` immediately on right-click context menu open and restores it cleanly on dismiss.
3. **Smart Multi-Word Fuzzy Search** (`src/js/ui/search-dialog.js`, `src/js/ui/panels.js`):
   - Added token-based fuzzy matching searching both title and description across boards and Settings.
   - Indexed all missing settings: `laserTrailDuration`, `penOpacity`, `boardLinkThumb`.
   - Upgraded in-Settings live search with immediate DOM filtering and category headers.
4. **Audio Recording Top Button & Replay Synchronization** (`src/js/ui/toolbar.js`, `src/js/core/audio-recorder.js`, `src/js/core/replay.js`, `src/js/core/surface.js`):
   - Fixed `#btnTopRecord` to check `app.audioRecorder.recording`, append to `doc.audioTracks`, and persist board.
   - Added autonomous `performance.now()` delta fallback clock in `ReplayEngine` to eliminate play/skip lockups.
   - Added electric neon cyan glow outline (`#00e5ff`, shadowBlur 14, width + 5) to currently replaying strokes and 450ms bloom decay to just-completed strokes.
   - Configurable skip intervals: `[5s, 10s, 13s, 15s, 30s]`.
   - Custom glassmorphic session menu replacing raw `<select>` to avoid DOM destruction mid-click.
   - Added floating bookmark preview card with clickable `[Jump]` button and stylus/touch seek support.
5. **Scribble Gesture Eraser Accuracy & Toggle** (`src/js/core/scratch.js`, `src/js/ui/toolbar.js`):
   - Removed 3000ms arbitrary time limit.
   - Added dominant reversal axis spatial overlap guard: distinguishes dense overlapping scribbles from sequential handwriting (`2 3 2`, `WRM`).
   - Added explicit ON/OFF toggle in Eraser popover and ReplayBar.
6. **Workspace Properties & Tag/Alias Autocomplete** (`src/js/ui/properties-dialog.js`, `src/js/ui/toolbar.js`, `src/index.html`):
   - Added `loadWorkspaceSuggestions()` pulling previous tags and aliases across all saved boards.
   - Interactive autocomplete dropdown supporting Enter/Tab/click selection.
   - Live top-bar property chips mounted directly beside `[🏷️ Properties]` for immediate visibility without opening the dialog.
7. **Settings UI Instant Feedback & Durations** (`src/js/ui/panels.js`):
   - Fixed `mkChoice` to immediately toggle the `.primary` class on click.
   - Extended laser durations to include `2.5s`, `5.0s`, and `10s`.
8. **Split Workspace Stability** (`src/js/ui/split-workspace.js`):
   - Fixed initialization crash where `this.rightPane` was referenced before construction.
9. **Zero-Regression Verification**:
   - `node scripts/smoke.js`: 1240 passed, 0 failed.
   - `node scripts/i18n-check.js`: 1256/1256 translated, 0 left over, 0 problems across all 7 languages.

---

## 3. Critical Architectural Rules & Anti-Regression Guardrails

1. **Cover Selection vs Study Tape Tap**:
   - `hitCurtain.subtype === 'tape'` toggles immediately on tap.
   - Standard answer covers (`subtype !== 'tape'`) must be selectable in `select` mode so `#ctxbar` displays the "Reveal" button.
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
