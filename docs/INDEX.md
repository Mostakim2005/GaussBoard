# GazBoard Replay — Master Feature Index & Layered TOC

> **CRITICAL DIRECTIVE FOR NEW AI SESSIONS**:
> **DO NOT read all files in this repository at once.** Doing so will exhaust your context window.
> 1. Use the **Master Lookup Table** below to identify the feature or domain the user wants to work on.
> 2. Open **ONLY** the designated Tier 1 Layer Dossier in `docs/layers/`.
> 3. That dossier will give you the exact 1–2 source files to edit, the data schema, and the invariant rules to follow.

## Documentation authority and lookup

| Need | Start here | Purpose |
| :--- | :--- | :--- |
| Understand only the original baseline | [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md) | Base features, source locations, and improvement checkpoints, excluding later custom additions. |
| Trace custom changes from v4.8.2 through v4.8.10 | [`FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) | Version-by-version feature and fix record, source mapping, verification notes, and known limitations; v4.8.9 and v4.8.10 patch details are in their release dossiers. |
| Find an implementation area | Layer dossiers below | Current architecture and source entry points; read only the relevant dossier for code work. |
| See release claims and package registry | [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md) | Release ledger and binary/archive references. Current patch dossier: [`releases/RELEASE-4.8.10.md`](releases/RELEASE-4.8.10.md). |
| See individual change records | [`FEATURE_RECORD.md`](FEATURE_RECORD.md), [`BUG_FIX_LOG.md`](BUG_FIX_LOG.md), `releases/RELEASE-*.md` | Feature IDs, bug resolutions, and per-release notes. |
| See original requirements and design proposals | [`plan/`](plan/) | Historical analysis/specifications; proposals must be checked against current source before being described as shipped. |
| See audit methodology and findings | [`releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md`](releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md), [`releases/AUDIT-4.8.4-FINDINGS.md`](releases/AUDIT-4.8.4-FINDINGS.md) | Audit records; consult the evolution record for later implementation/status. |

The initial audit was performed with **Codex 4.6 Medium in Cursor**. The secondary audit and fixes were applied with **GPT-6 Luna High using Codex**. Release dossiers and plans can include historical or proposed claims; verify shipped behavior in current source and feature-focused tests.

---

## 1. Master Feature & Subsystem Lookup Table

| Feature / Task Domain | Brief Description | Layer Dossier | Primary Source Files |
| :--- | :--- | :--- | :--- |
| **Audio-Ink Sync & Replay** | Audio recording with millisecond-timestamped strokes (`p.t`), configurable replay outline, and optional live camera follow | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/core/audio-recorder.js`<br>`src/js/core/replay.js` |
| **Reading/Writing Playback Modes** | Playback defaults to read-only pan/navigation; Writing mode allows new replay-timestamped ink. Sync, camera follow, and replay outline appearance can be changed from AudioBar. | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/app.js`<br>`src/js/core/tools.js`<br>`src/js/core/surface.js`<br>`src/js/ui/replay-bar.js`<br>`src/js/ui/audio-bar.js` |
| **AudioBar, Scrubber & Bookmarks** | Waveform density scrubber, skip intervals (5s, 10s, 15s, 30s), named bookmark editor | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/ui/audio-bar.js`<br>`src/js/ui/density-canvas.js` |
| **Canvas Audio Player Cards** | Interactive `type: 'audio'` cards placed on canvas with direct tap-to-play | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/core/render.js`<br>`src/js/core/tools.js` |
| **Scratch-Out Gesture Eraser** | StarNote-style scribble eraser with dominant reversal axis spatial overlap guard | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/scratch.js`<br>`src/js/core/tools.js` |
| **Windows Ink Bézier Curves** | Pluggable inking with velocity-weighted cubic Bézier curve fitting & DirectInk | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/ink.js`<br>`src/js/ui/panels.js` |
| **Highlighter Opacity & Color-Pop**| 50% default opacity slider (10%–100%) and dark text color-popping contrast enhancement | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/render.js`<br>`src/js/ui/toolbar.js` |
| **Pen Opacity & Laser Trails** | Pen opacity slider (10%–100%) and laser pointer trail duration options | [`layers/02-inking-and-gestures.md`](layers/02-inking-and-gestures.md) | `src/js/core/render.js`<br>`src/js/ui/panels.js` |
| **Active-Recall Study Tape & Answer Covers** | Persistent freehand tape and rectangular covers toggle concealed/revealed on tap; dedicated Study Tape tool in ribbon and Add/tools menus | [`layers/03-canvas-and-study-tape.md`](layers/03-canvas-and-study-tape.md) | `src/js/core/tools.js`<br>`src/js/core/hit.js`<br>`src/js/ui/toolbar.js` |
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
| **Stitched Video Export & Framing** | Multi-session selection, fixed recording/whole-board views, or a camera-follow view that tracks reanimated strokes | [`layers/07-video-export.md`](layers/07-video-export.md) | `src/js/export-video.js` |
| **Multi-Layer System (Standby)** | Layer system architecture (currently on standby per user request) | [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md) (§6) | `docs/plan/04-quality.md` |
| **Feature smoke-test groups** | Mandatory regressions and custom-addition suites run separately | Relevant layer dossier | `scripts/smoke.js`, `scripts/smoke-custom.js`; run `npm run smoke:custom` or a version-scoped `npm run smoke:features:*` |
| **Replay reliability checks** | Unit checks for delayed seek, play lifecycle, ordered recording chunks, replay-clock ink, and sync rendering gate | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `test/replay-reading.test.mjs`; run `npm run smoke:replay` |
| **Video framing checks** | Fixed/whole-board bounds, active replay stroke selection, camera follow easing, and export dialog choices | [`layers/07-video-export.md`](layers/07-video-export.md) | `test/video-framing.test.mjs`; run `npm run smoke:video` |

Replay camera follow and video framing changes are documented in [`releases/RELEASE-4.8.10.md`](releases/RELEASE-4.8.10.md); the video-driven Study Tape changes remain in [`releases/RELEASE-4.8.9.md`](releases/RELEASE-4.8.9.md).

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
