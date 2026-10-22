# Layer 02: Inking Engines, Pen Options & Gesture Eraser

## 1. Subsystem Overview
Governs pen stroke generation, pressure smoothing, pluggable inking engines (GazBoard default, Windows Ink Bézier, Perfect Freehand), highlighter adjustable opacity (50% default) with text color-popping contrast enhancement, pen stroke opacity, laser pointer trail controls, and the StarNote gesture scratch-out eraser with spatial overlap false-positive defense.

## 2. Primary Source Files (Touch ONLY These)
* **Gesture Eraser**: `src/js/core/scratch.js` (`isScratchOut()` algorithm, dominant reversal axis spatial overlap guard).
* **Pointer Event Dispatcher**: `src/js/core/tools.js` (`startStroke()`, `addStrokePoint()`, `finishStroke()`, `onPointerUp`).
* **Window Focus Recovery**: `src/js/core/tools.js` (`Interaction.finishOnWindowBlur()` finalizes an active action and releases pointer capture).
* **Pluggable Inking Pipeline**: `src/js/core/ink.js` (`InkEngine` interface, `WindowsInkEngine` cubic Bézier velocity interpolator).
* **Canvas Stroke Rendering**: `src/js/core/render.js` (`drawStroke()`, `highlighterOpacity`, `globalCompositeOperation = 'multiply'` for color popping).
* **Settings & Menus**:
  * `src/js/ui/toolbar.js` (Highlighter palette: opacity slider, color-popping toggle, eraser toggle).
  * `src/js/ui/panels.js` (Inking engine choice, pen opacity slider, laser trail duration options).

## 3. Algorithmic Invariants & Math Parameters
### Scratch-Out Gesture Eraser (`src/js/core/scratch.js`):
A 3 px spacing sampler normalizes classifier input across digitizers with different pointer report rates. It rejects non-finite coordinates and keeps significant x/y/diagonal turns; it never replaces or mutates the raw samples stored on the stroke.

A stroke qualifies as an intentional scratch-out gesture **only** if all 4 conditions are met:
1. Sharp direction reversals $\ge 5$ across normalized angles.
2. Stroke density $\ge 3.5$ (total arc length divided by bounding box diagonal).
3. Net progress ratio $\le 0.35$ (distance between start and end point divided by total stroke length).
4. **Dominant Reversal Axis Spatial Overlap Guard** ($\ge 0.25$):
   $$\text{Overlap Ratio} = \frac{\sum \text{overlap}(S_i, S_{i+1})}{\sum \text{length}(S_i)} \ge 0.25$$
   * Prevents writing digits (`2 3 2`, `3 3 3`) or letters (`w`, `m`, `WRM`) from accidentally erasing words.
   * No time limit cutoff (supports deliberate large scribbles).

### Highlighter Opacity & Color-Popping (`src/js/core/render.js`):
* Default opacity: `0.50` (50%).
* Range: `0.10` to `1.00`.
* Color-Popping: When `o.colorPop !== false`, sets `ctx.globalCompositeOperation = 'multiply'`, preventing dark underlying text or PDF scans from washing out or becoming cloudy under vibrant highlighter inks.

### Windows Ink Velocity-Weighted Cubic Bézier (`src/js/core/ink.js`):
* Computes instantaneous velocity vector between consecutive pointer events.
* Dynamically adjusts Bézier control point tension based on hardware speed, mirroring the smooth, responsive feel of Windows Snip & Sketch.

## 4. Relevant Bug Fixes
* **BUG-001**: 3-second hardcoded timeout cutoff removed from scratch-out detector.
* **BUG-002**: Scratch-out false positives on numbers and handwriting solved via spatial overlap guard.
* **BUG-009**: Settings pills lacked visual `.primary` class switching on click $\rightarrow$ fixed in `panels.js`.

The v5.0.0 focus-loss handler sends the owning interaction through its normal finish path and releases all captured pointer IDs; the check covers both active ink and stale pointer cleanup.

## 5. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - scratch-out gesture detection works
# - on a dark board a shape drawn in default colour is light
# - laser duration switches immediately
```

For the v5.0.0 feature-only verification scope, run `npm run smoke:custom`; the full audit and deferred issues are in [`../releases/AUDIT-POST-4.8.1-TO-5.0.0.md`](../releases/AUDIT-POST-4.8.1-TO-5.0.0.md).

## 6. v4.8.8 Engine Choice and Compatibility

The settings registry in `src/js/core/ink.js` exposes `default` (GazBoard Default), `windowsInk`, `perfectFreehand`, and `catmullRomBezier` (Catmull–Rom Bézier). v4.8.8 adds the last as a separate choice; it does not remove or replace the prior choices. `src/js/ui/panels.js` persists the selected key, and the path/run caches in `ink.js` include the engine key so changing engines cannot reuse geometry produced by the previous choice.

The engine changes how saved point samples are converted to a rendered path. It does not rewrite the stored point list. Keep `p.t`, pressure and metadata intact: audio replay timing, variable-pressure rendering, undo and saved-board data depend on the samples. Since the selected engine is a user setting and may affect the appearance of previously saved strokes when redrawn, changes to this behavior should remain explicit and user-selectable.

Potential interactions to check when changing an engine include perceived input latency, small-loop/acute-corner overshoot, pressure joins, cache invalidation, audio stroke timing, highlighter compositing, rendering cost on large boards, and PNG/SVG/PDF/video consistency. The intended checks are separate: `node --test test/custom-features.test.mjs` covers registry and timestamp preservation; `npm run smoke:custom` includes the 4.8.8 UI checks. See `docs/plan/03-method-eval.md` for option trade-offs.
