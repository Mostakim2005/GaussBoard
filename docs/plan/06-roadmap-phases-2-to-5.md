# Master Architectural Plan — Phases 2 to 5 (v5.5.0–v6.0.0)

> **Parent Index**: [`docs/INDEX.md`](../INDEX.md) | **Handover**: [`docs/PHASE1_AI_HANDOVER.md`](../PHASE1_AI_HANDOVER.md)
> **Scope**: Step-by-step implementation blueprint for Phases 2–5, to be executed one phase at a time after Phase 1 (`v5.4.0`) is verified.

---

## Global Guidelines for Phases 2–5

1. **Open-Source Library Policy (Personal Use Approved)**:
   * The user has explicitly authorized bundling open-source GitHub libraries (MIT/Apache-2.0/BSD/MPL) wherever they provide a more efficient, battle-tested, and robust implementation.
   * **Hard Constraint (Invariant #5)**: Never introduce `node-gyp` C/C++ native addons. Use pure JS/WASM/ESM bundles stored under `src/vendor/` (or bundled cleanly into `src/js/vendor/`) so offline-first execution and portable `.exe` builds work out of the box.
2. **Preserve the 6 Golden Invariants**:
   * Every new object type (`diagram`, `chart`, `mindmap`, `pdf-annotation`) must work seamlessly with audio-ink replay partitioning, undo/redo snapshots, split-screen panes, and 100% i18n parity across all 7 locales.

---

## Phase 2: Multi-Tab & Multi-Window Browsing (`v5.5.0`)

### 2.1 Objectives
Bring Chrome-style multi-tab switching, tab drag-out to new windows, and multi-window safety to GazBoard without corrupting board files on disk.

### 2.2 Architecture & Implementation Steps
1. **Top Chrome Tab Strip (`src/js/ui/tab-bar.js`)**:
   * Render a sleek, collapsible horizontal tab bar at the top of the workspace (`#tabBar`).
   * **In-Memory Tab Session Cache**: Maintain an LRU cache (`Map<boardId, { docSnapshot, undoStack, redoStack, cam, selection, scrollPos }>`, capped at 8 active tabs in RAM) so switching tabs is instantaneous ($<5\text{ ms}$) without re-reading disk or losing Undo/Redo history.
   * **Keyboard Shortcuts**:
     * `Ctrl+T`: New board tab
     * `Ctrl+W`: Save & close active tab
     * `Ctrl+Tab` / `Ctrl+Shift+Tab`: Cycle open tabs
     * `Ctrl+Shift+T`: Reopen last closed tab
   * **Context Menu on Tabs**: *Pin Tab*, *Duplicate Tab*, *Open in Right Split Pane*, *Move Tab to New Window*, *Close Other Tabs*.
2. **True Multi-Window Support & Lease Locking (`main.js` + `preload.js`)**:
   * Add IPC `window:new({ boardId })` in `main.js` that spawns a secondary `BrowserWindow` loading `?board=<id>`.
   * **Board Lease Manager (`main.js`)**: Track `activeBoardLeases: Map<boardId, webContentsId>`.
   * If Window B opens a board currently leased by Window A, Window B opens it in **Read-Only Reference Mode** with a one-click banner (*"Take over editing in this window"*), which flushes Window A's pending save and transfers the write lease to Window B.
   * Broadcast `boards:changed` across all open `BrowserWindow` instances whenever a board is saved so background tabs/windows auto-refresh cleanly.

---

## Phase 3: Visualizations, Mind Maps & Diagramming (`v5.6.0`)

### 3.1 Objectives
Enable rich, vector-sharp visualizations (`Mermaid.js` flowcharts/sequence/decision trees, `Markmap` mind maps, `Chart.js` spider/radar/bar/line charts) directly on the canvas, powered by **two user-friendly creation workflows**:
1. **Natural-Language UI Builder Assistant** (interactive guided builder that translates plain-English steps/nodes/data into diagram/chart code).
2. **AI Instruction Paste-to-Render** (one-click prompt generator + paste box where the user pastes AI-generated Mermaid/Markdown/JSON instructions and immediately renders or edits the diagram).

### 3.2 Recommended Libraries (Pure JS, Offline-First under `src/vendor/`)
* **Diagrams & Decision Trees**: `mermaid.esm.min.mjs` (Flowcharts, Decision Trees, Sequence, State, Class, Timeline, Mindmap).
* **Interactive Mind Maps**: `markmap-lib` + `markmap-view` (or Mermaid mindmap + native interactive node expander) converting Markdown bullet lists into radial/tree mind maps.
* **Charts & Spider/Radar Plots**: `chart.umd.min.js` (`Chart.js` v4 rendered to an offscreen `<canvas>` / PNG/SVG data URI for Radar/Spider charts, Bar, Line, Doughnut, Scatter).

### 3.3 Dual Creation UX (`src/js/ui/visualization-dialog.js`)
When the user clicks **Insert $\rightarrow$ Visualization / Diagram** (or double-clicks an existing diagram object on the board), open a unified 3-tab studio modal with a live preview pane:

1. **Mode A — Natural-Language UI Builder Assistant**:
   * **For Decision Trees / Flowcharts**: A conversational sentence-style builder:
     * *"When [Condition / Question] $\rightarrow$ If [Yes] go to [Outcome A], if [No] go to [Outcome B]"* with `+ Add Step / Branch` buttons.
     * Automatically compiles the user's natural-language cards into clean Mermaid syntax behind the scenes.
   * **For Mind Maps / Spider Maps**: An outline editor where typing indented lines or clicking `+ Child Idea` / `+ Sibling Idea` builds the mind map visually in real time.
   * **For Charts (Spider/Radar, Bar, Line, Pie)**: An editable spreadsheet-style mini-table (Labels + Series values) and chart-type selector that compiles directly into a `Chart.js` spec.
2. **Mode B — AI Instruction Copy/Paste Studio**:
   * **"Copy AI Prompt Template" Button**: Copies a ready-made system prompt to the clipboard (e.g., *"Generate a Mermaid flowchart / Chart.js JSON / Markdown mindmap forGazBoard about: [Topic]. Return only the code block."*).
   * **Smart Paste Box**: The user pastes any raw output from ChatGPT/Claude/Gemini (even if wrapped in ` ```mermaid `, ` ```json `, or ` ```markdown ` fences). Auto-detects the language, strips fences, validates syntax, shows human-readable error hints if malformed, and renders the live preview immediately.
3. **Mode C — Canvas Integration (`type: 'diagram'` or extended `image`/`text`)**:
   * Stores `{ type: 'image', subtype: 'visualization', vizKind: 'mermaid'|'mindmap'|'chart', vizSource: '...', src: 'data:image/svg+xml...' }`.
   * Double-clicking the object on the canvas reopens the Visualization Studio with `vizSource` pre-loaded for instant editing!
   * **"Explode to Native Shapes & Connectors" Action**: Optional button for simple flowcharts/mind maps that converts nodes into native GazBoard `shape` + `connector` objects so the user can hand-ink and drag individual nodes freely.

---

## Phase 4: Advanced PDF Annotator & LiquidText-Style Workspace (`v5.7.0`)

### 4.1 Objectives
Transform GazBoard's PDF experience from static rasterized page images into a full-featured PDF study & LiquidText-style active-reading environment.

### 4.2 Recommended Libraries (`src/vendor/`)
* **`pdfjs-dist`** (Mozilla PDF.js): Extracts selectable text layers (`page.getTextContent()`), document outlines/TOC (`pdf.getOutline()`), and internal links.
* **`pdf-lib`**: Pure-JS PDF manipulation library to read/edit PDF metadata (Title, Author, Subject, Keywords) and export/burn GazBoard highlights, ink strokes, and text notes as **real PDF annotation objects** into a standard `.pdf` file.

### 4.3 Key Features & Implementation Steps
1. **PDF Book Reader & TOC Sidebar (`src/js/ui/pdf-sidebar.js`)**:
   * Collapsible left drawer with 3 tabs: **Table of Contents (Chapters)**, **Page Thumbnails**, and **Annotations & Bookmarks Summary** (filterable by highlight color or tag).
   * **Continuous Two-Page Book Spread View**: Option to lay out pages side-by-side (`2-up Book View`) in addition to vertical strip.
2. **Selectable PDF Text Layer & Smart Highlight/Strikeout**:
   * Overlay an invisible, camera-synced PDF text selection layer over imported PDF pages when using the Text Select / Highlighter tool.
   * Selecting PDF text pops up a mini-bar: **Highlight** (Yellow/Green/Blue/Pink), **Underline**, **Strikeout**, **Copy Text**, or **Pull Excerpt to Workspace**.
3. **LiquidText-Inspired Active Reading Features**:
   * **Auto-Linked Text & Area Excerpts**: Dragging selected PDF text (or `Alt+Drag` area crop) into the margin or split workspace creates a linked Excerpt Card AND automatically attaches a **Live Elastic Tether (`connector` with `subtype: 'tether'`)** that visually spans from the exact source location on the PDF page to the excerpt card (including across Split Workspace panes!).
   * **Document Squeeze / Pinch-to-Compress (`src/js/core/pdf-squeeze.js`)**: Hold `Alt+Scroll` (or two-finger vertical pinch on a PDF strip) to temporarily fold/collapse un-highlighted sections between twodistant pages, bringing Page 2 and Page 18 side-by-side so you can compare them at once, then double-click the fold seam to expand back.
4. **PDF Metadata Editor & Native PDF Annotation Export (`src/js/ui/pdf-metadata-dialog.js`)**:
   * Edit PDF Title, Author, Subject, Keywords, and Page Labels via `pdf-lib`.
   * Export PDF with either **Flattened Ink** or **Editable Native PDF Annotations** (`/Ink`, `/Highlight`, `/FreeText` dictionaries).

---

## Phase 5: Deep Obsidian Interoperability (`v5.8.0`)

### 5.1 Objectives
Make GazBoard work hand-in-hand with an Obsidian vault via open file standards, deep URI links, optional live Local REST API sync, and an interactive Graph View.

### 5.2 Key Features & Implementation Steps
1. **JSON Canvas 1.0 (`.canvas`) Bidirectional Import & Export (`src/js/core/json-canvas.js`)**:
   * Full support for Obsidian's open [JSON Canvas 1.0](https://jsoncanvas.org/) `.canvas` format:
     * GazBoard `text`/`note` $\leftrightarrow$ `.canvas` `"type": "text"` nodes.
     * GazBoard `image`/ink groups $\leftrightarrow$ `.canvas` `"type": "file"` nodes.
     * GazBoard `connector` $\leftrightarrow$ `.canvas` `edges` (`fromNode`, `toNode`, `fromSide`, `toSide`, `label`).
2. **Direct Obsidian Vault Bridge (`src/js/core/obsidian-bridge.js`)**:
   * **`obsidian://` URI Protocol**: Support `obsidian://open?vault=<Vault>&file=<Note>` inside Markdown cards and board links so clicking opens the exact note/heading in the Obsidian desktop app.
   * **Vault Folder Watcher & Markdown Sidecar Export**: Configure a companion Obsidian Vault folder in Settings; auto-export a `.md` summary note per board containing YAML frontmatter (`tags`, `aliases`), all Markdown cards, extracted PDF highlights, and an embedded PNG snapshot (`![[Board.png]]`).
   * **Optional Obsidian Local REST API Client**: Connect to `http://127.0.0.1:27123` (when the user uses the Obsidian Local REST API plugin) to push excerpts/notes directly into the user's Daily Note or active Obsidian note with one click.
3. **Obsidian-Style Interactive Graph View (`src/js/ui/graph-view.js`)**:
   * Force-directed graph modal showing all boards, `#tags`, `[[wikilinks]]`, and cross-board excerpts as interactive nodes and edges. Clicking any node opens that board (or switches to its tab).
