# GazBoard Replay — Release Dossier v5.5.0

> **Release Version**: `v5.5.0`  
> **Milestone**: Phase 2 Step 1 — Chrome-Style Multi-Tab Bar & Central Shared CommonLibraries Repository  
> **Parent Documentation**: [`docs/INDEX.md`](../INDEX.md) | [`docs/releases/RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`docs/plan/06-roadmap-phases-2-to-5.md`](../plan/06-roadmap-phases-2-to-5.md)  
> **Date**: October 2026  
> **Verification Status**: ✅ 1,240/1,240 smoke tests passed | ✅ 100% i18n parity (1,587/1,587 keys across all 7 locales) | ✅ All custom tests passed

---

## 1. Executive Summary

GazBoard Replay **v5.5.0** delivers the first major milestone of Phase 2 from the architectural roadmap:
1. **Chrome-Style Multi-Tab Bar (`TabBar`)**:
   - Sleek, interactive top tab bar mounted above the canvas allowing users to keep multiple whiteboard sessions open and switch between them seamlessly.
   - **In-Memory LRU Session Cache**: Caches up to 8 recent board sessions in RAM (`docSnapshot`, `undoStack`, `redoStack`, `camera`), providing sub-5ms instantaneous board switching without disk reads or lost undo/redo history.
   - **Complete Keyboard & Navigation Shortcuts**:
     - `Ctrl+T`: Create and switch to a fresh new board tab.
     - `Ctrl+W`: Save and close the active tab (gracefully falling back to adjacent tabs or a new blank tab).
     - `Ctrl+Tab` / `Ctrl+Shift+Tab`: Cycle forward and backward through open tabs.
     - `Ctrl+1` through `Ctrl+9`: Direct jump to tab index 1–9.
   - **Real-Time Dynamic Synchronization**: Renaming boards via the title input immediately updates the tab label; opening boards from "My boards" gallery or external files integrates cleanly into existing or new tabs.
   - **Customizable Visibility**: Toggleable in Settings under Appearance (`showTabBar: true` by default).

2. **Central Shared CommonLibraries Repository on `C:\`**:
   - Established the permanent shared offline libraries repository at:  
     `C:\Users\kazir\Documents\Antigravity\CommonLibraries\`  
     (registered as Topic 3 in `C:\Users\kazir\Documents\Antigravity\TOPIC_CATALOG.md` per Antigravity Operating Rules).
   - Bundled and verified offline engines for current and upcoming phases:
     - **KaTeX** (`v0.16.21`): Fast mathematical formula typesetting and equations.
     - **PDF.js** (`v4.10.38`): Mozilla PDF parser and text-layer renderer.
     - **JSZip** (`v3.10.1`): ZIP archive container packaging for `.gazboard` bundles.
     - **Mammoth** (`v1.8.0`): Word `.docx` to HTML converter.
     - **Mermaid.js** (`v10.9.1`): Flowcharts, sequence diagrams, mind maps, and decision trees.
     - **Chart.js** (`v4.4.7`): HTML5 Canvas spider/radar, bar, line, and doughnut charts.
     - **pdf-lib** (`v1.17.1`): Pure JS PDF metadata editing and vector annotation embedding.
   - Central manifest [`libraries.json`](file:///C:/Users/kazir/Documents/Antigravity/CommonLibraries/libraries.json) and documentation [`README.md`](file:///C:/Users/kazir/Documents/Antigravity/CommonLibraries/README.md).

3. **In-App Library Inspector Modal (`src/js/ui/library-inspector.js`)**:
   - Interactive dialog accessible from Settings and the About window.
   - Displays real-time status (`Ready` / `Available`), version badges, category descriptions, and exact on-disk paths for all registered runtime libraries.
   - One-click button to open the shared directory in Windows Explorer (`shell:openCommonLibraries`).

4. **Preservation of the 6 Golden Invariants**:
   - Zero native `node-gyp` C++ dependencies.
   - Stroke point timestamp preservation (`p.t`) intact.
   - Finite audio duration safeguard maintained.
   - Scene partitioning during audio replay preserved.
   - 100% internationalization parity across all 7 translation locales.
   - Study tape and answer cover toggling intact.

---

## 2. File Modification & Implementation Ledger

| Component | File Path | Type | Role & Changes |
| :--- | :--- | :--- | :--- |
| **Multi-Tab Manager** | `src/js/ui/tabs.js` | JavaScript (ES6) | `TabBar` class managing tab strip DOM, LRU in-memory session cache, tab creation, instant tab switching, title synchronization, and close actions. |
| **Library Inspector** | `src/js/ui/library-inspector.js` | JavaScript (ES6) | Modal component displaying loaded libraries, versions, categories, and shared disk locations with Explorer launcher. |
| **App Integration** | `src/js/app.js` | JavaScript (ES6) | Imported and wired `TabBar`, added default setting `showTabBar: true`, hooked `loadBoard`, `newBoard`, `deleteBoard`, `command` handlers, and `Ctrl+T`/`Ctrl+W`/`Ctrl+Tab` shortcuts. |
| **User Settings UI** | `src/js/ui/panels.js` | JavaScript (ES6) | Added "Show tab bar" switch in Appearance section and "Inspect Runtime Libraries…" button in Settings and About. |
| **IPC Infrastructure** | `main.js`<br>`preload.js` | JavaScript (Node/Electron) | Added secure IPC handlers `shell:openCommonLibraries` and `libraries:manifest` with disk file validation. |
| **Styling & Themes** | `src/css/app.css` | CSS3 | Styles for `.gb-tab-bar`, `.gb-tab-item`, active states, scrollable tab strip, and `.lib-inspector-dialog` modal. |
| **Shared Libraries** | `C:\Users\kazir\Documents\Antigravity\CommonLibraries\` | Assets & Manifests | Central offline runtime repository containing KaTeX, PDF.js, JSZip, Mammoth, Mermaid, Chart.js, pdf-lib, and `libraries.json`. |
| **Local Manifest** | `src/vendor/libraries.json` | JSON | Vendored library manifest for offline standalone runtime discovery. |
| **Topic Catalog** | `C:\Users\kazir\Documents\Antigravity\TOPIC_CATALOG.md` | Markdown | Registered Topic 3 `CommonLibraries` with complete inventory chart per Antigravity Operating Rules. |
| **i18n Dictionaries** | `src/locales/*.json` (7 files) | JSON | Added translations for 30 new UI strings across `ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`. |
| **Automated Tests** | `test/tabs-and-libraries.test.mjs`<br>`scripts/smoke-custom.js` | Node test runner | Unit and integration checks for TabBar lifecycle, LRU cache restoration, and shared library manifest verification. |

---

## 3. Verification & Quality Gates

```powershell
# 1. Full regression smoke test suite
node scripts/smoke.js
# Result: 1240 passed, 0 failed

# 2. Strict 100% translation parity check across all 7 locales
node scripts/i18n-check.js
# Result: 1587 / 1587 translated, 0 left over, 0 problems across all 7 locales

# 3. Custom feature & multi-tab integration test suite
npm run smoke:custom
# Result: 30 custom features, 15 markdown, 4 excerpt, 14 replay, 3 video, 2 path security, 3 tabs & libraries, 9 audit 4.8.4.1, 8 custom 4.8.8, 3 replay 5.0.0, 5 split/excerpt 5.1.0 — 100% passed
```

---

## 4. Binary Release Package

- **Filename**: `GazBoard-v5.5.0-Portable.exe`
- **Location**: [`releases/GazBoard-v5.5.0-Portable.exe`](../../releases/GazBoard-v5.5.0-Portable.exe)
- **Size**: 106,637,679 bytes (~106.6 MB)
- **Format**: Zero-install standalone portable Windows executable
- **Packaging Protocol**: Follows Antigravity Rule 5 (Portable by default, version-stamped filename)

