# GazBoard v4.8.12 — Obsidian-Style Markdown & Wikilinks Architecture Specification

> **Target Audience**: Frontier AI Engineering Models (Gemini 1.5 Pro, Claude 3.5 Sonnet, GPT-4o) and System Architects.
> **Scope**: Add native, zero-native-dependency, Obsidian-inspired Markdown fields, interactive task lists, GFM tables, callout blocks, KaTeX math formulas, and `[[wikilinks]]` to GazBoard's whiteboard canvas.
> **Base Release**: GazBoard v4.8.11 (tagged commit `f01e1b30e57a8d28b680b504a44cc651160a6fe4` on branch `feat/m5-hardening-release`).
> **Target Version**: **v4.8.12**.

---

## 1. Executive Summary & Golden Invariants

GazBoard is a local-first, offline-first digital whiteboard for Windows 10/11 built on **Electron 43, Vanilla ES6 JavaScript Modules, and HTML5 Canvas 2D**. It has **zero frontend frameworks** (no React, Vue, or Svelte) and **zero compiled C/C++ native addons** (no `node-gyp`).

### The 6 Non-Negotiable Invariants (Never Break)
1. **Scene Partitioning During Audio Replay**:
   * Strokes belonging to an active audio recording session (`o.audioId === activeTrackId`) must NEVER be drawn in the base frozen canvas pass. They are drawn strictly in the dynamic overlay pass (`Surface.drawReplaySession()`).
2. **Stroke Point Timestamp Preservation (`p.t`)**:
   * All point simplification, Bézier curve fitting, and smoothing functions in `tools.js` and `ink.js` must preserve `p.t`. Stripping `p.t` breaks audio-ink synchronization.
3. **Finite Audio Duration Safeguard**:
   * WebM chunks can report `duration = Infinity` until indexed; always record elapsed wall-clock time in `track.durationMs`.
4. **100% Internationalization (i18n) Parity**:
   * Every user-facing UI string must be wrapped in `t('...')` and present across all 7 translation dictionaries (`ar.json`, `bn.json`, `de.json`, `es.json`, `pt-BR.json`, `zh-Hans.json`, `zh-Hant.json`). Verified via `node scripts/i18n-check.js`.
5. **Zero Extra Native Dependencies**:
   * All markdown parsing, wikilink translation, and rendering algorithms must remain pure portable JavaScript.
6. **Study Tape & Answer Cover Toggle**:
   * Both study tape (`subtype: 'tape'`) and rectangular answer covers toggle concealed/revealed on tap.

---

## 2. Target Feature Scope (Obsidian Parity)

```
┌────────────────────────────────────────────────────────┐
│  # Physics Notes & Derivation                          │
│                                                        │
│  > [!NOTE] Newton's Second Law                         │
│  > The acceleration is proportional to net force.      │
│                                                        │
│  - [x] Review lecture slides                           │
│  - [ ] Solve problem set 4                             │
│                                                        │
│  $$\mathbf{F} = \frac{d\mathbf{p}}{dt} = m\mathbf{a}$$ │
│                                                        │
│  Reference board: [[Classical Mechanics#Chapter 2]]    │
└────────────────────────────────────────────────────────┘
```

1. **GitHub Flavored Markdown (GFM)**:
   * Headings (`#` through `######`), bold (`**text**`), italic (`*text*`), strikethrough (`~~text~~`), underline (`<u>text</u>`), inline code (`` `code` ``).
   * Blockquotes and Obsidian Callout blocks: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!DANGER]`, `> [!INFO]`, `> [!SUCCESS]`.
   * Interactive Task Checklists (`- [ ] task`, `- [x] completed`) toggleable with a direct tap/click on canvas.
   * GFM Tables (`| col | col |`).
   * Code blocks with language labels and syntax styling (` ```js ... ``` `).
2. **Offline KaTeX Math Integration**:
   * Inline math: `$E = mc^2$`
   * Display / block math: `$$\int_{-\infty}^\infty e^{-x^2} dx = \sqrt{\pi}$$`
   * Leverages the existing offline KaTeX engine already bundled in `src/vendor/katex/`.
3. **Obsidian-Style Wikilinks & Internal Navigation**:
   * `[[Board Name]]` links directly to another GazBoard board.
   * `[[Board Name#3]]` links to Page 3 of that board.
   * `[[Board Name|Custom Label]]` supports piped display aliases.
   * Seamlessly translates into GazBoard’s native internal token format `@[Label](b:boardId#page)`.
   * Obsidian URI protocol support: `[External Note](obsidian://open?vault=VaultName&file=NotePath)`.
4. **Editing Experience**:
   * **Obsidian Live Preview**: Editable DOM overlay where placing the caret reveals raw Markdown syntax, and moving away renders it rich inline.
   * **Source / Preview Toggle**: One-click button on the formatting toolbar and `F2` / `Ctrl+Enter` keyboard shortcuts.

---

## 3. Data Model & Schema Modifications

### 3.1. Canvas Object Schema (`Store`)
Text objects (`type: 'text'`) and Sticky Notes (`type: 'note'`) in `src/js/core/store.js` gain additive properties:

```typescript
interface TextObject {
  id: string;               // e.g. "txt_abc123"
  type: 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;             // Raw Markdown ground-truth string
  markdown?: boolean;       // true if interpreted as Markdown (default: auto or true)
  autoSize?: boolean;       // false when user manually resizes handles
  wrapW?: number;           // Word wrapping threshold
  color?: string;           // Base text color
  fontSize?: number;        // Base font size (default: 24)
  font?: string;            // Font face: 'ui', 'marker', 'hand', 'serif', 'mono'
  align?: 'left'|'center'|'right';
  background?: string;      // Card background fill ('none' or '#hex')
  runs?: TextRun[];         // Preserved for backward-compatibility
}
```

### 3.2. Wikilink Token Translation
GazBoard already has a battle-tested board-linking engine in `src/js/core/boardrefs.js`:
* Native token: `@[Title](b:boardId#page)`
* Wikilink syntax: `[[Target Board#Page|Alias]]`
* **Translation Rule**: On input / commit, `src/js/core/boardrefs.js` converts `[[Title]]` into `@[Title](b:boardId)` by resolving `Title` against `storage-location.js`'s board catalog.

---

## 4. Architectural Subsystems & Code Locations

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GAZBOARD DIRECTORY MAP                          │
├──────────────────────────────┬─────────────────────────────────────────┤
│ File Path                    │ Role in Markdown Implementation         │
├──────────────────────────────┼─────────────────────────────────────────┤
│ src/js/core/markdown.js      │ NEW: Pure-JS Markdown Tokenizer & AST   │
│ src/js/core/render.js        │ Canvas2D text rendering & SVG cache     │
│ src/js/core/richtext.js      │ Rich text run generator & math spans    │
│ src/js/core/boardrefs.js     │ Wikilink regex & board ID resolver      │
│ src/js/core/maths.js         │ Offline KaTeX SVG layout & cache        │
│ src/js/core/hit.js           │ Interactive task checklist click hit    │
│ src/js/ui/textedit.js        │ In-place Live Preview overlay editor    │
│ src/js/ui/toolbar.js         │ Markdown toggle badge & format buttons  │
│ src/locales/*.json           │ 7 translation dictionaries              │
│ test/markdown.test.mjs       │ NEW: Unit tests for Markdown parser     │
└──────────────────────────────┴─────────────────────────────────────────┘
```

### Subsystem 1: Pure-JS Markdown Engine (`src/js/core/markdown.js`)
* **Invariant Constraint**: No C/C++ native packages (`node-gyp`).
* **Implementation**: Lightweight, modular pure-JS parser (bundle a standalone pure-JS `marked.min.js` or AST walker in `src/vendor/marked/`).
* **Custom Extensions**:
  1. *Obsidian Callouts*: Regex hook for `^>\s*\[!([A-Za-z]+)\]\s*(.*)$` emitting `<div class="callout callout-$1">`.
  2. *Checkboxes*: Match `^([ \t]*)[-*+]\s+\[([ xX])\]\s+(.*)$` emitting interactive `<input type="checkbox" data-line="$line">`.
  3. *Wikilinks*: Match `\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]` converting to internal board anchors.
  4. *KaTeX*: Match `\$\$([\s\S]+?)\$\$` (display) and `\$([^\$\n]+?)\$` (inline) invoking `katex.renderToString()`.

### Subsystem 2: Canvas2D Rendering Pipeline (`src/js/core/render.js`)
GazBoard draws everything on an HTML5 2D Canvas. To render complex HTML markdown (tables, callouts, formatted code, math) with vector sharpness:
* **The SVG `<foreignObject>` Offscreen Cache** (proven pattern already used in `src/js/core/maths.js`):
  1. Render parsed Markdown AST into styled HTML string with inline CSS.
  2. Embed inside an SVG data URI:
     ```xml
     <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
       <foreignObject width="100%" height="100%">
         <div xmlns="http://www.w3.org/1999/xhtml" class="gb-markdown-body">
           ${htmlContent}
         </div>
       </foreignObject>
     </svg>
     ```
  3. Load into an off-screen `HTMLImageElement` and cache by `hash(text, w, color, zoom)`.
  4. Draw directly via `ctx.drawImage(cachedImg, o.x, o.y, o.w, o.h)`.
* **Zero Blurriness**: SVG stays pin-sharp at 200%, 400% zoom, and high-DPI retina screens.

### Subsystem 3: In-Place Live Preview & Editing (`src/js/ui/textedit.js`)
* Currently `TextEditor` spawns `<div class="rt" contenteditable="true">` over `#editLayer`.
* **Enhancements**:
  * While editing: renders DOM elements with live formatting classes.
  * When caret enters a styled block (e.g. `### Heading`), the active line reveals raw markdown tokens `### Heading`. When caret leaves, it collapses into rendered HTML heading.
  * Checkbox toggle on canvas: `src/js/core/hit.js` tests if a click falls on a checklist checkbox `[ ]` coordinate; if so, toggles `[x]` in `o.text` directly without entering text editing mode!

---

## 4. Exact Files Requiring Modification

### 1. `src/js/core/store.js`
* Add default property `markdown: true` (or auto-detect) for new text objects.
* Ensure `toJSON` and `load` serialize `o.markdown` without schema breakage.

### 2. `src/js/core/boardrefs.js`
* Add `WIKILINK_RE = /\[\[([^\]\|\#\n]+)(?:#(\d{1,4}))?(?:\|([^\]\n]+))?\]\]/g;`.
* Export `wikilinksToRefs(text)` and `refsToWikilinks(text)` for bi-directional conversion.

### 3. `src/js/core/render.js`
* In `drawText(ctx, o, hideText)`:
  * Check if `o.markdown !== false && isMarkdown(o.text)`.
  * If true, delegate to `drawMarkdownBlock(ctx, o, hideText)` which manages the off-screen SVG cache.

### 4. `src/js/ui/textedit.js`
* In `begin(obj, cell)`:
  * If object is markdown, apply `.markdown-mode` styling to the overlay `contentEditable`.
  * Support `Ctrl+B` (wraps in `****`), `Ctrl+I` (wraps in `**`), `Ctrl+K` (inserts `[text](url)` or `[[board]]`).
* In `place()` and `fitBox()`:
  * Measure rendered Markdown DOM height instead of single-line text wrapping.

### 5. `src/js/ui/toolbar.js`
* Add Markdown format toggle button to `#textFormatBar` (icon: `M↓`, title: `t('Markdown')`).
* Allow users to switch between Plain Text and Markdown mode.

### 6. `src/locales/*.json` (All 7 Locales)
* Add translations:
  * `t('Markdown')`: "Markdown" / "ماركداون" / "মার্কডাউন" / etc.
  * `t('Toggle Task')`: "Toggle Task"
  * `t('Insert Wikilink')`: "Insert Board Link"

---

## 5. Implementation Roadmap for v4.8.12

| Phase | Milestone | Deliverable |
| :---: | :--- | :--- |
| **1** | Parser & AST | Create `src/js/core/markdown.js` with GFM, callouts, task lists, and tests in `test/markdown.test.mjs`. |
| **2** | Wikilinks Engine | Update `src/js/core/boardrefs.js` to parse `[[Board]]` and resolve board titles to local IDs. |
| **3** | Canvas2D Renderer | Implement `drawMarkdownBlock()` in `src/js/core/render.js` with off-screen SVG caching. |
| **4** | UI & Live Preview | Enhance `src/js/ui/textedit.js` and `#textFormatBar` in `toolbar.js` with Markdown controls. |
| **5** | Interactive Tasks | Add direct canvas tap-to-toggle for checkboxes `- [ ]` $\leftrightarrow$ `- [x]` in `hit.js`. |
| **6** | i18n & Smoke Suite | Add all 7 locale keys; verify `node scripts/smoke.js` (1,240/1,240) and `node scripts/i18n-check.js`. |
| **7** | Portable Packaging | Build `GazBoard-v4.8.12-Portable.exe` and update master catalog in `TOPIC_CATALOG.md`. |
