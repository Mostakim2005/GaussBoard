# GazBoard Replay — Master Feature & Fixes Record

> **Current source of release-by-release truth:** [`FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) covers v4.8.2–v4.8.8; later additions are cataloged in [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) and `docs/releases/RELEASE-*.md`. The catalog of original v4.8.1-only capabilities is [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md). This record retains detailed feature IDs and historical implementation notes; check current source and release tests when older entries conflict.

This document serves as the master registry of all features, enhancements, bug fixes, algorithmic parameters, and regression invariants implemented in GazBoard Replay (Windows-first fork). Every entry lists its purpose, source files, acceptance criteria, and regression test invariants.

---

## 1. Feature & Invariant Index

| Feature ID | Name | Primary Files | Status | Regression Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **F-101** | StarNote Gesture Scratch-Out Eraser | `src/js/core/scratch.js`<br>`src/js/core/tools.js`<br>`src/js/ui/toolbar.js` | Verified | $\ge 5$ sharp reversals, density $\ge 3.5$, net progress $\le 0.35$, dominant reversal axis spatial overlap guard ($\ge 0.25$). No time limit cutoff. Never erases digits (`2 3 2`, `3`) or words (`w`, `m`, `WRM`). Explicit ON/OFF toggle in Eraser popover. |
| **F-102** | Active-Recall Study Tape and Answer Covers | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/core/hit.js`<br>`src/js/core/store.js`<br>`src/js/app.js`<br>`src/js/ui/toolbar.js` | Follow-up verification added | Freehand tape and rectangular covers persist in both states and toggle concealed/revealed on tap. The revealed outline remains hittable; attached content follows each state. A dedicated tape-drawing tool is available from the ribbon and Add/tools menus. Focused checks are in `test/smoke-features-4.8.8.js`; root-cause and release-boundary notes are in `docs/releases/WORKING-FOLLOWUP-4.8.8-study-tape.md`. |
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
| **F-114** | Highlighter Opacity (50% Default) & Color-Popping | `src/js/core/render.js`<br>`src/js/core/tools.js`<br>`src/js/ui/toolbar.js` | Verified | Default opacity 50% (0.50). Interactive slider (10%–100%) in popover. Color-Popping composite mode keeps underlying dark text crisp and distinct without clouding or washing out. |
| **F-115** | Audio Skip Duration Customization | `src/js/ui/audio-bar.js` | Verified | Removed awkward 13s option. Skip durations strictly `[5s, 10s, 15s, 30s]`. Toggleable via click cycle or right-click options menu. |
| **F-116** | Audio Recording 3-Dot Menu & Canvas Cards | `src/js/ui/audio-bar.js`<br>`src/js/core/render.js`<br>`src/js/core/tools.js` | Verified | Recording panel matching Image 5 with header, `Audio-Ink Sync` toggle, and 3-dot context menu: `Insert into note`, `Export audio`, `Rename`, `Delete`. Audio note card on board with direct tap-to-play. |
| **F-117** | Named Bookmarks Inline Label Editor | `src/js/ui/density-canvas.js`<br>`src/js/ui/audio-bar.js` | Verified | Expanding inline rename field on bookmark pin tooltip card (hidden by default). Immediate persistence to `doc.audioTracks`. |
| **F-118** | PDF Import Mode & Auto-Alignment | `src/js/ui/pagepicker.js`<br>`src/js/insert.js` | Verified | Choice between `Movable objects` (printouts) and `Page background` (locked native pad sheets). Auto-alignment presets (`Fit width`, `Fit height`, `Fit page`). |
| **F-119** | Turnout Page Margin Adjustment Dialog | `src/js/ui/pagemargin-dialog.js`<br>`src/js/ui/panels.js`<br>`src/js/app.js` | Verified | Turnout-inspired modal with 8 draggable blue control handles, presets (Cornell wide left, wide right, top header, 2-col), background colors, and scope toggle (`Apply to entire note` vs `Apply to current page`). |
| **F-120** | Live Board Replay Surface Wiring | `src/js/app.js`<br>`src/js/core/surface.js`<br>`src/js/core/replay.js` | Verified | Connects the primary board Surface to its owning App so live drawing can access ReplayEngine and render progressively reanimated/highlighted session strokes. Reading/Writing mode remains a gesture/editing policy; sync and replay state govern the overlay. See BUG-023 and the v4.8.11 release dossier. |
| **F-121** | Obsidian YAML Block-List Metadata | `src/js/core/markdown.js`<br>`test/markdown.test.mjs` | Verified | Extracts tags and aliases from standard YAML block lists and parses quoted inline list entries with commas or colons without splitting their values. |
| **F-122** | Replay Display Modes Across Live and Export | `src/js/core/replay-clock.js`<br>`src/js/core/surface.js`<br>`src/js/export-video.js`<br>`src/js/ui/audio-bar.js` | Verified in v5.0.0 | Live reveal, Spotlight and Static are separate from Reading/Writing input mode; mode/filter and Ghost/Hidden Preview choices govern live board and single/stitched export. Live reveal remains the fallback. |
| **F-123** | Revision-Keyed Replay Session Index | `src/js/core/replay-clock.js`<br>`src/js/core/replay.js`<br>`src/js/export-video.js` | Verified in v5.0.0 | Reuses selected-session strokes by Store revision and track; at most 16 track indexes are kept per Store. Revision changes rebuild the index. Rendering visible strokes still scales with session size. |
| **F-124** | Sample-Rate-Stable Scratch Classifier | `src/js/core/scratch.js`<br>`test/custom-features.test.mjs` | Verified in v5.0.0 | Resamples valid points at 3 px spacing for classification only, preserves major axis/diagonal turns, rejects malformed coordinates and leaves actual ink samples unchanged. |
| **F-125** | Replay Camera and Pointer Focus Resilience | `src/js/core/replay.js`<br>`src/js/core/tools.js`<br>`test/replay-reading.test.mjs`<br>`test/custom-features.test.mjs` | Verified in v5.0.0 | Center follow uses a slower 360 ms response, caps a delayed frame at 50 ms and resets on pause. Window blur finalizes the active gesture and releases captured pointers. |

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
   - `node scripts/i18n-check.js`: 1,357/1,357 translated (100% complete) across all 7 locales.

### Round 4 Enhancements & Media Workflow Delivery
1. **Highlighter Opacity & Text Color-Popping** (`src/js/core/render.js`, `src/js/core/tools.js`, `src/js/ui/toolbar.js`, `src/js/app.js`):
   - Set default adjustable highlight opacity to 50% (`0.50`).
   - Integrated opacity slider (10%–100%) and live percentage indicator in the Highlighter palette.
   - Added `Text color-popping` toggle: prevents dark ink/scans from washing out beneath highlighters by using high-contrast composite mode, keeping underlying black text razor-sharp and punchy.
2. **Audio Skip Duration Reconfiguration** (`src/js/ui/audio-bar.js`):
   - Removed awkward 13-second interval. Configured skip durations strictly to `[5s, 10s, 15s, 30s]`.
   - Toggleable via left-click cycling or right-click / context menu dropdown for instantaneous interval selection.
3. **Recording Panel, 3-Dot Menu & Canvas Audio Cards** (`src/js/ui/audio-bar.js`, `src/js/core/render.js`, `src/js/core/tools.js`):
   - Upgraded session list into a full Recording Panel matching Image 5:
     - Header with close button `✕` and `Audio-Ink Sync` toggle with info tooltip.
     - Each recording item features title, duration, date/time, and a `•••` three-dot context menu.
     - Context menu actions:
       1. `Insert the recording into the note`: drops an interactive `type: 'audio'` player card directly onto the canvas with play/pause circle, duration, and track title. Tapping or double-clicking the card immediately opens playback.
       2. `Export audio`: prompts file download/save for `.webm` audio stream.
       3. `Rename`: in-place prompt to rename recording.
       4. `Delete`: removes track from `doc.audioTracks` and syncs UI.
4. **Named Audio Bookmarks** (`src/js/ui/density-canvas.js`):
   - Floating bookmark tooltip on the density scrubber timeline features an expandable edit toggle (hidden by default).
   - Clicking `✏️` reveals a name input field and `Save` button, updating `bm.name` and committing to `doc.audioTracks`.
5. **PDF Import Mode & Turnout Page Margin Adjustment** (`src/js/ui/pagepicker.js`, `src/js/insert.js`, `src/js/ui/pagemargin-dialog.js`, `src/js/ui/panels.js`, `src/js/app.js`):
   - Added PDF import mode selection in `choosePages`: `[Movable objects]` (standard printouts) vs `[Page background]` (locks imported PDF pages as native pad sheets, perfectly centered and scaled).
   - Auto-alignment presets: `[Fit width]`, `[Fit height]`, `[Fit page]`.
   - Implemented Turnout-inspired `PageMarginDialog`:
     - Visual canvas preview with **8 draggable blue circle control handles** (`nw, n, ne, e, se, s, sw, w`) allowing users to visually drag and expand/shrink margins with live dimension feedback.
     - 5 layout presets: Standard (uniform), Cornell Notes (wide left column for keywords/cues), Wide Right (annotation space), Top Header, and Two Columns.
     - Scope radio selector: `(●) Apply to the entire note` vs `( ) Apply to current page only`.
     - Accessible directly via `[📐 Page margin adjustment…]` in Canvas size settings.
6. **Quality & Test Verification**:
   - `node scripts/smoke.js`: 1240/1240 passed (100% pass rate).
   - `node scripts/i18n-check.js`: 1,357/1,357 translated (100% complete) across all 7 locales.

### 2.6 Milestone 5 Feedback Hardening: Navigation, Plus Menu Hot-Pinning, Ribbon Customization & Hover Persistence
1. **Mouse Wheel Dual Mode & Arrow Key Navigation** (`src/js/core/tools.js`, `src/js/app.js`, `src/js/ui/panels.js`, `src/js/ui/search-dialog.js`):
   - **Settings Toggle**: `Mouse wheel action` selector with two clear options:
     - `Page scroll / Pan (Ctrl to zoom)` (`mouseWheelMode: 'scroll'`)
     - `Zoom in/out (Ctrl to scroll)` (`mouseWheelMode: 'zoom'`)
   - **Intelligent Dual Mode**: Wheel executes the configured primary action; holding `Ctrl` seamlessly switches to the alternate action; `Shift+wheel` performs horizontal panning.
   - **Trackpad Protection**: Native two-finger trackpad panning and pinch-to-zoom remain completely smooth and unaffected.
   - **Arrow Key Navigation**:
     - Infinite canvas: arrow keys ($\leftarrow, \rightarrow, \uparrow, \downarrow$) pan in all 4 directions.
     - Paged mode: $\uparrow, \downarrow$ smoothly scroll page-by-page.
     - `Shift` key accelerates step size; safely suppressed when editing text or typing in inputs.
2. **Plus (`+`) Menu In-Place Hot-Pinning & Ribbon Customization** (`src/js/ui/toolbar.js`, `src/js/app.js`):
   - **Hot-Pinning in Place**: Toggling pin/unpin (📌 / 📍) in the `+` menu updates the pin icon, opacity, title, and ribbon state instantly without closing the popover or destroying the anchor button, enabling multiple pins/unpins in one sitting.
   - **Persistent Pinned Slot**: Dedicated `#pinnedToolsSlot` container in the toolbar allows hot-swapping pinned buttons without re-rendering or wiping `#toolbar`.
   - **Bidirectional Ribbon Customization**:
     - All primary ribbon tools (`select`, `lasso`, `pan`, `laser`, pens, `highlighter`, `eraser`, `ruler`, `text`, `note`, `shape`, `emoji`) can be moved to the `+` menu.
     - Right-clicking any ribbon tool moves it to the `+` menu (`app.settings.hiddenRibbonTools`) with a toast notification.
     - The `+` menu displays a dedicated "Ribbon tools" section with live 📌/📍 toggles and direct click-to-activate support.
     - Includes Class tools (`timer.open`, `view.present`, `insert.curtain`) as pinnable items.
3. **Windows-Style Persistent Hover Quick Actions & Side-by-Side Coexistence** (`src/js/app.js`, `src/js/ui/contextmenu.js`, `src/js/ui/panels.js`):
   - **Hover Grace Bridge**: Added a 350ms grace timeout and `:hover` tracking on `#ctxbar` so users can comfortably move the pointer onto the floating quick-action bar without premature dismissal.
   - **Side-by-Side Menu Positioning**: When both the horizontal quick-action toolbar (`#ctxbar`) and the vertical context menu are active, the context menu positions itself adjacent to `#ctxbar` (`cr.right + 8` or `cr.left - 8 - menuWidth`), guaranteeing zero overlap.
   - **Settings Toggle**: Added `Show quick actions on hover` switch in Settings.
4. **Verification**:
   - `node scripts/smoke.js`: 1240/1240 passed (100%).
   - `node scripts/i18n-check.js`: 1357/1357 translated (100%) across all 7 languages.

---

## 3. Critical Architectural Rules & Anti-Regression Guardrails

### V 4.8.8 Consolidated Audit Release

- Consolidates the intended additions from v4.8.2–v4.8.7 on the latest source tree.
- Adds a separate Catmull–Rom/Bézier inking engine; existing engines remain selectable. Point timestamps and metadata remain attached to samples.
- Adds settings opacity range, template tag filtering, video export presets, visible page margin guides, and arrowhead style selection; see `docs/releases/RELEASE-4.8.8.md` for behavior boundaries and known limitations.
- Adds custom feature checks separately from the mandatory regression suite: `npm run smoke:custom` and `npm run smoke:features:4.8.8`.
- Initial audit: Codex 4.6 Medium in Cursor. Secondary audit and fixes: GPT-6 Luna High using Codex.

### V 4.8.9–4.8.11 Follow-up Releases

- **v4.8.9:** study tape and rectangular answer covers persist and toggle on tap; see `docs/releases/RELEASE-4.8.9.md`.
- **v4.8.10:** optional live replay camera follow and stationary/follow-strokes export framing; see `docs/releases/RELEASE-4.8.10.md`.
- **v4.8.11:** reliable pending seek state, visible live replay outline, application-native undoable recording rename, adaptive recording menu placement, camera viewport/center/dead-zone modes, unique safe export names, and a follow-up correction wiring the primary live Surface to the App/ReplayEngine; see `docs/releases/RELEASE-4.8.11.md`.
- **Current source:** v4.8.11 (`f01e1b3`, local tag `v4.8.11`) plus the documented post-tag live-surface wiring correction. The user confirmed the live replay highlight/animation works on the board; automated checks and build details are in the release dossier.

### V 5.0.0 Feature Audit and Improvements

- The ranked review of all project additions after v4.8.1 is in [`docs/releases/AUDIT-POST-4.8.1-TO-5.0.0.md`](releases/AUDIT-POST-4.8.1-TO-5.0.0.md). Highest complexity areas: audio-synchronized replay/video, isolated split workspace, advanced inking, and the Markdown/wikilink rendering pipeline.
- Adds selectable Live reveal, Spotlight and Static replay presentation across live board and video exports; these do not replace Reading/Writing input modes.
- Reuses revision-keyed per-track replay stroke indexes, steadies center camera easing across pauses/delayed frames, normalizes scratch gesture classifier spacing, and releases pointer captures after app focus loss.
- `npm run smoke:custom` is the release smoke scope for user-added features; v5.0.0 did not run the base-only full smoke suite per the user's explicit scope.
- See [`docs/releases/RELEASE-5.0.0.md`](releases/RELEASE-5.0.0.md) for test totals, artifact and local tag record.

### V 4.8.4.1 — Audit Follow-up

- Based on v4.8.4 commit `e6a2caf`; includes crop undo/cancel fixes, crop source-bound clamping, and isolated video export lifecycle/clock/audio-load fixes.
- Initial audit attribution: **Codex 4.6 Medium in Cursor**. Secondary audit and fixes attribution: **GPT-6 Luna High using Codex**. Both attributions are provided by the project owner.
- The v4.8.5, v4.8.6 and v4.8.7 changes are compared in `docs/releases/RELEASE-4.8.4.1.md` and are not included in this build.

1. **Cover Selection and Study Tape Tap**:
   - Both `subtype === 'tape'` and standard answer covers toggle on a direct tap, including the second tap to conceal again.
   - Revealed cover outlines stay hittable and objects attached to them are restored/hidden with the state. In Select mode, dragging still moves a cover; the floating toolbar's Reveal action remains available for unrevealed covers.
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
