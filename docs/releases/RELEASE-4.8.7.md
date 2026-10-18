# GazBoard Release Dossier - v4.8.7

- **Release Version**: `4.8.7`
- **Release Date**: 2026-10-18
- **Base Commits**: 
  - `7549a64aa004f746057d9d8f793657cabe860ab4` (Features & Ergonomics)
  - `84817ac5bd0a98fc3e52e7260cd20c31f34a7c62` (Hardening & Quality Assurance)
- **Previous Working Baseline**: `4.8.6` (`GazBoard-4.8.6-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.7-portable.exe` (107,267,071 bytes)

---

## 1. Overview of Release
Release 4.8.7 delivers the complete set of ergonomic navigation and UI layout enhancements requested in User Feedback Round 5: dual-mode mouse wheel scroll vs. zoom toggle, comprehensive 4-way arrow canvas navigation, frictionless in-place plus-menu pinning, full ribbon tool drag-and-pin mobility (select, lasso, pen, laser, color pen, emojis, shapes), Windows-style persistent hover toolbars, and non-overlapping context menus.

---

## 2. Features Added & Modified

### F-487-01: Mouse Scroll Dual Mode Toggle (Zoom vs. Page Scroll)
- **Modules**: `src/js/core/tools.js` (lines 290–345), `src/js/ui/panels.js` (lines 140–165)
- **Description**: Allows users to configure whether the mouse scroll wheel zooms the canvas or scrolls vertically (pan).
- **Implementation**:
  - Setting `mouseWheelMode: 'zoom' | 'scroll'` persisted in localStorage.
  - In `scroll` mode, vertical wheel pans up/down; holding `Ctrl` switches temporarily to zoom; holding `Shift` pans horizontally.
  - In `zoom` mode, default wheel zooms at pointer locus; holding `Shift` or `Alt` scrolls pages.

### F-487-02: 4-Way Arrow Key Canvas Navigation & Page Stepping
- **Module**: `src/js/app.js` (lines 680–725)
- **Description**:
  - **Infinite Canvas Mode**: Arrow keys (Up, Down, Left, Right) smoothly pan the camera in 60px increments (holding Shift accelerates to 240px).
  - **Paged Canvas Mode**: Up/Down arrow keys move between pages or scroll vertically along the continuous page stack.

### F-487-03: Plus-Menu In-Place Hot-Pinning (No Board Dismissal)
- **Module**: `src/js/ui/toolbar.js` (lines 520–590)
- **Description**: Users can click pin icons inside the "+" overflow menu repeatedly to pin/unpin multiple tools without the menu automatically closing or reloading the canvas.

### F-487-04: Full Ribbon Tool Mobility (Front Ribbon to Plus Menu)
- **Module**: `src/js/ui/toolbar.js` (lines 610–695)
- **Description**: Select, Lasso Select, Freehand Pen, Laser Pointer, Color Pen Presets, Emojis, and Shapes can now be moved freely between the front ribbon bar and the plus menu.

### F-487-05: Windows-Style Persistent Hover Floating Toolbar
- **Module**: `src/js/ui/toolbar.js` (lines 810–890)
- **Description**: When hovering over canvas objects or toolbar triggers, the hover menu stays open with a 300ms leave grace period and pointer tracking, allowing users to move their mouse directly into the menu to select actions without flickering.

### F-487-06: Non-Overlapping Side-by-Side Context Menu Offsetting
- **Module**: `src/js/ui/contextmenu.js` (lines 180–235)
- **Description**: When both the floating hover toolbar and the right-click context menu are active simultaneously, the context menu automatically detects the hover toolbar's bounding rect and repositions itself horizontally adjacent (side-by-side) with an 8px gutter.

---

## 3. Bug Fixes in This Release
- **BUG-012**: Mouse wheel zoom unintentionally firing when attempting vertical page browsing in document mode.
- **BUG-013**: Arrow keys failing to respond when focus was on the canvas container element.
- **BUG-014**: Plus menu closing unexpectedly when clicking pin/unpin toggle buttons.
- **BUG-015**: Core ribbon tools (Lasso, Laser) locked in place and unable to be stowed in overflow menu.
- **BUG-016**: Hover floating toolbar disappearing instantly when moving mouse cursor toward it.
- **BUG-017**: Right-click context menu occluding the floating object toolbar.

---

## 4. Files Touched
- `src/js/app.js`
- `src/js/core/tools.js`
- `src/js/ui/contextmenu.js`
- `src/js/ui/panels.js`
- `src/js/ui/search-dialog.js`
- `src/js/ui/toolbar.js`
- `docs/BUG_FIX_LOG.md`
- `docs/FEATURE_RECORD.md`
- `docs/layers/06-workspace-and-ui.md`
- `src/locales/*.json` (7 languages)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 tests pass.
- **i18n Check**: 1,357 / 1,357 translations pass across all 7 locales.
- **Binary Verification**: Launch `GazBoard-4.8.7-portable.exe`. Test mouse wheel scroll toggle, arrow navigation, and plus menu hot-pinning.
- **Rollback Target**: `4.8.6` (`GazBoard-4.8.6-portable.exe`).
