# Release Dossier — GazBoard v6.9.0

> **Release Version**: `v6.9.0`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(core): Phase 9 Advanced Canvas, Workspace & Media Productivity (v6.9.0)`  
> **Binary Deliverable**: `GazBoard-v6.9.0-Portable.exe` (`113,120,743 bytes` / `107.88 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity across 7 locales with 2,194 strings, 0 native C++ dependencies, preserved `p.t` stroke timestamps, finite audio safeguard, scene partitioning during audio replay, Study Tape toggle persistence).

---

## 1. Executive Summary & Version 6.9.0 Scope

Release **`v6.9.0` (Phase 9 — Advanced Canvas, Workspace & Media Productivity)** delivers essential workflow enhancements across multimedia video export, structured query visualization, magnetic connector ergonomics, PDF document navigation, multi-tab session management, knowledge graph clustering, and flexible split-study layouts. Built strictly with zero native compilation dependencies in 100% pure JavaScript:

1. **Direct MP4 Video Export via `mp4-muxer` (`src/js/export-video.js`, `src/vendor/mp4-muxer.mjs`)**:
   - **Client-Side MP4 Container Muxing**: Direct MP4 file generation using `mp4-muxer` and WebCodecs (`VideoEncoder`, `VideoFrame`) without requiring external FFmpeg binaries.
   - **Format Selector**: Export dialog dropdown allowing users to select between **MP4 Video (`.mp4`)** and **WebM Video (`.webm`)**.
   - **Seamless Fallback**: Graceful fallback to `MediaRecorder` WebM output if WebCodecs is restricted or unavailable in the environment.
   - **Stitched & Multi-Track Support**: Produces fluid replay recordings across single or concatenated multi-session audio tracks.

2. **Obsidian-Style Dataview Query Engine & In-Canvas Kanban Cards (`src/js/core/dataview.js`, `src/js/core/kanban.js`)**:
   - **Pure JS Dataview Query Engine**: Executes structured queries over board objects, notes, and tags:
     - `TABLE [fields] WHERE [condition] SORT [field] [ASC|DESC] LIMIT [n]`
     - `LIST [field] WHERE [condition] SORT [field] [ASC|DESC] LIMIT [n]`
     - Supports safe condition parsing (`contains()`, `=`, `!=`, `>`, `<`) without `eval()`.
     - Renders clean, scrollable tabular HTML ready for whiteboard card stamping.
   - **In-Canvas Kanban Board Component**: Interactive multi-column sprint board (*To Do*, *In Progress*, *Done*):
     - Persistent card schema with title, description, and task completion checklists.
     - Move cards across columns with 1-click status advances (`KanbanManager.moveCard()`).
     - Rendered directly into canvas objects and stampable from the Diagrams & Layout ribbon.

3. **Smart Orthogonal Connectors & Magnetic Snap Ports (`src/js/core/connectors.js`)**:
   - **Manhattan Orthogonal 90° Routing**: Added `'orthogonal'` to `ROUTES` with automated 90-degree obstacle-avoidance elbow routing (`routeOrthogonal`).
   - **Cardinal Magnetic Snap Ports**: `snapPortPoints(box)` exposes magnetic connection ports at North (`n`), South (`s`), East (`e`), and West (`w`) cardinal midpoints of shapes and sticky notes.
   - **Clean Vector Elbows**: Eliminates diagonal crossings for clean electrical, algorithmic, and architecture diagrams.

4. **PDF Bookmarks & TOC Outline Search Drawer (`src/js/ui/pdf-sidebar.js`)**:
   - **Hierarchical Outline Tree**: Recursive rendering of multi-level nested PDF outlines with indentation and section depth indicators.
   - **Live Outline Search Filter**: Instant substring filtering across all section titles and page headers.
   - **Custom Canvas Bookmarks Tab**: Dedicated Bookmarks manager allowing users to bookmark any page or canvas coordinate with custom titles, 1-click jump navigation, and deletion controls.

5. **Tab Tearing & Persistent Workspace Sessions (`src/js/ui/tabs.js`)**:
   - **WorkspaceSessionManager**: Persists named multi-tab workspace sessions to `localStorage`.
   - **Session Save & Restore**: Save current open tabs as a named workspace session and restore multi-board working sets with 1 click.
   - **Tab Tearing Context Actions**: Tab right-click menu provides *Tear tab to new window*, *Save workspace session…*, and *Restore workspace session…*.

6. **Knowledge Graph Community Clustering Halos (`src/js/ui/graph-view.js`)**:
   - **Community Detection**: Identifies connected clusters and related boards using BFS graph traversal.
   - **Colored Clustering Halos**: Renders soft, translucent glowing cluster boundaries around related node groups.
   - **Clustering HUD Switch**: Interactive toggle in the graph header to switch cluster halos on or off dynamically.

7. **Dual Split Layout Orientations & Excerpt Shelf Dock (`src/js/ui/split-workspace.js`)**:
   - **Dual Split Orientations**: Supports both vertical (left/right) and horizontal (top/bottom) split study layouts with live orientation toggle (`⬌` / `⬍`).
   - **Excerpt Shelf Dock**: Slide-up excerpt tray displaying all excerpts captured across open boards with 1-click drag-and-drop stamping onto either canvas viewport.

8. **Ribbon Customizer & Inking Auto-Hide (`src/js/ui/sidebar-ribbon.js`)**:
   - **Category Spine Visibility**: Checkbox controls in the Layout shelf to toggle which category icons appear on the vertical rail.
   - **Proximity Inking Auto-Hide**: Automatically collapses the expanded tool deck to rail-only mode when drawing starts on the canvas, eliminating drawing obstruction.
   - **Quick Action Stamps**: 1-click quick insertion cards for Kanban boards and Dataview query execution.

---

## 2. Invariant & Verification Audit

| Requirement | Target | Achieved Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **New Features Smoke Test Suite** | 100% Pass Rate | **24 Passed, 0 Failed** | `node scripts/smoke.js --new-features` |
| **Strict Translation Parity** | 100% across all 7 locales | **2,194 / 2,194 keys (100%)** | `node scripts/i18n-check.js` |
| **Zero Native Addons** | Pure JS / Portable | **0 C++ Native Modules** | Audit check (`package.json`) |
| **Content Security Policy** | No `eval` / `new Function` | **Safe Regex & Query Parsing** | Content-Security-Policy compliance |
| **Stroke Timestamp Preservation** | Preserve `p.t` | **Verified** | `Store.add` / `tools.js` invariants |
| **Study Tape Persistence** | Preserved occlusion state | **Verified** | Toggle & visibility invariants |
| **Binary Deliverable** | Versioned Portable Binary | **GazBoard-v6.9.0-Portable.exe** | `releases/` directory |

---

## 3. Deliverable Matrix

| Deliverable | Path | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Portable Binary** | `GazBoard-v6.9.0-Portable.exe` | Win32 Binary | Zero-install standalone executable with all Phase 1–9 capabilities bundled. |
| **Dataview Engine** | [`src/js/core/dataview.js`](../../src/js/core/dataview.js) | Core Module | Pure JS query engine for TABLE and LIST whiteboard object queries. |
| **Kanban Component** | [`src/js/core/kanban.js`](../../src/js/core/kanban.js) | Core Module | Interactive in-canvas multi-column sprint Kanban board. |
| **Orthogonal Connectors** | [`src/js/core/connectors.js`](../../src/js/core/connectors.js) | Core Module | Manhattan 90° orthogonal elbow routing and cardinal magnetic snap ports. |
| **MP4 Video Export** | [`src/js/export-video.js`](../../src/js/export-video.js) | Export Engine | Client-side MP4 generation via `mp4-muxer` and WebCodecs. |
| **PDF Navigator & Bookmarks** | [`src/js/ui/pdf-sidebar.js`](../../src/js/ui/pdf-sidebar.js) | UI Drawer | Hierarchical TOC outline tree, outline search filter, and custom page bookmarks. |
| **Workspace Sessions** | [`src/js/ui/tabs.js`](../../src/js/ui/tabs.js) | UI Component | WorkspaceSessionManager for saving and restoring multi-tab board sessions. |
| **Knowledge Graph Clusters** | [`src/js/ui/graph-view.js`](../../src/js/ui/graph-view.js) | UI Visualizer | Connected component community detection and colored clustering halos. |
| **Split Layouts & Excerpt Dock** | [`src/js/ui/split-workspace.js`](../../src/js/ui/split-workspace.js) | Workspace UI | Horizontal / vertical split layouts and slide-up Excerpt Shelf Dock. |
| **Ribbon Customizer** | [`src/js/ui/sidebar-ribbon.js`](../../src/js/ui/sidebar-ribbon.js) | UI Ribbon | Spine category visibility customizer, inking auto-hide, and quick stamp cards. |
| **Vendored MP4 Muxer** | [`src/vendor/mp4-muxer.mjs`](../../src/vendor/mp4-muxer.mjs) | Library | Bundled zero-dependency pure ES module MP4 muxer. |
