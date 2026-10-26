# Layer 06: Study Workspace, Notes Overview & UI Controls

## 1. Subsystem Overview
Governs high-level user interface containers, the dual-viewport Split Study Workspace, Notes Overview card gallery with direct double-click opening and smart reflow actions, OmniSearch (Ctrl+F) with multi-word token fuzzy search, ribbon tool pinning/unpinning, and Obsidian-style board tags and aliases.

## 2. Primary Source Files (Touch ONLY These)
* **Split Workspace**: `src/js/ui/split-workspace.js` (`SplitWorkspace` class, dual viewport layout, independent Store and Camera synchronization).
* **Excerpt & selection actions**: `src/js/app.js`, `src/js/core/excerpts.js`, `src/js/core/render.js`, `src/js/ui/contextmenu.js` (bounded screenshot payload, source backlink, validation and hit-testing).
* **Markdown/board references**: `src/js/core/markdown.js`, `src/js/core/boardrefs.js`, `src/js/core/render.js` (Markdown parsing/rendering, anchor serialization and link geometry).
* **Notes Overview**: `src/js/ui/note-overview.js` (Gallery cards, double-click to open, smart reflow actions `[ | ] Split`, `# Tag`, `🏷️ Alias`).
* **OmniSearch & Filtering**: `src/js/ui/search-dialog.js` (Ctrl+F multi-word token fuzzy matcher across titles, descriptions, and tags).
* **Properties Dialog**: `src/js/ui/properties-dialog.js` (Obsidian tags `#tag/subtag` and aliases with workspace-wide autocomplete).
* **Toolbars & Ribbon**: `src/js/ui/toolbar.js` (Bottom/top bars, ribbon tool pinning 📌/📍, unpin on right-click, audio importer trigger).
* **Settings & Sidebars**: `src/js/ui/panels.js` (Gallery view HUD auto-hide, left sidebar `#tags` filtering, live in-Settings DOM search).

## 3. Subsystem Invariants & Behavior
### Split Study Workspace (`src/js/ui/split-workspace.js`):
* Mounts two side-by-side flexbox viewports. Left pane usually displays textbook or reference PDF; right pane acts as an active scratch note.
* Each pane possesses its own independent `Store`, `Camera`, and `Surface`.
* Lifecycle Invariant: DOM element measuring and flex layout MUST occur before constructing secondary camera and hydrating state to avoid unmounted host crashes (`BUG-008`).
* Each pane's `Interaction` listens for window blur. If the app loses focus mid-gesture, it completes the owning action and releases all captured pointer IDs so a hidden pane cannot keep a drawing or drag action active.
* The shared in-app clipboard can paste into the left pane when the pointer is over it. Excerpt payload drops are accepted by either pane; inserted images keep their originating board/page/bounds so Ctrl-click or the excerpt action can return to the source.
* Excerpts are bounded transparent PNG snapshots of a selection, capped at 4096 px per dimension and approximately 12 megapixels. Payload validation rejects unsupported versions, malformed image data, invalid bounds and oversized input before insertion. Board-bundle ID remapping updates excerpt backlinks.

### Markdown and board-link navigation
* Markdown text retains editable source and adds Obsidian-style highlights, subscript/superscript, footnotes, hidden comments, tilde code fences and hidden-but-addressable block IDs. Existing frontmatter, aliases/tags, tables, tasks, callouts, math and wikilinks remain supported.
* Wikilinks can target headings with `[[Board#Heading|Alias]]`, local headings with `[[#Heading]]`, and Obsidian block IDs with `[[#^block-id]]`. Numeric anchors continue to mean pad pages. Markdown links and native references preserve their heading anchor through serialization.
* Raw HTML remains escaped/unsupported; comments are omitted only in rendered Markdown and remain in the editable source. Footnote definitions are removed from the rendered body and displayed as a numbered list.

### Notes Overview & Gallery Smart Reflow (`src/js/ui/note-overview.js`):
* Direct Double-Click: Double-clicking any board card immediately opens that board.
* Removed redundant 3-dots menu. Replaced with direct action overlay buttons: `[ | ] Split`, `# Tag`, `🏷️ Alias`.
* Smart Reflow: If a note title exceeds 22 characters, the action buttons reflow cleanly above the title, preventing truncation or visual clipping.
* Gallery HUD auto-hide: Entering "My boards" automatically collapses `ReplayBar` and `AudioBar`.

### OmniSearch & In-Settings Multi-Word Search:
* Tokenizes queries into individual words and matches across both titles and descriptive body text.
* Settings panel live-filters DOM section cards on `input` events, hiding non-matching sections without page reloads (`BUG-004`).

### Ribbon Customization & Plus Menu Hot-Pinning:
* Each item in the `+` insert menu features a selectable pin icon (📌 / 📍) allowing users to pin frequently used tools directly to the ribbon or move items back into the menu.
* **In-Place Hot-Pinning**: Toggling pin/unpin updates the DOM in-place without rebuilding the toolbar DOM or dismissing the popover, allowing multiple pin toggles in one sitting (`BUG-014`).
* **Bidirectional Ribbon Customization**: Front ribbon tools (`select`, `lasso`, `pan`, `laser`, pens, `highlighter`, `eraser`, `ruler`, `text`, `note`, `shape`, `emoji`) can be moved to the `+` menu via right-click (`BUG-015`).
* Dedicated `#pinnedToolsSlot` manages dynamic tools cleanly.

### Navigation & Mouse Wheel Dual Mode (`src/js/core/tools.js`, `src/js/app.js`):
* `mouseWheelMode` setting allows choosing between `scroll` (Page scroll / Pan) and `zoom` (Zoom in/out).
* Holding `Ctrl` intelligently flips between zoom and scroll; `Shift+wheel` pans horizontally.
* Arrow keys pan 4-way on infinite canvas and scroll pages in paged mode when no item is selected (`BUG-016`).

### Windows-Style Persistent Hover Quick Actions & Side-by-Side Coexistence:
* `#ctxbar` features a 350ms grace bridge and `:hover` tracking matching native Windows hover menus (`BUG-012`).
* When right-clicking an object with quick actions active, the context menu opens adjacent side-by-side (`cr.right + 8` or `cr.left - 8 - menuWidth`) with zero overlap (`BUG-013`).
* Audio recording action menus use viewport measurements to open above or below the selected recording and constrain their height when neither side has full room. Recording names are edited with the app's modal text dialog and persisted as an undoable document transaction (v4.8.11).
* The recording-session menu removes its outside-click listener at close; its deferred listener attach checks that the same menu instance remains open (`BUG-032`, v5.0.0).

## 4. Relevant Bug Fixes
* **BUG-004**: In-settings search failed to match descriptions $\rightarrow$ multi-word token inverted index added.
* **BUG-008**: Split workspace initialized on unmounted pane $\rightarrow$ lifecycle reordered in `split-workspace.js`.
* **BUG-012**: Hover toolbar dismissed prematurely when moving cursor $\rightarrow$ 350ms grace timeout and `:hover` tracking.
* **BUG-013**: Context menu collided with hover toolbar $\rightarrow$ side-by-side non-overlapping positioning calculation.
* **BUG-014**: Pin toggle closed the `+` popover $\rightarrow$ in-place hot-toggling DOM and persistent `#pinnedToolsSlot`.
* **BUG-015**: Ribbon tools were not movable $\rightarrow$ bidirectional right-click to move and `hiddenRibbonTools` sync.
* **BUG-016**: Mouse wheel could not scroll and arrow keys lacked navigation $\rightarrow$ intelligent dual mode & 4-way arrow pan.
* **BUG-017**: Bengali smoke test exact title match failed $\rightarrow$ clean button title preserved.

## 5. Verification Commands
```powershell
node scripts/smoke.js
node scripts/i18n-check.js
# Verified tests:
# - 1240 passed, 0 failed
# - 1357/1357 translated across all 7 languages
```

## 6. v4.8.8 Filtering and User-Choice Rules

- **Tag filters:** My boards filters board metadata; the Templates panel filters built-in and custom template tags. They are distinct data sources and must remain separately testable.
- **Settings choice:** preserve existing choices and add options as requested. For example, the inking engine selector retains the existing engines and adds Catmull–Rom/Bézier. Do not silently turn a multi-choice setting into a yes/no switch.
- **Focused checks:** `npm run smoke:features:4.8.8` covers the live template tag filter and pen-opacity control. `npm run smoke:custom` runs these alongside the Node-level feature and security tests.
- **v5.3.0 Split Workspace & Markdown Fixes:** Added `SplitWorkspace.isOpen` getter, `leftSurface.destroy()` cleanup on `disable()`, `leftStore` subscription for auto-save and tag sync, `resolveAssets`/`externaliseAssets` for left study boards, full `swapPanes()` state preservation, and **Synchronized Split-View Scrolling** (`settings.splitSyncScroll`, default `false`, exposed via the Split Workspace header lock button and Settings). Fixed `buildMarkdownSvgDataUri` XHTML tag masking (`BUG-033`) and lowered `#replayBar` `z-index` to `21` (`BUG-044`).
- **Current version:** the full suite remains `node scripts/smoke.js` (1,240 assertions); new custom additions are tracked in [`../releases/RELEASE-5.3.0.md`](../releases/RELEASE-5.3.0.md).

## 9. v6.9.2 Hardening Corrections

- **Split workspace persistence:** left-board saves snapshot the document before any await, are chained (no old write after a new one) and are flushed before a board switch or close; a reference pane opened without a board adopts an id on its first content change and persists it. `resolveAssets()` results are loaded (pictures no longer open blank).
- **Reference-pane editing:** the pane owns a second `TextEditor` bound to its store/camera (typed notes no longer commit to the primary board) and editor coordinates include the canvas-to-overlay offset. `#editLayer`/`#ctxbar` stay in `#stage`, and reparented canvas/nib nodes are restored in order.
- **Focus lease:** pointer-down in either pane records `activePane`; undo/redo follow it, and pressing in a pane clears the other pane's selection so primary-bound keyboard commands cannot act on the wrong board.
- **Entry points:** the wikilink **Open in Split View** action is implemented (`openBoardInSplit()`), with a guard against opening the same board in both panes.
- **Multi-tab:** undo/redo survive tab switches (cache used non-existent fields), cached restore goes through `app.loadBoard()` then restores that tab's history, Duplicate tab copies the whole board, switches are serialised, session dialogs use `app.askText` (Electron has no `window.prompt`), and localStorage session data is validated on read.
- **Icons/ids:** excerpt-shelf stamping uses `uid('img')` instead of a millisecond timestamp.

## 10. v6.9.3 Rapid Bug Fixes & UX Hardening

- **Dark Mode Hover/Selection Contrast Sweep (`app.css`, `search-dialog.js`, `note-overview.js`):**
  - Resolved missing CSS tokens `--desk` and `--line` in `:root`, `:root[data-theme="dark"]`, and `@media (prefers-color-scheme: dark)`, which caused hovered tools, commands, and settings items to fall back to hardcoded light-gray/white backgrounds while retaining light text (white-on-white text washout).
  - Enforced adaptive surface background `var(--surface-2, rgba(128,128,128,0.15))` and explicit `color: var(--text)` overrides for `.search-tool-row:hover`, `.search-board-row:hover`, `.search-setting-row:hover`, and `.note-overview-card:hover`.
- **Board Aliases Rendering & Search Match Highlighting (`panels.js`):**
  - Updated `addBoard` (both grid tiles and list rows) to render `b.aliases` chips with a distinct purple badge and `🏷️` icon alongside `b.tags`.
  - Added search query highlighting via `markText(al, q)` so users immediately understand why a board appeared when searching for its alias.
- **Note Overview Top-Down Mini-Map & Page Thumbnails Navigator (`note-overview.js`):**
  - Re-architected `NoteOverviewDrawer` into a dual-tab layout: `[ Note overview ]` and `[ My boards ]`.
  - **Infinite Canvas Mode (`pages.length === 0`):** Renders a real-time 2D Mini-Map of all canvas objects with an interactive camera viewport window (`vx, vy, vw, vh`). Dragging or clicking on the mini-map pans the camera in real time across the infinite canvas. Includes "Fit to board", "Reset zoom", and live zoom percentage badge.
  - **Multi-Page Mode (`pages.length > 0`):** Renders a vertical top-down thumbnail strip of all board pages (Page 1, Page 2, Page 3...) with live rendered canvas previews, page dimensions, active page highlight, and 1-click navigation via `fitToPage(idx)`.
  - Maintained 100% translation parity across all 7 locales (2,246 keys).
- **Top Bar Space Optimization & Long Titles/Properties (`app.css`, `toolbar.js`):**
  - Expanded `#boardTitle` (`min-width: 120px; max-width: 480px; flex-shrink: 0;`), dynamic horizontal scrolling for `#topPropertiesChips` (`max-width: 520px`), rendering up to 3 individual tags and alias pills (`🏷️ alias`) instead of compressing everything into an aggregate badge.
- **Eraser Options Popover In-Place Updating (`toolbar.js`):**
  - Resolved popover dismissal on click: replaced `openToolPopover(app, anchor, 'eraser')` re-triggers (which triggered `popover.js` `isOpen` toggle-off) with in-place DOM updates (`updateModeUI` checkmark management and in-place `toggleBtn` ON/OFF toggling), keeping the eraser options menu persistently open.
- **Floating ReplayBar Theme & Contrast (`app.css`, `replay-bar.js`):**
  - Fixed dark fallback styling on light theme causing black text on dark charcoal backgrounds. Introduced adaptive `--surface-glass` and `--stroke-glass` tokens in `app.css`, ensuring high contrast and theme harmony in both light and dark modes.
- **Split Workspace Dual-Board Guard & Auto-Selection (`split-workspace.js`, `note-overview.js`):**
  - Guaranteed split view represents two distinct boards: rejects splitting a board against itself, alerts users if only one board exists in the workspace, filters the active main board out of the left board picker dropdown, and automatically pre-loads an alternative board when entering split view.
- **Partitioned Split Top Bar & Prominent Physical Board Swapping (`split-workspace.js`, `toolbar.js`, `app.css`):**
  - Dynamically mounts `#splitTopbarLeft` directly above the left pane with `[ Left board ]` badge, editable title input, `# Properties` button, tag/alias chips, prominent `[ ⇄ Swap ]` button, and close button.
  - Dynamically inserts `[ Right board ]` badge before `#boardTitle` directly above the right pane.
  - Physical board swapping (`swapPanes()`) exchanges document stores, IDs, repaints surfaces, and synchronizes both topbars simultaneously.
  - Maintained 100% translation parity across all 7 locales (2,253 keys translated).
- **Universal Glass Theme & High-Contrast Harmonization (`app.css`):**
  - Eliminated hardcoded dark fallback `rgba(28, 32, 38, 0.92)` from `.menu-glass` and popup cards which caused severe text contrast collapse (dark text on dark background in light themes). Replaced with responsive CSS custom properties (`--surface-glass`, `--stroke-glass`, `--card-glass-bg`, `--card-glass-border`, `--card-glass-hover`, `--text-3`).
- **Dynamic Inline Tab Creation & Instant Board Search Popover (`tabs.js`, `app.css`):**
  - Appended an inline `(+)` button (`.gb-tab-inline-add`) dynamically docked immediately to the right of the latest active tab, preventing excessive mouse travel to the far-right tab bar button.
  - Clicking opens a smart popover offering `[ + New Board ]`, `[ 📂 Open Existing ]`, a live fuzzy search input (`Search existing boards…`), and a dynamic filterable list of all existing boards for one-click opening.
- **Obsidian-Style Markdown Formatting Toolbar & Responsive Card Sizing (`contextmenu.js`, `textedit.js`, `transform.js`, `tools.js`, `render.js`, `app.css`):**
  - **Dedicated Expandable Toolbar**: Replaced minimal formatting bar with a full Obsidian Markdown Toolbar (`.obsidian-toolbar`) featuring Undo, Redo, Clear formatting, Eraser, H2 (`H₂`), H3 (`H₃`), Hn dropdown (H1-H6 + Paragraph), Bold (`B`), Italic (`I`), Strikethrough (`S`), Underline (`U`), Callouts (`📝▾` with 10 note styles), Code/Diagrams (`📦▾` with Code, Mermaid, Math), Live Preview toggle (`👁️`), Wikilink (`📎`), Markdown Tables (`▦`), Task Checklists (`☑`), Quotes (`💬`), Typography (`T...▾` with Line Numbers, Font Size, Line Spacing, YAML Frontmatter), Bullet & Numbered lists, Font Color (`A`), and Highlight & Note Background.
  - **Fix Glitchy / Uncontrollable Resizing**: In `transform.js` (`scaleObject`) and `tools.js` (`fitResizedText`), stopped scaling `fontSize` when resizing markdown/text cards; stopped forcing uniform square aspect ratios on corner drags without Shift; and stopped `commit()` from wiping out manual card heights.
  - **Solid vs. Transparent Note Backgrounds**: Default markdown notes render with solid adaptive card surface backgrounds (`#202227` dark / `#ffffff` light) with subtle shadow and border, preventing transparent callout/text washouts. Added a background switcher offering Transparent, Theme Solid, and 7 preset swatches.
  - **Half-Page Default Dimensions & Presets**: New or small markdown notes automatically adopt comfortable half-page default dimensions (`640x520`) with quick preset cycling (`⛶`: Half-Page `640x520`, Wide `960x680`, Compact `360x240`).
  - **Live Preview Enhancements**: Added interactive wikilink navigation (`[[Board#Heading]]`) from within Live Preview, task checkbox toggling, and toggleable gutter line numbers (`.gb-show-line-numbers`). Maintained 100% translation parity across all 7 locales (2,329 keys).

## 11. Movable & Resizable Maths Studio, STEM Expansion & KaTeX Slot Clicking

- **Movable & Resizable Maths Modal Window (`mathedit.js`, `app.css`)**:
  - Modal `#mathEditor` is movable by dragging the header `.mx-head` (`cursor: grab; user-select: none`).
  - Window supports smooth resizing (`resize: both; overflow: auto; min-width: 440px; min-height: 420px;`).
- **STEM Expansion (High School 10–12 & University 1st-Year Basics)**:
  - Added dedicated **Electrical** palette: Ohm's law ($V=IR$), electric power ($P=VI, P=I^2R$), AC complex impedance ($Z_{RLC}, Z_L, Z_C$), angular frequency and resonance ($\omega=2\pi f, f_0$), AC phasors ($\mathbf{V}=|V|\angle\theta$), Euler ($e^{j\theta}$), time constants ($\tau=RC, \tau=L/R$), Laplace transfer functions ($H(s), s=\sigma+j\omega, \mathcal{L}\{f\}$), Maxwell's equations ($\nabla\cdot\mathbf{D}, \nabla\cdot\mathbf{B}, \nabla\times\mathbf{E}, \nabla\times\mathbf{H}$), and EE units ($\Omega, \text{k}\Omega, \text{M}\Omega, \mu\text{F}, \text{mH}, \text{dB}$).
  - Added dedicated **Chemistry** palette: reaction arrows ($\rightarrow, \rightleftharpoons, \xrightleftharpoons{}$), thermodynamics ($\Delta H^{\circ}, \Delta G^{\circ}, \Delta S^{\circ}$), equilibrium ($K_{\text{eq}}, K_a, K_w$), pH and pOH ($\text{pH}=-\log_{10}[\text{H}^+], \text{pH}+\text{pOH}=14$), ideal gas law ($PV=nRT$), Arrhenius kinetics ($k=Ae^{-\frac{E_a}{RT}}$), Nernst equation ($E=E^{\circ}-\frac{RT}{nF}\ln Q$), and common species ($\text{H}^+, \text{OH}^-, \text{H}_2\text{O}, \text{CO}_2, e^-, \text{mol/L}$).
  - Expanded **Calculus** (triple integrals $\iiint$, vector operators $\nabla\cdot\vec{v}, \nabla\times\vec{v}$, limits $\lim_{x\to a}$, Taylor series, L'Hôpital) and **Physics & Stats** (Newton's 2nd law $\mathbf{F}=m\mathbf{a}$, mass-energy $E=mc^2$, momentum $\mathbf{p}=m\mathbf{v}$, kinetic/potential energy $K, U$, waves $v=f\lambda, T=1/f, \omega=\sqrt{k/m}$, constants $\varepsilon_0, \mu_0$, Bayes theorem $P(A|B)$).
- **Studio Button Hover Tooltip Banner (`.mx-studio-explain`)**:
  - Dynamically updates guidance banner below the studio buttons on hover, explaining what `Matrix…`, `SymPy`, `MATLAB`, `Wolfram`, `Natural Math…`, and `Solve…` do and how to use their output.
- **Interactive Live KaTeX Preview Slot Clicking & Highlighting**:
  - Hovering over arguments/tokens in `.mx-preview` displays green hover outline (`.mx-slot-hover`).
  - Clicking any argument/placeholder in the live rendered math detects the slot, selects and highlights the corresponding text in the LaTeX textarea above, and flashes active green (`.mx-slot-active`), allowing direct and error-free editing of formulas.
- **100% Strict i18n Parity**: All new tabs, buttons, dialog inputs, and explanations are translated across all 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`) verified via `node scripts/i18n-check.js`.

## 12. Independent Snipping Tool & Paged Context Menu Deletion

- **Independent Excerpt Snipping Tool (`replay-bar.js`, `app.js`, `contextmenu.js`)**:
  - Added dedicated `[✂️ Snip]` button to the floating replay/utility bar (`#replayBar`) with toggleable visibility in settings.
  - Added `[✂️ Capture excerpt snippet]` to the canvas right-click context menu.
  - Allows clicking anywhere to initiate visual region capture with crosshair cursor, dimmed backdrop, and instant clipboard copy with linked board provenance.
- **Canvas Context Menu Page Deletion (`contextmenu.js`)**:
  - Right-clicking on any page background or canvas in paged mode presents `[🗑️ Delete page {n}]` or `[🗑️ Delete this page]`, directly deleting the targeted page with full undo support.

## 13. YouTube Video Overlay & Player Security Audit (`video-dialog.js`, `index.html`, `render.js`)

- **Content Security Policy Frame & Media Directives**:
  - Added `frame-src 'self' app: data: blob: https://www.youtube.com https://www.youtube-nocookie.com;` to `index.html` CSP meta tag, enabling YouTube embeds in the player modal.
  - Added `img-src` allowlisting `https://img.youtube.com` and `https://i.ytimg.com` for high-resolution video thumbnail fetching.
  - Added `media-src 'self' app: data: blob: https: file:;` for direct streaming video URLs.
- **Comprehensive Video URL Parsing & Parameter Support**:
  - Expanded `parseVideoUrl()` regex to support YouTube live streams (`/live/`), Shorts (`/shorts/`), embeds, and queries with pre-appended parameters (`?feature=shared&v=...`).
  - Added timestamp extraction (`?t=45`, `?t=1m25s`, `?start=45`) to initialize the video player directly at the linked moment.
- **Security Sandboxing & Scheme Injection Prevention**:
  - Strictly blocked dangerous URI schemes (`javascript:`, `data:text/html`, `vbscript:`).
  - Added explicit iframe sandboxing: `sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups"` with `referrerpolicy="no-referrer-when-downgrade"`.
  - Added validation gate in `openVideoInsertDialog` to reject unknown or empty URLs with user-friendly toast guidance.
- **Lifecycle & Memory Leakage Teardown**:
  - Ensured complete media unloading (`videoEl.removeAttribute('src')`, `load()`, `iframe.src = 'about:blank'`) and backdrop-click dismissal on both the insertion and player dialogs.
  - Implemented smooth `postMessage` seeking with iframe fallback.
- **Render Engine Robustness & Error Boundary (`render.js`)**:
  - Fixed `ReferenceError: image is not defined` in `drawVideoCard` by properly referencing `getImage(o.thumb, onload)`.
  - Wrapped dynamic object rendering in `drawObject` inside an isolated `try { ... } catch (err) { console.warn('Render error in object', o.type, err); } finally { ctx.restore(); }` error boundary. This prevents any corrupted card or media element from crashing the render loop, which previously left canvases shifted, blank, or with invisible/transparent elements during panning and zooming.

## 14. Tab Clearing Routing to 'My Boards' & Multi-Tab Operations (`tabs.js`, `panels.js`, `app.css`)

- **Routing Tab Closure to 'My Boards' Gallery (`tabs.js`, `panels.js`)**:
  - When closing the final remaining open tab (or clearing all tabs), GazBoard no longer automatically spawns an empty "Untitled Board" by default.
  - Instead, closing the last tab clears `activeId`, empties `this.tabs = []`, re-renders the clean empty tab strip (retaining the quick `(+)` add button), and immediately opens the full-screen **My Boards** gallery (`app.panels.boards()`).
  - This allows the user to choose intentionally whether to create a new board, open a folder, or select an existing board from their library.
  - If the user cancels or closes the "My Boards" panel without selecting an alternative board when `tabs.length === 0`, `panels.js` safely re-syncs the active loaded document tab so the workspace remains in an operational state.
- **Close All Tabs Context Menu Action**:
  - Added `Close all tabs` action (`closeAllTabs()`) to the tab right-click context menu alongside `Close tab`, `Close other tabs`, and `Close tabs to the right`.
  - Fully translated across all 7 locales (`ar`, `bn`, `de`, `es`, `pt-BR`, `zh-Hans`, `zh-Hant`) maintaining 100% i18n coverage.



