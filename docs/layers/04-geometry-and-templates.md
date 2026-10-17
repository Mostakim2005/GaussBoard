# Layer 04: Connectors, Arrow Geometry & Custom Templates

## 1. Subsystem Overview
Manages arrow and line geometry, barbed arrowhead styling, line-to-arrow bi-directional conversion, thickness stepping, custom background templates from File Explorer (images/PDF), "Set current board as template" snapshotting, and the interactive zoom presets hover popover with star favorites.

## 2. Primary Source Files (Touch ONLY These)
* **Arrow & Connector Math**: `src/js/core/connectors.js` (`drawArrowhead()`, `arrowScale`, barbed indentation math).
* **Connector Rendering**: `src/js/core/render.js` (`drawConnector()`, line heads).
* **Templates System**: `src/js/templates.js` (`customTemplates` registry, `addCustomTemplate()`, `applyTemplate()`).
* **Camera & Zoom**: `src/js/core/camera.js` (`fitWidth()`, `fitHeight()`, `zoomTo()`).
* **UI Controls**:
  * `src/js/ui/panels.js` (Templates panel header buttons: `[➕ Add template from outside]`, `[📋 Set current board as template]`).
  * `src/js/ui/toolbar.js` (Zoom label hover popover `#zoomPresetsPopover`, star favorites toggle).
  * `src/js/ui/contextmenu.js` (Arrow scale and heads converter actions in selection bar).

## 3. Subsystem Invariants & Behavior
### Arrow & Connector Geometry (`src/js/core/connectors.js`):
* Elongated arrowhead proportions: `lengthMul = 1.4` relative to width.
* Barbed indentation: inward notch at the base of the triangle provides high-visibility professional styling ("Bigger & clearer").
* Heads Converter:
  * `heads: 'none'` $\rightarrow$ Plain straight line.
  * `heads: 'end'` $\rightarrow$ Single directional arrow.
  * `heads: 'both'` $\rightarrow$ Bi-directional double arrow.
* Arrowhead scale support via `o.arrowScale`: `1.0x`, `1.5x`, `2.2x`.

### Custom Template System (`src/js/templates.js`, `src/js/ui/panels.js`):
1. **External Import (`[➕ Add template from outside]`)**: File picker for `.png`, `.jpg`, `.webp`, `.svg`, or `.pdf`. Imported images become background templates rendered into pad sheets.
2. **Current Board Snapshot (`[📋 Set current board as template]`)**: Clones active board background color, grid style, page dimensions, and non-audio annotations into `localStorage['gazboard_custom_templates']`.
3. Displays with custom thumbnail cards and delete buttons `[✕]` in the Templates panel.

### Zoom Presets Popover (`src/js/ui/toolbar.js`):
* Pops up on hover or click over `#zoomLabel`.
* Presets: `900%`, `400%`, `200%`, `100%`, `50%`, `25%`.
* Star favorites (`★` / `☆`) persist in `app.settings.favoriteZooms`.
* Quick Fit Viewport controls: `Fit width` (`↔`), `Fit height` (`↕`), `Fit to page` (`⛶`), and `Fit to board` (`⊡`).

## 4. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - one press on the shape button opens the shape menu
# - an insert onto an empty board lands in the middle of the view
```
