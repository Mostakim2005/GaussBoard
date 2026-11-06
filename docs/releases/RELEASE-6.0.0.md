# Release Dossier — GazBoard v6.0.0

> **Release Version**: `v6.0.0`  
> **Date**: October 23, 2026  
> **Git Commit Target**: `release: GazBoard v6.0.0 comprehensive architectural audit & hardened milestone`  
> **Binary Deliverable**: `GazBoard-v6.0.0-Portable.exe` (108,169,116 bytes / 103.16 MiB)  
> **Parent Documentation**: [`RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`../INDEX.md`](../INDEX.md) | [`../AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)  
> **Invariant Compliance**: Strict adherence across all 6 Golden Invariants (100% i18n parity, 1,240 smoke checks passed, custom test suite passed, 0 native C++ dependencies).

---

## 1. Executive Summary & Architectural Milestone

Release **`v6.0.0`** is a major architectural milestone delivering a comprehensive audit, stabilization, and hardening of all features introduced from **`v5.3.0` through `v5.9.0`**. 

Led by a 20-year Principal Architect audit framework, this release systematically eliminates memory leaks, uncollected window event listeners, background media audio leaks, and math evaluation sandbox vulnerabilities, while establishing a balanced configuration surface and cohesive Fluent / Material 3 glassmorphic styling across all modals, drawers, and buttons.

---

## 2. Comprehensive Architectural Audit & Hardening Matrix

| Subsystem / Feature | Defect / Vulnerability Identified | Architectural Hardening & Resolution | Status |
| :--- | :--- | :--- | :--- |
| **Knowledge Graph View** (`graph-view.js`) | Window event listeners (`mousemove`, `mouseup`, `keydown`) registered anonymously on every modal open, leaking memory on close. | Refactored into stored handlers (`this._onMouseMove`, `this._onMouseUp`, `this._onKeyDown`) explicitly detached in `close()`. | **Resolved & Audited** |
| **Diagram Studio** (`visualization-dialog.js`) | Escape key listener checked nonexistent `this.active` property; lingering `{ once: true }` listener attached to window. | Bound `this._onKeyDown` with explicit detachment in `close()`; destroyed pending debounce timers on teardown. | **Resolved & Audited** |
| **Video & Media Player** (`video-dialog.js`) | Background audio continued playing if modal was closed while a video or YouTube embed was streaming. | Added explicit `videoEl.pause()`, source release (`videoEl.src = ''`), and YouTube `iframe.src = 'about:blank'` on teardown. | **Resolved & Audited** |
| **Document Navigator** (`pdf-sidebar.js`) | Drawer DOM lacked keyboard Escape dismissal and listener lifecycle detachment. | Added bound Escape key listener with guaranteed detachment in `close()`. | **Resolved & Audited** |
| **Scientific Math Evaluator** (`scientific-math.js`) | Safe arithmetic quick evaluator lacked length limits and guard against chained exponentiation (`**`). | Implemented strict 256-character string length cap, chained power loops rejection (`/\*{2,}.*\*{2,}.*\*{2,}/`), and character allowlist verification. | **Resolved & Audited** |
| **Multi-Window Lease System** (`app.js`) | Window mode badge in bottom corner lacked user configuration toggle. | Added `showWindowModeBadge` toggle in Settings under Canvas with immediate DOM visibility update. | **Resolved & Audited** |
| **Diagram Defaults** (`visualization-dialog.js`, `panels.js`) | Card styling defaulted to white card without configurable preference. | Added `diagramCardStyle` setting (`white` vs `transparent`) with 100% i18n parity. | **Resolved & Audited** |

---

## 3. Settings & UI Ergonomics Balance

Rather than hardcoding behaviors or introducing excessive toggles, `v6.0.0` establishes an intentional balance:
* **Core Invariants (Non-Toggleable)**:
  - Finite audio duration metadata fallback.
  - Timestamp preservation on handwritten stroke points (`p.t`).
  - Active audio replay scene partitioning.
  - Zero external C++ native dependencies (`node-gyp`).
* **Ergonomic Preferences (Toggleable in Settings)**:
  - `showTabBar`: Toggle Chrome-style tab strip.
  - `showWindowModeBadge`: Toggle corner active-editor / read-only badge when multiple windows are open.
  - `diagramCardStyle`: Default background for diagrams and charts (`White Card` vs `Transparent`).
  - `autoExportMarkdownSidecar`: Companion `.md` note creation on board save.
  - `graphPhysics`: Force-directed physics animation in Knowledge Graph View.
  - `showExcerptTethers`: Dynamic elastic tether lines from excerpt cards to board coordinates.
  - `scratchOut` & `scratchTargets`: Fine-grained gesture scratch-out eraser target filters.
  - `enableHoverToolbar`: Contextual hovering action bar.

---

## 4. Verification & Test Ledger

| Test Suite | Command | Result | Verification Notes |
| :--- | :--- | :--- | :--- |
| **Base Regression Suite** | `node scripts/smoke.js` | **1,240 passed, 0 failed** | Complete suite passing across all canvas, inking, storage, link, and timer checks. |
| **Custom Subsystem Suite** | `node scripts/smoke-custom.js` | **All suites passed** | Custom feature tests, Markdown extensions, excerpts, replay, diagrams, math, video, and Phase 5 Obsidian/Canvas interoperability. |
| **Strict 100% i18n Parity** | `node scripts/i18n-check.js` | **1,790/1,790 translated** | 100% parity across all 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`) with 0 missing and 0 errors. |
| **Standalone Portable Build** | `npx electron-builder --win portable` | **Packaged successfully** | Generated self-contained zero-install executable in `releases/`. |

---

## 5. Artifact & Deliverable Matrix

* **Portable Executable**: `GazBoard-v6.0.0-Portable.exe`
* **Master Architecture Index**: [`docs/INDEX.md`](../INDEX.md)
* **Bootstrap Specifications**: [`AI_BOOTSTRAP.md`](../../AI_BOOTSTRAP.md)
* **Releases Ledger**: [`docs/releases/RELEASES_INDEX.md`](RELEASES_INDEX.md)
* **Developer Handover**: [`docs/DEVELOPER_HANDOVER.md`](../DEVELOPER_HANDOVER.md)
