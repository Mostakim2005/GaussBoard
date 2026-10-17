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

### Round 3 Hardening & Enhancements (Gallery Filter, Ribbon Customization, Crop/Annotate, Multi-Video Stitch)
1. **Gallery View Auto-Hide & Tag Filtering** (`src/js/ui/panels.js`, `src/js/app.js`, `src/js/ui/replay-bar.js`):
   - Auto-hides `ReplayBar` and `AudioBar` when entering "My boards" gallery, restoring on board open/close.
   - Added a `#tags` section in the left sidebar below "Folders" to filter boards by tag with counts.
   - Rendered glassmorphic tag badges (`#tag`) on board cards below titles without overlap.
   - Included board tags and aliases in `searchFind()` scoring.
2. **Ribbon Customization & Audio Import** (`src/js/ui/toolbar.js`, `src/js/insert.js`, `src/css/app.css`):
   - Widened ribbon with `overflow-x: auto` and thin scrollbar support.
   - Added `Audio / Recording…` (`insert.audio`) file import in the `+` menu (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`, `.aac`, `.flac`) calculating SHA-256 asset hash and duration.
   - Added selectable pin/unpin toggles (📌 / 📍) beside each insert menu item to move items to the ribbon or back to the menu. Right-clicking pinned tools on the ribbon instantly unpins them.
3. **Image / PDF Printout Hover Menu, Non-Destructive Crop & Direct Annotation Grouping** (`src/js/ui/contextmenu.js`, `src/js/core/render.js`, `src/js/core/tools.js`, `src/js/core/surface.js`):
   - Floating toolbar appears on pointer hover over items in `select` mode via `Surface.screenBoxFor()`.
   - Added `[✂️ Crop image]` with interactive edge sliders (`Top`, `Bottom`, `Left`, `Right`), non-destructive `o.crop = { sx, sy, sw, sh }` in `render.js:drawImage()`, and Reset/Apply buttons.
   - Added `[✏️ Annotate image]` mode: strokes drawn directly over an image receive `attachedTo: image.id`.
   - On `[Done Annotating]`, the image and all annotations are grouped together and locked (`locked: true`), moving as one unit and protected from eraser until unlocked.
4. **Multi-Session Stitched Video Export** (`src/js/export-video.js`):
   - Interactive session picker modal with checkboxes, up/down (▲/▼) reordering, and a stitch toggle.
   - Implemented sequential multi-track stitching: Web Audio multiplexes tracks sequentially into a single `MediaRecorder` stream, outputting a unified WebM video with synchronized audio and stroke replays.
   - Optional separate export mode saves each track individually.
5. **Quality & Test Verification**:
   - `node scripts/smoke.js`: 1240 passed, 0 failed.
   - `node scripts/i18n-check.js`: 1295/1295 translated across all 7 languages.

### Round 4 Enhancements (Arrow & Line Geometry, Custom Templates, Pluggable Inking, Zoom Presets Popover)
1. **Arrow & Line Geometry Customization** (`src/js/core/connectors.js`, `src/js/core/render.js`, `src/js/ui/contextmenu.js`, `src/js/app.js`):
   - Redesigned arrowhead geometry with elongated proportions (`lengthMul = 1.4`), barbed indentation, and prominent styling ("Bigger & clearer").
   - Added `o.arrowScale` support to scale arrowheads (`1.0x`, `1.5x`, `2.2x`) via the selection bar.
   - Added stroke thickness stepping (`app.stepLineWidth(+/- 1.5)`) for both lines, arrows, and shapes.
   - Added flexible heads converter supporting Plain line (`heads: 'none'`), Single arrow (`heads: 'end'`), and Bi-directional arrow (`heads: 'both'`), allowing instant conversion between straight lines and arrows.
2. **Custom Template System** (`src/js/ui/panels.js`, `src/js/templates.js`, `src/js/app.js`, `src/index.html`):
   - Added `#panelActions` container in panel header with two dedicated buttons when viewing Templates:
     - `[➕ Add template from outside]`: file picker for external images (`.png`, `.jpg`, `.webp`, `.svg`) or `.pdf` to import as background templates.
     - `[📋 Set current board as template]`: snapshots the active board's background, pages, and non-audio objects into a reusable custom template with promptable name.
   - Rendered "Custom templates" section in the Templates grid with live canvas/image previews and delete buttons (`[✕]`).
   - Extended `app.applyTemplate()` to restore custom layouts, background styling, pages, and imported template images.
3. **Pluggable Inking Architecture & Windows Ink Velocity Bézier Smoothing** (`src/js/core/ink.js`, `src/js/app.js`, `src/js/ui/panels.js`):
   - Created modular `InkEngine` pipeline: `GazBoard Default`, `Windows Ink (Velocity & Bezier)`, and `Perfect Freehand`.
   - Implemented velocity-weighted cubic Bézier spline interpolation inspired by Windows DirectInk / Snip & Sketch, dynamically adjusting stroke curvature based on pen velocity.
   - Added `Inking engine` choice dropdown in Settings under Low-latency inking options.
4. **Zoom Preset Popover & Fit Viewport Controls** (`src/js/ui/toolbar.js`, `src/js/core/camera.js`, `src/js/app.js`, `src/css/app.css`):
   - Added hover/click popover on `#zoomLabel` (`100%`) displaying presets: `900%`, `400%`, `200%`, `100%`, `50%`, `25%`.
   - Added interactive star buttons (`★` / `☆`) to favorite and visually highlight specific zoom presets.
   - Highlighted active zoom level matching the camera scale.
   - Added viewport fit options: `Fit width` (`↔`), `Fit height` (`↕`), `Fit to page` (`⛶`), and `Fit to board` (`⊡`).
   - Implemented `camera.fitWidth()` and `camera.fitHeight()` with smooth bounds clamping and aspect scaling.
5. **Quality & Test Verification**:
   - `node scripts/smoke.js`: verified 100% pass rate.
   - `node scripts/i18n-check.js`: 1320/1320 translated (100% complete) across all 7 locales.

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
