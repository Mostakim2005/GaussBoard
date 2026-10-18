# GazBoard Release Dossier - v4.8.5

- **Release Version**: `4.8.5`
- **Release Date**: 2026-10-17
- **Base Commit**: `fa6b58f25de274e8d99d3668585dd22080399d07`
- **Previous Working Baseline**: `4.8.4` (`GazBoard-4.8.4-portable.exe`)
- **Standalone Windows Executable**: `GazBoard-4.8.5-portable.exe` (107,256,816 bytes)

---

## 1. Overview of Release
Release 4.8.5 expands precision drawing, diagramming, and inking ergonomics: deep customization of connector arrowheads, user-defined custom board templates, pluggable Bézier spline ink smoothing algorithms, and a quick-select zoom presets popover.

---

## 2. Features Added & Modified

### F-485-01: Advanced Connector Arrowhead & Line Geometry Customization
- **Modules**: `src/js/core/connectors.js` (lines 140–210), `src/js/ui/contextmenu.js` (lines 290–345)
- **Description**: Full geometric control over connector lines and arrows:
  - Arrowhead styles: `Open`, `Filled Triangle`, `Stealth`, and `Diamond`.
  - Configurable tip size (small, medium, large).
  - Bidirectional arrows (start and end tips).
  - Curviness parameter for smooth curved Bezier connector routes.

### F-485-02: User-Defined Custom Board Template Creator
- **Modules**: `src/js/templates.js` (lines 45–80), `src/js/ui/panels.js` (lines 420–550)
- **Description**: Users can save their current canvas background color, grid pattern, page size, and pre-arranged elements as a reusable template saved in local app storage.

### F-485-03: Pluggable Inking Bézier Smoothing Engine
- **Modules**: `src/js/core/ink.js` (lines 110–174), `src/js/core/render.js` (lines 48–62)
- **Description**: Switchable ink interpolation modes:
  - `Raw`: Unfiltered input points for maximum stylus responsiveness.
  - `Chaikin`: Classic corner-cutting smoothing.
  - `Catmull-Rom`: Continuous curvature cubic Bézier spline interpolation with velocity-sensitive pressure tapering.

### F-485-04: Zoom Presets Popover Menu
- **Modules**: `src/js/core/camera.js` (lines 180–205), `src/js/ui/toolbar.js` (lines 410–475)
- **Description**: Clicking the zoom percentage indicator opens a compact popover with one-click presets: `25%`, `50%`, `75%`, `100%`, `150%`, `200%`, `400%`, `Fit to Page`, and `Fit to Content`.

---

## 3. Bug Fixes in This Release
- **BUG-485-01**: Fixed arrowhead rotation distortion on near-vertical line angles.
- **BUG-485-02**: Fixed Catmull-Rom spline loop artifacts when drawing tiny closed circles.
- **BUG-485-03**: Fixed custom template thumbnail rendering when board contained embedded PDF elements.

---

## 4. Files Touched
- `src/css/app.css`
- `src/index.html`
- `src/js/app.js`
- `src/js/core/camera.js`
- `src/js/core/connectors.js`
- `src/js/core/ink.js`
- `src/js/core/render.js`
- `src/js/templates.js`
- `src/js/ui/contextmenu.js`
- `src/js/ui/icons.js`
- `src/js/ui/panels.js`
- `src/js/ui/toolbar.js`
- `src/locales/*.json` (7 languages)

---

## 5. Verification & Rollback
- **Smoke Test Baseline**: 1,240 / 1,240 passing.
- **Binary Verification**: Launch `GazBoard-4.8.5-portable.exe`. Test connector line arrowheads and zoom presets popover.
- **Rollback Target**: `4.8.4` (`GazBoard-4.8.4-portable.exe`).
