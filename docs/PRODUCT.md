# Product Intent & Feature Map (`docs/PRODUCT.md`)
> **1-Line Summary:** The permanent source of truth for what GaussBoard 6.11.0 must do and feel like, independent of how the code is currently organized.

## 1. Core Vision & User Experience Intent
* **What This App Does (Plain English):** GaussBoard (v6.11.0) is an offline-first digital whiteboard and STEM engineering workstation for electrical engineering students, inspired by StarNote, Flexcil, LiquidText, and Microsoft OneNote.
* **How It Must Feel to Use:** Pen writes like real ink with pressure and zero smoothing lag, canvas pans and zooms instantly at 5% to 800%, everything works offline with no account and no cloud, boards stay on the device and export cleanly to PNG, SVG, and PDF.
* **Lineage:** Original heritage from GazBoard by MD. Fakhruddin Gazzali (theBoringCodes), v4.8.1 baseline. This GaussBoard line (maintained by Kazi S. Mostakim) extends it through v4.8.2 to v6.9.2+. Native file format is `.gaussboard` (with full backward-compatibility for `.gazboard` and `.openboard`). Primary target is Windows portable binaries.

## 2. Active Features (Do Not Break)

### [FEATURE: Infinite-Canvas-Pen-Inking] | Aliases: whiteboard, infinite canvas, pen tool, highlighter, stylus, palm rejection
> **1-Line Summary:** Infinite pan/zoom canvas where the stylus inks and the mouse points, with pressure-sensitive pen and highlighter that stay exactly as drawn.
* **User Intention (Non-Negotiable):** Teachers and students must draw on an infinite canvas without losing work, with sticky pen colors, edge auto-pan, connection to figures, and 8 paper colors plus grid, dots, lines, columns, and graph patterns.
* **Visual / UI Behavior:** Ribbon tools V L P H E N T S; mouse with pen selected selects and pans once a stylus is known; drag on bare canvas pans; scroll wheel zooms; edge auto-pan speeds up near the window edge; backgrounds scale sensibly with zoom.
* **Code Anchors (Grep Targets):**
  * `src/js/core/ink.js` -> `createInkEngine`, `pressure`, `stroke`
  * `src/js/core/tools.js` -> `PEN`, `HILITE`, `toolStateMachine`
  * `src/js/core/camera.js` -> `pan`, `zoom`, `screenToBoard`
  * `src/js/core/render.js` -> `renderObject`, `applyBackground`
  * `src/js/ui/toolbar.js` -> `ribbon`, `penTray`

### [FEATURE: Audio-Ink-Replay] | Aliases: audio recording, replay, lecture replay, waveform, bookmarks, audio bar
> **1-Line Summary:** Record voice while writing, then replay the drawing in time with the audio using the waveform scrubber and bookmarks.
* **User Intention (Non-Negotiable):** Lecture notes must play back stroke-by-stroke in timestamp order, with live reveal, spotlight, static mode, seeking, and optional camera follow without cutting or re-timing strokes.
* **Visual / UI Behavior:** AudioBar waveform, 5s 10s 15s 30s skips, named bookmark editor, recording rename, canvas audio cards; Reading mode is read-only pan, Writing mode allows new timestamped ink.
* **Code Anchors (Grep Targets):**
  * `src/js/core/audio-recorder.js` -> `AudioRecorder`, `start`, `stop`
  * `src/js/core/replay.js` -> `ReplayEngine`, `applyRemote`
  * `src/js/core/surface.js` -> `drawReplaySession`, `firstPointAfter`
  * `src/js/ui/audio-bar.js` -> `renderWaveform`, `seekToTime`
  * `src/js/core/store.js` -> `checkpoint`, `applyRemote`

### [FEATURE: Study-Tape-Answer-Covers] | Aliases: study tape, answer cover, active recall, conceal, reveal, quiz
> **1-Line Summary:** Persistent tape and rectangular covers that hide work during recall and reveal it on tap while staying hittable as faint outlines.
* **User Intention (Non-Negotiable):** Students must mask answers and check themselves, with freehand tape and cards persisting on the board and attached ink following the cover state.
* **Visual / UI Behavior:** Study Tape tool in ribbon and Add/tools menus; tap toggles concealed/revealed; concealed covers redraw above replay so secrets stay hidden; study runner modal supports review.
* **Code Anchors (Grep Targets):**
  * `src/js/core/tools.js` -> `studyTapeTool`, `coverFor`
  * `src/js/core/render.js` -> `drawCover`, `boundsOf`
  * `src/js/core/hit.js` -> `hitTestCover`, `toggleCover`
  * `src/js/ui/study-runner.js` -> `setReviewState`, `refreshCanvas`

### [FEATURE: Scratch-Out-Eraser] | Aliases: scratch eraser, scribble erase, gesture erase, partial erase
> **1-Line Summary:** StarNote-style scribble eraser that removes only the ink it crosses and splits strokes instead of deleting whole objects.
* **User Intention (Non-Negotiable):** Fast natural erasing with zero false positives on handwriting, plus whole-object and erase-everything modes, with eraser growth to 2.8x while scrubbing.
* **Visual / UI Behavior:** Four eraser sizes; dominant reversal axis with spatial overlap guard; concealed covers spare the ink beneath; selection prunes after deletion.
* **Code Anchors (Grep Targets):**
  * `src/js/core/scratch.js` -> `classifyScratch`, `isScratch`
  * `src/js/core/tools.js` -> `ERASE`, `eraseStroke`
  * `src/js/core/erase.js` -> `partialErase`, `t0`, `t1`
  * `src/js/core/hit.js` -> `eraseSweep`, `pruneSelection`

### [FEATURE: Split-Workspace] | Aliases: split view, dual pane, side by side, reference pane, multi-window
> **1-Line Summary:** Two independent side-by-side boards with separate cameras, stores, undo stacks, and text editors for textbook plus notes work.
* **User Intention (Non-Negotiable):** Students must read a textbook on one side and write notes on the other, with left saves chained, focus lease driving undo, and no silent loss when switching boards.
* **Visual / UI Behavior:** SplitStudyWorkspace enable/disable; left pane owns its TextEditor and camera offset; openBoardInSplit guards against opening the same board twice; multi-window lease manager switches Active Editor versus Read-Only.
* **Code Anchors (Grep Targets):**
  * `src/js/ui/split-workspace.js` -> `SplitStudyWorkspace`, `openBoardInSplit`, `flushLeftBoard`
  * `src/js/app.js` -> `activePane`, `isLeftFocused`
  * `src/js/ui/textedit.js` -> `TextEditor`, `commit`
  * `main.js` -> `leaseManager`, `crossWindowSync`

### [FEATURE: Document-Import-Pages] | Aliases: PDF import, Word import, PowerPoint import, page picker, LibreOffice
> **1-Line Summary:** Drag in PDF, Word, PowerPoint, and spreadsheet files, pick pages and layout, then annotate each page as an independent object.
* **User Intention (Non-Negotiable):** Teachers must bring lecture slides and handouts onto the board, choose Standard/High/Maximum quality, and move, lock, and export pages with ink that erases without touching the page.
* **Visual / UI Behavior:** Insert Document or drag-drop; thumbnail picker with range box and row/grid/stacked layout; quality changes pixel density only, board size stays identical; About shows LibreOffice versus built-in engine; GAZBOARD_DISABLE_LIBREOFFICE forces built-in path.
* **Code Anchors (Grep Targets):**
  * `src/js/insert.js` -> `importDocument`, `pagePicker`
  * `src/js/importers/pdf.js` -> `rasterizePdf`, `renderPage`
  * `src/js/importers/pptx.js` -> `readOOXML`, `renderSlide`
  * `src/js/ui/pagepicker.js` -> `showPagePicker`, `rangeParse`
  * `soffice.js` -> `convertWithLibreOffice`
  * `msoffice.js` -> `convertBuiltin`

### [FEATURE: Circuit-Sim-EE-Workbench] | Aliases: circuit simulator, MNA, DOL starter, Forward-Reverse, DMM, oscilloscope, ladder logic
> **1-Line Summary:** Headless MNA circuit engine with semiconductors, 555 timer, industrial presets, and live meters that drive LEDs correctly across long circuits.
* **User Intention (Non-Negotiable):** EE students must wire DOL and Forward-Reverse presets that actually latch, see correct diode drops and driver outputs, measure with DMM continuity, and export BOM and ladder views.
* **Visual / UI Behavior:** 2.5D workbench modal, object-textured design, animated current particles, snapped terminals, cubic Bezier wires, Web Audio clicks and hums.
* **Code Anchors (Grep Targets):**
  * `src/js/core/circuit-sim.js` -> `solveMNA`, `DOL`, `forwardReverse`, `diodeDrop`
  * `src/js/ui/circuit-workbench.js` -> `openWorkbench`, `stepSim`
  * `src/js/core/connectors.js` -> `routeOrthogonal`, `arrowHead`

### [FEATURE: Math-Studio-CAS-Grapher] | Aliases: math editor, SymPy, KaTeX, function grapher, CAS, calculus, matrix builder
> **1-Line Summary:** Offline math studio with 6 palettes, matrix builder, quick evaluator, and 2D/3D graphing with tangent and Riemann shading.
* **User Intention (Non-Negotiable):** Students must edit matrices and calculus symbols offline, see correct domain/asymptote handling, and export syntax without network calls.
* **Visual / UI Behavior:** MathEdit dialog, palette categories Calculus/Linear Algebra/Cases/Greek/Symbols/Physics/Stats, on-demand KaTeX load; grapher supports y=f(x), z=f(x,y), polar r=theta.
* **Code Anchors (Grep Targets):**
  * `src/js/core/scientific-math.js` -> `evaluateExpr`, `solveQuadratic`
  * `src/js/ui/mathedit.js` -> `MatheditDialog`, `matrixBuilder`
  * `src/js/ui/function-grapher.js` -> `plotFunction`, `riemannShade`
  * `src/js/core/formula-graph.js` -> `parseFormula`, `derivative`

### [FEATURE: Knowledge-Interop-Graph] | Aliases: JSON Canvas, knowledge graph, Markdown sidecar, LiquidText tethers, document navigator
> **1-Line Summary:** Bidirectional JSON Canvas 1.0, interactive knowledge graph, Obsidian Markdown sidecar with YAML and KaTeX, tethers, and TOC navigator.
* **User Intention (Non-Negotiable):** Notes must move between GaussBoard and Obsidian cleanly, show as a force-directed network with zoom/search/drag, and keep LiquidText-style links to source regions.
* **Visual / UI Behavior:** GraphView modal, sidecar export on demand or auto on save, cyan tether lines with glide-to-source badges, Alt+T TOC drawer with thumbnail navigation.
* **Code Anchors (Grep Targets):**
  * `src/js/core/json-canvas.js` -> `exportCanvas`, `importCanvas`
  * `src/js/ui/graph-view.js` -> `GraphViewModal`, `layoutForce`
  * `src/js/core/markdown-sidecar.js` -> `exportSidecar`, `frontmatter`
  * `src/js/core/boardrefs.js` -> `resolveHeading`, `resolveBlock`
  * `src/js/ui/pdf-sidebar.js` -> `PdfSidebarDrawer`, `buildTOC`

### [FEATURE: LAN-Handoff-Sync] | Aliases: LAN sync, share on network, pairing code, TCP 53318, UDP 53319, firewall
> **1-Line Summary:** Device-to-device board handoff on the same Wi-Fi with X25519 and AES-256-GCM, one-time codes, previews, and firewall self-checks.
* **User Intention (Non-Negotiable):** Classrooms must send boards without cloud or accounts, with Just-for-now versus Remember pairing, explicit accept/replace/keep-both, and no automatic acceptance.
* **Visual / UI Behavior:** Settings Share on this network off by default; pairing code shown on receiver; sender/board/size/preview shown before save; firewall repair on Windows with UAC, detect-only on macOS/Linux.
* **Code Anchors (Grep Targets):**
  * `sync/protocol.js` -> `PROTOCOL`, `createPairingCode`, `sealMessage`
  * `sync/node.js` -> `startDiscovery`, `sendBoard`
  * `sync/firewall.js` -> `checkFirewall`, `repairWindowsRules`
  * `sync/desktop.js` -> `openTransferDialog`, `confirmTransfer`

### [FEATURE: Workspace-Tabs-Storage] | Aliases: multi-tab, tab bar, boards panel, storage folder, autosave, atomic save
> **1-Line Summary:** Chrome-style tab strip with sub-5ms LRU session cache, board library in a chosen folder, and atomic temp-file-plus-rename saves.
* **User Intention (Non-Negotiable):** Students must switch boards instantly, keep tabs across restarts, and trust that an unclean shutdown still restores the last open board without a blank greeting.
* **Visual / UI Behavior:** Ctrl+T/W/Tab/1..9 shortcuts, tab undo cache, duplicate and session dialogs, Boards panel shows active folder with open button, Settings Storage Change folder with move-to-trash option.
* **Code Anchors (Grep Targets):**
  * `src/js/ui/tabs.js` -> `TabBar`, `WorkspaceSessionManager`
  * `storage-location.js` -> `readConfig`, `writeConfig`, `defaultBoardsDir`
  * `src/js/core/store.js` -> `checkpoint`, `atomicSave`
  * `src/js/core/recent.js` -> `recordLastOpen`, `loadRecent`
  * `src/js/core/folders.js` -> `listBoards`, `moveToTrash`

### [FEATURE: Media-Export] | Aliases: PNG export, SVG export, PDF export, WebM video, MP4 video, compression
> **1-Line Summary:** Export whole boards or selections to PNG at 2x, editable SVG, paginated PDF, and stitched WebM with audio by default plus MP4 with a no-sound notice.
* **User Intention (Non-Negotiable):** Students must share work anywhere, with correct page sizes and tiling, real vector text in SVG, and no silent video loss.
* **Visual / UI Behavior:** Export dialog with fixed/whole-board/follow framing, six video presets, MP4 shows translated no-sound warning, WebM default; compression studio with live before/after sizes.
* **Code Anchors (Grep Targets):**
  * `src/js/board-export.js` -> `exportPNG`, `exportSVG`, `exportPDF`
  * `src/js/export-video.js` -> `exportWebM`, `exportMP4`, `stitchSessions`
  * `src/js/core/compression.js` -> `compressImage`, `bulkCompress`
  * `src/js/ui/compression-dialog.js` -> `CompressionDialog`, `qualitySlider`

### [FEATURE: I18n-Offline] | Aliases: translations, 7 locales, offline, vendored, no CDN, service worker
> **1-Line Summary:** 100% i18n parity across 7 locales (2,424 keys) with every runtime library vendored locally and zero external CDN leaks.
* **User Intention (Non-Negotiable):** Non-English users must see every UI string translated and work fully offline on desktop and PWA, with board text measured consistently everywhere.
* **Visual / UI Behavior:** English sentence is the key via t(); missing translations fall back to English; board fonts bundled via @font-face rather than borrowed from the OS.
* **Code Anchors (Grep Targets):**
  * `src/js/i18n.js` -> `t`, `loadDictionary`, `LANGUAGES`
  * `src/locales/*.json` -> `keys`, `translations`
  * `src/vendor/libraries.json` -> `manifestVersion`, `bundledPath`
  * `scripts/i18n-check.js` -> `checkParity`
  * `src/sw.js` -> `precache`, `runtimeCache`

### [FEATURE: Presentation-View-Mode-And-Page-Strip] | Aliases: view mode, page strip, music staff, guitar tab, table repair
> **1-Line Summary:** Read-only presentation view mode with fading ghost highlighters, thumbnail page strip, manuscript score templates, and automatic table corruption healing.
* **User Intention (Non-Negotiable):** Teachers and students need to walk through boards without accidental edits (`Ctrl+Alt+V`), browse pages via quick sidebar thumbnails, write music notes on standard 5-line staff / 6-line guitar tab, and open legacy or damaged tables without UI lockup.
* **Visual / UI Behavior:** View mode displays persistent top `#viewPill` with `Done` button; inking becomes temporary fading overlay; `#pagestrip` sidebar opens from left margin tab; background palette offers music staff and guitar tab; table loader auto-mends out-of-bounds tables up to 40x40.
* **Code Anchors (Grep Targets):**
  * `src/js/ui/pagestrip.js` -> `PageStrip`
  * `src/js/core/render.js` -> `drawStaves`, `staffLayout`
  * `src/js/core/surface.js` -> `ghosts`, `_drawGhosts`
  * `src/js/core/store.js` -> `repairTable`, `frozen`
  * `src/js/app.js` -> `toggleViewMode`, `hintViewMode`

### [FEATURE: Set-Squares-And-Protractor-Drafting] | Aliases: set squares, triangles, protractor, drafting, angle input, geometry tools
> **1-Line Summary:** Geometric set squares (30°/60°/90°, 45°/45°/90°) and protractor with edge snapping, dial/knob adjustment, typed angle aiming, and stylus-isolated drafting.
* **User Intention (Non-Negotiable):** Engineering students and technical drafters need precise geometric triangles and protractors to construct accurate diagrams, measure angles (0° pointing right or up), and draw edge-guided lines while strictly preserving audio-ink timestamps (`p.t`) and stylus-pointer partitioning.
* **Visual / UI Behavior:** Ruler menu offers Ruler, Triangle 45°, Triangle 30°/60°, and Protractor; protractor shows dual 0°–180° scales (outer dark, inner blue) with adjustable needle arm; set squares show millimeter ticks and angle readouts; drafting edge snapping engages exclusively for stylus writing without trapping mouse pointers; circuit connector wiring automatically bypasses ruler latching.
* **Code Anchors (Grep Targets):**
  * `src/js/core/tools.js` -> `triProject`, `protProject`, `triEdgesAt`, `protEdgesAt`, `aimProtArm`
  * `src/js/app.js` -> `openRulerMenu`, `fitTriangle`, `toggleRuler`
  * `test/set-squares-protractor.test.mjs` -> `triCorners`, `protGeom`


### [FEATURE: Centralized-Hold-Gesture-Manager] | Aliases: hold manager, radial menu, long press, dual dwell timers, gesture arbitration
> **1-Line Summary:** Centralized hardware-differentiated hold gesture coordinator with dual dwell timers, domain component priority, pinch abort, and zero-dot radial ring invocation.
* **User Intention (Non-Negotiable):** Users holding stylus or mouse pointers on the board need intuitive modal inspections and shortcut rings without false triggers during quick sketching, tiny dot writes, or multi-touch zooms, and without leaving phantom 1-point ink dots or orphan undo entries.
* **Visual / UI Behavior:** Stationary hold (< 18px travel) on empty board opens an 8-item SVG radial menu ring for stylus or contextual menu for mouse; post-stroke dwell (>= 24px travel with pause) converts freehand lines to geometric shapes (`holdToShape`); holding on domain objects (circuit components, answer covers) opens their native properties or toggle action with strict priority over radial HUD; two-finger pinch immediately cancels pending holds.
* **Code Anchors (Grep Targets):**
  * `src/js/core/hold-manager.js` -> `HoldGestureManager`, `handlePointerDown`, `handlePointerMove`, `cancelHold`
  * `src/js/ui/radial.js` -> `RadialShortcutRing`, `showAt`, `dispatchItem`
  * `src/js/core/tools.js` -> `abortActiveStroke`, `onPointerDown`, `onPointerUp`
  * `test/hold-manager.test.mjs` -> `testHoldManager`

### [FEATURE: Smart-Progressive-Slicing-And-Zoom-LOD] | Aliases: progressive rendering, smart slicing, heavy canvas, zoom LOD, sub-pixel culling
> **1-Line Summary:** High-capacity progressive canvas slicer with atomic cover bundling, dynamic CPU frame budgeting (3.0–8.0ms), and zoom-aware level-of-detail downsampling.
* **User Intention (Non-Negotiable):** Heavy boards containing 5,000+ to 20,000+ objects must render smoothly across pan and zoom operations without freezing the UI, leaking concealed answer cover secrets, or dropping frames during audio replay or MNA circuit simulation.
* **Visual / UI Behavior:** Canvas uses 3-layer progressive composition: Layer 0 (grid/background), Layer 1 (`_inkCanvas` built progressively in background via dynamic time slices), and Layer 2 (live 60 FPS unbaked overlays for wet strokes, audio replay, and circuit electrons); pre-filtering culls hidden strokes below opaque answer covers to prevent secret flash; zoom-out (`camZ < 0.35`) performs sub-pixel culling and stride-based point downsampling.
* **Code Anchors (Grep Targets):**
  * `src/js/core/surface.js` -> `_paintHeavy`, `_paintOrder`, `_getSliceBudgetMs`, `_inkCanvas`, `_build`
  * `src/js/core/render.js` -> `drawStroke` (LOD downsampling & sub-pixel culling)
  * `test/sliced-rendering.test.mjs` -> `testSlicedRendering`

### [FEATURE: Upstream-51x-Inking-And-Eraser-Suite] | Aliases: neon pen, erase shapes too, pen glow, recordPointer, drawAhead, predictTail, settings search, eraserRing, setPaintBand, smoother PDF eraser
> **1-Line Summary:** Glowing neon pen effect, optional shape-outline erasing (`eraseShapes`), screen-recording pen halo (`recordPointer`), optional draw-ahead prediction (`drawAhead`), sticky word-start Settings search, and compositor eraser ring with interior PDF shadow skipping.
* **User Intention (Non-Negotiable):** Teachers and STEM students need high-visibility neon ink for dark/light boards, safe opt-in shape erasing without accidentally deleting labelled diagrams or covered answers, visible pen location in screen recordings, optional latency-masking prediction that never mutates saved timestamps, instant Settings filtering with clean Escape handling, and lag-free erasing over imported PDF pages.
* **Visual / UI Behavior:** Pen popover offers `Neon` effect with 8 neon swatches and auto-switches plain dark ink to neon purple (`#b026ff`); Eraser popover adds off-by-default `Erase shapes too` switch; Settings adds a sticky word-start search bar (with `<mark class="set-mark">` highlights, section-header matching, query persistence across rerenders, and Escape-to-clear), `Show the pen in screen recordings` (`#penGlow` / `.pen-glow`), and `Draw ahead of the pen` (`surface.wetTail`). Eraser hover/rubbing uses a compositor-moved `#eraserRing` / `.eraser-ring` layer, defers idle background freezes while a gesture is active (`surface.busy`), and skips interior PDF page drop shadows on banded repaints (`setPaintBand`).
* **Code Anchors (Grep Targets):**
  * `src/js/core/render.js` -> `drawNeon`, `NEON_REACH`, `inkStyle`, `setPaintBand`, `bandStats`, `drawImage`
  * `src/js/core/hit.js` -> `outlineAlong`, `getScratch`
  * `src/js/core/tools.js` -> `followGlow`, `hideGlow`, `ringEl`, `placeRing`, `hideRing`, `predictTail`, `eraseSweep`
  * `src/js/core/surface.js` -> `drawScene`, `busy`, `warmFreeze`, `_drawWet`, `wetTail`
  * `src/js/ui/panels.js` -> `buildSettingsSearch`, `settings`
  * `test/upstream-51x-features.test.mjs` -> Tests 1–6

### [FEATURE: Chemistry-Lab-Suite] | Aliases: chemistry, chemical sketcher, SMILES, periodic table, 3D molecule viewer, stoichiometry
> **1-Line Summary:** Offline chemistry workbench with 118-element periodic table, exact Gaussian chemical equation balancer, 2D SMILES sketcher, and interactive 3D molecular viewer.
* **User Intention (Non-Negotiable):** STEM students must balance reactions, inspect element properties/Bohr shells, sketch SMILES structures, and stamp publication-ready chemistry cards onto the canvas without internet access.
* **Code Anchors (Grep Targets):**
  * `src/js/core/chemistry.js` -> `balanceChemicalEquation`, `calculateMolarMass`, `insertReactionCard`
  * `src/js/ui/chemical-sketcher.js` -> `ChemicalSketcher`, `openIn3D`
  * `src/js/ui/molecule-viewer.js` -> `MoleculeViewer`, `loadCustomMolecule`
  * `src/js/ui/periodic-table.js` -> `PeriodicTableModal`

### [FEATURE: Visualization-Studio-And-Mermaid-Bridge] | Aliases: visualization studio, mermaid, chart.js, flowchart, mindmap, draw.io
> **1-Line Summary:** Offline Mermaid flowchart/mindmap and Chart.js builder with strict SVG sandboxing and round-trip delegation to external Mermaid Manager (`drawio-desktop`).
* **Code Anchors (Grep Targets):**
  * `src/js/core/diagrams.js` -> `renderMermaidSvg`, `renderChartDataUrl`
  * `src/js/core/diagram-builder.js` -> `buildFlowchart`, `buildMindmap`
  * `src/js/ui/visualization-dialog.js` -> `VisualizationStudio`

### [FEATURE: Interactive-STEM-Simulations-And-Writing-Tools] | Aliases: PhET runner, physics sim, academic dictionary, technical linter, kanban, dataview, video suite
> **1-Line Summary:** Offline Canvas 2D physics simulations, offline academic dictionary with TTS, LaTeX-aware technical writing linter, in-canvas Kanban boards, inline Dataview metadata, and video lecture player with `.srt`/`.vtt` subtitles and timestamp bookmarks.
* **Code Anchors (Grep Targets):**
  * `src/js/ui/phet-runner.js` -> `PhetRunner`
  * `src/js/ui/academic-dictionary.js` & `src/js/ui/dictionary-popover.js` -> `AcademicDictionaryModal`
  * `src/js/core/technical-linter.js` -> `lintTechnicalText`
  * `src/js/core/kanban.js` & `src/js/core/dataview.js` -> `KanbanManager`, `DataviewEngine`
  * `src/js/ui/video-dialog.js` & `src/js/ui/subtitles.js` -> `VideoPlayerModal`, `parseSubtitles`
  * `src/js/core/fsrs.js` & `src/js/core/anki.js` -> `repeat`, `syncBoardToAnki`, `exportBoardToApkg`

## 3. Planned Features & App-Merge Wishlist
*(Per owner directive, detailed feasibility specs for the Xournal++, Rnote, Lean PDF, and LiquidText wishlist items below are maintained inline here rather than split into a separate module file.)*

### [WISHLIST: Pane-Aware-Command-Dispatcher] | Aliases: pane commands, Delete routing, Copy routing
> **1-Line Summary:** Full per-pane Delete/Copy/Select-all/z-order routing for split workspace, beyond the current selection-clearing mitigation.
* **User Intention:** Commands should act on the pane the user pressed in, not always the primary board.
* **Target Integration Point:** `src/js/app.js` -> `dispatchCommand`, `src/js/ui/split-workspace.js` -> `activePane`

### [WISHLIST: Live-Collaboration-Seam] | Aliases: real-time collaboration, presence cursors, cloud boards
> **1-Line Summary:** Future live co-editing built on the operation log without changing the editor model.
* **User Intention:** Presence and shared editing if ever requested, while keeping offline-first handoff as the default.
* **Target Integration Point:** `src/js/core/store.js` -> `checkpoint`, `applyRemote`, `onOp`

### [WISHLIST: Lean-Linked-Or-Attached-Single-PDF-Lazy-Render] | Aliases: lean pdf, 80MB pdf bloat fix, linked pdf, attached pdf, lazy viewport render, page-locked pdf
> **1-Line Summary:** Replace upfront 100-page bitmap pre-rendering (~25–80 MB bloat) with a hybrid Linked external PDF or 1× Attached single-PDF asset and lazy on-demand `pdf.js` viewport rendering onto locked page slots.
* **Problem Solved & Motivation:** Currently `openPdf()` (`src/js/importers/pdf.js`) and `insertDocument()` (`src/js/insert.js`) eagerly rasterize every imported page to JPEG bitmaps (`scale: 2–4.2`), causing 100-page textbooks to bloat to ~25–80+ MB in `assets/` while still blurring past 200% zoom.
* **Proposed Hybrid Architecture (High Feasibility):**
  * **Linked External PDF Mode (Default for large PDFs, 0 MB board overhead):** Store `{ pdfPath, pdfSha256, pageRange, fitMode }` in the board document instead of 100 page images. Uses SHA-256 matching to auto-relink if a textbook moves on disk (similar to Xournal++ `.xopp`, but with hash verification).
  * **Optional 1× Attached Single-PDF Mode (Portable for LAN Sync / Android / PWA):** 1-click toggle stores the single original vector `.pdf` binary once in `assets/<sha256>.pdf` (typically 2–8 MB instead of 80 MB of JPEGs) so the board remains self-contained without per-page bitmap duplication.
  * **Page-Locked Coordinate Mapping + Lazy `pdf.js` LRU Render:** Imported pages sit in locked/anchored `doc.pages` slots (non-draggable in Lean PDF mode; small `<=10`-page imports and Office decks can retain movable-page-object mode). `pdfjs-dist` renders only currently visible pages (+1–2 buffer neighbors) at live camera zoom (`cam.z * dpr`) into a bounded in-memory LRU cache (~8–12 pages), keeping text vector-crisp up to 800% zoom.
  * **Invariant Compatibility:** Because board coordinates remain anchored to `pageRects(doc.pages)`, existing strokes with `p.t` audio timestamps (`TRAP 1`, `TRAP 2`), `Study Tape` / `Answer Covers` (`TRAP 6`), `PdfSidebarDrawer` TOC/thumbnails, and `Split Workspace` continue to work without re-timing.
* **Target Integration Points:**
  * `src/js/importers/pdf.js` -> `openPdf` (persistent handle + bounded LRU page cache)
  * `src/js/insert.js` -> `insertDocument`, `layoutPages` (Linked vs. Attached single-PDF import option)
  * `src/js/ui/pagepicker.js` -> `choosePages` (Lean Document Mode vs. Movable Page Objects selector)
  * `src/js/core/render.js` -> `drawBackground` / `drawLazyPdfPage`

### [WISHLIST: Vertical-Space-Tool-And-Snapping] | Aliases: vertical space, push strokes down, rnote vertical space, grid snap, 15 degree rotation snap
> **1-Line Summary:** Rnote-style Vertical Space insertion/contraction bar plus Xournal++-style toggleable Grid Snapping and 15° Rotation Snapping.
* **User Intention:** Let users open vertical breathing room anywhere mid-note without lassoing an entire lower half of a page, and align objects/rotations cleanly onto grids and standard drafting angles.
* **Feasibility & Architecture Notes (Very High Feasibility — Pure JS):**
  * **Vertical Space Tool:** Dragging a horizontal divider line vertically shifts all objects (and optionally page-margin anchors) with `bounds.y >= cursorY` by `dy` via a single batched `Store` `set` operation (`Store.commit`), preserving all stroke `p.t` timestamps (`TRAP 2`), Undo/Redo, and LAN sync.
  * **Grid & Rotation Snapping:** Snap dragged/resized bounding-box corners to the active grid/graph spacing (`render.js` grid step) and snap rotation handles/shapes to `15°` increments (`45°`, `60°`, `90°`), with configurable tolerance and modifier-key bypass.
* **Target Integration Points:**
  * `src/js/core/tools.js` -> `toolStateMachine` (vertical-space divider tool)
  * `src/js/core/transform.js` -> `moveObject`, `scaleHandles`, `rotate`
  * `src/js/ui/toolbar.js` -> `ribbon`

### [WISHLIST: Compass-Drafting-Tool] | Aliases: compass, circular arc, sector drafting, xournalpp geometry, radius guide
> **1-Line Summary:** Xournal++-style interactive wheel Compass drafting tool for exact circles, arcs, filled sectors, and radial measurements alongside existing Set Squares and Protractor.
* **User Intention:** Extend technical EE/geometry drafting beyond lines and angles (`Set-Squares-And-Protractor-Drafting`) to clean circular constructions, phasor diagrams, and Smith/polar arcs.
* **Feasibility & Architecture Notes (Very High Feasibility — Pure JS):**
  * Interactive on-screen compass wheel with center handle, radius scale readout (cm/world units), and angle indicator (`0°–360°`).
  * Stylus-isolated edge projection (`compProject`) guides circumference arcs/circles and radial segments while preserving real-time `p.t` timestamps (`TRAP 2`), bypassing circuit connector wiring, and avoiding mouse capture (`Stylus-Inks-Mouse-Points`).
* **Target Integration Points:**
  * `src/js/core/tools.js` -> `triProject`, `protProject` (add `compProject` & `compEdgesAt`)
  * `src/js/app.js` -> `openRulerMenu`
  * `src/js/core/render.js` -> `drawDraftingTools`

### [WISHLIST: RoughJS-Sketchy-Shapes-And-Calligraphic-Pen] | Aliases: rough.js, sketchy shapes, calligraphic pen, modeled brush, rnote styles
> **1-Line Summary:** Optional `rough.js` (MIT) sketchy hand-drawn shape rendering and a velocity/pressure-modeled Calligraphic Pen inspired by Rnote.
* **User Intention:** Offer expressive whiteboard diagramming (`rough.js` sketch aesthetics on shapes/cards) and crisp fountain/calligraphic handwriting alongside existing Solid, Neon, Pencil, Rainbow, and Galaxy pens.
* **Feasibility & Architecture Notes (High Feasibility — Pure JS OSS Reuse):**
  * **Sketchy Shapes (`roughjs`, MIT, ~10–15 KB):** Vendor `rough.js` in `src/vendor/` + `SharedLibraries` (credit in `THIRD_PARTY_NOTICES.md`) and persist a deterministic `roughSeed` on shape objects so progressive slicing (`Smart Slicing`) and Zoom LOD (`camZ < 0.35`) never shimmer between frames.
  * **Calligraphic / Modeled Pen:** Compute variable ribbon/elliptical nib width from stylus pressure, velocity, and stroke angle in `ink.js` / `render.js`, storing raw centerline points + `p.t` timestamps untouched (`TRAP 2`) so audio replay and scratch-out erasing (`erase.js`) continue to split cleanly.
* **Target Integration Points:**
  * `src/vendor/libraries.json`, `THIRD_PARTY_NOTICES.md`
  * `src/js/core/ink.js`, `src/js/core/render.js` -> `drawShape`, `drawStroke`
  * `src/js/ui/palettes.js` -> `PEN_EFFECTS`

### [WISHLIST: Deep-PDF-Text-Select-Highlight-Search-Links] | Aliases: pdf text select, pdf highlight, pdf underline, pdf strikeout, pdf search ctrl+f, pdf hyperlinks, xournalpp pdf tools
> **1-Line Summary:** Xournal++-style deep PDF text interaction: text selection, copy, highlight/underline/strikeout markups, clickable PDF links, and `Ctrl+F` full-document text search.
* **User Intention:** Turn imported textbooks and papers from flat background pictures into searchable, selectable, link-navigable study documents without switching apps.
* **Feasibility & Architecture Notes (Medium Effort — Pairs with Lean PDF Mode):**
  * **Live `pdfjs-dist` Text & Link Extraction:** Leverage already-vendored `pdf.min.mjs` (`page.getTextContent()` and `page.getAnnotations()`) to build lightweight normalized text runs and link hotspots on visible/active PDF pages without bloated bitmap duplication.
  * **Markup & Search UX:** Floating selection popup triggers Copy Quote, Highlight, Underline, or Strikethrough stored as `Store` vector markup objects anchored to `docPage` coordinates (so Study Tape, Undo, and LAN Sync all work); `Ctrl+F` / `F3` scans document text runs and glides the camera to matches; external PDF URLs pass strictly through `safeExternalUrl` (`TRAP: Untrusted-Url-And-Path`).
  * **Note on Heavy Optional Extensions:** If desktop native/WASM acceleration (e.g., MuPDF/QPDF or `Tesseract.js` OCR for scanned PDFs) is later desired for 1,000+ page textbooks or ISO 32000-1 PDF writeback, it aligns with `Pure-JS-First-With-Optional-Desktop-Native-WASM`.
* **Target Integration Points:**
  * `src/js/importers/pdf.js` -> `openPdf` (text & annotation link extractors)
  * `src/js/ui/pdf-sidebar.js` -> `PdfSidebarDrawer` + `src/js/ui/search-dialog.js`
  * `src/js/core/tools.js`, `src/js/core/render.js`

### [WISHLIST: Multi-Layer-System-And-Page-Depth] | Aliases: WISHLIST-Multi-Layer-System, layers, page depth, bezier splines, tangent knots, whiteout eraser
> **1-Line Summary:** Expanded per-page/board Multi-Layer stack (hide/lock/merge/reorder), Xournal++-style editable Bezier Splines with anchor knots/tangents, and non-destructive Whiteout eraser mode.
* **User Intention:** Organize dense engineering schematics, PDFs, solution overlays, and recall steps cleanly across layers, draft smooth curved waveforms/splines with editable tangent handles, and mask unwanted background markings non-destructively.
* **Feasibility & Architecture Notes (Medium Effort):**
  * **Multi-Layer System:** Add `doc.layers` and `obj.layerId` in `Store`, with per-layer visibility, lock, reorder, and merge operations. Must integrate tightly with `_paintOrder` Smart Slicing (`surface.js`), `TRAP 1` active audio replay partitioning, and `TRAP 6` Study Cover occlusion so hidden answers never leak across layers.
  * **Editable Bezier Splines:** Click to place polyline knots, drag to pull cubic Bezier tangent handles (live anchor/tangent overlay during editing), and commit smooth multi-segment curves into `Store` (`connectors.js` / `render.js`).
  * **Whiteout Eraser:** Add an eraser/masking mode that draws opaque paper-matched strokes over fixed backgrounds or PDF layers without mutating underlying pages.
* **Target Integration Points:**
  * `src/js/core/store.js` -> `doc.layers`, `Store.applyOp`
  * `src/js/core/surface.js` -> `_paintOrder`, `_paintHeavy`
  * `src/js/core/tools.js`, `src/js/core/render.js`

### [WISHLIST: LiquidText-Active-Reading-And-Pinch-Workspace] | Aliases: liquidtext, pinch collapse, pin and tear, text excerpts, margin gutter expansion, pdf-lib, sync scroll
> **1-Line Summary:** Full LiquidText-inspired active-reading proposal: pinch-to-collapse reading view, text-selection Pin-and-Tear excerpts, non-destructive book margin gutter expansion (`pdf-lib`), and multi-excerpt synthesis workspace.
* **Current Baseline vs. Proposed Scope:** GaussBoard already ships `isExcerpt` image snips, `excerptSource` coordinates, cyan elastic tether lines, and `cam.glideTo` jump-to-source (`src/js/core/excerpts.js`, `src/js/core/render.js`). This proposal tracks the full LiquidText workflow for future design review:
  * **Pinch-to-Collapse Document View:** Temporarily fold blank/unannotated stretches between highlighted passages or distant PDF pages in the reader pane so a student can compare equation (1) on page 12 directly above its proof on page 148 without altering the underlying file.
  * **Text-Selection Pin-and-Tear Excerpts:** Extend `EXCERPT_MIME` (`src/js/core/excerpts.js`) beyond bitmap crops so dragging selected PDF text drops a structured Markdown/KaTeX quote card onto the canvas or Split Workspace with bidirectional `glideTo` + cyan flash highlight back to exact PDF coordinates.
  * **Book Margin Expansion (`pdf-lib` / Virtual Gutters):** Add printable margin gutters around dense textbooks (via already-vendored `pdf-lib` `setMediaBox`/`setCropBox` or virtual locked marginalia zones) so handwritten derivations sit beside paragraphs without shrinking page text.
  * **Synthesis Clustering & Ink-to-Text Anchors:** Group torn excerpts into collapsible comparison clusters on the workspace and attach ink annotations directly to PDF text anchors so reflow/zoom preserves context.
* **Target Integration Points:**
  * `src/js/core/excerpts.js` -> `validateExcerptPayload`, `excerptImageObject` (extend for `pdf-text` excerpts)
  * `src/js/ui/split-workspace.js` -> `SplitStudyWorkspace`
  * `src/js/core/compression.js` / `pdf-lib` -> margin gutter expansion helper
  * `src/js/core/render.js` -> tether & excerpt card rendering

### [FEATURE: Dual-Circuit-Simulation-With-Ngspice] | Aliases: ngspice-wasm, spice netlist, MNA Live, EEcircuit, TINA
> **1-Line Summary:** Dual circuit engine combining built-in pure-JS MNA (`IndustrialCircuitSim`) for instant interactive relays/motors with switchable `ngspice-wasm` / analytical SPICE sweep (`SpiceEngine`), `.cir` netlist export, and TI `TINA` launcher.
* **User Intention:** Preserve all existing industrial control simulation while gaining non-linear SPICE `.tran`/`.ac` analysis, `.cir` export, and TI `TINA` interop without bloating the `<15 MB` PWA bundle.
* **Code Anchors (Grep Targets):** `src/js/core/circuit-sim.js` -> `IndustrialCircuitSim`, `src/js/core/spice-engine.js` -> `SpiceEngine`, `generateSpiceNetlist`, `electron/spice-bridge.cjs` (`[M13-01]`)

### [FEATURE: Pentagram-And-RAG-Manager-Interoperability] | Aliases: RAG Manager, 27130, xref_id, gaussboard deep link, anki deduplication, headless cli
> **1-Line Summary:** Connects `GaussBoard` to central `RAG Manager` (`127.0.0.1:27130`), Obsidian (`:27125`), Mermaid Manager, DeepTutor (`:8001`), and Anki (`:8765`) via canonical `xref_id` sidecars, active `gaussboard://` URI handling, idempotent Anki sync, Practice Engine banks, and `--json` headless CLI export.
* **User Intention:** Editing a board, card, diagram, or lecture audio transcript updates cross-references across the entire 5-app Pentagram without duplicate Anki cards, broken deep links, or silent overwrite conflicts.
* **Code Anchors (Grep Targets):** `electron/triarchy-bridge.cjs`, `electron/rag-bridge.cjs`, `electron/cli-export.cjs`, `src/js/core/pentagram-sync.js`, `src/js/core/anki.js`, `src/js/core/markdown-sidecar.js`, `docs/modules/pentagram-audit-and-upgrades.md`

## 4. Canonical References & Live Verification
* **Core Documentation Suite:** `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS_AND_TRAPS.md`, `docs/releases/ANDROID_READINESS.md`
* **Active Verification Suite:** `node scripts/smoke.js --new-features` (24/24 passing)
* **Internationalization Suite:** `node scripts/i18n-check.js` (2,424/2,424 across 7 locales)
* **Android Platform Suite:** `node --test test/android-*.test.js` (82/82 passing)
* **Core Data Schemas & State:** `src/js/core/store.js` (`Store`, `doc.objects`, `doc.pages`, `doc.audioTracks`)
* **Platform & Packaging:** `main.js`, `preload.js`, `package.json`
