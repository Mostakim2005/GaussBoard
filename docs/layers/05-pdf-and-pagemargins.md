# Layer 05: PDF Background Import & Turnout Page Margins

## 1. Subsystem Overview
Controls document import workflows (PDF, Word, Slides), the dual PDF import mode (`Movable objects` vs `Page background`), auto-alignment presets (`Fit width`, `Fit height`, `Fit page`), and the Turnout-inspired Page Margin Adjustment Dialog featuring 8 interactive draggable control handles and layout presets.

## 2. Primary Source Files (Touch ONLY These)
* **Page Margin Dialog**: `src/js/ui/pagemargin-dialog.js` (`PageMarginDialog` class, 8 drag handles, Cornell presets).
* **PDF Page Range Picker**: `src/js/ui/pagepicker.js` (Page range selection, mode radio: `Movable objects` vs `Page background`, alignment buttons).
* **Document Importer**: `src/js/insert.js` (`insertDocument()`, native pad sheet creation with locked background image).
* **Pad Sheet Geometry**: `src/js/core/pages.js` (`pageRects()`, margin calculations, layout offsets).
* **Settings Access**: `src/js/ui/panels.js` (`[📐 Page margin adjustment…]` button in Canvas size settings).

## 3. Subsystem Invariants & Behavior
### PDF Import Modes (`src/js/ui/pagepicker.js`, `src/js/insert.js`):
1. **Movable Objects Mode (Printouts)**:
   * Each imported page is dropped as an independent `type: 'image'` object on the infinite canvas.
   * Can be freely moved, scaled, cropped, or deleted.
2. **Page Background Mode**:
   * Creates native locked pad sheets (`pages.push({ w, h, bg, margins })`).
   * Bakes PDF pages as locked sheet backgrounds (`mk(p, box, true)`), perfectly centered and scaled to the sheet dimensions.
   * Prevents accidental movement while writing notes over textbooks or worksheets.

### Turnout-Inspired Page Margin Adjustment Dialog (`src/js/ui/pagemargin-dialog.js`):
* Interactive modal featuring **8 draggable blue circle control handles** positioned around the margin boundary:
  * `nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`.
  * Real-time drag updates top, bottom, left, and right margins in pixels with live dimension chips.
* **Layout Presets**:
  1. *Standard*: Uniform margins (e.g. 40px all around).
  2. *Cornell Notes*: Wide left margin for cue questions and keywords.
  3. *Wide Right*: Wide right margin for side annotations and corrections.
  4. *Top Header*: Large top header space for lecture titles and dates.
  5. *Two Columns*: Symmetric wide side margins.
* **Scope Selector**:
  * `(●) Apply to the entire note`: updates `doc.pages.forEach(p => p.margins = ...)`.
  * `( ) Apply to current page only`: updates active page index only.

## 4. Verification Commands
```powershell
node scripts/smoke.js
# Verified tests:
# - PDF import adds pages — 3 pages
# - desktop Settings shows the active boards folder and the storage controls
```

## 5. v4.8.8 Page Margin Status

Margin fields remain per-page data. `src/js/core/pages.js` computes guide rectangles and `src/js/core/surface.js` draws them on the interactive canvas. The guide overlay is not rendered into PNG, PDF or video output, and it does not clip user content or reserve a printable area. This is a known partial implementation; the release dossier and feature history must use this exact boundary.

The focused unit checks verify margin calculation, scope, persistence and undo operations. They do not verify margin enforcement in an exported document because no such export consumer exists yet.

---

## 6. Advanced PDF Annotation & Book Reader Blueprint (v5.6.0+)

For the comprehensive engineering specification for interactive text markup (highlights, underline, squiggly), LiquidText-style pin-and-tear excerpts, book margin expansion via `pdf-lib`, scanned book offline OCR via `Tesseract.js` WASM, and Table of Contents navigation, see:  
[`docs/plan/08-pdf-annotation-and-book-reader-architecture.md`](../plan/08-pdf-annotation-and-book-reader-architecture.md).
