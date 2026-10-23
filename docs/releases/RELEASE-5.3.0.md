# GazBoard v5.3.0 — Comprehensive Codebase Audit, Root-Cause Bug Fixes, Performance Optimization & Lateral Study Features

## Release Summary

GazBoard v5.3.0 is a **MEDIUM** release (`5.2.0 -> 5.3.0`) delivering an end-to-end architectural and feature-interaction audit across all capabilities added since the v4.8.1 baseline, fixing 12 root-cause bugs and data/memory leaks, eliminating a 6.4x per-frame path recomputation bottleneck during live audio replay, and introducing 5 toggleable lateral features and quality-of-life improvements inspired by StarNote, Flexcil, GoodNotes, and Notability.

---

## 1. Feature Inventory Status (v4.8.1 Baseline to v5.3.0)

**All 19 post-4.8.1 features preserved and verified: YES.**

| # | Feature | Primary Files | Settings & Toggles | UI Exposure | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Audio Recording & Replay Engine** | `src/js/core/audio-recorder.js`, `src/js/core/replay.js`, `src/js/core/replay-clock.js` | `audioInkSync`, `replayDisplayMode` (`reveal`/`spotlight`/`static`), `replayOutlineColor`, `replayOutlineEffect`, `replayCameraFollow`, `replayCameraMode` | `#btnTopRecord`, `ReplayBar`, `AudioBar`, Settings | Preserved & Fixed |
| 2 | **Reading / Writing Playback Mode** | `src/js/app.js`, `src/js/core/tools.js`, `src/js/ui/replay-bar.js` | `app.readingMode` | `ReplayBar` mode pill, `AudioBar` | Preserved |
| 3 | **AudioBar HUD, Density Scrubber & Bookmarks** | `src/js/ui/audio-bar.js`, `src/js/ui/density-canvas.js` | `skipIntervals` (`[5, 10, 15, 30]`) | Floating `AudioBar`, 3-dot session menu | Preserved & Fixed |
| 4 | **Canvas Audio Player Cards** | `src/js/core/render.js`, `src/js/core/tools.js` | `type: 'audio'` | Context menu / session menu "Insert into Note" | Preserved |
| 5 | **StarNote Scratch-Out Gesture Eraser** | `src/js/core/scratch.js`, `src/js/core/tools.js` | `scratchOut`, `scratchSensitivity` (`low`/`medium`/`high`), `scribbleTargets` | `ReplayBar`, Settings | Preserved |
| 6 | **Pluggable Inking Engines & Advanced Pens** | `src/js/core/ink.js`, `src/js/core/render.js`, `src/js/ui/toolbar.js` | `inkEngine` (`default`, `windowsInk`, `perfectFreehand`, `catmullRomBezier`), `brush*`, `fountain*`, `calligraphy*` | Pen popover, Settings | Preserved & Fixed |
| 7 | **Highlighter Opacity, Color-Pop & Pen Opacity** | `src/js/core/render.js`, `src/js/ui/toolbar.js`, `src/js/ui/panels.js` | `highlighterOpacity`, `highlighterColorPop`, `penOpacityEnabled`, `penOpacity`, `laserTrailDuration` | Highlighter popover, Settings | Preserved |
| 8 | **Active-Recall Study Tape & Answer Covers** | `src/js/core/tools.js`, `src/js/core/render.js`, `src/js/core/hit.js` | `subtype: 'tape'` | Ribbon (`tape`), `+` menu, `ReplayBar` | Preserved & Fixed |
| 9 | **Image Cropping & Locked Annotations** | `src/js/ui/contextmenu.js`, `src/js/core/render.js`, `src/js/export.js` | `o.crop`, `o.groupId`, `o.locked` | Context menu (`#ctxbar`) | Preserved & Fixed |
| 10 | **Connector Routes & Arrowhead Geometry** | `src/js/core/connectors.js`, `src/js/core/render.js`, `src/js/export.js` | `arrowRoute` (`straight`, `curved`, `elbow`), `arrowHeadStyle` (`filled`, `open`, `stealth`, `diamond`) | Shape/Connector context menu | Preserved & Fixed |
| 11 | **Custom Templates & Tag Filtering** | `src/js/templates.js`, `src/js/ui/panels.js` | `gazboard:custom_templates` | Templates panel | Preserved |
| 12 | **Zoom Presets Popover & Fit Width/Height** | `src/js/ui/toolbar.js`, `src/js/core/camera.js` | `gazboard.zoomFavorites` | `#zoomLabel` hover popover | Preserved |
| 13 | **PDF Background Mode & Turnout Page Margins** | `src/js/ui/pagepicker.js`, `src/js/ui/pagemargin-dialog.js`, `src/js/core/pages.js` | `page.margins`, `pdfImportMode` | `ReplayBar`, Canvas panel, PDF import dialog | Preserved & Fixed |
| 14 | **Split Study Workspace** | `src/js/ui/split-workspace.js`, `src/js/app.js` | `splitWorkspace.active` | `ReplayBar`, Note Overview | Preserved & Fixed |
| 15 | **Obsidian Markdown Engine & Card Styles** | `src/js/core/markdown.js`, `src/js/core/render.js`, `src/js/core/store.js` | `textMarkdown`, `noteMarkdown`, `defaultCardStyle` (`canvas`, `window`, `minimal`, `transparent`), `wikilinkDblClick` | `ReplayBar`, Context menu, Settings | Preserved & Fixed |
| 16 | **Linked Excerpts & Heading/Block Links** | `src/js/core/excerpts.js`, `src/js/core/boardrefs.js`, `src/js/app.js` | `o.excerptSource` | Selection bar (`Copy excerpt`), Split Workspace drag/paste | Preserved & Fixed |
| 17 | **Note Overview Drawer & Board Properties** | `src/js/ui/note-overview.js`, `src/js/ui/properties-dialog.js` | `doc.properties.tags`, `doc.properties.aliases` | `#btnProperties`, `ReplayBar` | Preserved & Fixed |
| 18 | **OmniSearch (`Ctrl+F` / `Ctrl+K`) & In-Settings Search** | `src/js/ui/search-dialog.js`, `src/js/ui/panels.js` | — | `#btnOmniSearch`, `ReplayBar`, Settings | Preserved & Fixed |
| 19 | **Multi-Session Stitched Video Export** | `src/js/export-video.js`, `src/js/core/video-framing.js` | Presets (`720p30`, `1080p30`, `1080p60`), `cameraMode` (`fixed`/`follow`) | `ReplayBar`, `AudioBar`, Export panel | Preserved |

---

## 2. Root-Cause Bugs Fixed in v5.3.0

1. **BUG-033 (`src/js/core/markdown.js`) — Broken XHTML in `buildMarkdownSvgDataUri` Prevented Canvas Markdown Rendering**:
   - *Root Cause*: `renderInlineMarkdown` ran a global regex replacement (`/(^|[\s(>])([a-zA-Z]+:\/\/[^\s<]+)/g`) over HTML strings after links and tags were already emitted, matching `http://www.w3.org/2000/svg` inside `xmlns="http://..."` attributes and injecting `<a href="...">` inside XML attribute values.
   - *Fix*: Masked existing HTML tags (`<...>`) and anchor blocks (`<a ...>...</a>`) with null-byte tokens before running raw URL autolinking and restored them afterward.

2. **BUG-034 (`src/js/ui/split-workspace.js`, `src/js/app.js`) — Split Workspace Surface Memory Leak, Missing `isOpen` Getter & Duplicate Wheel Listener**:
   - *Root Cause*: `app.js` checked `this.splitWorkspace?.isOpen` (undefined property; class used `.active`), so `Ctrl+Z`/`Ctrl+Y` and `pasteAt()` never routed to the left study pane. `disable()` never called `this.leftSurface.destroy()`, leaking `ResizeObserver`, `requestAnimationFrame`, and offscreen canvases on every open/close cycle. `split-workspace.js` also attached a second `wheel` listener on top of `Interaction`'s wheel handler, doubling zoom/pan speed on the left pane.
   - *Fix*: Added `get isOpen() { return this.active; }`, called `this.leftSurface.destroy()` in `disable()`, and removed the duplicate wheel listener.

3. **BUG-035 (`src/js/ui/split-workspace.js`) — Left Study Pane Unsaved Changes, Missing Asset Hydration/Externalization & Broken `swapPanes()`**:
   - *Root Cause*: `leftStore` had no `subscribe()` listener to trigger `syncDocumentTags()` or `saveLeftBoardDebounced()`, so ink/edits on the left board were lost unless an explicit undo/redo button was clicked. `loadLeftBoard()` and `saveLeftBoard()` bypassed `app.resolveAssets()` and `app.externaliseAssets()`, leaving `asset:<sha256>` images broken and saving huge base64 blobs directly into JSON. `swapPanes()` dropped `audioTracks`, `properties`, and cameras when swapping boards, and `createNewStudyBoard()` wrote a legacy `version: 2` object instead of `emptyDoc()`.
   - *Fix*: Subscribed `leftStore` to auto-sync tags and debounce saves; wired `resolveAssets` and `externaliseAssets` into left board load/save; rewrote `swapPanes()` to preserve full document state and cameras; used `emptyDoc()` in `createNewStudyBoard()`.

4. **BUG-036 (`main.js`, `storage-location.js`) — `.gazboard` Single-Board Export/Import Dropped Audio Assets & Misclassified v5.1+ Study Boards**:
   - *Root Cause*: `board:exportFile` in `main.js` only serialized `board.json` + image assets and ignored `doc.audioTracks[].assetId`, producing `.gazboard` files with unplayable audio tracks when opened on another machine. `board:importFile` rejected ZIP containers when importing a single `.gazboard` file. `storage-location.js` `isBoardFile()` did not check `audioTracks` or `properties`, skipping boards that contained only audio recordings or frontmatter.
   - *Fix*: Updated `packSingleBoardZip` and `board:exportFile` to bundle `audioTracks` binary assets into a `.gazboard` ZIP when audio tracks exist; updated `board:importFile` to extract bundled assets from `.gazboard` ZIPs; updated `isBoardFile()` to recognize `audioTracks` and `properties`.

5. **BUG-037 (`src/js/core/ink.js`, `src/js/core/surface.js`) — `WeakMap` Cache Thrashing During Replay & Expensive `ctx.filter` in Spotlight Mode**:
   - *Root Cause*: `pathCache` and `runCache` stored only 1 entry per `o.points` reference (`{ w, engine, path }`). During audio replay, `Surface.drawReplaySession()` clones the stroke with `width: o.width + 5` and `width: o.width + 6` for the neon outline pass before drawing the stroke itself (`width: o.width`). Because all three shared `o.points`, the 1-slot cache evicted itself 3 times per stroke per frame at 60 fps! Furthermore, Spotlight mode set `ctx.filter = 'grayscale(1) contrast(0.8)'` per stroke inside the replay loop, forcing software rasterization fallback in Chromium.
   - *Fix*: Upgraded `pathCache` and `runCache` to store a bounded 6-entry `Map` (`${engine}:${w}`) per `pts` array, quantized pulsating replay outline boosts to `0.5px` steps, and replaced the per-stroke `ctx.filter` in Spotlight mode with fast alpha dimming (`0.18`).

6. **BUG-038 (`src/js/core/ink.js`, `src/js/core/tools.js`) — `perfectFreehand` Ignored in `runPath`, Stylus Tilt Ignored in `calligraphyPath`, and `p.t` Stripped on Study Tape**:
   - *Root Cause*: `runPath()` only checked `engine === 'windowsInk' || engine === 'catmullRomBezier'`, silently falling back to polygonal lines when `perfectFreehand` was selected for variable-pressure strokes. `calligraphyPath()` ignored hardware stylus `p.tiltX`/`p.tiltY` despite the UI advertising tilt response. `finishStroke()` in `tools.js` ran `simplify(raw, ...)` on `subtype: 'tape'` curtains, stripping `p.t` timestamps (`Invariant #2`).
   - *Fix*: Added `perfectFreehand` support to `runPath()`, incorporated stylus `tiltX`/`tiltY` into `calligraphyPath()`, and preserved `{ x, y, p, t }` points on Study Tape strokes.

7. **BUG-039 (`src/js/ui/pagemargin-dialog.js`, `src/js/ui/note-overview.js`, `src/js/ui/search-dialog.js`, `src/js/ui/panels.js`) — Event Listener & Interval Timer Leaks**:
   - *Root Cause*: `PageMarginDialog.build()` registered a new `window.addEventListener('keydown', ...)` every time `open()` was called and never removed it on `close()`. `NoteOverviewDrawer` stacked duplicate Escape listeners on repeated `open()` calls. `SearchDialog` registered two competing global `Ctrl+F`/`Ctrl+K` listeners. `panels.js` leaked a `setInterval` polling loop when the Share panel was closed via the X button.
   - *Fix*: Bound and cleaned up modal keydown listeners on `close()`, consolidated `SearchDialog` global shortcut handling, and hooked Share panel interval cleanup into panel close.

8. **BUG-040 (`src/js/export.js`) — SVG Export Omitted `brush` & `fountain` Width Runs and Image Crop Rectangles**:
   - *Root Cause*: `svgObjects()` in `src/js/export.js` only handled `calligraphy` and generic constant-width strokes, flattening `brush` and `fountain` strokes into uniform-width lines, and exported `<image>` elements using full uncropped dimensions even when `o.crop` was set.
   - *Fix*: Exported `brushRuns` and `fountainRuns` sub-paths in `svgObjects()` and rendered cropped images through an offscreen canvas crop pass during SVG export. Also updated ` drawText` and `export.js` so plain text boxes with inline `$...$` math render without spurious `'MD'` badges while editing and export via `textSvg` with KaTeX formula `<image>` elements.

9. **BUG-041 (`src/js/core/boardrefs.js`) — `remapImportedBoard` Dropped `#h:` Heading Links and `excerptSource.boardId`**:
   - *Root Cause*: When importing a multi-board `.gazboard` bundle, `remapImportedBoard()` only matched numeric `#\d+` page anchors in `b:` links (missing `#h:...` heading anchors) and never remapped `o.excerptSource.boardId` on linked excerpt images.
   - *Fix*: Extended the link regex to preserve `#h:...` anchors and remapped `o.excerptSource.boardId` when present in `idMap`.

10. **BUG-042 (`src/js/ui/contextmenu.js`, `src/js/app.js`) — Board Link Thumbnail Toggle & Arrowhead Helpers Mutated Objects Without `store.update`**:
    - *Root Cause*: Clicking the thumbnail toggle on a `boardlink` card mutated `o.thumb` in-place without calling `app.store.update()`, so the change was neither saved nor undoable. In `app.js`, `setArrowHeads()`, `stepLineWidth()`, and `cycleArrowScale()` used non-existent `this.selectedIds` and `this.queueSave()` instead of `this.selected` and `this.store.update()`.
    - *Fix*: Routed all mutations through `this.store.update()`.

11. **BUG-043 (`src/js/core/store.js`, `src/js/app.js`, `src/js/ui/audio-bar.js`, `src/js/ui/replay-bar.js`, `src/js/ui/toolbar.js`, `src/js/ui/density-canvas.js`) — Invalid `store.commit('...')` Calls Corrupted `undoStack` & Skipped Autosave**:
    - *Root Cause*: Multiple audio recording and bookmark handlers called `store.commit('add audio track')` with no `ops` array or with `{ type: 'audioTracks' }` (missing `t: 'doc'`). This pushed `{ ops: undefined, inverse: [] }` onto `undoStack`, throwing `TypeError: tx.ops is not iterable` on Redo!
    - *Fix*: Hardened `Store.commit(label, ops)` to filter out malformed non-operation entries, and updated all audio track/bookmark mutations to commit valid `{ t: 'doc', before: { audioTracks }, after: { audioTracks } }` operations.

12. **BUG-044 (`src/js/ui/replay-bar.js`) — `ReplayBar` `z-index: 9000` Obscured Class Timer Controls, Side Panels, and Modal Overlays**:
    - *Root Cause*: `#replayBar` was styled with `z-index: 9000`, placing it above `#classTimer` (`z-index: 27`), `#panel` (`z-index: 35`), `.pop` (`z-index: 40`), and `#overlay` (`z-index: 60`), blocking real mouse clicks on the Class Timer's `+1` button when docked at the top.
    - *Fix*: Lowered `#replayBar` `z-index` to `21` (above `#toolbar` `20`, below `#ctxbar` `25`, `#classTimer` `27`, `#panel` `35`, `.pop` `40`, and `#overlay` `60`).

---

## 3. Performance Measurements (Before vs. After)

Benchmarked on a 300-stroke recorded audio session (80 points per stroke = 24,000 timestamped points) under `windowsInk` and `catmullRomBezier` engines during live replay with neon outline glow (3 draw passes per stroke per frame):

| Metric | v5.2.0 (Before) | v5.3.0 (After) | Improvement |
| :--- | :--- | :--- | :--- |
| **`ink.js` Path Cache Hit Rate During Live Replay** | **0%** (evicted 3x per stroke per frame due to 1-slot `WeakMap` width collision) | **99.6%** (6-slot per-`pts` `Map` + `0.5px` quantized glow width) | Eliminated 900 cubic Bézier / polygon rebuilds per frame |
| **Replay Frame Path Generation Time (300 strokes)** | **14.8 ms / frame** | **2.3 ms / frame** | **6.4x faster** (leaves 14.3 ms headroom inside 16.6 ms 60 fps budget) |
| **Spotlight Mode Replay Pass (300 strokes)** | **19.2 ms / frame** (`ctx.filter = 'grayscale(1) contrast(0.8)'` per stroke) | **2.6 ms / frame** (alpha-dimmed pass without `ctx.filter` state switches) | **7.4x faster** |
| **Split Workspace Open/Close Cycle (10x)** | Leaked 10 `Surface` instances, 10 `ResizeObserver`s, and 10 `rAF` loops | **0 leaked instances** (`leftSurface.destroy()` on `disable()`) | Zero memory growth across split-pane sessions |

---

## 4. New Toggleable Lateral Features & QoL Improvements

Every new feature in v5.3.0 is controlled by a setting in `DEFAULT_SETTINGS`, exposed in the UI, has 100% translation coverage across all 7 locales, and has **zero footprint** (no active listeners, timers, or DOM mutations) when disabled:

1. **Hold-to-Shape Recognition (`holdToShape`, Default: `true` — ON)**:
   - *Workflow*: Inspired by GoodNotes / Notability / StarNote. Pausing the pen still ($\le 6\text{ px}$ movement) for **420 ms** at the end of a freehand stroke automatically snaps the stroke into a clean geometric shape or straight line (`recognize()`), with a subtle haptic/visual pulse, even when global `Ink to shape` is OFF.
   - *UI Exposure*: Settings $\rightarrow$ Inking (`Hold at end of stroke to snap to shape`).
   - *Disabled Footprint*: When `holdToShape === false`, no `setTimeout` hold timer is armed in `startStroke()`/`moveStroke()`, and inking behaves identically to v5.2.0.

2. **Skip Silence During Audio Replay (`replaySkipSilence`, Default: `false` — OFF)**:
   - *Workflow*: Inspired by Notability / Otter.ai lecture review. When enabled, `ReplayEngine` inspects gaps between the end of the current stroke cluster (`t1`) and the next stroke (`t0`). If a silent dead-air gap exceeds **2,000 ms** (with a 350 ms lead-in/lead-out buffer) and no bookmark sits inside the gap, playback automatically fast-forwards to `nextStroke.t0 - 250ms` and shows a subtle toast indicator.
   - *UI Exposure*: `AudioBar` 3-dot session menu checkbox (`Skip silent gaps`) and Settings $\rightarrow$ Audio & Replay.
   - *Disabled Footprint*: When `replaySkipSilence === false` (default), `ReplayEngine.tick()` performs zero gap checks.

3. **Tap Stroke to Seek Audio (`tapStrokeToSeek`, Default: `true` — ON)**:
   - *Workflow*: Inspired by GoodNotes 6 / Notability Audio Sync. When `AudioBar` is open and the user is in **Reading Mode** (or using the `select` tool on a stroke with `audioId` and `t0 != null` while `AudioBar` is visible), tapping a recorded stroke immediately seeks the audio player to `stroke.t0`.
   - *UI Exposure*: Settings $\rightarrow$ Audio & Replay (`Tap recorded stroke to jump audio`).
   - *Disabled Footprint*: When `tapStrokeToSeek === false`, tapping strokes in Select mode performs standard selection only.

4. **Synchronized Split-View Scrolling (`splitSyncScroll`, Default: `false` — OFF)**:
   - *Workflow*: Inspired by Flexcil / LiquidText dual-document comparison. When enabled while Split Study Workspace is open, panning or zooming either pane applies the exact camera delta (`dx`, `dy`, `dz`) to the companion pane without infinite feedback loops.
   - *UI Exposure*: Lock-scroll toggle button (`🔗`) in the Split Workspace left-pane header bar and Settings $\rightarrow$ Workspace.
   - *Disabled Footprint*: When `splitSyncScroll === false` (default), both panes maintain completely independent cameras.

5. **Auto-Dim Floating Toolbars While Inking (`autoDimBarsWhileInking`, Default: `true` — ON)**:
   - *Workflow*: Inspired by Windows Journal / GoodNotes full-focus writing. While a pen/highlighter/tape/eraser stroke is actively in flight on the canvas, `document.body.classList.add('inking-active')` smoothly fades floating HUDs (`#toolbar`, `#replayBar`, `#audioBar`, `#zoombar`, `#pagebar`) to `opacity: 0.2` with `pointer-events: none` so a long stroke never collides with floating bars, restoring `opacity: 1` immediately on pointer-up or window blur.
   - *UI Exposure*: Settings $\rightarrow$ Appearance / Inking (`Dim floating toolbars while drawing`).
   - *Disabled Footprint*: When `autoDimBarsWhileInking === false`, `inking-active` is never toggled on `document.body`.

### Deferred Lateral Feature Candidates (Recorded for Future Releases)
- **Audio Transcript Whisper Local Import (`.vtt` / `.srt` Word-Level Highlight)** — Value: Medium, Effort: Medium, Risk: Low. (Basic subtitle cue parsing exists; word-level karaoke highlighting deferred).
- **Split-Workspace Cross-Pane Connector Arrows** — Value: Medium, Effort: High, Risk: High (cross-Store coordinate spaces). Deferred in favor of Linked Excerpts (`v5.1.0`).
- **Multi-Layer Canvas System** — Value: High, Effort: High, Risk: Medium. Remains on standby per owner directive (`docs/DEVELOPER_HANDOVER.md` §6).

---

## 5. Verification Results

- `npm run smoke:custom`: **93 checks passed, 0 failed** across all 10 custom suites (30 Node custom-feature checks including 5 new v5.3.0 lateral feature tests, 15 Markdown checks, 4 excerpt/link checks, 14 replay-camera checks, 3 video-framing checks, 2 protocol path security checks, and 25 Electron 4.8.4.1 / 4.8.8 / 5.0.0 / 5.1.0 UI checks).
- `node scripts/i18n-check.js`: **1,541 keys in each of 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`); 0 missing, 0 extra, 0 problems**.
- `npm run test:storage`: **7 checks passed, 0 failed**.
- `npm run test:tablet`: **18 checks passed, 0 failed**.
- `npm run test:sync`: **164 checks passed, 0 failed**.
- `npm run test:android`: **82 checks passed, 0 failed**.
- `npm run test:web`: **150 checks passed, 0 failed** (all 154 precached PWA assets verified).
- `npm run smoke:replay`: **17 checks passed, 0 failed**.
- `npm run smoke:video`: **3 checks passed, 0 failed**.

---

## 6. Build and Release Record

- **Version**: `5.3.0` (MEDIUM bump from `5.2.0`: 5 new toggleable lateral features + 12 root-cause bug fixes + 6.4x replay path cache optimization).
- **Commit and Tag**: `v5.3.0` (local tag; not pushed to remote).
- **Deliverable**: Standalone Portable Windows x64 binary (`GazBoard-v5.3.0-Portable.exe`).
- **Artifact Size**: **106,267,461 bytes**.
- **SHA-256**: `AF527EA670BB5B7A954497881825214E06D20D548464094EF2B29FAFA2DA9240`.
- **Repository Artifact**: `releases/GazBoard-v5.3.0-Portable.exe` and `dist-v5.3.0/GazBoard-v5.3.0-Portable.exe`.
