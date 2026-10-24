# Release Dossier — GazBoard v6.9.1

> **Release Version**: `v6.9.1`  
> **Date**: October 24, 2026  
> **Git Commit Target**: `feat(core): Comprehensive Offline Libraries & UI/UX Discovery Entry Points Audit (v6.9.1)`  
> **Binary Deliverable**: [`releases/GazBoard-v6.9.1-Portable.exe`](../../releases/GazBoard-v6.9.1-Portable.exe) (`113,130,063 bytes` / `107.89 MiB`)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity across 7 locales with 2,238 strings, 0 native C++ dependencies, preserved `p.t` stroke timestamps, finite audio safeguard, scene partitioning during audio replay, Study Tape toggle persistence).

---

## 1. Executive Summary & Version 6.9.1 Scope

Release **`v6.9.1` (Comprehensive Offline Libraries & UI/UX Discovery Entry Points Audit)** performs an end-to-end verification and UX gap closure across all features implemented in GazBoard. It addresses two critical operational areas:

### 1. Offline Libraries, Third-Party Packages & Asset Integrity
- **15 Vendored Offline Packages Verified**: All required third-party libraries and binary assets are confirmed locally vendored under `src/vendor/` and documented in `src/vendor/libraries.json` as well as the external Antigravity archive (`C:\Users\kazir\Documents\Antigravity\CommonLibraries\`):
  1. `katex` (v0.16.21 + complete 20 woff2 font files + CSS)
  2. `pdfjs` (v4.10.38 + worker + sandbox + binary cmaps + standard fonts)
  3. `pdfjs-viewer` (v4.10.38 + viewer CSS)
  4. `pdf-lib` (v1.17.1)
  5. `fontkit` (v1.1.1)
  6. `tesseract` (v5.1.1 + SIMD WASM binary + worker + English trained data)
  7. `jszip` (v3.10.1)
  8. `mammoth` (v1.8.0)
  9. `mermaid` (v10.9.1)
  10. `chartjs` (v4.4.7)
  11. `3dmol` (v2.0.4)
  12. `nerdamer` (v1.1.13 + Algebra, Calculus, Solve modules)
  13. `function-plot` (v1.24.0)
  14. `mathjs` (v12.4.1)
  15. `mp4-muxer` (v5.2.2)
- **JSON Syntax Normalization**: Resolved character escape syntax in `src/vendor/libraries.json` and mirrored in the shared Antigravity repository.
- **Zero External Network / CDN Leaks**: Source code audit of 144 files in `src/` confirms 0 external CDN calls (`cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `googleapis.com`).
- **Comprehensive PWA Precache**: Updated `src/sw.js` with all 15 vendored packages, workers, and modern modules to ensure 100% offline autonomy.

---

### 2. UI / UX & Discovery Entry Point Enhancements
- **Main "+" (Add / Insert) Menu (`src/js/ui/toolbar.js`)**:
  - Added dedicated **"STEM & Advanced Tools"** section with direct entries:
    - *Circuit Simulation Workbench…* (<kbd>Ctrl+Shift+E</kbd>)
    - *2D Function Grapher & Calculus…* (<kbd>Ctrl+Shift+G</kbd>)
    - *3D Molecular Structure Viewer…* (<kbd>Ctrl+Shift+M</kbd>)
    - *2D Chemical Sketcher & SMILES…* (<kbd>Ctrl+Shift+K</kbd>)
    - *Interactive Periodic Table…*
    - *PhET Simulation Lab…*
    - *Academic Dictionary & Thesaurus…* (<kbd>Ctrl+Shift+D</kbd>)
    - *Study Session & FSRS Review…* (<kbd>Ctrl+Shift+R</kbd>)
    - *Insert Kanban Board* (interactive 3-column sprint board)
    - *Run Dataview Query Table* (Obsidian-style query card)
  - Registered full pinning support (`getPinMetadata`) allowing users to pin any of these tools directly to the bottom toolbar with 1 click.
- **OmniSearch Command Palette (<kbd>Ctrl+K</kbd> / <kbd>Ctrl+F</kbd>) (`src/js/ui/search-dialog.js`)**:
  - Added new **"Tools & Commands"** live search section. Users can type any tool keyword (e.g. `circuit`, `graph`, `molecule`, `periodic`, `dictionary`, `phet`, `study`, `kanban`, `dataview`, `video`) to get instant 1-click execution or press <kbd>Enter</kbd> to launch.
- **Main Export Menu (`openExportPopover`)**:
  - Added direct option for **Export Video / Audio Replay (.mp4, .webm)…** triggering client-side WebCodecs / MP4 muxing.
- **More ("…") Menu (`openMorePopover`)**:
  - Added direct option for **Runtime Libraries & Dependencies…** to inspect all 15 offline engines, versions, and paths.
- **Canvas Context Menu (`src/js/ui/contextmenu.js`)**:
  - Right-clicking empty space now provides quick access to *Engineering Ribbon* (<kbd>Ctrl+B</kbd>), *Circuit Workbench…* (<kbd>Ctrl+Shift+E</kbd>), *Function Grapher…* (<kbd>Ctrl+Shift+G</kbd>), *Knowledge Graph…* (<kbd>Alt+G</kbd>), and *Document Navigator & TOC…* (<kbd>Alt+T</kbd>).
- **Keyboard Shortcuts Dialog (<kbd>F1</kbd>) (`src/js/app.js`)**:
  - Added a dedicated **Engineering & STEM Workstation** category detailing all modern shortcuts.

---

## 2. Invariant & Verification Audit

| Requirement | Target | Achieved Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **New Features Smoke Test Suite** | 100% Pass Rate | **24 Passed, 0 Failed** | `node scripts/smoke.js --new-features` |
| **Strict Translation Parity** | 100% across all 7 locales | **2,238 / 2,238 keys (100%)** | `node scripts/i18n-check.js` |
| **Zero Native Addons** | Pure JS / Portable | **0 C++ Native Modules** | Audit check (`package.json`) |
| **Content Security Policy** | No `eval` / `new Function` | **Safe Regex & Query Parsing** | Content-Security-Policy compliance |
| **Stroke Timestamp Preservation** | Preserve `p.t` | **Verified** | `Store.add` / `tools.js` invariants |
| **Study Tape Persistence** | Preserved occlusion state | **Verified** | Toggle & visibility invariants |
| **Binary Deliverable** | Versioned Portable Binary | **GazBoard-v6.9.1-Portable.exe** | `releases/` directory |

---

## 3. Deliverable Matrix

| Deliverable | Path | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Portable Executable** | `releases/GazBoard-v6.9.1-Portable.exe` | Binary | Self-contained, zero-install portable Windows executable |
| **Topic Mirror Binary** | `C:\Users\kazir\Documents\Antigravity\GazBoard\dist\GazBoard-v6.9.1-Portable.exe` | Binary | Permanent topic deliverable |
| **Offline Libraries Catalog** | `src/vendor/libraries.json` | Catalog | Full offline inventory of 15 third-party packages |
| **Release Dossier** | `docs/releases/RELEASE-6.9.1.md` | Documentation | Progressive documentation record |
| **Master Index** | `docs/INDEX.md` | Documentation | Updated table of contents |
| **Developer Handover** | `docs/DEVELOPER_HANDOVER.md` | Documentation | Architectural state and release stamp |
