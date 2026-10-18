# Custom Feature Audit: v4.8.1 to v4.8.7

**Status:** Source audit, follow-up implementation, and separate feature checks completed for the consolidated v4.8.8 working tree.  
**Scope:** Cumulative product changes recorded from the v4.8.1 baseline through the v4.8.7 feature commit. Translation quality was not audited as a separate task.

**Audit attribution:** Initial audit by **Codex 4.6 Medium in Cursor**; secondary audit and fixes by **GPT-6 Luna High using Codex**, as reported by the project owner.

**Current-status note:** This report's inventory table describes the audited v4.8.7 tree. The follow-up consolidated release is v4.8.8. Read [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md) and [`RELEASE-4.8.8.md`](RELEASE-4.8.8.md) for source-checked changes and current known limits; do not interpret “present in v4.8.7” as current v4.8.8 status.

## Version Evidence and Scope Notes

The repository has Git tags for v4.8.0 and v4.8.1 only. The v4.8.2–v4.8.7 boundaries are documented release commits, not version tags. The v4.8.7 product code is at `7549a64`; `84817ac` adds documentation and hardening records after it. `package.json` still reports `4.8.1`, so About/build metadata do not identify this checkout as v4.8.7. This audit treats the confirmed release history and records as the intended target.

The release dossiers are not a fully reliable specification on their own. Some labels differ from the implementation or claim behavior not supported by the files. The inventory below was checked against code and the current smoke suite, and flags known mismatches.

## Feature Inventory

| Feature or fix | Introduced | Present in current v4.8.7 tree | Automated coverage | Notes |
|---|---:|---|---|---|
| Settings search; pen opacity; laser duration; multi-session audio; bookmarks; video framing; stylus drag threshold | 4.8.2 | Yes | Full smoke; the custom suite separately checks pressure rendering and audio skip, not every setting/UI path | Bookmark keyboard/timeline navigation and export framing should have dedicated focused checks. |
| Gesture false-positive rejection; gradient audio density; Notes Overview navigation; object properties; search keyboard behavior; audio/replay/split feedback fixes | 4.8.3 | Yes | Full smoke covers scratch detection, replay, and split infrastructure; custom suite checks slow scratch recognition | Density rendering, direct overview jump, and properties fields lack dedicated feature-only checks. |
| Board tag filtering; ribbon pinning foundation; external audio import; non-destructive crop/annotation; stitched WebM export | 4.8.4 | Yes, with crop/export fixes added in 4.8.4.1 | Full smoke plus 9 focused Electron checks for crop and exporter; custom unit checks crop bounds | External audio import and full encoded WebM output are not validated by the focused fake-media tests. |
| Connector geometry/arrowheads; custom templates; selectable ink engines; zoom presets | 4.8.5 | Yes, with documentation mismatch | Full smoke has extensive connector behavior and template application checks; custom suite checks route geometry, ink engines, and camera fit | The dossier says Raw/Chaikin/Catmull-Rom; source exposes `default`, `windowsInk`, and `perfectFreehand`. Custom template create/delete and zoom-popover interaction need focused checks. |
| Highlighter opacity/color-pop; audio skip intervals and session actions; PDF background import; page margins | 4.8.6 | Partial | Full smoke covers PDF/page workflows; custom suite checks 5/10/15/30-second skip cycling and margin scope/undo | Page margin metadata was discarded by `cleanPage`; fixed in this audit. Margin metadata is not consumed by board rendering or PDF layout, so the visual/printable margin behavior remains partial. |
| Wheel modes; arrow-key navigation; plus-menu hot-pinning; ribbon mobility; persistent hover actions; side-by-side context menu | 4.8.7 | Yes | Full smoke includes arrow/page navigation; custom suite checks zoom fitting | Full smoke lacks a separately runnable, version-scoped suite for pinning, hover persistence, context-menu placement, and wheel mode combinations. |
| Crop undo/cancel/bounds and isolated video-export lifecycle fixes | 4.8.4.1 follow-up | Yes | `npm run smoke:features:4.8.4.1` (9 checks), also included in `npm run smoke:custom` | Media encoding is mocked; the suite verifies replay-clock isolation, timeout handling, and cleanup behavior, not actual Windows MediaRecorder output. |
| Consolidated fixes and custom additions (ink engine, pen opacity range, template tags, video presets, margin guides, connector head styles, imported-audio cleanup, protocol path security) | 4.8.8 | Yes, with the margin export limitation documented | `npm run smoke:custom` (13 Node feature + 2 security + 9 + 3 Electron checks); mandatory suite 1,240/1,240 | Existing ink choices are retained and Catmull–Rom/Bézier is additive. Page-margin guides are visual only and do not constrain exports. |

## Changes Made During This Audit

1. `preparePoints()` smoothing now copies each source point's metadata while replacing its smoothed coordinates. This preserves `p.t`, pressure, and other point fields.
2. `cleanPage()` now retains validated per-page margins and background color through store operations and saves.
3. Page-margin application now commits its document background-color change in the same undo transaction as the page changes.
4. Added `npm run smoke:custom`, which runs the new custom-feature Node tests and the focused 4.8.4.1 Electron tests separately from the mandatory base regression suite.

## Security and Bug Findings

| ID | Severity | Status | Location | Finding and suggested fix |
|---|---|---|---|---|
| AUD-01 | P2 | Fixed | `src/js/core/ink.js`, `smoothPath()` | Intermediate smoothed points kept coordinates and pressure but dropped timestamp `t` and other metadata. Preserve the original point fields while replacing x/y; a regression test now asserts timestamps and metadata survive. |
| AUD-02 | P2 | Fixed | `src/js/core/pages.js`, `cleanPage()`; `src/js/ui/pagemargin-dialog.js`, `apply()` | Page data was reduced to width, height, and date, so margin/background fields were lost on commit/save. The dialog also directly mutated document background outside the undo log. Validated fields are now retained and both changes share one transaction. |
| AUD-03 | P2 | Fixed in 4.8.8 | `main.js`, `src/js/platform/path-security.cjs` | Replaced vulnerable string-prefix path validation with a normalized path-boundary check and malformed URL handling. Node tests cover sibling-prefix and traversal cases. Symlink resolution is not part of this check. |
| AUD-04 | P2 | Fixed in 4.8.8 | `package.json:4`, `package-lock.json` | Package metadata now identifies the consolidated release as 4.8.8 before packaging. |
| AUD-05 | P2 | Partial, documented | `src/js/ui/pagemargin-dialog.js`, `src/js/core/surface.js`, `src/js/core/pages.js` | Margins persist and are drawn as dashed screen guides. They are not enforced as a clipping area or consumed by PDF/image/video export. The 4.8.8 dossier describes this limitation explicitly. |

## Test Instructions and Results

Run the dedicated custom-feature suite:

```powershell
npm run smoke:custom
```

It runs the Node-level custom checks (scratch-out, timestamp-preserving ink smoothing, pressure behavior, connector routes, crop bounds, zoom fit, page-margin persistence/scope/undo, audio skip intervals, and subtitle parsing) followed by the focused 4.8.4.1 Electron exporter/crop checks.

Run the mandatory full regression suite separately:

```powershell
node scripts/smoke.js
```

Run the focused v4.8.8 browser/UI checks separately with `npm run smoke:features:4.8.8`.

Results before the 4.8.8 consolidation were:

- Custom Node checks: 9 passed, 0 failed.
- Focused 4.8.4.1 Electron checks: 9 passed, 0 failed.
- Mandatory full smoke: 1,240 passed, 0 failed after the source fixes.
- Standalone `scripts/i18n-check.js` was not run, at the user's request.

The consolidated v4.8.8 checks and current verification results are recorded in `RELEASE-4.8.8.md`.

