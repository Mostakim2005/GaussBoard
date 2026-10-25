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
| **F-126** | Source-Linked Visual Excerpts | `src/js/core/excerpts.js`<br>`src/js/app.js`<br>`src/js/core/render.js`<br>`test/excerpt.test.mjs` | Verified in v5.1.0 | Captures a bounded transparent PNG from a selection, pastes or drags it to another board, and keeps source board/page/bounds metadata for return navigation. Payload validation and board-ID remapping preserve safety and portability. |
| **F-127** | Split-Pane Excerpt Transfer | `src/js/ui/split-workspace.js`<br>`src/js/app.js`<br>`test/smoke-features-5.1.0.js` | Verified in v5.1.0 | Routes the in-app clipboard to the left board when the pointer is there and accepts excerpt drag/drop into the reference pane while retaining independent board stores. |
| **F-128** | Markdown Heading and Block Links | `src/js/core/boardrefs.js`<br>`src/js/core/markdown.js`<br>`src/js/app.js`<br>`test/excerpt.test.mjs` | Verified in v5.1.0 | Supports board heading anchors, local `[[#Heading]]` links and `[[#^block-id]]`; numeric anchors remain pad-page links and aliases survive conversion. |
| **F-129** | Obsidian Markdown Quality-of-Life Syntax | `src/js/core/markdown.js`<br>`test/markdown.test.mjs` | Verified in v5.1.0 | Adds highlight, subscript/superscript, footnotes, hidden comments, tilde fences and hidden block-ID markers while keeping editable source text. |
| **F-130** | Double-Layered Sidebar Ribbon Menu & Brand Switcher | `src/js/ui/workbench-ribbon.js`<br>`src/css/workbench-ribbon.css` | Verified in v6.1.0 | Primary and secondary collapsible tool rails with Glassmorphism and Material 3 design, text labels, icons, tooltips, left/right docking, brand switcher (GaussBoard/JazaBoard/GazBoard), and circuit/engineering stencils. |
| **F-131** | Memory & Spaced Repetition Suite (FSRS v5, AnkiConnect & LiquidText) | `src/js/core/spaced-repetition.js`<br>`src/js/ui/study-runner.js`<br>`src/js/ui/excerpt-drawer.js` | Verified in v6.2.0 | Pure JS Free Spaced Repetition Scheduler (FSRS v5) calculating stability $S$, difficulty $D$, retrievability $R$, active-recall review runner (<kbd>Ctrl+Shift+R</kbd>) with rating buttons (Again, Hard, Good, Easy), direct AnkiConnect HTTP bridge (`127.0.0.1:8765`), standards-compliant `.apkg` export, and LiquidText-style excerpt cards with elastic tethers. |
| **F-132** | STEM Revision Engines & Interactive Simulation Runner | `src/js/core/scientific-math.js`<br>`src/js/ui/periodic-table.js`<br>`src/js/ui/simulation-runner.js`<br>`src/js/ui/formula-modal.js` | Verified in v6.3.0 | Pure JS Gaussian elimination chemical equation balancer and stoichiometry calculator, 118-element periodic table modal, offline HTML5 PhET simulation runner modal with frame capture to canvas, STEM formula encyclopedia, and offline technical lexicon with Web Speech API text-to-speech. |
| **F-133** | 2.5D Industrial Circuit Simulation & Headless MNA Engine | `src/js/core/circuit-sim.js`<br>`src/js/ui/circuit-workbench.js`<br>`src/js/ui/diagram-builder.js` | Verified in v6.4.0 | Real-time Modified Nodal Analysis (MNA) DC/transient solver with Newton-Raphson non-linear iterations, interactive 2.5D workbench (<kbd>Ctrl+Shift+E</kbd>) with magnetic terminal snapping, animated current flow particles, live dual-probe Digital Multimeter (DMM) with audio buzzer, dual-trace virtual oscilloscope, Web Audio mechanical sound effects, and Relay Ladder Logic (RLL) exporter. |
| **F-134** | 3D Molecular Structure Viewer & Crystallography Modal | `src/js/ui/molecule-viewer.js`<br>`src/js/vendor/3Dmol-min.js` | Verified in v6.5.0 | Pure Canvas 2D/3D depth-sorted molecular viewer (<kbd>Ctrl+Shift+M</kbd>) with CPK atom coloring, Ball & Stick/VDW/Wireframe representations, 6 built-in STEM models (Water, Methane, Benzene, Caffeine, DNA, Buckminsterfullerene), auto-spin orbit, and 1-click whiteboard image snapshot. |
| **F-135** | Dynamic 2D Calculus Function Grapher, Symbolic CAS & Linter | `src/js/ui/function-grapher.js`<br>`src/js/core/scientific-math.js`<br>`src/js/core/technical-linter.js` | Verified in v6.5.0 | Safe Recursive Descent AST mathematical expression parser (zero `eval`/`new Function`), dynamic 2D Cartesian function grapher (<kbd>Ctrl+Shift+G</kbd>) with tangent derivative slider and Riemann definite integral area shading, `SymbolicCAS` linear solver & polynomial differentiation, reactive `NotebookVariables`, and rule-based ESL / technical writing linter. |
| **F-136** | Phase 6 Lateral Features & Quality-of-Life Suite | `src/js/ui/function-grapher.js`<br>`src/js/ui/molecule-viewer.js`<br>`src/js/ui/circuit-workbench.js`<br>`src/js/ui/periodic-table.js`<br>`src/js/core/scientific-math.js`<br>`src/js/core/technical-linter.js`<br>`src/js/ui/study-runner.js` | Verified in v6.6.0 | Desmos/GeoGebra dual-function curve comparison $g(x)$ in `#ec4899`, live curve trace crosshair with coordinate pill `(x, y)`, automated roots ($y=0$) & extrema ($dy/dx=0$) target rings; MolView/PyMOL click-to-measure bond distance (Å) and bond angle (°) with custom PDB/XYZ importer; EveryCircuit/Multisim live DC voltage slider ($0\text{V}-30\text{V}$) and DMM Wattage mode (`W`) with thermal overheat alarm badge; Ptable/ChemDraw Bohr shell concentric orbital rings and chemical formula molar mass calculator (e.g. `Ca(OH)2`, `CuSO4*5H2O`); Hemingway/Grammarly Flesch-Kincaid readability scoring and 1-click auto-fix; Anki/RemNote active recall review scorecard with whiteboard stamping; 100% i18n parity across 7 locales (2,061 keys). |
| **F-137** | Phase 7 STEM Powerhouse: Semiconductor Circuits, 2D ChemDraw, 3D Surfaces & Physics Labs | `src/js/core/circuit-sim.js`<br>`src/js/ui/circuit-workbench.js`<br>`src/js/ui/chemical-sketcher.js`<br>`src/js/ui/function-grapher.js`<br>`src/js/ui/phet-runner.js` | Verified in v6.7.0 | Falstad-style analog, digital & semiconductor circuit simulator (BJT NPN/PNP, MOSFET N/P, diodes, Zener, LEDs with glow emission, LM741 Op-Amps, NE555 timer IC with astable oscillation, full logic gates AND/OR/NOT/NAND/NOR/XOR/XNOR, 7-segment display, and 5 functional presets); ChemDraw-style 2D chemical structure drawing canvas with heteroatom palette, ring stamps, SMILES 2D/3D VSEPR parser and 1-click 3D molecular viewer bridge; 3D Cartesian surface ($z=f(x,y)$) with elevation/azimuth orbit rotation and polar ($r=f(\theta)$) calculus grapher; pre-built physics simulation lab (geometrical optics ray tracing, Coulomb electric field vectors, 2D momentum collision lab, 2D rigid sandbox); 100% i18n parity across 7 locales (2,093 keys). |
| **F-138** | Phase 8 Language, Math & Knowledge Core: Academic Dictionary, Grammar Linter, Natural Math & Cloze Export | `src/js/ui/academic-dictionary.js`<br>`src/js/core/technical-linter.js`<br>`src/js/core/scientific-math.js`<br>`src/js/ui/study-runner.js`<br>`src/js/ui/mathedit.js` | Verified in v6.8.0 | WordNet academic dictionary & thesaurus modal (<kbd>Ctrl+Shift+D</kbd>) with AWL lexicon, IPA phonetics, synonyms, antonyms, collocations, corpus sentences, Web Speech TTS, and whiteboard card stamping; academic writing & grammar linter with colloquialism replacement, subject-verb agreement, citation checking, Academic Style Score (0–100%), and formal tone elevation; natural conversational math-to-LaTeX converter (`naturalMathToLaTeX`), symbolic quadratic CAS solver (`SymbolicCAS.solveQuadratic`), and matrix determinant; Image Occlusion dual review modes (Hide All vs Hide One), review HUD mode toggle, and Anki-compatible cloze deck export (`exportClozeDeck`); 100% i18n parity across 7 locales (2,143 keys). |
| **F-139** | Phase 9 Advanced Canvas, Workspace & Media Productivity: MP4 Export, Dataview, Kanban, Orthogonal Connectors, PDF Bookmarks, Session Persistence, Graph Clusters & Dual Split | `src/js/export-video.js`<br>`src/js/core/dataview.js`<br>`src/js/core/kanban.js`<br>`src/js/core/connectors.js`<br>`src/js/ui/pdf-sidebar.js`<br>`src/js/ui/tabs.js`<br>`src/js/ui/graph-view.js`<br>`src/js/ui/split-workspace.js`<br>`src/js/ui/sidebar-ribbon.js`<br>`src/vendor/mp4-muxer.mjs` | Verified in v6.9.0 | Client-side MP4 video container muxing via `mp4-muxer` and WebCodecs; pure JS Obsidian-style Dataview query engine (`TABLE`/`LIST`); in-canvas interactive multi-column sprint Kanban cards; Manhattan 90° orthogonal elbow routing and cardinal magnetic snap ports (`n`, `s`, `e`, `w`); hierarchical PDF outline tree search & custom page bookmarks; multi-tab `WorkspaceSessionManager` saving/restoring to `localStorage`; knowledge graph connected component community clustering with colored halos; horizontal & vertical split study layouts with Excerpt Shelf Dock; ribbon category customizer and proximity inking auto-hide; 100% i18n parity across 7 locales (2,194 keys). |

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


### V 5.3.0 Comprehensive Audit, Performance Optimization & Lateral Features

- Fixes 12 root-cause bugs (`BUG-033` to `BUG-044`) across Markdown SVG `<foreignObject>` XHTML escaping, Split Study Workspace lifecycle/surface disposal/asset hydration/`swapPanes()`, `.gazboard` ZIP audio bundling/extraction, `Store.commit` transaction validation, `ink.js` multi-variant path caching (6.4x faster live replay), `perfectFreehand` `runPath` support, stylus `tiltX`/`tiltY` calligraphy angle, and Study Tape `p.t` timestamp preservation.
- Adds 5 toggleable lateral features & QoL improvements:
  - **Hold-to-Shape (`holdToShape: true`)**: Pause pen still for 420 ms at stroke end to snap freehand strokes into clean geometric shapes.
  - **Skip Silence During Audio Replay (`replaySkipSilence: false`)**: Fast-forward silent dead-air gaps $>2.0\text{ s}$ between recorded stroke clusters while stopping at bookmarks.
  - **Tap Stroke to Seek Audio (`tapStrokeToSeek: true`)**: Tap a recorded stroke in Reading Mode or with Select tool while AudioBar is open to jump audio playback to `stroke.t0`.
  - **Synchronized Split-View Scrolling (`splitSyncScroll: false`)**: Lock camera pan/zoom deltas across both Split Study Workspace panes.
  - **Auto-Dim Floating Toolbars While Inking (`autoDimBarsWhileInking: true`)**: Smoothly fade floating HUDs to 20% opacity with `pointer-events: none` during active pen strokes.
- See [`docs/releases/RELEASE-5.3.0.md`](docs/releases/RELEASE-5.3.0.md) for full details, performance benchmarks, and verification counts.

### V 6.6.0 Phase 6 Lateral Features & Quality-of-Life Suite

- Delivers a comprehensive suite of competitive lateral features, quality-of-life improvements, and professional workflows inspired by industry benchmarks:
  1. **Desmos/GeoGebra Dual-Function & Trace Mode** (`src/js/ui/function-grapher.js`):
     - Multi-function comparison overlay plotting $g(x)$ simultaneously with distinct curve color (`#ec4899` pink).
     - Live curve trace crosshair cursor snapping to the active function curve with dynamic floating coordinate tooltips `(x, y)`.
     - Automated roots detection ($y = 0$, emerald green `#10b981` target rings) and local extrema detection ($dy/dx = 0$, purple `#a855f7` pins).
  2. **MolView/PyMOL 3D Molecular Measurement & Custom Importer** (`src/js/ui/molecule-viewer.js`):
     - Interactive click-to-measure tool: 2 clicks compute 3D Euclidean bond distance ($d$ in Å) with dashed measurement line and floating distance tag; 3 clicks compute bond angle ($\theta^\circ$).
     - Custom PDB / XYZ coordinate text importer modal with centroid auto-centering and automated covalent bond detection.
  3. **EveryCircuit/Multisim Live DC Supply Voltage & Power Dissipation** (`src/js/ui/circuit-workbench.js`, `src/js/core/circuit-sim.js`):
     - Live DC voltage slider ($0\text{V} - 30\text{V}$) adjusting active DC power rails dynamically during running simulation without resetting netlists.
     - Multimeter Wattage mode (`W`) measuring branch dissipation ($P = V \times I$) with an automatic thermal overload alarm (`🔥 OVERHEAT` at $>120\text{W}$).
  4. **Ptable/ChemDraw Bohr Orbitals & Chemical Molar Mass Calculator** (`src/js/ui/periodic-table.js`, `src/js/core/scientific-math.js`):
     - Concentric Bohr Shell electron orbitals diagram in inspector showing $K, L, M, N\dots$ shell counts.
     - Chemical Molar Mass Calculator evaluating formula weights (e.g. `Ca(OH)2` $\to 74.092\text{ g/mol}$, `CuSO4*5H2O` $\to 249.677\text{ g/mol}$) with stoichiometric mass percentages and canvas stamp.
  5. **Hemingway Readability Engine & 1-Click Auto-Fix** (`src/js/core/technical-linter.js`):
     - `calculateReadability(text)` computing Flesch Reading Ease ($0-100$) and US Grade Level scores.
     - `TechnicalLinter.fixAll(text)` 1-click transformation auto-substituting concise phrasing and spelling fixes.
  6. **Anki/RemNote Active Recall Scorecard & Whiteboard Stamp** (`src/js/ui/study-runner.js`):
     - Session completion scorecard displaying retention accuracy %, rating distribution, and `[📸 Stamp Scorecard]` button creating an active-recall study log on the canvas.
- **Verification**:
  - `node scripts/smoke.js`: 1,244 passed, 0 failed (100% pass rate).
  - `node scripts/i18n-check.js`: 2,061 / 2,061 translated (100% parity across all 7 locales).
  - Standalone binary: [`releases/GazBoard-v6.6.0-Portable.exe`](releases/GazBoard-v6.6.0-Portable.exe) (`113,060,623 bytes` / `107.82 MiB`).
  - See [`docs/releases/RELEASE-6.6.0.md`](docs/releases/RELEASE-6.6.0.md) for full release details.

### V 6.7.0 Phase 7 STEM Powerhouse (Circuits, 2D Chemistry, 3D Calculus, Physics Labs)

- Delivers full offline STEM workstations:
  1. **Falstad-Style Analog, Digital & Discrete Semiconductor Circuit Simulator** (`src/js/core/circuit-sim.js`, `src/js/ui/circuit-workbench.js`):
     - BJT NPN/PNP, MOSFET N/P, silicon and Zener diodes, optical LEDs, LM741 operational amplifiers, NE555 timer ICs, logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR), 7-segment display, and 5 industrial presets.
  2. **ChemDraw-Style 2D Chemical Structure Drawing & SMILES 2D/3D VSEPR Parser** (`src/js/ui/chemical-sketcher.js`):
     - Interactive chemical canvas, single/double/triple/wedged bonds, heteroatom palette, ring stamps (Benzene, Cyclopentane, Cyclohexane), and 1-click bridge to 3D molecular viewer and canvas stamp.
  3. **3D Surface & Polar Function Calculus Grapher** (`src/js/ui/function-grapher.js`):
     - 3D Cartesian surface plotting ($z = f(x, y)$) with azimuth/elevation orbit and depth-sorting; polar curve plotting ($r = f(\theta)$).
  4. **Pre-built Physics Simulation Lab & Rigid Sandbox** (`src/js/ui/phet-runner.js`):
     - Geometrical optics ray tracing (convex lens, focal rays, image formation), Coulomb electric field vectors, 2D momentum collision lab, and 2D Newtonian rigid sandbox.
- **Verification**:
  - `node scripts/smoke.js`: 1,248 passed, 0 failed (100% pass rate).
  - `node scripts/i18n-check.js`: 2,093 / 2,093 translated (100% parity across all 7 locales).
  - Standalone binary: [`releases/GazBoard-v6.7.0-Portable.exe`](releases/GazBoard-v6.7.0-Portable.exe) (`113,075,190 bytes` / `107.84 MiB`).
  - See [`docs/releases/RELEASE-6.7.0.md`](docs/releases/RELEASE-6.7.0.md) for full release details.

### V 6.8.0 Phase 8 Language, Math & Knowledge Core (WordNet, Academic Linter, Natural Math, Image Occlusion)

- **F-138**: Delivers comprehensive language, linguistic writing, natural mathematics, and active-recall flashcard capabilities:
  1. **WordNet Academic Dictionary & Scholarly Thesaurus** (`src/js/ui/academic-dictionary.js`):
     - Academic Word List (AWL Sublists 1-10) and STEM vocabulary database.
     - Definitions, parts of speech, IPA phonetics, synonyms, antonyms, collocations, and example corpus sentences.
     - Interactive thesaurus chip search, native Web Speech TTS pronunciation, and 1-click whiteboard definition card stamping.
     - Hotkey <kbd>Ctrl+Shift+D</kbd> and ESL ribbon shelf integration.
  2. **University-Level Grammar, Citation & Academic Writing Linter** (`src/js/core/technical-linter.js`):
     - Academic tone and colloquialism replacement rules.
     - Subject-verb agreement grammar rules.
     - Citation integrity checking for parenthetical citations.
     - Quantitative Academic Style Score (0–100%) and automatic scholarly tone elevation (`TechnicalLinter.applyAcademicTone()`).
  3. **Natural Language Math-to-LaTeX Converter & Symbolic CAS** (`src/js/core/scientific-math.js`, `src/js/ui/mathedit.js`):
     - `naturalMathToLaTeX(text)` parses natural conversational math expressions (integrals, derivatives, limits, sums, matrices) into formatted LaTeX.
     - `SymbolicCAS.solveQuadratic(eqStr)` solves quadratic and linear equations with exact discriminant and step-by-step LaTeX roots.
     - `SymbolicCAS.matrixDeterminant(matrix)` computes exact determinants for $n \times n$ matrices.
     - Math Editor dialog (`mathedit.js`) includes `🗣️ Natural Math…` and `⚡ Solve…` action buttons.
  4. **Image Occlusion Dual Review Modes & Anki Cloze Deck Export** (`src/js/ui/study-runner.js`, `src/js/ui/sidebar-ribbon.js`):
     - "Hide All, Guess One" vs "Hide One, Guess One" occlusion review modes.
     - Floating review HUD mode switcher with instant live state refresh.
     - `exportClozeDeck()` generating Anki-compatible TSV flashcard decks for immediate clipboard export.
- **Verification**:
  - `node scripts/smoke.js --new-features`: 21 passed, 0 failed (100% pass rate).
  - `node scripts/i18n-check.js`: 2,143 / 2,143 translated (100% parity across all 7 locales).
  - Standalone binary: [`releases/GazBoard-v6.8.0-Portable.exe`](releases/GazBoard-v6.8.0-Portable.exe) (`113,095,961 bytes` / `107.86 MiB`).
  - See [`docs/releases/RELEASE-6.8.0.md`](docs/releases/RELEASE-6.8.0.md) for full release details.


### V 6.9.1 Phase 9 Offline Third-Party Libraries & UI/UX Discovery Entry Points Audit

- **F-140**: Delivers 100% offline verification, JSON manifest fix, complete STEM workbench discovery UI integration, and 100% i18n parity:
  1. **100% Offline Third-Party Libraries Verification** (`src/vendor/`, `CommonLibraries/`):
     - Verified all 15 third-party offline libraries (KaTeX, PDF.js, Tesseract.js, Three.js, MathJS, Mol*, Opentype, PGFPlots/ChartJS, WordNet, etc.) with zero external CDN requests.
     - Fixed JSON string backslash escaping in `libraries.json` manifests.
  2. **STEM & Advanced Workbenches Discovery in Main Insert Menu** (`src/js/insert.js`, `src/js/ui/toolbar.js`):
     - 10 dedicated discovery cards in the "+" Insert menu (Circuit Workbench, Molecule Viewer, Function Grapher, Symbolic CAS, Physics Simulation Lab, Periodic Table, WordNet Dictionary, Academic Linter, Kanban Board, Document Navigator).
     - 1-click ribbon pinning toggle on all tool cards.
  3. **OmniSearch Palette (<kbd>Ctrl+K</kbd>) Command Registry** (`src/js/ui/search-dialog.js`):
     - Searchable commands and workbench shortcuts directly callable from the OmniSearch dialog.
  4. **Runtime Libraries Status Inspector & Menu Enhancements** (`src/js/ui/panels.js`, `src/index.html`):
     - Added "Runtime Libraries" inspector modal in More Settings menu displaying offline status and storage sizes.
     - Added "Export Board as Video" entry in the main Export submenu.
     - Canvas context menu shortcuts for quick workbench access.
  5. **100% i18n Parity Across All 7 Locales** (`src/locales/*.json`):
     - Added 45 new localization keys across all 7 dictionaries (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`), achieving 2,238 / 2,238 keys (100% parity).
- **Verification**:
  - `node scripts/smoke.js --new-features`: 24 passed, 0 failed (100% pass rate).
  - `node scripts/i18n-check.js`: 2,238 / 2,238 translated (100% parity across all 7 locales).
  - See [`docs/releases/RELEASE-6.9.1.md`](docs/releases/RELEASE-6.9.1.md) for full release details.


### P2 & P3 Subsystems Hardening & Architectural Verification

- **Hardening Scope**: Comprehensive code audit, edge-case remediation, and dedicated unit test suites for all 26 subsystems across P2 (Domain Workbenches & Simulators) and P3 (Utilities & UI Enhancements):
  1. **P3 Utilities & UI Hardening** (`docs/hardening/03-P3-UTILITIES-AND-UI-ENHANCEMENTS.md`):
     - *Academic Dictionary & WordNet*: Added `typeof window !== 'undefined' && 'speechSynthesis' in window` check preventing runtime crashes in test/Node environments.
     - *Technical Linter & Academic Tone*: Protected embedded LaTeX equations (`$...$`, `$$...$$`) and code blocks from text transformation, preserving math symbols like `\big(`.
     - *Periodic Table & Bohr Shells*: Added complete Bohr electron shell calculations for all 118 elements; handled zero/invalid inputs safely.
     - *Chemical Formula & Molar Mass*: Safe hydration symbol parsing (`*`, `·`, `•`) and bracket handling in `parseFormula()`.
     - *Surface Laser Trail*: Fixed `Surface.pruneLaser()` to dynamically respect custom `laserTrailDuration` settings.
  2. **P2 Domain Workbenches & Simulators Hardening** (`docs/hardening/02-P2-DOMAIN-WORKBENCHES-AND-SIMULATORS.md`):
     - *ChemDraw 2D Chemical Sketcher*: Added support for multi-digit SMILES ring closures (`%10`–`%99`) and centered card stamping using `cam.viewport(sw, sh)`.
     - *Symbolic CAS & Notebook Variables*: Implemented `evaluateNotebookVariables(varMap)` with 3-color DFS cycle detection and topological sorting, eliminating circular dependency hangs.
     - *Dataview Query Engine*: Blocked prototype pollution keys (`__proto__`, `prototype`, `constructor`); added case-insensitive infix `CONTAINS` and multi-clause `AND` parsing.
     - *FSRS v5 Engine*: Enforced numerical stability clamps (`newStability >= 0.01`, `scheduledDays >= 10/1440`), preventing interval corruption.
     - *AnkiConnect Bridge*: Added strict 2,500ms `AbortController` timeout to `invokeAnkiConnect()`.
     - *PDF Sidebar Drawer*: Decoupled outline search filtering from DOM re-creation, preserving search input focus across keystrokes.
     - *Workbench Coordinate Centering*: Standardized `cam.viewport(sw, sh)` coordinate centering across Molecule Viewer, Function Grapher, and Circuit Workbench.
     - *Study Runner Occlusion Reset (Invariant #6)*: Ensured all whiteboard occlusions are restored to concealed state (`revealed = false`) upon exiting review sessions.
- **Verification**:
  - `node --test test/p2-hardening.test.mjs`: 7 passed, 0 failed (100% pass rate).
  - `node --test test/p3-hardening.test.mjs`: 6 passed, 0 failed (100% pass rate).
  - `node scripts/smoke.js --new-features`: 24 passed, 0 failed (100% pass rate).
  - `node scripts/i18n-check.js`: 2,238 / 2,238 translated (100% parity across all 7 locales).


### P1 Subsystems Hardening: Computational Engines & Media Pipelines

- **Hardening Scope**: Full audit, numerical stability guards, and dedicated unit test suite for all 8 subsystems in `docs/hardening/01-P1-COMPUTATIONAL-ENGINES-AND-MEDIA.md`:
  1. **Headless MNA Circuit Simulator & Semiconductors** (`src/js/core/circuit-sim.js`):
     - Added `buildProtectedMatrix()` with $10^{-12}$ S minimum diagonal shunt conductance, preventing singular matrix division-by-zero on ungrounded nodes.
     - Implemented `clampDiodeVoltage()` limiting algorithm, preventing floating-point exponential overflow in Shockley diode Newton-Raphson iterations.
     - Throttled procedural audio continuity buzzer (150ms) and button clicks (40ms) to prevent Web Audio buffer starvation.
  2. **Video Exporter & MP4 Muxer** (`src/js/export-video.js`):
     - Clamped track duration to finite numbers $\ge 1$, eliminating division-by-zero and NaN progress calculation.
     - Added safe runtime error catching on WebCodecs `VideoEncoder` with graceful fallback to `MediaRecorder` WebM.
  3. **Obsidian Markdown & KaTeX Engine** (`src/js/core/markdown.js`):
     - Hardened `renderMathToXhtml()` with `throwOnError: false`, `errorColor: '#f43f5e'`, and `strict: false`, rendering clean fallback spans on malformed LaTeX formulas.
     - Preserved currency prices (`$500`, `$250`) as plain prose while compiling valid math formulas.
  4. **Dynamic Calculus Function Grapher** (`src/js/ui/function-grapher.js`):
     - Implemented vertical asymptote discontinuity detection, breaking canvas line strokes across opposite infinities in $\tan(x)$ and $1/x$.
     - Guarded Riemann integral area formatting against non-finite values (`Number.isFinite(integralArea) ? ... : 'O.L'`).
  5. **Multi-Tab Workspace Session Manager** (`src/js/ui/tabs.js`):
     - Added `QuotaExceededError` recovery automatically pruning older saved sessions to prevent fatal `localStorage` exceptions.
  6. **Manhattan 90° Orthogonal Routing** (`src/js/core/connectors.js`):
     - Implemented and exported `cleanOrthogonalPath()` pruning duplicate consecutive points ($<0.001$) and collapsing intermediate collinear bends.
- **Verification**:
  - `node --test test/p1-hardening.test.mjs`: 5 passed, 0 failed (100% pass rate).
  - `node --test test/p1-hardening.test.mjs test/p2-hardening.test.mjs test/p3-hardening.test.mjs`: 18 passed, 0 failed.
  - `node scripts/smoke.js --new-features`: 24 passed, 0 failed.
  - `node scripts/i18n-check.js`: 2,238 / 2,238 translated (100% parity across all 7 locales).
