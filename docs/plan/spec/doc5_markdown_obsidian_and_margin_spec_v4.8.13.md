# GazBoard v4.8.13 — Advanced Obsidian Markdown Ecosystem, Margin Overhaul & Split Workspace Architecture Specification

> **Target Audience**: Frontier AI Engineering Models (Gemini for Argon, Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o) and Systems Architects.  
> **Scope**: Implement full Obsidian-style Markdown parity (default Markdown for all text, toggleable Obsidian card window models, wikilinks/embeds `![[...]` with configurable double-click action menu, hashtag `#` autocomplete/indexing), overhaul the Page Margin dialog (fix inverted drag kinematics, increase margin limits up to 2000px, fix mouse-drift auto-dismiss), and repair the dual-viewport Split Workspace.  
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

### 2.1. Markdown UI Buttons, Default Markdown & Toggleable Card Window Models
* **Default Markdown for All Text**:
  - Every new text object created (via text tool, double-clicking canvas, pasting from clipboard, or toolbar buttons) strictly defaults to **`markdown: true`**.
  - Plain text remains an explicit backward-compatibility option, but Markdown is the default state for the entire app.
* **Toggleable Obsidian Card Window Models**:
  - Users are not locked into one fixed card look. Each card supports a selectable `cardStyle`:
    1. **`canvas`** (Default Obsidian Canvas style): Rounded card rectangle (`border-radius: 10px`), card background with subtle border, shadow, and sleek corner "MD" type badge.
    2. **`window`** (Full Obsidian Window Header model): Dedicated title/header bar with window drag handle, editable title, and collapse/expand toggle button (`▲` / `▼`).
    3. **`minimal`** (Minimalist border): Clean rounded border, subtle background tint, no header or badges.
    4. **`transparent`** (Borderless): Raw canvas text with no card boundary (classic whiteboard look).
  - Toggling between these styles is accessible directly from the floating format bar (`#textFormatBar`), selection bar (`#ctxbar`), and right-click context menu.
* **Markdown UI Buttons**:
  1. **Top Ribbon (`ReplayBar` / `src/js/ui/replay-bar.js`)**: Add a toggleable Markdown button (`btnMarkdown` / "MD") to insert a new Markdown card directly onto the canvas.
  2. **Floating Overlay / Format Bar (`src/js/ui/toolbar.js`)**: Add rich Markdown buttons: Heading levels (`H1`, `H2`, `H3`), Callout (`[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!DANGER]`), Checklists (`- [ ]`), Inline/Block Math (`$`, `$$`), Board Wikilinks (`[[...]]`), and Card Style Selector.
  3. **Right-Click Menu (`src/js/ui/contextmenu.js`)**: Add "Insert Markdown Card", "Card Style ▾", "Toggle Markdown Mode", and "Edit Link / Embed...".

### 2.2. Wikilinks, Embeds (`![[...]]`), Aliases & Tag Autocomplete
* **Embed Syntax (`![[Board#Page|Alias]]`)**:
  - An exclamation prefix denotes an embed/transclusion. In Live Preview and canvas rendering, an embedded board card displays an interactive summary preview or thumbnail of that target board.
* **Configurable Double-Click Action (No Regrets)**:
  - Double-clicking a wikilink or board reference opens a non-blocking Quick Action Popover (unless the user has configured an automatic default):
    1. **Embed in Place (`![[...]]`)**: Switch or toggle to rich embedded board preview.
    2. **Open in Split Study View**: Open the linked board side-by-side in dual workspace.
    3. **Navigate Directly**: Switch current canvas to the target board.
    4. **Edit Link & Aliases**: Open the link editing modal.
    - Includes a checkbox: *"Always perform this action on double-click (can be changed anytime in Settings)"*.
    - This ensures users are never locked into a single choice they might regret later.
* **Hold-and-Click (Long-Press) or Right-Click Interaction**:
  - Long-pressing or right-clicking a wikilink or board reference opens the Link Editor popover:
    - Target Board selection (dropdown/search).
    - Target Page (numeric input).
    - Display Alias (text input for `|Alias`).
    - Embed Toggle checkbox (`![[...]]`).
* **Hashtag (`#`) Tag Autocomplete & Indexing**:
  - Typing `#` inside `TextEditor` (`textedit.js`) triggers a tag autocomplete dropdown showing existing tags from `store.doc.properties.tags` and across all workspace boards.
  - Selecting a tag completes `#tagname `.
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
│ src/js/core/render.js        │ 4 selectable card window styles, collapse state   │
│ src/js/core/boardrefs.js     │ Embed support, alias piping, link metadata parser │
│ src/js/core/store.js         │ `markdown: true` default, `cardStyle`, tag counts │
│ src/js/ui/textedit.js        │ `#` tag autocomplete popup, `![[...]]` embedding  │
│ src/js/ui/toolbar.js         │ Markdown ribbon, card style picker, format tools  │
│ src/js/ui/replay-bar.js      │ Top ribbon "MD" button, "Page Margin" button      │
│ src/js/ui/contextmenu.js     │ "Insert MD", "Card Style", "Page Margin", Links   │
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

### 4.2. Toggleable Obsidian Card Window Models (`src/js/core/render.js`)

Each text card carries `cardStyle: 'canvas' | 'window' | 'minimal' | 'transparent'` (default: `'canvas'`).

```javascript
export function drawMarkdownCardContainer(ctx, o, isDark = false) {
  const style = o.cardStyle || 'canvas';
  if (style === 'transparent') return;

  const pad = 12;
  const x = o.x - pad;
  const y = o.y - pad;
  const w = o.w + pad * 2;
  const h = o.h + pad * 2;
  const r = 10;

  ctx.save();

  // 1. Background fill
  ctx.fillStyle = o.background && o.background !== 'none'
    ? o.background
    : (isDark ? '#23252a' : '#ffffff');

  // 2. Card Shadow (for 'canvas' and 'window' styles)
  if (style === 'canvas' || style === 'window') {
    ctx.shadowColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
  }

  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();

  // Reset shadow for borders & headers
  ctx.shadowColor = 'transparent';

  // 3. Border stroke
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  ctx.stroke();

  // 4. Style-specific Header decorations
  if (style === 'window') {
    // Obsidian Window Header bar
    const headerH = 26;
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, headerH, [r, r, 0, 0]);
    else ctx.rect(x, y, w, headerH);
    ctx.fill();

    // Bottom border of header
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.moveTo(x, y + headerH);
    ctx.lineTo(x + w, y + headerH);
    ctx.stroke();

    // Card Title / Breadcrumb
    ctx.font = '600 11px sans-serif';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const titleText = o.title || (o.text ? o.text.split('\n')[0].replace(/^#+\s*/, '').slice(0, 24) : 'Markdown');
    ctx.fillText(titleText, x + 12, y + headerH / 2);

    // Collapse toggle button indicator
    ctx.textAlign = 'right';
    ctx.fillText(o.collapsed ? '▼' : '▲', x + w - 12, y + headerH / 2);
  } else if (style === 'canvas') {
    // Obsidian Canvas subtle type pill ("MD")
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
  }

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

#### Configurable Double-Click Action Popover (No Regrets):
When double-clicking a wikilink or board reference on canvas:
```javascript
export function openWikilinkDoubleAction(app, ref, anchorPoint) {
  const pref = app.storage?.getPreference('wikilinkDblClick') || 'ask';
  if (pref !== 'ask') {
    executeWikilinkAction(app, ref, pref);
    return;
  }

  const pop = h('div', { class: 'wikilink-action-popover' },
    h('div', { class: 'title' }, t('Choose Action for {name}', { name: ref.name })),
    h('button', { onclick: () => { executeWikilinkAction(app, ref, 'embed'); pop.remove(); } }, t('Embed in Place (![[...]])')),
    h('button', { onclick: () => { executeWikilinkAction(app, ref, 'split'); pop.remove(); } }, t('Open in Split View')),
    h('button', { onclick: () => { executeWikilinkAction(app, ref, 'navigate'); pop.remove(); } }, t('Navigate to Board')),
    h('button', { onclick: () => { executeWikilinkAction(app, ref, 'edit'); pop.remove(); } }, t('Edit Link & Aliases...')),
    h('label', {},
      h('input', { type: 'checkbox', id: 'chkRememberDblClick' }),
      t('Remember choice (changeable in Settings)')
    )
  );
  showPopover(pop, anchorPoint);
}
```

#### Link Editor Popover:
When right-clicking or long-pressing a wikilink or board ref card:
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
  - Action: Creates a new Markdown card at canvas center.
  - Title: `t('Insert Markdown Note')`.
* **Page Margin Button (`btnPageMargin`)**:
  - Icon: Margin icon (square with dashed margin lines).
  - Action: Opens `app.pageMarginDialog.open()`.
  - Title: `t('Page Margin Adjustment')`.

### 5.2. Floating Selection Toolbar (`src/js/ui/toolbar.js` / `#ctxbar`)
* **Markdown Sub-Ribbon**:
  - When a text or markdown card is selected, show formatting buttons:
    - Card Style Selector (`Canvas` / `Window` / `Minimal` / `Transparent`)
    - `H1`, `H2`, `H3`
    - Bold (`**`), Italic (`*`), Strikethrough (`~~`)
    - Callout dropdown (`[!NOTE]`, `[!TIP]`, `[!WARNING]`)
    - Checklist (`- [ ]`)
    - KaTeX Math (`$$`)
    - Wikilink (`[[...]]`)
    - Page Margin action button

### 5.3. Right-Click Context Menu (`src/js/ui/contextmenu.js`)
* Add:
  - `Insert Markdown Card` (invokes `app.insertMarkdown(clientX, clientY)`)
  - `Card Style ▾` submenu (`Canvas`, `Window`, `Minimal`, `Transparent`)
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
   - Default text creation -> verifies `markdown: true` and card model container appear immediately.
   - Switch card styles (`canvas` -> `window` -> `minimal` -> `transparent`) -> updates instantly on canvas.
   - Double-click wikilink -> shows Action Chooser modal with "Remember choice" option.
   - Open Page Margin dialog: drag handle `e` right -> page margin expands rightward smoothly.
   - Drag cursor past modal boundary -> modal remains open until pointer is released.
   - Set margin to 1500px -> canvas visibly expands by 1500px.
   - Type `#` in text editor -> tag autocomplete popup opens and allows selecting tags.
   - Toggle Split View -> text editor and selection menu remain precisely positioned over right canvas.
5. **Portable Binary Build**:
   - Compile `GazBoard-v4.8.13-Portable.exe` in `dist/`.
   - Update `TOPIC_CATALOG.md`.
