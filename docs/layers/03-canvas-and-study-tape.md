# Layer 03: Canvas Rendering, Study Tape & Image Annotation

## 1. Subsystem Overview
Manages the core 2D HTML5 Canvas rendering pipeline, the dual-pass dynamic overlay, active-recall study tape, image edge cropping, and direct pen annotations grouped and locked with background images.

## 2. Primary Source Files (Touch ONLY These)
* **Canvas Surface Manager**: `src/js/core/surface.js` (`Surface` class, viewport transformation, frozen bitmap cache, dynamic HUD passes, bloom decay).
* **2D Drawing Pipeline**: `src/js/core/render.js` (`drawScene()`, `drawStroke()`, `drawImage()`, `drawCurtain()`, `drawAudioCard()`).
* **Hit-Testing & Picking**: `src/js/core/hit.js` (`pick()`, `ghost()` exclusion predicate).
* **Object Geometry**: `src/js/core/store.js` (`boundsOf()` for freehand tape point bounds).
* **Hover Menu & Context Actions**: `src/js/ui/contextmenu.js` (Floating action bar on hover over items, non-destructive cropping controls, direct annotation mode).
* **Pointer Interactions**: `src/js/core/tools.js` (Two-way tape toggling, pen annotation grouping and locking).

## 3. Subsystem Invariants & Behavior
### Active-Recall Study Tape and Answer Covers:
* **Concealed State**: Rendered with diagonal neon hatched stripes (violet/cyan alternating stripes) with an outer glowing border.
* **Revealed State**: Both freehand tape and rectangular covers remain as a faint dashed outline so the covered object can be tapped again; answers underneath are readable.
* **Two-Way Toggle**: A tap on either type toggles concealed/revealed. Select mode, pen tap, laser tap, and mouse-pointer tap can trigger it. Dragging in Select mode still moves the cover.
* **Attached Content**: Objects attached to a cover are hidden when concealed and restored when revealed; both transitions are undoable.
* **Hit-Testing Rule**: Revealed covers remain hittable so they can be toggled back. Ink is searched through; a non-ink object stacked above a cover takes the hit.
* **Drawing Tool Entry Points**: The dedicated Study Tape ribbon button, Add menu, ribbon-tools menu, and replay quick-action button activate `tool: 'tape'`. The tool draws persistent freehand tape rather than placing a rectangular card.

### Scene Partitioning & Electric Cyan Bloom Decay:
* Replaying strokes render with an electric cyan glow (`#00e5ff`, `shadowBlur: 14`, `width + 5`) and a bright white pen tip.
* Upon finishing a replay stroke, a 450ms bloom decay animates smoothly back to base ink opacity.
* Frozen cache invalidation incorporate `freezeKey = activeTrackId` to prevent ghost artifacts.

### Image Cropping & Grouped Annotations:
* **Non-Destructive Crop**: Stored in `o.crop = { sx, sy, sw, sh }`. Rendered via `ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` in `render.js`.
* **Direct Image Annotation**:
  * Clicking `[✏️ Annotate image]` attaches strokes with `s.attachedTo = image.id`.
  * Clicking `[Done Annotating]` calculates the combined bounding box, marks all annotations and the image as grouped and locked (`locked: true`), protecting them from the eraser until explicitly unlocked.

## 4. Relevant Bug Fixes
* **BUG-003**: Selection bar (`#ctxbar`) and right-click context menu overlapped $\rightarrow$ mutual exclusion implemented in `contextmenu.js`.
* **BUG-008**: Split workspace initialization crashed on unmounted DOM host $\rightarrow$ lifecycle reordered in `split-workspace.js`.

## 5. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - rectangular answer covers and freehand study tape both toggle in both directions
# - Study Tape ribbon and Add-menu entries activate the freehand tape tool
# - Copy as picture puts a picture of the selection on the clipboard
```

## 6. v4.8.8 Margin Overlay Boundary

`src/js/core/pages.js` exports `pageMarginRects(pages)` to calculate guide rectangles, and `src/js/core/surface.js` draws those as a screen overlay. They are visual writing guides; they are deliberately excluded from `renderTo()` output and are not clipping boundaries. Do not document them as print-safe margins or use them as export bounds unless an export path is explicitly changed and tested.

The 4.8.8 custom tests cover asymmetric margin geometry and page scope. Crop undo/cancel, source-bound clamping and video surface cleanup have focused checks in `npm run smoke:features:4.8.4.1`.
