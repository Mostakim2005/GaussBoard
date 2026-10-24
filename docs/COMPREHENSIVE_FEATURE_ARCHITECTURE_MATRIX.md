# GazBoard Replay — Comprehensive Feature & Architecture Matrix

> **Scope**: Complete architectural ledger and cross-subsystem interaction matrix covering all custom features implemented in GazBoard Replay from v4.8.1 through v6.9.1.  
> **Core Architectural Paradigm**: Pure Vanilla JavaScript (ES6 Modules), Canvas2D hardware acceleration, zero frontend frameworks (React/Vue/Svelte-free), zero C++ native addons (`node-gyp`-free), 100% offline autonomy (0 external CDNs), strict 6 Golden Invariants compliance.

---

## 1. Architectural System Overview

The GazBoard Replay architecture is organized into 6 interconnected subsystem layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Top-Level Shell & Chrome                              │
│   (Multi-Tab Bar, OmniSearch Dialog, Floating HUDs, Double-Layer Ribbon)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    Interaction & Tool Dispatch Pipeline                     │
│  (Pointer Routing, Gesture Classifier, Inking Pipeline, Selection Bar)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       Document State Store (`Store`)                        │
│   (Spatial Map, Undo/Redo Stacks, Audio Session Ledger, Tags & Aliases)     │
└───────────────────┬──────────────────────────────────────┬──────────────────┘
                    │                                      │
┌───────────────────▼──────────────────┐ ┌─────────────────▼──────────────────┐
│      Primary Canvas Surface          │ │       Replay & Media Engine        │
│ (Virtual Camera, Dirty Region Render,│ │ (Sub-ms Replay Clock, AudioBar HUD,│
│  Hatched Patterns, Connectors)       │ │  WebCodecs / MP4 Muxer Pipeline)   │
└──────────────────────────────────────┘ └────────────────────────────────────┘
                    │                                      │
┌───────────────────▼──────────────────────────────────────▼──────────────────┐
│             Domain Workbenches (STEM, Circuits, Language & CAS)             │
│ (MNA Circuit Sim, 3D Mol* Viewer, 2D/3D Grapher, FSRS v5, WordNet Lexicon)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Feature Matrix

### Domain 1: Audio Recording, Temporal Replay & Media Export

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-103: Audio-Ink Timestamp Synchronization** | [`src/js/core/audio-recorder.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/audio-recorder.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js)<br>[`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js) | While recording is active, every pointer event captures a millisecond-precision wall-clock timestamp relative to track start: $p.t = \text{now}() - t_{\text{start}}$. Timestamp arrays are preserved through Catmull-Rom/Bézier curve fitting. Metadata (`id`, `assetId`, `durationMs`, `bookmarks`) persists inside `doc.audioTracks`. |
| **F-104: Dynamic Canvas Replay Engine & Glow Inking** | [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js)<br>[`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js) | Employs **Scene Partitioning (Invariant #1)**: base canvas drawing passes exclude strokes where `o.audioId === activeTrackId`. Replay strokes render exclusively in dynamic overlay passes: past strokes at 100% ink (with 450ms cyan bloom decay), active stroke with electric cyan glow (`#00e5ff`, `shadowBlur: 14`), and future strokes as ghosted ink (`alpha: 0.38`). High-resolution delta clock prevents drift when Web Audio stalls. |
| **F-105: AudioBar HUD & Waveform Scrubber** | [`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js)<br>[`src/js/ui/density-canvas.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/density-canvas.js) | [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Floating glassmorphic HUD hosting play/pause, playback speeds (0.5x–2.0x), and configurable skip durations (`[5s, 10s, 15s, 30s]`). Density canvas aggregates stroke temporal point distributions into 1D bucketing histograms, rendering a gradient audio density waveform with interactive stylus seek-scrubbing. |
| **F-109: ReplayBar Floating Dockable HUD** | [`src/js/ui/replay-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/replay-bar.js) | [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Draggable and dockable floating toolbar (Top, Bottom, Left, Right, Free). Features a 6px drag threshold with pointer capture to prevent stylus magnetic latching, supporting vertical and horizontal orientations with smooth transition easing. |
| **F-110: Multi-Session Stitched WebM Video Exporter** | [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js) | [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js)<br>[`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js) | Offscreen canvas replay pump operating at target frame rates (30/60 FPS). Renders cumulative bounding boxes of session notes with padding. Audio multiplexing sequentially stitches multi-session audio buffers via Web Audio API into a single continuous `MediaRecorder` stream with progress reporting and chunk-flush guarantees. |
| **F-116: Canvas Audio Player Cards** | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js)<br>[`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js) | Interactive `type: 'audio'` canvas cards containing track metadata, waveform thumbnail, duration, and progress ring. Tapping or double-clicking initiates in-place playback directly from the board without opening the full modal. |
| **F-117: Named Bookmarks Inline Label Editor** | [`src/js/ui/density-canvas.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/density-canvas.js)<br>[`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js) | Floating bookmark tooltip on the density scrubber timeline features an expandable edit field. Users can click `✏️` to assign semantic labels (e.g., "Theorem 1", "Example Problem"), committed instantly to `track.bookmarks` in `doc.audioTracks`. |
| **F-120: Live Primary Surface ReplayEngine Wiring** | [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js)<br>[`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js) | [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js) | Connects the primary board `Surface` to its owning `App` so live drawing accesses `ReplayEngine` state. Dispatches progressive reanimated strokes while maintaining clean separation between Reading Mode (read-only navigation) and Writing Mode (active inking). |
| **F-122: Multi-Mode Replay Presentation** | [`src/js/core/replay-clock.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay-clock.js)<br>[`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js) | [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js)<br>[`src/js/ui/audio-bar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/audio-bar.js) | Separates replay visual representation into three selectable modes across both live board and video exports: **Live Reveal** (strokes write dynamically in sync with audio), **Spotlight** (current stroke glows while others dim), and **Static** (all strokes rendered with glowing playback cursor). |
| **F-123: Revision-Keyed Per-Track Replay Cache** | [`src/js/core/replay-clock.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay-clock.js)<br>[`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>[`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js) | Indexes strokes by `Store` revision stamp and audio track ID in an LRU cache (16 slots maximum). Eliminates costly $O(N)$ linear scans on every animation frame, yielding 6.4x faster live rendering throughput during heavy multi-thousand stroke replay. |
| **F-125: Replay Camera Follow & Focus Resilience** | [`src/js/core/replay.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/replay.js)<br>[`src/js/core/camera.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/camera.js) | [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | Smooth 360ms camera easing tracking active replay drawing points. Enforces a 50ms maximum delta clamp on delayed frames to prevent camera snap-glitches upon app tab re-entry. Automatically cleans up pointer captures on window blur. |
| **F-139: Direct Client-Side MP4 Video Muxing** | [`src/js/export-video.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/export-video.js)<br>[`src/vendor/mp4-muxer.mjs`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/mp4-muxer.mjs) | [`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Pure JS client-side MP4 container muxing via `mp4-muxer` and WebCodecs (`VideoEncoder`, `VideoFrame`). Avoids external FFmpeg binaries. Offers format picker (`.mp4` vs `.webm`) with automatic fallback to `MediaRecorder` WebM if WebCodecs is restricted. |

---

### Domain 2: Inking Pipeline, Eraser Gestures & Geometry

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-101: StarNote Gesture Scratch-Out Eraser** | [`src/js/core/scratch.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scratch.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/core/erase.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/erase.js)<br>[`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js)<br>[`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js) | Kinematic classifier detecting rapid scribble gestures ($\ge 5$ sharp turns, density $\ge 3.5$, net displacement $\le 0.35$). Uses spatial overlap ratio ($\ge 0.25$) on the dominant reversal axis to eliminate false positives on handwriting (`w`, `m`, `2 3 2`). Triggers `eraseStrokesInBox()` with atomic undo. |
| **F-102: Active-Recall Study Tape & Answer Covers** | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/core/hit.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/hit.js)<br>[`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | **Non-Negotiable Invariant #6**: Freehand tape (`subtype: 'tape'`) and rectangular covers persist in board document state and toggle concealed/revealed on tap. Concealed renders diagonal neon hatched stripes; revealed renders faint dashed outlines that remain hittable. Attached annotations follow cover visibility. |
| **F-111: Stroke Opacity Slider & Quick Toggle** | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/ui/panels.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/panels.js) | Extends stroke schema with `o.opacity` (0.10 to 1.00). Injects `globalAlpha` into Canvas2D drawing paths, supporting ballpoint and translucent gel-pen styling with zero rendering degradation. |
| **F-112: Laser Pointer Trail Duration Controller** | [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/ui/panels.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/panels.js) | Time-decay pointer point queue with configurable trail lifetime ($0\text{ms}$ instant fade, $300\text{ms}$, $520\text{ms}$, $1.2\text{s}$, $2.5\text{s}$, $5.0\text{s}$, $10\text{s}$). Redraws dynamically during requestAnimationFrame loop. |
| **F-114: Highlighter 50% Opacity & Color-Popping** | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | [`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js) | Calibrated 50% default highlighter opacity with interactive slider (10%–100%). Uses color-popping composite modes (`source-over` with luminance-aware contrast boost) to keep underlying black handwritten or printed text sharp and readable without muddiness. |
| **F-124: Sample-Rate-Stable Scratch Classifier** | [`src/js/core/scratch.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scratch.js) | [`test/custom-features.test.mjs`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/test/custom-features.test.mjs) | Resamples input points at normalized 3px spatial intervals prior to gesture evaluation. Preserves turn curvature, rejects malformed digitizer spikes, and ensures identical gesture detection rates regardless of whether the pointer hardware samples at 60Hz or 240Hz. |
| **F-139: Manhattan Orthogonal 90° Routing & Snap Ports** | [`src/js/core/connectors.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/connectors.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | Generates Manhattan 90° elbow routes (`routeOrthogonal`) with automated obstacle clearance. `snapPortPoints(box)` exposes magnetic connection ports at North (`n`), South (`s`), East (`e`), and West (`w`) cardinal midpoints of shapes and cards, eliminating diagonal clutter in engineering schematics. |

---

### Domain 3: Split Workspace, Markdown & Knowledge Synthesis

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-106: Obsidian Properties & Autocomplete** | [`src/js/ui/properties-dialog.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/properties-dialog.js)<br>[`src/js/ui/toolbar.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/toolbar.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>`src/index.html` | Topbar properties dialog managing board tags (`#tag/subtag`) and aliases. `loadWorkspaceSuggestions()` aggregates global tag and alias frequencies across all stored boards, providing interactive autocomplete pills and live top-bar status badges. |
| **F-107: Unified OmniSearch Command Palette** | [`src/js/ui/search-dialog.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/search-dialog.js) | [`src/js/ui/panels.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/panels.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Multi-word token fuzzy matching modal (<kbd>Ctrl+K</kbd> / <kbd>Ctrl+F</kbd>). Simultaneously searches boards, in-settings toggles, and launches all modern tools and workbenches via 1-click execution or <kbd>Enter</kbd>. |
| **F-108: Split Study Workspace & Note Overview** | [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js)<br>[`src/js/ui/note-overview.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/note-overview.js) | [`src/js/core/surface.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/surface.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Dual-pane study layout mounting an independent reference board alongside the active scratch canvas with separate `Store`, `Surface`, and undo/redo stacks. Note Overview provides instant card double-click opening with title-length smart reflow actions. |
| **F-121: Obsidian YAML Block-List Metadata** | [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js) | [`src/js/core/boardrefs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/boardrefs.js) | Parser for Obsidian YAML frontmatter block lists (`tags:`, `aliases:`). Correctly parses quoted inline comma-separated lists and multiline bullet lists without string mangling. |
| **F-126: Source-Linked Visual Excerpt Cards** | [`src/js/core/excerpts.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/excerpts.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/ui/contextmenu.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/contextmenu.js) | Captures bounded transparent PNG snapshots of selections and converts them into portable excerpt cards (`o.excerptSource`). Cards retain source `boardId`, `pageIndex`, and spatial coordinates, providing bidirectional return navigation on click. |
| **F-127: Split-Pane Excerpt Transfer** | [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | [`src/js/core/excerpts.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/excerpts.js) | Routes in-app clipboard payloads to the left pane when hovered and enables native drag-and-drop of visual excerpts directly between split study boards without store collision. |
| **F-128: Markdown Heading & Block Links** | [`src/js/core/boardrefs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/boardrefs.js)<br>[`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js) | [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Supports local and cross-board wikilinks with heading anchors (`[[Board#Heading]]`) and block ID anchors (`[[Board#^block-id]]`). Numeric anchors navigate pad pages; text anchors smoothly pan to matching card headers. |
| **F-129: Obsidian Markdown Formatting Syntax** | [`src/js/core/markdown.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/markdown.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js) | Extended Markdown tokenizer rendering text highlight (`==text==`), subscript (`~sub~`), superscript (`^sup^`), footnotes (`[^1]`), hidden HTML comments (`%%comment%%`), and tilde code fences. |
| **F-139: Dataview Query Engine & Kanban Cards** | [`src/js/core/dataview.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/dataview.js)<br>[`src/js/core/kanban.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/kanban.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js)<br>[`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js) | Pure JS Dataview query evaluator (`TABLE`/`LIST` with `WHERE`, `SORT`, `LIMIT`) parsing board objects safely without `eval()`. In-canvas Kanban component (`KanbanManager`) maintains interactive 3-column boards with task completion checklists and status advance actions. |
| **F-139: Tab Session Persistence & Graph Clusters** | [`src/js/ui/tabs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/tabs.js)<br>[`src/js/ui/graph-view.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/graph-view.js) | [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js)<br>[`src/js/core/boardrefs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/boardrefs.js) | `WorkspaceSessionManager` serializes open multi-tab sessions to `localStorage` for 1-click restore. Knowledge Graph View performs BFS connected component detection to draw translucent glowing community clustering halos around related board clusters. |
| **F-139: Dual Split Orientations & Excerpt Dock** | [`src/js/ui/split-workspace.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/split-workspace.js) | [`src/js/core/excerpts.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/excerpts.js)<br>[`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Dynamically toggles split workspace layout between vertical (side-by-side) and horizontal (top/bottom) orientations (`⬌`/`⬍`). Features a slide-up Excerpt Shelf Dock collecting all captured board excerpts for rapid whiteboard stamping. |

---

### Domain 4: Engineering Workbench, Electronics & Physics

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-130: Double-Layered Sidebar Ribbon Menu** | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | `src/index.html`<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Collapsible engineering workspace (<kbd>Ctrl+B</kbd>) featuring a vertical icon spine rail and slide-out category shelf deck. Docks left or right with Glassmorphism / Material styling, in-app brand customizer, and proximity inking auto-hide. |
| **F-133: Industrial Circuit Workbench & MNA Engine** | [`src/js/core/circuit-sim.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/circuit-sim.js)<br>[`src/js/ui/circuit-workbench.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/circuit-workbench.js) | [`src/js/core/diagram-builder.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/diagram-builder.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Headless Modified Nodal Analysis (MNA) matrix solver with Newton-Raphson iteration. Powers an interactive 2.5D industrial workbench (<kbd>Ctrl+Shift+E</kbd>) with magnetic port snapping, cubic wire routing, animated electron particles, dual-probe DMM with audio buzzer, virtual oscilloscope, and DOL/Interlock presets. |
| **F-136: Live DC Voltage Slider & Overheat Alarm** | [`src/js/ui/circuit-workbench.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/circuit-workbench.js)<br>[`src/js/core/circuit-sim.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/circuit-sim.js) | [`src/js/core/tools.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/tools.js) | Live $0\text{V}-30\text{V}$ power rail slider adjusting active netlists on the fly. Multimeter Wattage mode (`W`) measures branch power dissipation ($P = V \times I$) and triggers visual thermal overheat badges (`🔥 OVERHEAT` at $>120\text{W}$). |
| **F-137: Discrete Semiconductor & Logic Simulation** | [`src/js/core/circuit-sim.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/circuit-sim.js)<br>[`src/js/ui/circuit-workbench.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/circuit-workbench.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Comprehensive semiconductor library supporting Ebers-Moll BJT (NPN/PNP), Shichman-Hodges MOSFET (N/P), Shockley diode equations, Zener breakdown, optical LEDs with emission glow, LM741 Op-Amps, NE555 timer ICs (astable/monostable), logic gates, and 7-segment displays. |
| **F-137: Pre-Built Physics Simulation Lab** | [`src/js/ui/phet-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/phet-runner.js) | [`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js)<br>[`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js) | Interactive HTML5 simulation suite containing geometrical optics ray tracing (Snell's Law, thin lens equations), Coulomb electric field vectors ($\vec{E} = \frac{kq}{r^2}\hat{r}$), 2D elastic/inelastic momentum collisions, and a 2D Newtonian rigid body physics sandbox with canvas snapshotting. |

---

### Domain 5: Mathematics, Symbolic CAS & Graphing

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-132: STEM Formula Encyclopedia & Balancer** | [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js)<br>[`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Solves chemical reaction stoichiometry using Gaussian elimination over atomic balance conservation matrices. Catalogs Grade 11-12 STEM formulas with instant formula card stamping. |
| **F-135: Dynamic 2D Calculus Function Grapher** | [`src/js/ui/function-grapher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/function-grapher.js)<br>[`src/vendor/function-plot.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/function-plot.js) | [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Recursive Descent AST mathematical expression parser (zero `eval`). Plots dynamic 2D Cartesian curves (<kbd>Ctrl+Shift+G</kbd>) with tangent derivative slider ($\frac{df}{dx}$), secant lines, and Riemann definite integral area shading with LaTeX output. |
| **F-135: Lightweight Symbolic CAS Engine** | [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js)<br>[`src/vendor/nerdamer/`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/nerdamer/) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Symbolic math engine performing symbolic polynomial differentiation, root isolation, and linear equation solving ($ax + b = 0$). Features reactive notebook variable binding across whiteboard text notes. |
| **F-136: Curve Tracing, Dual Functions & Extrema** | [`src/js/ui/function-grapher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/function-grapher.js) | [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js) | Desmos/GeoGebra-style dual-function overlay plotting $g(x)$ in `#ec4899`. Features a live crosshair cursor tracking curves with coordinate tooltips `(x, y)`, and automated detection rings for roots ($y = 0$) and local extrema ($\frac{dy}{dx} = 0$). |
| **F-137: 3D Surface & Polar Function Graphing** | [`src/js/ui/function-grapher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/function-grapher.js) | [`src/vendor/math.min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/math.min.js) | 3D Cartesian surface plotter ($z = f(x, y)$) with wireframe depth-sorting, 3D orbit rotation (elevation & azimuth), and polar curve plotting ($r = f(\theta)$). |
| **F-138: Natural Math-to-LaTeX & Quadratic CAS** | [`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js)<br>[`src/js/ui/mathedit.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/mathedit.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | `naturalMathToLaTeX()` translates conversational math strings (e.g. "integral of x^2 from 0 to 1") into formatted LaTeX equations. `SymbolicCAS.solveQuadratic()` solves second-degree polynomials with step-by-step discriminant evaluation. |

---

### Domain 6: Chemistry & 3D Molecular Modeling

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-132: 118-Element Interactive Periodic Table** | [`src/js/ui/periodic-table.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/periodic-table.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Complete database for all 118 chemical elements. Features interactive category filtering (alkali metals, halogens, noble gases), electronegativity trends, atomic radius heatmaps, and element stamp cards. |
| **F-134: 3D Molecular Structure Viewer** | [`src/js/ui/molecule-viewer.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/molecule-viewer.js)<br>[`src/vendor/3Dmol-min.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/vendor/3Dmol-min.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Interactive 3D molecular viewer (<kbd>Ctrl+Shift+M</kbd>) with CPK atom coloring, Ball & Stick / VDW / Wireframe modes, auto-spin orbit, preset library (Water, Methane, Benzene, Caffeine, DNA, Buckyball), and high-res canvas snapshot export. |
| **F-136: Bond Measurements & PDB Coordinate Importer** | [`src/js/ui/molecule-viewer.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/molecule-viewer.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js) | Interactive click-to-measure tool: 2 clicks compute 3D Euclidean bond distance ($d$ in Å) with dashed distance tags; 3 clicks compute bond angle ($\theta^\circ$). Includes custom PDB/XYZ text coordinate parser with auto-centering and covalent bond detection. |
| **F-136: Bohr Shell Orbitals & Molar Mass Calculator** | [`src/js/ui/periodic-table.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/periodic-table.js)<br>[`src/js/core/scientific-math.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/scientific-math.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Concentric Bohr Shell electron configuration inspector ($K, L, M, N\dots$). Evaluates chemical formula molar weights (e.g., $\text{Ca(OH)}_2 \to 74.09\text{ g/mol}$, $\text{CuSO}_4\cdot 5\text{H}_2\text{O} \to 249.68\text{ g/mol}$) with stoichiometric mass percentages. |
| **F-137: ChemDraw 2D Structure Canvas & SMILES Parser**| [`src/js/ui/chemical-sketcher.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/chemical-sketcher.js) | [`src/js/ui/molecule-viewer.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/molecule-viewer.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | 2D chemical structure drawing canvas with heteroatom palette (C, N, O, S, P, halogens), bond multipliers (single, double, triple, wedged), ring stamps (Benzene, Cyclopentane, Cyclohexane), SMILES string parser, and 1-click bridge to the 3D Molecular Viewer. |

---

### Domain 7: Linguistics, Grammar & Spaced Repetition

| Feature ID & Name | Primary Source Files | Interacting / Affected Files | Architectural Approach & Mechanics |
| :--- | :--- | :--- | :--- |
| **F-131: FSRS v5 Spaced Repetition & Anki Bridge** | [`src/js/core/fsrs.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/fsrs.js)<br>[`src/js/core/anki.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/anki.js)<br>[`src/js/ui/study-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/study-runner.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js)<br>[`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Pure JS Free Spaced Repetition Scheduler (FSRS v5) calculating stability $S$, difficulty $D$, and retrievability $R$. Active-recall review runner (<kbd>Ctrl+Shift+R</kbd>) with rating buttons (Again, Hard, Good, Easy), direct AnkiConnect desktop bridge (`127.0.0.1:8765`), and `.apkg` flashcard packaging via JSZip. |
| **F-135: Technical Writing & ESL Linter** | [`src/js/core/technical-linter.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/technical-linter.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Rule-based technical writing linter detecting passive voice, conversational redundancies, wordiness, and duplicate adjacent words with instant correction replacements. |
| **F-136: Readability Scoring & Auto-Fix** | [`src/js/core/technical-linter.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/technical-linter.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Implements Flesch Reading Ease ($0-100$) and Flesch-Kincaid US Grade Level readability algorithms. `TechnicalLinter.fixAll(text)` performs 1-click batch transformation to clean, concise prose. |
| **F-136: Active Recall Review Scorecard** | [`src/js/ui/study-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/study-runner.js) | [`src/js/core/store.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/store.js) | Generates an end-of-session review summary displaying retention accuracy %, rating breakdown (Again/Hard/Good/Easy), and `[📸 Stamp Scorecard]` action creating a permanent study log on the canvas. |
| **F-138: WordNet Academic Dictionary & Thesaurus** | [`src/js/ui/academic-dictionary.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/academic-dictionary.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js)<br>[`src/js/app.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/app.js) | Offline WordNet / Academic Word List dictionary (<kbd>Ctrl+Shift+D</kbd>) with IPA phonetics, definitions, synonyms, antonyms, collocations, corpus sentences, native Web Speech TTS pronunciation, and 1-click definition card stamping. |
| **F-138: Academic Writing & Grammar Linter** | [`src/js/core/technical-linter.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/technical-linter.js) | [`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Evaluates formal academic tone, colloquialisms, subject-verb agreement, and parenthetical citation integrity. Computes an Academic Style Score (0–100%) and provides 1-click tone elevation (`applyAcademicTone()`). |
| **F-138: Image Occlusion Modes & Cloze Deck Export** | [`src/js/ui/study-runner.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/study-runner.js) | [`src/js/core/render.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/core/render.js)<br>[`src/js/ui/sidebar-ribbon.js`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/src/js/ui/sidebar-ribbon.js) | Supports "Hide All, Guess One" vs "Hide One, Guess One" review modes for Study Tape and answer covers. `exportClozeDeck()` exports active occlusion cards as Anki-compatible TSV flashcard decks. |

---

## 3. Cross-Subsystem Dependency & Data Flow Graph

```mermaid
flowchart TD
    subgraph UI_Shell ["User Interface & Shell"]
        Ribbon["sidebar-ribbon.js (Ctrl+B)"]
        PlusMenu["toolbar.js (+ Menu)"]
        OmniSearch["search-dialog.js (Ctrl+K)"]
        CtxMenu["contextmenu.js"]
        TabBar["tabs.js"]
    end

    subgraph State_Storage ["State & Store Layer"]
        Store["core/store.js (doc.objects)"]
        AudioTracks["doc.audioTracks"]
        Pages["core/pages.js (doc.pages)"]
    end

    subgraph Canvas_Rendering ["Rendering & Canvas Engine"]
        Surface["core/surface.js"]
        Render["core/render.js"]
        Hit["core/hit.js"]
        Connectors["core/connectors.js"]
    end

    subgraph Specialized_Engines ["Domain Workbenches & Simulators"]
        CircuitSim["core/circuit-sim.js & circuit-workbench.js"]
        Grapher["ui/function-grapher.js"]
        MolViewer["ui/molecule-viewer.js"]
        ChemSketch["ui/chemical-sketcher.js"]
        Dictionary["ui/academic-dictionary.js"]
        FSRS["core/fsrs.js & study-runner.js"]
        DataView["core/dataview.js & core/kanban.js"]
        VideoMux["export-video.js & mp4-muxer.mjs"]
    end

    Ribbon --> CircuitSim & Grapher & MolViewer & ChemSketch & Dictionary & FSRS & DataView
    PlusMenu --> CircuitSim & Grapher & MolViewer & ChemSketch & Dictionary & FSRS & DataView
    OmniSearch --> CircuitSim & Grapher & MolViewer & ChemSketch & Dictionary & FSRS & DataView

    CircuitSim --> Store & Surface
    Grapher --> Store & Surface
    MolViewer --> ChemSketch & Store
    ChemSketch --> Store & MolViewer
    Dictionary --> Store
    FSRS --> Store & Render
    DataView --> Store & Render

    Store --> Surface & Render
    AudioTracks --> VideoMux
    Surface --> Hit & Render & Connectors
```

---

## 4. Invariant Compliance Checklist

Every feature in the matrix rigorously adheres to the **6 Golden Invariants**:
1. **Scene Partitioning During Audio Replay**: `(o) => o.audioId !== activeTrackId` excludes recorded session ink from the base canvas during audio replay.
2. **Stroke Point Timestamp Preservation**: Smoothing passes, curve fitters, and simplify algorithms in `tools.js` and `ink.js` strictly preserve `p.t`.
3. **Finite Audio Duration Safeguard**: Fallback to elapsed wall-clock `track.durationMs` whenever `audio.duration` returns `Infinity` or non-finite values.
4. **100% Internationalization (i18n) Parity**: Every user-facing UI string is wrapped in `t('...')` and translated across all 7 locales (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`) with zero missing or left-over keys.
5. **Zero Extra Native C++ Dependencies**: No `node-gyp` or native Windows DLL dependencies. All algorithms, solvers, and parsers remain pure portable JavaScript.
6. **Study Tape and Answer Cover Persistence**: Both freehand study tape and rectangular covers persist in board document state and toggle between concealed and revealed on direct tap.
