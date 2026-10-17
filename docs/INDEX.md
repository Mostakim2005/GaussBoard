# GazBoard Replay — Master Feature Index & Layered TOC

> **CRITICAL DIRECTIVE FOR NEW AI SESSIONS**:
> **DO NOT read all files in this repository at once.** Doing so will exhaust your context window.
> 1. Use the **Master Lookup Table** below to identify the feature or domain the user wants to work on.
> 2. Open **ONLY** the designated Tier 1 Layer Dossier in `docs/layers/`.
> 3. That dossier will give you the exact 1–2 source files to edit, the data schema, and the invariant rules to follow.

---

## 1. Master Feature & Subsystem Lookup Table

| Feature / Task Domain | Brief Description | Layer Dossier | Primary Source Files |
| :--- | :--- | :--- | :--- |
| **Audio-Ink Sync & Replay** | Audio recording with millisecond-timestamped strokes (`p.t`) and neon glow playback | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/core/audio-recorder.js`<br>`src/js/core/replay.js` |
| **AudioBar, Scrubber & Bookmarks** | Waveform density scrubber, skip intervals (5s, 10s, 15s, 30s), named bookmark editor | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/ui/audio-bar.js`<br>`src/js/ui/density-canvas.js` |
| **Canvas Audio Player Cards** | Interactive `type: 'audio'` cards placed on canvas with direct tap-to-play | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/core/render.js`<br>`src/js/core/tools.js` |
| **Scratch-Out Gesture Eraser** | StarNote-style scribble eraser with dominant reversal axis spatial overlap guard | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/scratch.js`<br>`src/js/core/tools.js` |
| **Windows Ink Bézier Curves** | Pluggable inking with velocity-weighted cubic Bézier curve fitting & DirectInk | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/ink.js`<br>`src/js/ui/panels.js` |
| **Highlighter Opacity & Color-Pop**| 50% default opacity slider (10%–100%) and dark text color-popping contrast enhancement | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/render.js`<br>`src/js/ui/toolbar.js` |
| **Pen Opacity & Laser Trails** | Pen opacity slider (10%–100%) and laser pointer trail duration options | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/render.js`<br>`src/js/ui/panels.js` |
| **Active-Recall Study Tape** | Hatched diagonal neon tape toggling between concealed and revealed on tap | [`layers/03-canvas-and-study-tape.md`](layers/03-canvas-and-study-tape.md) | `src/js/core/render.js`<br>`src/js/core/hit.js` |
| **Scene Partitioning & Glow** | Base frozen canvas filtering and dynamic replay stroke bloom decay | [`layers/03-canvas-and-study-tape.md`](layers/03-canvas-and-study-tape.md) | `src/js/core/surface.js`<br>`src/js/core/render.js` |
| **Image Cropping & Annotations** | Non-destructive image edge sliders and attached pen annotations grouping/lock | [`layers/03-canvas-and-study-tape.md`](layers/03-canvas-and-study-tape.md) | `src/js/ui/contextmenu.js`<br>`src/js/core/render.js` |
| **Arrowhead & Line Geometry** | Barbed elongated arrowheads, scaling, line thickness stepping & conversion | [`layers/04-geometry-and-templates.md`](layers/04-geometry-and-templates.md) | `src/js/core/connectors.js`<br>`src/js/core/render.js` |
| **Custom Templates System** | File Explorer image/PDF template import and active board snapshotting | [`layers/04-geometry-and-templates.md`](layers/04-geometry-and-templates.md) | `src/js/templates.js`<br>`src/js/ui/panels.js` |
| **Zoom Presets Popover** | Hover popover on zoom label with star favorites and Fit Width/Fit Height | [`layers/04-geometry-and-templates.md`](layers/04-geometry-and-templates.md) | `src/js/ui/toolbar.js`<br>`src/js/core/camera.js` |
| **PDF Background Import Mode** | Locked native pad background import mode alongside movable objects printout | [`layers/05-pdf-and-pagemargins.md`](layers/05-pdf-and-pagemargins.md) | `src/js/ui/pagepicker.js`<br>`src/js/insert.js` |
| **Turnout Page Margin Dialog** | 8 draggable blue control handles, Cornell layout presets & note/page scope | [`layers/05-pdf-and-pagemargins.md`](layers/05-pdf-and-pagemargins.md) | `src/js/ui/pagemargin-dialog.js`<br>`src/js/core/pages.js` |
| **Split Study Workspace** | Dual side-by-side viewports with independent camera and store synchronization | [`layers/06-workspace-and-ui.md`](layers/06-workspace-and-ui.md) | `src/js/ui/split-workspace.js` |
| **Notes Overview & Gallery Tags** | Gallery card direct double-click opening, smart reflow actions, `#tags` sidebar | [`layers/06-workspace-and-ui.md`](layers/06-workspace-and-ui.md) | `src/js/ui/note-overview.js`<br>`src/js/ui/panels.js` |
| **OmniSearch & In-Settings** | Ctrl+F fuzzy multi-token search across titles/descriptions; live DOM filtering | [`layers/06-workspace-and-ui.md`](layers/06-workspace-and-ui.md) | `src/js/ui/search-dialog.js`<br>`src/js/ui/panels.js` |
| **Ribbon Customization** | Pinned tool toggles (📌 / 📍) moving items between ribbon and `+` menu | [`layers/06-workspace-and-ui.md`](layers/06-workspace-and-ui.md) | `src/js/ui/toolbar.js` |
| **Stitched Video Export** | Multi-session selection picker, ▲/▼ reordering, and combined WebM video export | [`layers/07-video-export.md`](layers/07-video-export.md) | `src/js/export-video.js` |
| **Multi-Layer System (Standby)** | Layer system architecture (currently on standby per user request) | [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md) (§6) | `docs/plan/04-quality.md` |

---

## 2. Progressive Navigation Protocol

When handling any coding request:
```
Step 1: Check Master Table above -> Find the Layer Dossier in docs/layers/
Step 2: Read ONLY that Layer Dossier (< 1,000 tokens)
Step 3: Edit ONLY the files listed in Section 2 of that Dossier
Step 4: Verify against Section 4 (Invariants) and Section 6 (Test Commands)
Step 5: Run "node scripts/smoke.js" to guarantee 0 regressions
```
