# GazBoard Progressive Releases & Binary Index

For a source-checked narrative of feature changes, implementation approach, corrections, and known limitations, see [`../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md`](../FEATURE_EVOLUTION-4.8.1-to-4.8.8.md). For the original baseline only, see [`../BASE_FEATURE_CATALOG-4.8.1.md`](../BASE_FEATURE_CATALOG-4.8.1.md). Audit attribution: initial audit by **Codex 4.6 Medium in Cursor**; secondary audit and fixes by **GPT-6 Luna High using Codex**.

This document provides the ledger of progressive Windows releases, from the original base (`4.8.1`) through the current major release. Each release is paired with its Windows executable and a dedicated release dossier when the artifact is available.

---

## 1. Release Ledger & Binary Registry

| Version | Commit SHA | Portable Windows Executable | Binary Size | Release Dossier | Key Additions / Changes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v4.8.1** | `Base` | [`GazBoard-4.8.1-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.1-portable.exe) | 107,266,641 B | *Original Baseline* | Base application baseline before progressive replay & study extensions. |
| **v4.8.2** | `6f2f8d3` | [`GazBoard-4.8.2-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.2-portable.exe) | 107,242,268 B | [`RELEASE-4.8.2.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.2.md) | In-settings search, pen opacity, laser trail duration, audio session selector, video framing presets. |
| **v4.8.3** | `d8d4a20` | [`GazBoard-4.8.3-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.3-portable.exe) | 107,245,970 B | [`RELEASE-4.8.3.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.3.md) | Feedback R1 & R2, directional scribble false-positive rejection, gradient audio density HUD, Note Overview double-click jump. |
| **v4.8.4** | `e6a2caf` | [`GazBoard-4.8.4-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.4-portable.exe) | 107,251,200 B | [`RELEASE-4.8.4.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.4.md) | My boards tag filtering, ribbon pinning, standalone audio import, image crop/annotation, stitched WebM export. |
| **V 4.8.4.1** | `e6a2caf` + audit fixes | [`GazBoard-4.8.4.1-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/V-4.8.4.1/dist/GazBoard-4.8.4.1-portable.exe) | Build output | [`RELEASE-4.8.4.1.md`](RELEASE-4.8.4.1.md) | Crop undo/cancel and source bounds; isolated, cleaned video export; v4.8.5–v4.8.7 comparison recorded, not merged. |
| **v4.8.5** | `fa6b58f` | [`GazBoard-4.8.5-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.5-portable.exe) | 107,256,816 B | [`RELEASE-4.8.5.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.5.md) | Connector arrowhead styles (open, stealth, diamond), custom template creator, Catmull-Rom Bézier smoothing, zoom popover. |
| **v4.8.6** | `ffe7a4a` | [`GazBoard-4.8.6-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.6-portable.exe) | 107,263,747 B | [`RELEASE-4.8.6.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.6.md) | Calibrated 50% highlighter opacity, configurable audio skip (5s–30s), recording 3-dot menu, PDF background mode, page margins dialog. |
| **v4.8.7** | `7549a64` feature code; `84817ac` release/docs record | [`GazBoard-4.8.7-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.7-portable.exe) | 107,267,071 B | [`RELEASE-4.8.7.md`](file:///C:/Users/kazir/Documents/OpenCode/GazBoard/docs/releases/RELEASE-4.8.7.md) | Mouse wheel scroll/zoom dual-mode, 4-way arrow navigation, plus-menu hot-pinning, full ribbon tool mobility, persistent hover bar, side-by-side context menu. |
| **v4.8.8** | `e00b93f` (`v4.8.8` local tag) | [`GazBoard-4.8.8-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/V-4.8.8/dist/GazBoard-4.8.8-portable.exe) | 107,270,761 B | [`RELEASE-4.8.8.md`](RELEASE-4.8.8.md) | Consolidated 4.8.2–4.8.7 features; added selectable Catmull–Rom/Bézier engine, template tag filtering, pen opacity range, video presets, margin guides, arrowhead styles, audio and protocol-path hardening. |
| **v4.8.9** | `v4.8.9` local tag (push pending authentication) | [`GazBoard-4.8.9-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.9-portable.exe) | 107,270,755 B | [`RELEASE-4.8.9.md`](RELEASE-4.8.9.md) | Video-driven Study Tape and answer-cover toggling, hit-testing/bounds/render fixes, and dedicated ribbon/Add-menu tool entries. |
| **v4.8.10** | Local tag `v4.8.10` | [`GazBoard-4.8.10-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/V-4.8.10/dist/GazBoard-4.8.10-portable.exe) | 107,275,427 B | [`RELEASE-4.8.10.md`](RELEASE-4.8.10.md) | Optional live replay camera follow; fixed recording/whole-board or follow-strokes video framing, including stitched exports. |
| **v4.8.11** | Local tag `v4.8.11` + replay wiring follow-up | [`GazBoard-4.8.11-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/V-4.8.11/dist/GazBoard-4.8.11-portable.exe) | 107,277,884 B | [`RELEASE-4.8.11.md`](RELEASE-4.8.11.md) | Replay seek-state reliability, visible live highlighter outlines and live Surface-to-ReplayEngine wiring, working recording rename, adaptive recording menu placement, camera center/dead-zone modes, unique video export filenames. |
| **v4.8.21** | Local tag `v4.8.21` | [`GazBoard-v4.8.21-Portable.exe`](../../dist/GazBoard-v4.8.21-Portable.exe) | 106,252,560 B | [`RELEASE-4.8.21.md`](RELEASE-4.8.21.md) | Electron IPC sender and navigation guards, validated external URLs, safe bookmark labels with Escape-to-cancel, Obsidian YAML block-list metadata, locale completeness. |
| **v5.0.0** | Local tag `v5.0.0` | [`GazBoard-v5.0.0-Portable.exe`](../../dist-v5.0.0/GazBoard-v5.0.0-Portable.exe) | 106,255,198 B | [`RELEASE-5.0.0.md`](RELEASE-5.0.0.md) | Feature audit; replay display modes across live/export; track-index caching; calmer center camera; sample-rate-stable scratch classification; pointer focus cleanup. |
| **v5.1.0** | Local tag `v5.1.0` | [`GazBoard-v5.1.0-Portable.exe`](../../dist-v5.1.0/GazBoard-v5.1.0-Portable.exe) | 106,259,823 B | [`RELEASE-5.1.0.md`](RELEASE-5.1.0.md) | Linked screenshot excerpts; split-pane paste/drop; board heading and block links; additional Obsidian Markdown conveniences. |
| **v5.2.0** | Local tag `v5.2.0` | [`GazBoard-v5.2.0-Portable.exe`](../../dist-v5.2.0/GazBoard-v5.2.0-Portable.exe) | 106,265,899 B | [`RELEASE-5.2.0.md`](RELEASE-5.2.0.md) | Full audit verification; toolbar `.menu-item` compatibility & card click delegation; plain text vs Markdown card disambiguation; PWA precache sync. |
| **v5.3.0** | Local tag `v5.3.0` | [`GazBoard-v5.3.0-Portable.exe`](../../releases/GazBoard-v5.3.0-Portable.exe) | 106,267,461 B | [`RELEASE-5.3.0.md`](RELEASE-5.3.0.md) | Deep post-4.8.1 audit (12 root-cause bugs fixed); 6.4x replay path cache speedup; 5 toggleable lateral features (`holdToShape`, `replaySkipSilence`, `tapStrokeToSeek`, `splitSyncScroll`, `autoDimBarsWhileInking`). |
| **v5.4.0** | `feat/cumulative-fixes` | [`GazBoard-v5.4.0-Portable.exe`](../../releases/GazBoard-v5.4.0-Portable.exe) | 106,627,966 B | [`RELEASE-5.4.0.md`](RELEASE-5.4.0.md) | Phase 1 Upstream Sync (`4.8.2..4.9.4`); guarded pencil tool & audio engine; pane-isolated mouse wheel page scrolling; `_slideFrozen` canvas blitting; 100% i18n parity; conscious exclusion of `Shift Straight Line`. |
| **v5.5.0** | `feat/cumulative-fixes` | [`GazBoard-v5.5.0-Portable.exe`](../../releases/GazBoard-v5.5.0-Portable.exe) | 106,637,679 B | [`RELEASE-5.5.0.md`](RELEASE-5.5.0.md) | Phase 2 Step 1: Chrome-style Multi-Tab Bar (`TabBar`) with sub-5ms LRU session cache; centralized `C:\Users\kazir\Documents\Antigravity\CommonLibraries\` runtime library repository; in-app Library Inspector modal; 100% i18n parity across 7 locales. |
| **v5.6.0** | `feat/cumulative-fixes` | [`GazBoard-v5.6.0-Portable.exe`](../../releases/GazBoard-v5.6.0-Portable.exe) | 106,648,811 B | [`RELEASE-5.6.0.md`](RELEASE-5.6.0.md) | Phase 2 Step 2: Multi-Window Browsing with smart focus-driven lease locking (Active Editor vs Read-Only Reference Mode), real-time cross-window board synchronization, TabBar context menu (Open in new window, Close other tabs, Duplicate tab), and <kbd>Ctrl+Shift+N</kbd> hotkey. |
| **v5.7.0** | `feat/cumulative-fixes` | [`GazBoard-v5.7.0-Portable.exe`](../../releases/GazBoard-v5.7.0-Portable.exe) | 107,452,880 B | [`RELEASE-5.7.0.md`](RELEASE-5.7.0.md) | Phase 3: Interactive UI Visualization & Diagramming Studio with offline Mermaid.js and Chart.js, visual Decision Tree / Mind Map / Radar builders, live side-by-side preview, real-time syntax validation, 1-click AI prompt assistant, and canvas diagram card integration. |
| **v5.8.0** | `feat/cumulative-fixes` | [`GazBoard-v5.8.0-Portable.exe`](../../releases/GazBoard-v5.8.0-Portable.exe) | 108,158,531 B | [`RELEASE-5.8.0.md`](RELEASE-5.8.0.md) | Phase 4: SymPy/MATLAB/Wolfram Alpha Scientific Math Studio, interactive matrix dimension builder, offline arithmetic/symbolic evaluator, offline image & PDF compression dialog, in-app video & YouTube player with full-res native frame capture & clickable timestamp bookmark stamps, 2-page book spread reading view, and Turnout gutter (+160px). |
| **v5.9.0** | `feat/cumulative-fixes` | [`GazBoard-v5.9.0-Portable.exe`](../../releases/GazBoard-v5.9.0-Portable.exe) | 108,168,272 B | [`RELEASE-5.9.0.md`](RELEASE-5.9.0.md) | Phase 5: JSON Canvas 1.0 (`.canvas`) bidirectional import/export, interactive Knowledge Graph View modal (`GraphViewModal`), Obsidian Markdown sidecar exporter with YAML frontmatter, LiquidText-style elastic tether connectors, and Document Navigator & TOC Sidebar (`PdfSidebarDrawer`). |

---

## 2. Regression Isolation & Rollback Guide for AI and Testers

If an issue is observed during testing, follow this progressive bisect checklist:

1. **Ink or Drawing Rendering Anomaly**:
   - Check if the issue occurs in `v4.8.5` (Bézier smoothing intro) or `v4.8.2` (Pen opacity intro).
   - If present in `v4.8.5` but not `v4.8.4`, inspect `src/js/core/ink.js`.
   - Rollback binary: [`GazBoard-4.8.4-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.4-portable.exe).

2. **Audio Timeline or Replay Synchronization Anomaly**:
   - Check if present in `v4.8.3` (Density HUD), `v4.8.4` (External import), or `v4.8.6` (Audio skip step).
   - Rollback binary: Test the preceding minor version binary directly from `dist/`.

3. **Toolbar, Ribbon, or Navigation Anomaly**:
   - Check `v4.8.7` (Mouse wheel / arrows / persistent hover bar / plus-menu pinning).
   - Rollback binary: [`GazBoard-4.8.6-portable.exe`](file:///C:/Users/kazir/Documents/Antigravity/GazBoard/dist/GazBoard-4.8.6-portable.exe).

---

## 3. Storage Locations
- **Durable release archive**: `C:\Users\kazir\Documents\Codex\GazBoard\`
- **Current v5.1.0 archive snapshot**: `C:\Users\kazir\Documents\Codex\GazBoard\v5.1.0\`
- **Working Repository Source**: `C:\Users\kazir\Documents\OpenCode\GazBoard\`
- Older Antigravity locations referenced in historical release rows record where prior artifacts were stored; they are not destinations for new releases.
- **Archive rule**: copy source/docs/build artifacts only after the working release passes its required verification. For documentation-only handover updates, copy the updated documentation paths into the current archive without replacing its binaries.
