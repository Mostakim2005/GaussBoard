# GazBoard Replay — Master Feature Index & Layered TOC

> **CRITICAL DIRECTIVE FOR NEW AI SESSIONS**:
> **DO NOT read all files in `docs/` at once.** Start with `AGENTS.md` and `AI_BOOTSTRAP.md`, then use [`AI_DOCS_MAP.md`](AI_DOCS_MAP.md) for document roles and this index to select one subsystem dossier. Read only that dossier and the source/tests it names.

## Documentation authority and lookup

| Need | Start here | Purpose |
| :--- | :--- | :--- |
| Understand documentation structure or find the right document | [`AI_DOCS_MAP.md`](AI_DOCS_MAP.md) | Directory roles, source-of-truth rules, and token-light reading paths. |
| Start a fresh AI/contributor session | [`../AI_BOOTSTRAP.md`](../AI_BOOTSTRAP.md), then this index; open [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md) when current state/preferences are needed | Project mental model, task routing, current branch/release, owner preferences, verified state, and known limitations. |
| Understand only the original baseline | [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md) | Base features, source locations, and improvement checkpoints, excluding later custom additions. |
| Trace custom release history | [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md) | Select one release dossier; the evolution file is historical and covers v4.8.2–v4.8.8. |
| Inspect features, architecture, and audit from v4.8.11 to v4.8.19 | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) | Authoritative technical specification, subsystem architecture deep dives (Split Workspace, Advanced Pens, Obsidian Markdown), 6 Golden Invariants audit, and AI hardening runbook for v4.8.11–v4.8.19. |
| Find an implementation area | Layer dossiers below | Current architecture and source entry points; read only the relevant dossier for code work. |
| See release claims and package registry | [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md) | Release ledger and binary/archive references. Current patch dossier: [`releases/RELEASE-4.8.11.md`](releases/RELEASE-4.8.11.md). |
| See individual change records | [`FEATURE_RECORD.md`](FEATURE_RECORD.md), [`BUG_FIX_LOG.md`](BUG_FIX_LOG.md), `releases/RELEASE-*.md` | Feature IDs, bug resolutions, and per-release notes. |
| See original requirements and design proposals | [`plan/`](plan/) | Historical analysis/specifications; proposals must be checked against current source before being described as shipped. |
| See audit methodology and findings | [`releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md`](releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md), [`releases/AUDIT-4.8.4-FINDINGS.md`](releases/AUDIT-4.8.4-FINDINGS.md) | Audit records; consult the evolution record for later implementation/status. |

The initial audit was performed with **Codex 4.6 Medium in Cursor**. The secondary audit and fixes were applied with **GPT-6 Luna High using Codex**. Release dossiers and plans can include historical or proposed claims; verify shipped behavior in current source and feature-focused tests.

**Current snapshot:** v4.8.20, local tag `v4.8.20`. Features include Split Study Workspace `Ctrl+Z` smart routing, Brush velocity thinning cache key, SVG markdown `<foreignObject>` vector export, KaTeX currency non-collision, YAML frontmatter extraction, digitizer hardware stylus tilt capture, pen color preservation, Obsidian Markdown Cards, 1:1 Page Margin Kinematics, Scribble Eraser Target Guarding, and Advanced Pen Suite (Brush, Fountain, Calligraphy). Standalone portable executable: `releases/GazBoard-v4.8.20-Portable.exe` mirrored to `C:\Users\kazir\Documents\Antigravity\GazBoard\dist\GazBoard-v4.8.20-Portable.exe`.

---

## 1. Master Feature & Subsystem Lookup Table

| Feature / Task Domain | Brief Description | Layer Dossier | Primary Source Files |
| :--- | :--- | :--- | :--- |
| **Audio-Ink Sync & Replay** | Audio recording with millisecond-timestamped strokes (`p.t`), live animated replay overlay, robust seeking, and optional viewport/center/dead-zone camera follow | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/app.js`<br>`src/js/core/audio-recorder.js`<br>`src/js/core/replay.js`<br>`src/js/core/surface.js` |
| **Reading/Writing Playback Modes** | Playback defaults to read-only pan/navigation; Writing mode allows new replay-timestamped ink. Sync, camera follow, and replay outline appearance can be changed from AudioBar. | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/app.js`<br>`src/js/core/tools.js`<br>`src/js/core/surface.js`<br>`src/js/ui/replay-bar.js`<br>`src/js/ui/audio-bar.js` |
| **AudioBar, Scrubber & Bookmarks** | Waveform density scrubber, skip intervals (5s, 10s, 15s, 30s), named bookmark editor, recording rename and adaptive action menu | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `src/js/ui/audio-bar.js`<br>`src/js/ui/density-canvas.js` |
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
| **Obsidian Markdown & Cards** | GFM Markdown parser, KaTeX math, task lists, callouts, and 4 card presentation models (`canvas`, `window`, `minimal`, `transparent`) | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§2.1–§2.2) | `src/js/core/markdown.js`<br>`src/js/core/boardrefs.js`<br>`src/js/core/render.js` |
| **1:1 Page Margin Kinematics** | Drag handles tracking pointer up to 2,000px without drift; Cornell presets | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§2.2) | `src/js/ui/pagemargin-dialog.js`<br>`src/js/core/pages.js` |
| **Ribbon Safety & Reflow** | Disabled accidental right-click tool ejection; adaptive flex-wrap reflow; smart audio popover viewport positioning | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§2.3–§2.4) | `src/js/ui/toolbar.js`<br>`src/js/ui/audio-bar.js`<br>`src/js/ui/panels.js` |
| **Scribble Eraser Guarding** | Protects text boxes and sticky notes from accidental scribble erasure by default; 3-mode sensitivity slider | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§2.5) | `src/js/core/scratch.js`<br>`src/js/core/tools.js` |
| **Note Overview Previews & Modals** | Board card thumbnail rendering and inline modal `# Tag` & `Alias` creation | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§2.6) | `src/js/ui/note-overview.js` |
| **Split Study Workspace Overhaul** | Complete dual-store isolation; independent surfaces, ink nibs & undo stacks; autocomplete combobox (`setLast: false`) | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§3.1) | `src/js/ui/split-workspace.js`<br>`src/js/core/tools.js` |
| **Advanced Pen Suite** | Brush (velocity thinning), Fountain (directional tine spread), Calligraphy (closed chisel envelope); 1-click switcher | [`MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md`](MASTER_POST_4.8.11_FEATURES_AND_AUDIT.md) (§3.2) | `src/js/core/ink.js`<br>`src/js/core/render.js`<br>`src/js/ui/toolbar.js` |
| **Stitched Video Export & Framing** | Multi-session selection, fixed recording/whole-board views, camera-follow framing, and timestamped unique suggested filenames | [`layers/07-video-export.md`](layers/07-video-export.md) | `src/js/export-video.js` |
| **Multi-Layer System (Standby)** | Layer system architecture (currently on standby per user request) | [`DEVELOPER_HANDOVER.md`](DEVELOPER_HANDOVER.md) (§6) | `docs/plan/04-quality.md` |
| **Feature smoke-test groups** | Mandatory regressions and custom-addition suites run separately | Relevant layer dossier | `scripts/smoke.js`, `scripts/smoke-custom.js`; run `npm run smoke:custom` or a version-scoped `npm run smoke:features:*` |
| **Replay reliability checks** | Unit checks for delayed seek, play lifecycle, ordered recording chunks, replay-clock ink, and sync rendering gate | [`layers/01-audio-and-replay.md`](layers/01-audio-and-replay.md) | `test/replay-reading.test.mjs`; run `npm run smoke:replay` |
| **Video framing checks** | Fixed/whole-board bounds, active replay stroke selection, camera follow easing, and export dialog choices | [`layers/07-video-export.md`](layers/07-video-export.md) | `test/video-framing.test.mjs`; run `npm run smoke:video` |

Replay camera follow and video framing changes are documented in [`releases/RELEASE-4.8.10.md`](releases/RELEASE-4.8.10.md); replay/UI/export workflow fixes and the live Surface-to-App wiring correction are in [`releases/RELEASE-4.8.11.md`](releases/RELEASE-4.8.11.md); the video-driven Study Tape changes remain in [`releases/RELEASE-4.8.9.md`](releases/RELEASE-4.8.9.md).

---

## 2. Progressive Navigation Protocol

When handling a coding request, keep the context path narrow:
```
AGENTS.md -> AI_BOOTSTRAP.md -> docs/INDEX.md -> one layer dossier -> named source and focused tests
```
Read handover, release notes, feature catalogs, or plans only when the task needs them. Do not open neighboring dossiers “for context.” If the requested work spans multiple subsystems, route each independently and read only the smallest relevant part of each dossier.
