# GazBoard Feature Evolution: v4.8.1 to v4.8.8

This is the current, source-checked map of the product changes layered over the v4.8.1 baseline. It ties each version to its Git tag, primary code areas, implementation approach, audit corrections, and remaining limitations. It supersedes conflicting claims in older planning notes; those notes remain as records of what was proposed at the time.

For the original product surface, see [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md). For automated checks and the current status of audit findings, see [`releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md`](releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md) and [`releases/RELEASE-4.8.8.md`](releases/RELEASE-4.8.8.md).

## How to read this record

- **Baseline:** Git tag `v4.8.1`, commit `84c26437cdb998660d23d1cca37625b27e4a6213`.
- **Version boundaries:** v4.8.2–v4.8.7 are represented by local Git tags. For v4.8.7, `7549a64` contains the feature code and `84817ac` is the release/documentation record. Their detailed dossiers remain at `docs/releases/RELEASE-4.8.x.md`.
- **v4.8.4.1:** This was a follow-up branch based on v4.8.4, not a cumulative release containing v4.8.5–v4.8.7.
- **v4.8.8:** Cumulative audited release commit `e00b93f` (local tag `v4.8.8`), with a documentation follow-up at `663de90`.
- A feature named in an older dossier is not proof by itself that the feature was complete. Corrections below are based on the code/tag audit and focused tests where available.

## Version-by-version changes

### v4.8.1 — base application

GazBoard provides the base canvas, drawing and object model, board storage, document import/export, templates, and local/network workflows. The separate base catalog maps these facilities to the v4.8.1 source tree. Features added in later increments are not part of this baseline.

### v4.8.2 — settings, input controls, audio navigation, and export setup

- **Added/changed:** live settings search; stored pen opacity behavior; configurable laser trail duration; multi-session audio selection and bookmark navigation; video framing choices; and a stylus drag threshold.
- **Implementation areas:** `src/js/ui/panels.js`, `src/js/core/render.js`, `src/js/core/tools.js`, `src/js/core/surface.js`, `src/js/ui/audio-bar.js`, `src/js/ui/density-canvas.js`, `src/js/ui/replay-bar.js`, and `src/js/export-video.js`.
- **Approach:** settings write user preferences; rendering reads per-stroke/style state; audio selection is driven by `doc.audioTracks`; timeline markers use stroke activity; the drag threshold keeps a short pointer movement from becoming a pan.
- **Audit correction:** the v4.8.2 dossier describes a visible pen-opacity slider and video framing presets more strongly than the code delivered. The audited tree lacked the pen range control and an export-preset picker. v4.8.8 adds and separately tests those controls.
- **Retained choice:** existing opacity toggle behavior remains; the new slider exposes the configured value rather than replacing the prior control.

### v4.8.3 — feedback fixes, gesture filtering, and study navigation

- **Added/changed:** more selective scratch-out detection; richer audio-density display; Note Overview navigation; object properties; keyboard handling for search; and audio/replay/split-workspace feedback fixes.
- **Implementation areas:** `src/js/core/scratch.js`, `src/js/core/audio-recorder.js`, `src/js/core/replay.js`, `src/js/core/surface.js`, and `src/js/ui/{audio-bar,density-canvas,note-overview,properties-dialog,search-dialog,split-workspace}.js`.
- **Approach:** direction/reversal and spatial evidence is used to distinguish scribbling from ordinary writing; replay UI derives activity from timestamped strokes; overview interactions move the camera to the selected item; split panes are initialized after their DOM hosts exist.
- **Known verification gap:** the full regression suite exercises core replay and navigation behaviors, but not every individual properties, overview, and density-HUD interaction as a dedicated feature-only check. The standalone feature suite remains the place to add focused interaction checks.
- **Corrections:** later records consolidate issue numbering in `docs/BUG_FIX_LOG.md`; use the versioned release dossier and source history rather than assuming every BUG number is globally unique.

### v4.8.4 — gallery organization and media workflows

- **Added/changed:** board-tag filtering; the first ribbon pinning implementation; external audio import; non-destructive image crop and image annotation; and multi-session stitched WebM export.
- **Implementation areas:** `src/js/ui/panels.js`, `src/js/ui/toolbar.js`, `src/js/insert.js`, `src/js/ui/contextmenu.js`, `src/js/core/render.js`, `src/js/core/surface.js`, and `src/js/export-video.js`.
- **Approach:** tag state filters board cards; ribbon state is persisted in settings; imported audio is registered as a track and asset; crops store a source rectangle without destroying pixels; export replays selected sessions into an offscreen canvas and multiplexes audio.
- **Audit findings:** gallery tag filtering initially applied to boards, not templates; imported audio could assume a made-up duration; crop preview/apply/reset had undo and cancellation problems; crop rectangles needed source-bound clamping; and export shared live replay/surface state and could retain media resources. The v4.8.4 dossier also claimed a 90-degree crop action not present in the tagged code.
- **Fixes:** crop transactions, cancel restoration, source-bound clamping, and isolated video-export clock/resource cleanup were added in the v4.8.4.1 follow-up. v4.8.8 extends tags to templates, resolves duration from media metadata when possible, avoids inventing a duration when unavailable, and releases temporary media URLs.
- See `docs/releases/AUDIT-4.8.4-FINDINGS.md` for both the historical 4.8.4.1 status and the v4.8.8 follow-up status.

### v4.8.5 — connectors, templates, inking choice, and zoom tools

- **Added/changed:** connector routing/geometry and scaling; custom template import and snapshots; selectable inking engines; zoom presets and fit actions.
- **Implementation areas:** `src/js/core/connectors.js`, `src/js/core/ink.js`, `src/js/templates.js`, `src/js/core/camera.js`, `src/js/ui/contextmenu.js`, `src/js/ui/panels.js`, and `src/js/ui/toolbar.js`.
- **Approach:** connector endpoints/routes are calculated separately from object rendering; templates are local reusable descriptions; inking choice selects a path-generation strategy; zoom popover commands the existing camera.
- **Audit correction:** the release dossier advertises open/filled/stealth/diamond head styles and names Raw/Chaikin/Catmull–Rom modes. In the audited source those advertised head shapes were not all implemented, and the actual engine registry was `default`, `windowsInk`, and `perfectFreehand`. v4.8.8 adds all four head styles and adds Catmull–Rom/Bézier as a separate option while preserving the existing registry choices.
- **Option policy:** do not collapse the engine choice to a binary toggle. Keep selectable alternatives visible and document trade-offs; see `docs/plan/03-method-eval.md` and `docs/plan/spec/doc1_feature_specification.md`.

### v4.8.6 — highlighter, audio controls, PDF plates, and margins

- **Added/changed:** 50% highlighter default and opacity/color-pop controls; audio skip/session actions; PDF import as a locked page background; and the page margin dialog with layout presets and page/note scope.
- **Implementation areas:** `src/js/core/render.js`, `src/js/core/tools.js`, `src/js/ui/audio-bar.js`, `src/js/ui/density-canvas.js`, `src/js/ui/pagepicker.js`, `src/js/insert.js`, `src/js/ui/pagemargin-dialog.js`, and `src/js/ui/panels.js`.
- **Approach:** highlighter style is applied at render time; skip controls alter replay position; PDF background mode creates page-backed content rather than freely movable printout objects; margins are stored per page and changed through Store operations.
- **Audit correction:** page margin values survived in metadata but the application did not draw a guide or use them as export clipping/print bounds. v4.8.8 adds on-screen margin guides and retains metadata; exports still do not enforce the margin boundary. This remains a known limitation, not a completed print-area feature.
- **Historical value changes:** skip intervals have varied across increments; the current supported list is `[5, 10, 15, 30]` seconds. Do not infer the v4.8.6 UI from the later state.

### v4.8.7 — navigation and ribbon interaction

- **Added/changed:** mouse-wheel scroll/zoom mode; arrow-key navigation; in-place plus-menu pinning; moving primary ribbon tools into the plus menu; persistent hover actions; and side-by-side context-menu placement.
- **Implementation areas:** `src/js/core/tools.js`, `src/js/app.js`, `src/js/ui/panels.js`, `src/js/ui/search-dialog.js`, `src/js/ui/toolbar.js`, and `src/js/ui/contextmenu.js`.
- **Approach:** stored wheel preference chooses primary behavior, modifier keys select alternate behavior; keyboard navigation is suppressed while typing; pin changes update the existing anchored popover; hidden ribbon tools are persisted; hover grace and measured rectangles govern menu behavior.
- **Known verification gap:** core wheel and arrow navigation have regression coverage, but the original tree did not have a separately selectable test group for every plus-menu, hover, and context-menu combination. The 4.8.8 suite adds targeted tests only for new 4.8.8 behavior; extend focused coverage for those 4.8.7 combinations as maintenance work.

### v4.8.8 — consolidated audited release

- **Added/changed:** retains all listed 4.8.2–4.8.7 capability choices; adds the separately selectable Catmull–Rom/Bézier engine, pen-opacity range control, template tag filtering (boards and templates), video export presets (720p30, 1080p30, 1080p60), on-canvas page-margin guides, all four arrowhead styles, audio metadata/URL cleanup, and app-protocol path-boundary hardening.
- **Implementation areas:** `src/js/core/ink.js`, `src/js/ui/panels.js`, `src/js/templates.js`, `src/js/export-video.js`, `src/js/core/pages.js`, `src/js/core/surface.js`, `src/js/core/connectors.js`, `src/js/core/render.js`, `src/js/insert.js`, `src/js/ui/audio-bar.js`, `src/js/platform/path-security.cjs`, and `main.js`.
- **Approach:** additive selectable modes; cache keys include active engine; new controls persist through settings; tag predicates are reused for board/template views; export presets pass explicit size/rate; page margin rectangles are a separate screen overlay; protocol paths are validated with a normalized boundary check.
- **Known limitation:** page margins are screen guides only and do not clip drawing or constrain exports. Full real-time Windows media encoding was not exercised by the focused fake-media tests.
- **Audit security note:** the protocol boundary flaw was inherited from the baseline path check. v4.8.8 fixes the sibling-prefix traversal, but symlink resolution is outside the added check's scope.

### v4.8.9 — Study Tape and answer-cover interaction patch

- **Fixed:** both freehand Study Tape and rectangular answer covers now toggle concealed/revealed on successive taps and remain on the board. Revealed outlines remain hittable, attached objects follow cover state, and dragging in Select mode continues to move the cover.
- **Added:** a dedicated Study Tape drawing tool in the main ribbon and Add/tools menus.
- **Root causes addressed:** revealed standard covers were excluded from hit testing; point-based freehand tape did not receive Store bounds; and the tape renderer referenced `bboxOfPoints` without importing it.
- **Verification:** focused feature smoke 6/6 and mandatory regression suite 1,240/1,240. The release dossier records Windows build checksums and artifact details.
- **Details:** [`releases/RELEASE-4.8.9.md`](releases/RELEASE-4.8.9.md).

## Change/removal policy

The audited v4.8.8 release intentionally preserves existing inking choices and does not remove the listed user-facing additions. Where the implementation or wording changes between releases—such as skip intervals, engine labels, or incomplete margin behavior—the version record calls it out. A behavior listed in a planned specification is not marked shipped unless it exists in the source and has evidence in a feature check or release dossier.

## Navigation

- Base application feature map: [`BASE_FEATURE_CATALOG-4.8.1.md`](BASE_FEATURE_CATALOG-4.8.1.md)
- Current product features and invariants: [`FEATURE_RECORD.md`](FEATURE_RECORD.md)
- Release ledger: [`releases/RELEASES_INDEX.md`](releases/RELEASES_INDEX.md)
- Feature/security audit: [`releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md`](releases/AUDIT-CUSTOM-FEATURES-4.8.1-to-4.8.7.md)
- AI routing: [`INDEX.md`](INDEX.md) and [`../AI_BOOTSTRAP.md`](../AI_BOOTSTRAP.md)
