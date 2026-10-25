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
