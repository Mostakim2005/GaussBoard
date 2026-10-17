# Layer 03: Canvas Rendering, Study Tape & Image Annotation

## 1. Subsystem Overview
Manages the core 2D HTML5 Canvas rendering pipeline, the dual-pass dynamic overlay, active-recall study tape, image edge cropping, and direct pen annotations grouped and locked with background images.

## 2. Primary Source Files (Touch ONLY These)
* **Canvas Surface Manager**: `src/js/core/surface.js` (`Surface` class, viewport transformation, frozen bitmap cache, dynamic HUD passes, bloom decay).
* **2D Drawing Pipeline**: `src/js/core/render.js` (`drawScene()`, `drawStroke()`, `drawImage()`, `drawCurtain()`, `drawAudioCard()`).
* **Hit-Testing & Picking**: `src/js/core/hit.js` (`pick()`, `ghost()` exclusion predicate).
* **Hover Menu & Context Actions**: `src/js/ui/contextmenu.js` (Floating action bar on hover over items, non-destructive cropping controls, direct annotation mode).
* **Pointer Interactions**: `src/js/core/tools.js` (Two-way tape toggling, pen annotation grouping and locking).

## 3. Subsystem Invariants & Behavior
### Active-Recall Study Tape (`subtype: 'tape'`):
* **Concealed State**: Rendered with diagonal neon hatched stripes (violet/cyan alternating stripes) with an outer glowing border.
* **Revealed State**: Rendered as a faint, translucent neon dashed outline so underlying answers are completely readable.
* **Two-Way Toggle**: Single tap toggles between concealed and revealed instantly without requiring selection.
* **Hit-Testing Rule**: In `src/js/core/hit.js`, revealed study tape MUST be exempt from the `ghost()` filter so it can be clicked again to conceal.

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
# - study tape curtain toggles and reveals
# - Copy as picture puts a picture of the selection on the clipboard
```
