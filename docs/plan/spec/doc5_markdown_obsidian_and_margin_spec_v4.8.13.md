# GazBoard v4.8.13 — Advanced Obsidian Markdown Ecosystem, Margin Overhaul & Split Workspace Architecture Specification

> **Target Audience**: Frontier AI Engineering Models (Gemini for Argon, Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o) and Systems Architects.  
> **Scope**: Implement full Obsidian-style Markdown parity (UI buttons, Obsidian Canvas card styling, wikilinks/embeds `![[...]` editing, hashtag `#` autocomplete/indexing), overhaul the Page Margin dialog (fix inverted drag kinematics, increase margin limits up to 2000px, fix mouse-drift auto-dismiss), and repair the dual-viewport Split Workspace.  
> **Base Version**: GazBoard **v4.8.12** (commit `6b74f72` on branch `feat/markdown-text-boxes-v4.8.12`).  
> **Target Version**: **v4.8.13** (branch `feat/markdown-obsidian-margin-v4.8.13`).  

---

## 1. Executive Summary & Golden Invariants

GazBoard is a high-performance, local-first digital whiteboard for Windows 10/11 built on **Electron 43, Vanilla ES6 Modules, and HTML5 Canvas 2D**. It has zero frontend framework bloat and zero compiled C/C++ native addons (`node-gyp`).

### The 6 Non-Negotiable Invariants (Must Never Break)
1. **Scene Partitioning During Audio Replay**: Strokes with `o.audioId === activeTrackId` must never be rendered in the base frozen canvas pass. They render strictly in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**: All curve fitting, smoothing, and point decimation in `tools.js` and `ink.js` must preserve `p.t` to avoid desynchronizing ink from audio.
3. **Finite Audio Duration Safeguard**: Always track elapsed wall-clock recording duration in `track.durationMs` to safeguard against WebM `Infinity` duration quirks.
4. **100% Internationalization (i18n) Parity**: Every user-facing UI label, button, and toast must use `t('...')` across all 7 supported locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`). Check with `node scripts/i18n-check.js`.
5. **Zero Extra Native Dependencies**: All markdown parsers, math renderers, and link translators must remain pure portable JavaScript.
6. **Study Tape & Answer Cover Toggle**: Interactive study tape (`subtype: 'tape'`) and rectangular answer covers must toggle concealed/revealed state on tap.

---

## 2. Requirements Matrix & Problem Diagnostics

### 2.1. Markdown UI Buttons & Obsidian Canvas Card Styling
* **Current State (v4.8.12)**: Markdown formatting is only accessible on `#textFormatBar` when a text box is actively being edited, or via the `#ctxmenu` context menu. Text boxes appear as standard borderless text blocks unless explicitly styled as notes.
* **Target State (v4.8.13)**:
  1. **Top Ribbon (`ReplayBar` / `src/js/ui/replay-bar.js`)**: Add a toggleable Markdown button (`btnMarkdown` / "MD") that lets users insert a new Markdown card directly onto the canvas or toggle default Markdown mode.
  2. **Floating Overlay / Format Bar (`src/js/ui/toolbar.js`)**: Add rich Markdown buttons: Heading levels (`H1`, `H2`, `H3`), Callout (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!DANGER]`), Checklists (`- [ ]`), Inline/Block Math (`$`, `$$`), and Board Wikilinks (`[[...]]`). Provide a toggle to show/hide the extended markdown button strip.
  3. **Right-Click Menu (`src/js/ui/contextmenu.js`)**: Add "Insert Markdown", "Toggle Markdown Mode", and "Edit Link / Embed...".
  4. **Obsidian Canvas Card Styling**: When `o.markdown === true`, render the card with an Obsidian Canvas card container:
     - Rounded corner rectangular border (`border-radius: 8px`).
     - Distinct card background (`#ffffff` in light theme, `#252529` in dark theme) with subtle drop shadow (`box-shadow: 0 4px 12px rgba(0,0,0,0.08)`).
     - Subtle top-left badge/pill ("MD" or "Markdown") indicating card type.
  5. **Pasted Text Handling**: When "Insert Markdown" is chosen or Markdown mode is enabled, clipboard-pasted text automatically creates a Markdown-enabled card (`o.markdown = true`).

### 2.2. Wikilinks, Embeds (`![[...]]`), Aliases & Tag Autocomplete
* **Current State (v4.8.12)**: Supports reading `[[Board#Page|Alias]]` and converting to internal `@[Label](b:id)`. However, there is no UI to edit an existing link or alias, no support for transclusion/embeds `![[...]]`, and typing `#` does not trigger tag suggestions.
* **Target State (v4.8.13)**:
  1. **Embed Syntax (`![[Board#Page|Alias]]`)**: An exclamation prefix denotes an embed/transclusion. In Live Preview and canvas rendering, an embedded board card displays an interactive summary preview or thumbnail of that target board.
  2. **Double-Click Interaction**: Double-clicking a wikilink or board ref card activates embedding (converts `[[...]]` to `![[...]]` or opens the board in split view).
  3. **Hold-and-Click (Long-Press) or Right-Click Interaction**: Long-pressing or right-clicking a wikilink or board reference opens a Link Editor popover:
     - Target Board selection (dropdown/search).
     - Target Page (numeric input).
     - Display Alias (text input for `|Alias`).
     - Embed Toggle checkbox (`![[...]]`).
  4. **Hashtag (`#`) Tag Autocomplete & Indexing**:
     - When typing `#` inside `TextEditor` (`textedit.js`), a tag autocomplete dropdown appears showing existing tags from `store.doc.properties.tags` and across all workspace boards.
     - Selecting a tag completes `#tagname`.
     - When text objects are edited or created with tags (`#tag`), the tag registry updates the frequency count of tags in `store.doc.properties.tags`.

### 2.3. Page Margin Overhaul (`pagemargin-dialog.js`)
* **Bug 1: Inverted Handle Kinematics**:
  - *Root Cause*: In `src/js/ui/pagemargin-dialog.js` (lines 243–249), handle `e` computes `margins.right = startM.right + dx`. However, in `updatePreviewBox()`, `contentArea.style.right = rightPad` is an inner inset. As `margins.right` grows, `rightPad` grows, moving the right handle to the *left*! Dragging right moves the handle left (inverted).
  - *Fix*: Outward dragging must intuitively expand the margin/writing area. When dragging right handle `e` to the right ($dx > 0$), the right margin expands outward. Calculate handle positions directly from normalized margin offsets so cursor displacement maps 1:1 with handle position.
* **Bug 2: Restrictive Margin Limits**:
  - *Root Cause*: Clamped to `Math.min(200, ...)` and `extraW = Math.max(0, margins.left + margins.right - 80)`.
  - *Fix*: Expand maximum margin bounds from 200px to at least **2,000px** (as indicated by the massive red bounding box in the user's annotated Image 4). In `apply()`, page width/height expansion must scale proportionally with user-selected margins so the visual paper margin expands dramatically.
* **Bug 3: Premature Modal Dismissal on Mouse Drift**:
  - *Root Cause*: `backdrop.addEventListener('click')` fires when dragging outside the card boundary, and pointer events are lost without pointer capture.
  - *Fix*: Call `handleEl.setPointerCapture(e.pointerId)` on `pointerdown` and `releasePointerCapture(e.pointerId)` on `pointerup`. Introduce an `isDragging` flag that suppresses backdrop dismissal during active drag interactions.
* **UI Placement**:
  - Add Page Margin trigger to the **Top Ribbon** (`ReplayBar`), **Extended Ribbon Menu**, **Hover Selection Menu** (`#ctxbar`), and **Right-Click Context Menu** (`#ctxmenu`).

### 2.4. Dual-Viewport Split Workspace Repair (`split-workspace.js`)
* **Root Cause Diagnostics**:
  - In `src/js/ui/split-workspace.js`, `this.primaryCanvas` (`#c`) is reparented into `this.rightPane` (`#stageRight`).
  - However, `#editLayer` (the DOM layer for text editing) and `#ctxbar` (the selection floating menu) remain in `#stage`.
  - When `#c` is shifted right by `ratio * 100%`, `cam.toScreen(wx, wy)` produces coordinates relative to `#c`. But `#editLayer` is positioned at the top-left of `#stage` (starting at $x=0$).
  - As a result, the text editing box and hover bar are displaced into the left pane!
  - Furthermore, canvas resize observers and bounding client rects become misaligned.
* **Fix**:
  - Reparent `#editLayer` and `#ctxbar` along with `#c` into `this.rightPane`, or enclose them in a unified viewport container so their coordinate spaces remain 100% aligned with `#c`.
  - When disabling split workspace, cleanly restore `#c`, `#editLayer`, and `#ctxbar` back to `#stage`.

---

## 3. Architecture & File Modification Plan

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         GAZBOARD DIRECTORY MAP (v4.8.13)                         │
├──────────────────────────────┬───────────────────────────────────────────────────┤
│ File Path                    │ Specific Modification Scope                       │
├──────────────────────────────┼───────────────────────────────────────────────────┤
│ src/js/core/markdown.js      │ Embeds `![[...]]`, tag extractor `#tag`, styling │
│ src/js/core/render.js        │ Obsidian Canvas card styling (border, background) │
│ src/js/core/boardrefs.js     │ Embed support, alias piping, link metadata parser │
│ src/js/core/store.js         │ Tag counting, default markdown preference setting │
│ src/js/ui/textedit.js        │ `#` tag autocomplete popup, `![[...]]` embedding  │
│ src/js/ui/toolbar.js         │ Extended Markdown button ribbon, format controls  │
│ src/js/ui/replay-bar.js      │ Top ribbon "MD" button, "Page Margin" button      │
│ src/js/ui/contextmenu.js     │ Context menu items: "Insert MD", "Page Margin"    │
│ src/js/ui/pagemargin-dialog.js│ Kinematics fix, 2000px limits, pointer capture   │
│ src/js/ui/split-workspace.js │ Fix `#editLayer` & `#ctxbar` reparenting/align    │
│ src/locales/*.json           │ 7 translation dictionaries (all new strings)      │
│ test/markdown.test.mjs       │ Extended test suite for embeds and tag indexing   │
└──────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 4. Subsystem Implementation Specifications

### 4.1. Page Margin Overhaul (`src/js/ui/pagemargin-dialog.js`)

#### Kinematics Derivation:
In Turnout / Page Margin UI, the preview box represents the page boundary, and the handles on the margins adjust the writing area margins.
* **Left Handle (`w`)**:
  - Dragging right ($dx > 0$): Margin increases inward.
  - Dragging left ($dx < 0$): Margin expands outward.
  - Formula: `margins.left = clamp(0, MAX_MARGIN, Math.round(startM.left - dx * scaleFactor))`
* **Right Handle (`e`)**:
  - Dragging right ($dx > 0$): Margin expands outward.
  - Dragging left ($dx < 0$): Margin shrinks inward.
  - Formula: `margins.right = clamp(0, MAX_MARGIN, Math.round(startM.right + dx * scaleFactor))`
* **Top Handle (`n`)**:
  - Dragging up ($dy < 0$): Margin expands outward.
  - Dragging down ($dy > 0$): Margin shrinks inward.
  - Formula: `margins.top = clamp(0, MAX_MARGIN, Math.round(startM.top - dy * scaleFactor))`
* **Bottom Handle (`s`)**:
  - Dragging down ($dy > 0$): Margin expands outward.
  - Dragging up ($dy < 0$): Margin shrinks inward.
  - Formula: `margins.bottom = clamp(0, MAX_MARGIN, Math.round(startM.bottom + dy * scaleFactor))`

#### Drag & Drift Prevention:
```javascript
let isDragging = false;

handleEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  e.preventDefault();
  isDragging = true;
  handleEl.setPointerCapture(e.pointerId);
  startX = e.clientX;
  startY = e.clientY;
  startM = { ...this.margins };
});

handleEl.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  // Apply kinematics formulas
  updatePreviewBox();
});

handleEl.addEventListener('pointerup', (e) => {
  if (isDragging) {
    isDragging = false;
    try { handleEl.releasePointerCapture(e.pointerId); } catch {}
  }
});

// Backdrop click guard
backdrop.addEventListener('click', (e) => {
  if (isDragging) return; // Prevent closing while dragging
  if (e.target === backdrop) this.close();
});
```

#### Maximum Limits & Apply Logic:
```javascript
const MAX_MARGIN = 2000; // Increased from 200 to 2000px

apply() {
  const curIdx = this.app.currentPageIndex?.() || 0;
  const pages = this.app.pages.map((p, idx) => {
    if (this.scope === 'single' && idx !== curIdx) return p;
    const baseW = p.baseW || p.w || 794;
    const baseH = p.baseH || p.h || 1122;
    // Visually expand page canvas to accommodate large margins
    const extraW = Math.max(0, this.margins.left + this.margins.right - 80);
    const extraH = Math.max(0, this.margins.top + this.margins.bottom - 80);
    return {
      ...p,
      baseW,
      baseH,
      w: baseW + extraW,
      h: baseH + extraH,
      margins: { ...this.margins },
      bg: this.color
    };
  });
  // Commit to store and repaint surface
}
```

---

### 4.2. Obsidian Canvas Card Styling (`src/js/core/render.js`)

When rendering a Markdown text box (`o.markdown === true`), draw an Obsidian Canvas-inspired card container before rendering the SVG text overlay:

```javascript
export function drawMarkdownCardContainer(ctx, o, isDark = false) {
  const pad = 12;
  const x = o.x - pad;
  const y = o.y - pad;
  const w = o.w + pad * 2;
  const h = o.h + pad * 2;
  const r = 10; // Rounded corners

  ctx.save();
  // Card Shadow
  ctx.shadowColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  // Background
  ctx.fillStyle = o.background && o.background !== 'none'
    ? o.background
    : (isDark ? '#23252a' : '#ffffff');
  
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();

  // Reset shadow for border
  ctx.shadowColor = 'transparent';

  // Card Border (subtle outline, highlight if selected)
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  ctx.stroke();

  // Subtle Header Pill ("Markdown")
  const pillW = 32, pillH = 14;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,120,212,0.1)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + 10, y + 8, pillW, pillH, 4);
  ctx.fill();

  ctx.font = '600 9px sans-serif';
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,120,212,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MD', x + 10 + pillW / 2, y + 8 + pillH / 2);

  ctx.restore();
}
```

---

### 4.3. Wikilinks, Embeds & Tag Autocomplete

#### Embed Syntax (`boardrefs.js` & `markdown.js`):
* Wikilink: `[[Target Board#Page|Alias]]`
* Embed: `![[Target Board#Page|Alias]]`
```javascript
export const EMBED_WIKILINK_RE = /!\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|([^\]\n]+))?\]\]/g;
```

#### Link Editor Popover:
When the user right-clicks or long-presses a wikilink or board ref card:
* Shows a clean popover with:
  - Input: Board Title (with autocomplete from board directory)
  - Input: Page number (optional)
  - Input: Custom display alias (optional)
  - Toggle: "Embed note content" (`![[...]]` vs `[[...]]`)
  - Buttons: "Save" and "Remove link"

#### Hashtag (`#`) Autocomplete in `src/js/ui/textedit.js`:
1. Listen for `#` keypress in the contenteditable element.
2. Check if caret is immediately following a `#` preceded by whitespace or start of line.
3. Open a floating suggestions popup right below the caret showing:
   - Recent tags from `store.doc.properties.tags`.
   - Global tags from other boards.
4. On Enter / Tab / Click:
   - Insert `#tagName ` and close popup.
5. On text commit:
   - Extract all `#([a-zA-Z0-9_\-\/]+)` tags.
   - Aggregate into `store.doc.properties.tags` with updated frequency counts.

---

### 4.4. Split Workspace Repair (`src/js/ui/split-workspace.js`)

#### Viewport Synchronization Fix:
In `enable()`:
```javascript
enable({ leftBoardData = null, ratio = 0.5 } = {}) {
  // Stash canvas, editLayer, and ctxbar
  this.primaryCanvas = document.getElementById('c');
  this.editLayer = document.getElementById('editLayer');
  this.ctxbar = document.getElementById('ctxbar');

  // Reparent primaryCanvas, editLayer, and ctxbar INTO rightPane
  this.rightPane.appendChild(this.primaryCanvas);
  if (this.editLayer) this.rightPane.appendChild(this.editLayer);
  if (this.ctxbar) this.rightPane.appendChild(this.ctxbar);

  // Resize both left and right surfaces
  this.leftSurface.resize();
  this.app.surface.resize();
}

disable() {
  // Restore all three elements back to stage in their original order
  if (this.primaryCanvas && this.originalCanvasParent) {
    this.originalCanvasParent.appendChild(this.primaryCanvas);
  }
  if (this.editLayer && this.originalCanvasParent) {
    this.originalCanvasParent.appendChild(this.editLayer);
  }
  if (this.ctxbar && this.originalCanvasParent) {
    this.originalCanvasParent.appendChild(this.ctxbar);
  }
  this.app.surface.resize();
}
```

---

## 5. UI Entry Points & Ribbon Integration

### 5.1. Top Ribbon (`src/js/ui/replay-bar.js`)
* **Markdown Button (`btnMarkdown`)**:
  - Icon: Markdown `M↓` icon.
  - Action: Creates a new Markdown card at canvas center, or toggles default Markdown insertion mode.
  - Title: `t('Insert Markdown Note')`.
* **Page Margin Button (`btnPageMargin`)**:
  - Icon: Margin icon (square with dashed margin lines).
  - Action: Opens `app.pageMarginDialog.open()`.
  - Title: `t('Page Margin Adjustment')`.

### 5.2. Floating Selection Toolbar (`src/js/ui/toolbar.js` / `#ctxbar`)
* **Markdown Sub-Ribbon**:
  - When a text or markdown card is selected, show formatting buttons:
    - `H1`, `H2`, `H3`
    - Bold (`**`), Italic (`*`), Strikethrough (`~~`)
    - Callout dropdown (`[!NOTE]`, `[!TIP]`, `[!WARNING]`)
    - Checklist (`- [ ]`)
    - KaTeX Math (`$$`)
    - Wikilink (`[[...]]`)
    - Page Margin action button

### 5.3. Right-Click Context Menu (`src/js/ui/contextmenu.js`)
* Add:
  - `Insert Markdown` (invokes `app.insertMarkdown(clientX, clientY)`)
  - `Page Margin...` (invokes `app.pageMarginDialog.open()`)
  - `Edit Link / Embed...` (when right-clicking over a link)

---

## 6. Verification & Test Plan

1. **Unit Testing (`test/markdown.test.mjs`)**:
   - Verify `![[Board#Page|Alias]]` parse and serialize.
   - Verify `#tag` extraction and frequency count.
   - Verify callout rendering for all 12 types.
2. **Regression Smoke Suite (`node scripts/smoke.js`)**:
   - Ensure all **1,240 assertions** pass with 0 errors.
3. **i18n Parity (`node scripts/i18n-check.js`)**:
   - Ensure 100% string coverage across all 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`).
4. **Interactive Manual Testing**:
   - Open Page Margin dialog: drag handle `e` right -> page margin expands rightward smoothly.
   - Drag cursor past modal boundary -> modal remains open until pointer is released.
   - Set margin to 1500px -> canvas visibly expands by 1500px.
   - Type `#` in text editor -> tag autocomplete popup opens and allows selecting tags.
   - Toggle Split View -> text editor and selection menu remain precisely positioned over right canvas.
5. **Portable Binary Build**:
   - Compile `GazBoard-v4.8.13-Portable.exe` in `dist/`.
   - Update `TOPIC_CATALOG.md`.
