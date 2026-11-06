# GazBoard Replay — Release Dossier v5.6.0

> **Release Version**: `v5.6.0`  
> **Milestone**: Phase 2 Step 2 — Multi-Window Support, Smart Focus-Driven Lease Locking & Cross-Window Synchronization  
> **Parent Documentation**: [`docs/INDEX.md`](../INDEX.md) | [`docs/releases/RELEASES_INDEX.md`](RELEASES_INDEX.md) | [`docs/plan/06-roadmap-phases-2-to-5.md`](../plan/06-roadmap-phases-2-to-5.md)  
> **Date**: October 2026  
> **Verification Status**: ✅ 1,240/1,240 smoke tests passed | ✅ 100% i18n parity (1,594/1,594 keys across all 7 locales) | ✅ All custom tests passed

---

## 1. Executive Summary

GazBoard Replay **v5.6.0** delivers the second milestone of Phase 2 from the architectural roadmap:
1. **Multi-Window Browsing & Standalone Whiteboard Spawning**:
   - Users can now spawn separate standalone application windows (<kbd>Ctrl+Shift+N</kbd> or right-clicking a tab -> *Open in new window*).
   - Secondary windows run complete isolated Electron renderers with full custom protocol security validation (`isTrustedRenderer` multi-window verification).
   - Closing secondary windows flushes unsaved data cleanly without terminating the application if other windows remain open.

2. **Smart Focus-Driven Lease Locking (`WindowManager`)**:
   - When multiple windows are open:
     - The **focused / active window** holds the primary **Editor Lease** (`isEditor: true`), operating in full inking and editing mode.
     - The **inactive / background window** automatically falls back to **Read-Only Reference Mode** (`readingMode: true`), preventing concurrent write races or lost updates.
     - An elegant glassmorphic status badge appears in the top-right corner of the canvas:
       - In active editor: displays `✍️ Active editor` (auto-dims after 2.5s).
       - In background: displays `🔒 Read-only reference` with a one-click `[ Take over editing ]` action.
     - Simply clicking or focusing into the background window instantly and seamlessly transfers the write lease!

3. **Real-Time Cross-Window Board Synchronization**:
   - Whenever an active window saves changes to a board on disk (`boards:save`), `main.js` broadcasts `board:externalUpdate` to all other open windows.
   - Background windows viewing that board automatically reload and refresh the canvas state in real time, keeping their camera coordinates strictly intact without screen jumps.

4. **TabBar Context Menu & Tab Management**:
   - Right-clicking any tab item in the TabBar opens an intuitive context menu:
     - 🗗 **Open in new window** (<kbd>Ctrl+Shift+N</kbd>)
     - 📋 **Duplicate tab**
     - ✕ **Close other tabs**
     - ✕ **Close tab** (<kbd>Ctrl+W</kbd>)

5. **Preservation of the 6 Golden Invariants**:
   - Zero native `node-gyp` C++ dependencies.
   - Stroke point timestamp preservation (`p.t`) intact.
   - Finite audio duration safeguard maintained.
   - Scene partitioning during audio replay preserved.
   - 100% internationalization parity across all 7 translation locales (1,594 / 1,594 translated, 0 left over).
   - Study tape and answer cover toggling intact.

---

## 2. File Modification & Implementation Ledger

| Component | File Path | Type | Role & Changes |
| :--- | :--- | :--- | :--- |
| **Electron Main Process** | `main.js` | JavaScript (Node/Electron) | Multi-window registry (`whiteboardWindows`), editor lease manager (`activeEditorWin`, `setEditorLease`, `broadcastLeaseState`), IPC handlers (`window:new`, `window:claimLease`, `window:getLeaseState`), multi-window frame security in `isTrustedRenderer`, and save broadcast in `boards:save`. |
| **Preload Bridge** | `preload.js` | JavaScript (Electron Preload) | Exposed `newWindow`, `claimLease`, `getLeaseState`, `onLeaseChanged`, `onBoardExternalUpdate`, and `onOpenBoardById` to `window.board`. |
| **App Core & Lease UI** | `src/js/app.js` | JavaScript (ES6) | Added `initMultiWindowLease()`, `handleLeaseStateChange()`, `ensureWindowModeBadge()`, `updateWindowModeBadge()`, <kbd>Ctrl+Shift+N</kbd> hotkey, and focus-driven lease claiming. |
| **Tab Bar Context Menu** | `src/js/ui/tabs.js` | JavaScript (ES6) | Added right-click context menu (`showTabContextMenu`), `duplicateTab`, and `closeOtherTabs`. |
| **Styles & Glassmorphism** | `src/css/app.css` | CSS3 | Styling for `.window-mode-badge` (active-editor vs read-only with pulse), and `.gb-tab-context-menu`. |
| **i18n Dictionaries** | `src/locales/*.json` (7 files) | JSON | Added translations for all 7 multi-window and tab management strings across `ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`. |
| **Automated Tests** | `test/multi-window.test.mjs`<br>`scripts/smoke-custom.js` | Node test runner | Unit checks for lease state transitions, tab context menu operations, and preload IPC exposures. |

---

## 3. Verification & Quality Gates

```powershell
# 1. Full regression smoke test suite
node scripts/smoke.js
# Result: 1240 passed, 0 failed

# 2. Strict 100% translation parity check across all 7 locales
node scripts/i18n-check.js
# Result: 1594 / 1594 translated, 0 left over, 0 problems across all 7 locales

# 3. Custom feature & multi-window integration test suite
npm run smoke:custom
# Result: 30 custom features, 15 markdown, 4 excerpt, 14 replay, 3 video, 2 path security, 3 tabs & libraries, 3 multi-window & lease, 9 audit 4.8.4.1, 8 custom 4.8.8, 3 replay 5.0.0, 5 split/excerpt 5.1.0 — 100% passed
```

---

## 4. Binary Release Package

- **Filename**: `GazBoard-v5.6.0-Portable.exe`
- **Location**: `GazBoard-v5.6.0-Portable.exe`
- **Size**: 106,648,811 bytes (~106.6 MB)
- **Format**: Zero-install standalone portable Windows executable
- **Packaging Protocol**: Follows Antigravity Rule 5 (Portable by default, version-stamped filename)
