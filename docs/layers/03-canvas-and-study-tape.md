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

## 7. v6.9.2 Hardening Corrections

- **Study runner state machine:** `StudyRunner` no longer assigns `object.revealed` directly. `setReviewState()` updates the cover and any content written on it (`hidden`), and `refreshCanvas()` calls `surface.touch()` so the frozen-scene key moves and the reveal actually repaints. FSRS ratings are applied through `store.update()` (undoable) rather than pre-mutating the object.
- **Freehand tape attachment:** `coverFor()` derives the cover footprint from `boundsOf()`, so ink written on a freehand tape (which has points/bbox but no x/y/w/h) is attached, moves and hides with the tape.
- **Tape is a mask, not ink:** a tape drawn while recording is no longer stamped with `audioId`/`t0`, so the replay engine does not animate or ghost it.
- **Replay vs concealment:** concealed covers are redrawn after the replay pass, keeping blinded ink hidden during animated replay (deliberate trade-off documented in the release dossier).

## 8. Dedicated Study Tape Pen & Active Recall Assessment

- **Dedicated Pen Tray Tool**: Study Tape is elevated to a primary pen item in `#penTray` with an authentic tape-dispenser / pulled-strip SVG icon, keyboard shortcut `T`, and synchronized toolbar selection.
- **Double-Click Popover & Customization**:
  - Size presets: 5 widths (`16px`, `24px`, `34px`, `48px`, `64px`).
  - Swatch palette: 7 tape colors (Classic Yellow, Neon Cyan, Hot Pink, Mint Green, Soft Lavender, Warm Orange, Sleek Charcoal).
  - Textures: 3 tactile finishes (`Stripes`, `Plain`, `Washi Dots`).
  - Stepped Opacity Slider: Interactive 10% snap increments (`0%` to `100%`) with tick markers and a `50%` midpoint.
  - Active Recall Setting: Toggle checkbox to prompt assessment on reveal, plus review counters.
- **Active Recall Assessment Modal & Database**:
  - Revealing a concealed tape on canvas prompts an Active Recall rating modal with 4 choices:
    - `Confident & Right` (green)
    - `Unsure & Right` (blue)
    - `Confident & Wrong` (amber)
    - `Unsure & Wrong` (rose)
  - Records reviews with timestamp, score, confidence, and trial counts inside `tapeObj.assessments` and in the board document database `doc.tapeDb[tapeId]` for future Anki/FSRS export. Provides "Skip" and "Don't ask again" options.

## 9. Interactive Visual Crop, Resize & Clean Lock Display

- **On-Canvas Interactive Cropping HUD (`startImageCrop`)**:
  - Replaced legacy slider dialog with an on-canvas visual overlay `#imageCropOverlay` attached directly to `#stage`.
  - High-contrast dotted/dashed cyan outline (`border: 2px dashed #00e5ff`) with drop-shadow for visibility on both dark and light images.
  - 8 interactive stretch handles (`nw`, `ne`, `sw`, `se`, `n`, `s`, `w`, `e`) allowing fluid resizing in any direction.
  - 4 semi-transparent shaded mask strips (`rgba(0, 0, 0, 0.52)`) dimming the regions outside the active crop box.
  - Rule-of-thirds grid lines (dashed 3x3 guides) within the crop window.
  - Direct dragging inside the box translates the crop window smoothly.
  - Floating action pill at bottom displaying live crop percentage, `↶ Reset`, `✕ Cancel`, and `✓ Apply` with instant canvas preview.
- **Image Resize Popover (`openImageResizePopover`)**:
  - Accessible directly from the image selection context bar (`[Resize image]`).
  - Offers width and height inputs with a "Keep aspect ratio" toggle, plus quick scale presets (`50%`, `75%`, `100%`, `125%`, `150%`, `200%`).
- **Clean Lock Display**:
  - In `surface.js`, locked outlines and lock badges (`drawLockedOutline`, `drawLockBadge`) are rendered exclusively when an object is actively selected or hovered (`isSelected || isHovered`).
  - Annotated images and locked board elements remain completely clean and uncluttered during normal reading, presentation, and editing.

## 10. Independent Snipping Tool, Excerpt Boundaries & Sheet Clamping

- **Independent Snipping Tool (`startSnippingExcerpt()`)**:
  - Accessible via ribbon button `[✂️ Snip]`, canvas context menu (`Capture excerpt snippet`), or keyboard shortcut.
  - Activates interactive semi-transparent backdrop overlay with crosshair cursor and helper tooltip.
  - User drags a bounding box over any canvas content; on mouse-up, the region is rendered to a high-resolution excerpt image with linked source metadata (`boardId`, `pageIndex`, `bounds`).
  - Image is automatically copied to the system clipboard and can be pasted onto any board or split workspace.
- **Distinctive Excerpt Visual Styling**:
  - Excerpt image objects display a purple dashed boundary (`#7c3aed`, 2px dashed outline) with 4 sharp corner bracket accents in canvas rendering (`render.js`).
  - Rendered with a top-left branded pill badge: `[ 🔗 Excerpt · SourceBoard ]` for immediate visual differentiation from standard screenshots.
  - Maintains LiquidText-style elastic tether lines to original source bounds when viewing the origin board.
- **Page Boundary Clamping / Constrain to Sheet**:
  - In `pages.js` (`offsetIntoRect`), oversized objects are anchored at the top-left of the target page rather than centering across page gutters and bleeding into preceding pages.
  - In `tools.js` (`clampGroupToPaper` and resize handling), dragged and inserted objects in paged mode are strictly clamped and proportionally downscaled to fit within the page dimensions.

## 11. Video Card Rendering Robustness & Infinite Mirror Loop Prevention

- **Video Card Image Fetching**: In `render.js` (`drawVideoCard`), thumbnail decoding correctly calls `getImage(o.thumb, onload)` instead of undeclared `image()`, eliminating the `ReferenceError` on video insert.
- **Canvas Render Error Boundary**: Wrapped object rendering dispatch in `drawObject()` with a `try ... catch ... finally { ctx.restore(); }` safeguard. Any individual object rendering failure is logged without aborting `drawScene()`, preventing unhandled exceptions from breaking `_slideFrozen()` and causing infinite blit recursion / Droste mirror tunnels.


